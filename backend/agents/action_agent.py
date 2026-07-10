import os
import json
import re
from datetime import datetime, date
from sqlalchemy import text
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from dotenv import load_dotenv

load_dotenv()

from guardrails.guards import validate_write_sql, check_bulk_operation
from prompts import WRITE_ACTION_PROMPT
from database import PendingAction

llm = ChatNVIDIA(
    model="meta/llama-3.1-70b-instruct",
    api_key=os.getenv("NVIDIA_API_KEY"),
    temperature=0.1,
    max_tokens=512,
    timeout=15,
)


def handle_write(message: str, vendor_id: int, chat_history: str, db, disambiguation_context: dict = None) -> dict:
    """
    Handle WRITE intent: generate UPDATE SQL, validate, run pre-flight,
    and return result dict.

    Returns a dict with keys:
      - response, intent, pending_action_id (always)
      - disambiguation_options, disambiguation_context (if ambiguous)

    Pre-flight runs BEFORE any streaming begins. The orchestrator checks
    the result and decides whether to return JSON (error/disambiguation)
    or proceed to SSE streaming for the proposal confirmation.
    """
    try:
        if disambiguation_context:
            # Resuming from an ambiguity resolution — user selected a specific record.
            action_type = disambiguation_context.get("action_type")
            action_sql = disambiguation_context.get("action_sql")
            human_readable = disambiguation_context.get("human_readable")
            proposed_changes = disambiguation_context.get("proposed_changes", {})
            selected_user_id = disambiguation_context.get("selected_user_id")
            selected_user_name = disambiguation_context.get("selected_user_name")
            affected_user = selected_user_name
            affected_user_id = selected_user_id

            # Replace the subquery with the explicit ID
            action_sql = re.sub(
                r"\(SELECT\s+id\s+FROM\s+users\s+WHERE\s+name\s+LIKE\s+'[^']+'\)",
                str(selected_user_id),
                action_sql,
                count=1,
                flags=re.IGNORECASE
            )

        else:
            # 1. Build prompt
            prompt = WRITE_ACTION_PROMPT.format(
                vendor_id=vendor_id,
                today="2026-07-09",
                message=message
            )

            # 2. Call LLM
            response = llm.invoke(prompt)
            response_text = response.content.strip()

            # 3. Parse JSON — two-stage parsing
            cleaned = re.sub(r'```(?:json|sql)?\n?(.*?)\n?```', r'\1', response_text, flags=re.DOTALL).strip()

            try:
                parsed = json.loads(cleaned)
            except json.JSONDecodeError:
                match = re.search(r'\{.*\}', cleaned, re.DOTALL)
                if match:
                    try:
                        parsed = json.loads(match.group())
                    except json.JSONDecodeError:
                        return {"response": "I couldn't plan that action. Please rephrase.", "intent": "CONVERSATIONAL", "pending_action_id": None}
                else:
                    return {"response": "I couldn't plan that action. Please rephrase.", "intent": "CONVERSATIONAL", "pending_action_id": None}

            action_type = parsed.get("action_type", "UNKNOWN")
            action_sql = parsed.get("action_sql", "")
            human_readable = parsed.get("human_readable", "")
            affected_user = parsed.get("affected_user", "")
            proposed_changes = parsed.get("proposed_changes", {})
            affected_user_id = None

            if not action_sql:
                return {"response": "I couldn't generate a valid action for that request.", "intent": "CONVERSATIONAL", "pending_action_id": None}

            # 4. Validate write SQL (guardrail layer 3)
            validation = validate_write_sql(action_sql)
            if not validation["valid"]:
                return {
                    "response": f"I can't perform that operation. {validation['reason']}",
                    "intent": "CONVERSATIONAL",
                    "pending_action_id": None
                }

            # 5. Pre-flight SELECT check — runs BEFORE streaming begins
            subquery_match = re.search(
                r"SELECT\s+id\s+FROM\s+users\s+WHERE\s+name\s+LIKE\s+'([^']+)'",
                action_sql,
                re.IGNORECASE
            )
            if subquery_match:
                name_pattern = subquery_match.group(1)
                try:
                    check_result = db.execute(
                        text("SELECT id, name FROM users WHERE name LIKE :pattern"),
                        {"pattern": name_pattern}
                    )
                    matching_users = check_result.fetchall()
                    if len(matching_users) == 0:
                        return {
                            "response": f"I couldn't find a user matching '{name_pattern.replace('%', '')}'.",
                            "intent": "CONVERSATIONAL",
                            "pending_action_id": None
                        }
                    elif len(matching_users) > 1:
                        # AMBIGUOUS — return JSON immediately (no streaming)
                        options = [{"id": row[0], "description": f"{row[1]} (ID: {row[0]})"} for row in matching_users]
                        return {
                            "response": f"I found {len(matching_users)} users matching that name. Which one did you mean?",
                            "intent": "AMBIGUOUS",
                            "pending_action_id": None,
                            "disambiguation_options": options,
                            "disambiguation_context": {
                                "action_sql": action_sql,
                                "action_type": action_type,
                                "human_readable": human_readable,
                                "proposed_changes": proposed_changes
                            }
                        }
                    else:
                        affected_user = matching_users[0][1]
                        affected_user_id = matching_users[0][0]
                        # We intentionally DO NOT replace the subquery here, so that if there are
                        # multiple subqueries (e.g. for multiple users), SQLite can execute them all naturally.
                except Exception as e:
                    print("Preflight check failed:", e)

        # 6. Check for bulk operations (guardrail layer 4)
        bulk_check = check_bulk_operation(action_sql)
        if bulk_check["is_bulk"]:
            human_readable = f"BULK OPERATION: {human_readable}"

        # 7. Generate Current State Snapshot from pre-flight SELECT
        current_state_json = None
        target_table = "unknown"
        if "memberships" in action_sql.lower():
            target_table = "memberships"
        elif "trials" in action_sql.lower():
            target_table = "trials"
        elif "bookings" in action_sql.lower():
            target_table = "bookings"

        if target_table != "unknown" and affected_user_id:
            try:
                res = db.execute(
                    text(f"SELECT * FROM {target_table} WHERE user_id = :uid AND vendor_id = :vid LIMIT 1"),
                    {"uid": affected_user_id, "vid": vendor_id}
                ).fetchone()
                if res:
                    row_dict = dict(res._mapping)
                    for k, v in row_dict.items():
                        if isinstance(v, (datetime, date)):
                            row_dict[k] = v.isoformat()
                    current_state_json = json.dumps(row_dict)
            except Exception as e:
                print("Snapshot error:", e)

        # 8. Build proposed_state from LLM's proposed_changes overlaid on current_state
        #    Zero SQL parsing — the LLM already computed the concrete values.
        proposed_state_json = None
        if current_state_json and proposed_changes:
            try:
                current = json.loads(current_state_json)
                proposed = {**current, **proposed_changes}
                proposed_state_json = json.dumps(proposed)
            except Exception as e:
                print("Proposed state build error:", e)

        # 9. Insert into pending_actions
        new_action = PendingAction(
            vendor_id=vendor_id,
            action_type=action_type,
            action_sql=action_sql,
            human_readable=human_readable,
            current_state=current_state_json,
            proposed_state=proposed_state_json,
            status="pending"
        )
        db.add(new_action)
        db.commit()
        db.refresh(new_action)

        # 10. Return success
        return {
            "response": f"Action proposed: {human_readable}. Please review and approve it in the panel on the right.",
            "intent": "WRITE",
            "pending_action_id": new_action.id
        }

    except Exception as e:
        print("Write error:", e)
        return {"response": "I encountered an error planning that action. Please try again.", "intent": "WRITE", "pending_action_id": None}
