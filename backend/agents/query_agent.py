import os
import json
import re
from sqlalchemy import text
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from dotenv import load_dotenv

load_dotenv()

from guardrails.guards import validate_read_sql, mask_pii
from prompts import READ_SQL_PROMPT, EMPTY_RESULT_RESPONSE

llm = ChatNVIDIA(
    model="meta/llama-3.1-70b-instruct",
    api_key=os.getenv("NVIDIA_API_KEY"),
    temperature=0.1,
    max_tokens=512,
    timeout=15,
)


async def handle_read(message: str, vendor_id: int, chat_history: str, db) -> str:
    """Handle READ intent: generate SQL, validate, execute, format, mask PII."""
    try:
        from datetime import datetime
        prompt = READ_SQL_PROMPT.format(
            vendor_id=vendor_id,
            today=datetime.now().strftime("%Y-%m-%d"),
            chat_history=chat_history,
            message=message
        )

        # 2. Call LLM
        try:
            response = llm.invoke(prompt)
        except Exception as e:
            return "I am having trouble connecting to my brain right now. Please try again."
        response_text = response.content.strip()

        # 3. Parse JSON — two-stage parsing (brainstorm D2)
        # Stage 1: strip markdown code blocks
        cleaned = re.sub(r'```(?:json|sql)?\n?(.*?)\n?```', r'\1', response_text, flags=re.DOTALL)
        cleaned = cleaned.strip()

        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError:
            # Stage 2: extract first JSON object
            match = re.search(r'\{.*\}', cleaned, re.DOTALL)
            if match:
                try:
                    parsed = json.loads(match.group())
                except json.JSONDecodeError:
                    return "I couldn't understand the query. Please try rephrasing."
            else:
                return "I couldn't understand the query. Please try rephrasing."

        sql = parsed.get("sql", "")
        if not sql:
            return "I couldn't generate a query for that request. Please try rephrasing."

        # 4. Validate SQL
        validation = validate_read_sql(sql)
        if not validation["valid"]:
            return f"I couldn't generate a safe query for that request. Try rephrasing."

        # 5. Execute SQL
        try:
            result = await db.execute(text(sql))
            rows = result.fetchall()
            columns = list(result.keys())
        except Exception as e:
            return f"I encountered an error fetching that data. Exception: {str(e)}\n\nQuery: {sql}"

        # 6. Check empty
        if len(rows) == 0:
            return EMPTY_RESULT_RESPONSE

        # 7. Result size guard (brainstorm D8) — truncate at 25 rows
        total_count = len(rows)
        truncated = False
        if total_count > 25:
            rows = rows[:25]
            truncated = True

        # 8. Format results
        if len(rows) == 1 and len(columns) == 1:
            formatted = str(rows[0][0])
        else:
            # Multiple rows — markdown table format
            lines = []
            # Header
            header = "| " + " | ".join(columns) + " |"
            separator = "|" + "|".join(["---" for _ in columns]) + "|"
            lines.extend([header, separator])
            # Rows
            for row in rows:
                formatted_row = "| " + " | ".join([str(val) for val in row]) + " |"
                lines.append(formatted_row)
            formatted = "\n".join(lines)

        if truncated:
            formatted += f"\n\n_Showing first 25 of {total_count} results. Please narrow your query._"

        # 9. Mask PII
        masked = mask_pii(formatted)

        # 10. Add explanation if available
        explanation = parsed.get("explanation", "")
        if explanation:
            masked = f"{explanation}\n\n{masked}"

        return masked

    except Exception as e:
        return "I encountered an error processing your request. Please try again."
