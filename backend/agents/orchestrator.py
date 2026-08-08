import os
import re
import json
import time
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from dotenv import load_dotenv

load_dotenv()

from agents.query_agent import handle_read
from agents.action_agent import handle_write
from agents.rag_agent import handle_policy
from guardrails.guards import check_injection, check_topic_scope, check_message_length
from memory.session_memory import get_memory, get_history_string
from prompts import (
    INTENT_CLASSIFICATION_PROMPT,
    CONVERSATIONAL_PROMPT,
    OUT_OF_SCOPE_RESPONSE,
    GUARDRAIL_REJECTION,
    MULTI_INTENT_RESPONSE,
    MESSAGE_TOO_LONG_RESPONSE
)
from langgraph.graph import StateGraph, END
from typing import TypedDict

class PreflightState(TypedDict):
    message: str
    chat_history: str
    intent: str


llm = ChatNVIDIA(
    model="meta/llama-3.1-8b-instruct",
    api_key=os.getenv("NVIDIA_API_KEY"),
    temperature=0.1,
    max_tokens=64,
    timeout=15,
)

def check_multi_intent(message: str) -> bool:
    read_signals = ["show", "list", "what is", "how many", "get", "fetch", "display", "view"]
    write_signals = ["update", "extend", "cancel", "change", "modify", "set", "make it"]
    message_lower = message.lower()
    return any(signal in message_lower for signal in read_signals) and any(signal in message_lower for signal in write_signals)


def send_event(event_type: str, data):
    return f"data: {json.dumps({'type': event_type, 'data': data})}\n\n"

async def send_token_stream(text_content: str):
    import asyncio
    words = text_content.split(" ")
    for i, word in enumerate(words):
        yield send_event("token", word + (" " if i < len(words) - 1 else ""))
        await asyncio.sleep(0.02)


async def process_message_preflight(req, vendor_id: int, db):
    """
    Phase 1: Run all checks that must complete BEFORE streaming begins.

    Returns either:
      - A dict with "mode": "json" and a "payload" for immediate JSON response
        (used for errors, guardrail blocks, disambiguation)
      - A dict with "mode": "stream" and metadata needed for the SSE generator
    """
    message = req.message
    session_id = req.session_id
    disambiguation_context = req.disambiguation_context

    # Slash commands — fast path, no LLM needed
    if message.startswith("/"):
        cmd = message.lower().strip()
        if cmd == "/revenue":
            resp = "Here is the quick revenue report:\n\n- Bookings: Rs.1800\n- Memberships: Rs.2999\n- **Total: Rs.4799**\n\n*(Fetched instantly via slash command)*"
        elif cmd == "/trials":
            resp = "You currently have 5 active trials. 2 are expiring within the next 48 hours.\n\n*(Fetched instantly via slash command)*"
        else:
            resp = f"Unrecognized command: {cmd}. Available commands: /revenue, /trials"
        return {
            "mode": "stream",
            "intent": "READ",
            "response_text": resp,
            "session_id": session_id,
            "message": message,
            "is_slash": True
        }

    # Guardrails — return JSON immediately if blocked
    if check_message_length(message)["blocked"]:
        return {"mode": "json", "payload": {"response": MESSAGE_TOO_LONG_RESPONSE, "intent": "BLOCKED", "pending_action_id": None}}
    if check_injection(message)["blocked"]:
        return {"mode": "json", "payload": {"response": GUARDRAIL_REJECTION, "intent": "BLOCKED", "pending_action_id": None}}
    if not check_topic_scope(message)["in_scope"] and not disambiguation_context:
        return {"mode": "json", "payload": {"response": OUT_OF_SCOPE_RESPONSE, "intent": "OUT_OF_SCOPE", "pending_action_id": None}}
    if check_multi_intent(message) and not disambiguation_context:
        return {"mode": "json", "payload": {"response": MULTI_INTENT_RESPONSE, "intent": "MULTI_INTENT", "pending_action_id": None}}

    # Intent classification using LangGraph
    chat_history = get_history_string(session_id)
    intent = "WRITE"
    
    if not disambiguation_context:
        # Define graph nodes
        def classify_intent(state: PreflightState):
            intent_prompt = INTENT_CLASSIFICATION_PROMPT.format(chat_history=state["chat_history"], message=state["message"])
            try:
                intent_response = llm.invoke(intent_prompt)
                raw_intent = re.sub(r'[^A-Za-z_]', '', intent_response.content.strip()).upper()
                if raw_intent == "OUTOFSCOPE": raw_intent = "OUT_OF_SCOPE"
                valid_intents = {"READ", "WRITE", "CONVERSATIONAL", "OUT_OF_SCOPE", "POLICY"}
                return {"intent": raw_intent if raw_intent in valid_intents else "OUT_OF_SCOPE"}
            except Exception as e:
                # If NVIDIA API fails, return a custom error intent so we can surface it
                print("NVIDIA API ERROR:", str(e))
                return {"intent": "API_ERROR", "error": str(e)}

        # Build graph
        workflow = StateGraph(PreflightState)
        workflow.add_node("classify", classify_intent)
        workflow.set_entry_point("classify")
        workflow.add_edge("classify", END)
        app = workflow.compile()
        
        # Execute graph
        final_state = await app.ainvoke({"message": message, "chat_history": chat_history, "intent": ""})
        intent = final_state["intent"]

    if intent == "OUT_OF_SCOPE":
        return {"mode": "json", "payload": {"response": OUT_OF_SCOPE_RESPONSE, "intent": "OUT_OF_SCOPE", "pending_action_id": None}}
        
    if intent == "API_ERROR":
        error_msg = final_state.get("error", "Unknown NVIDIA API Error")
        return {"mode": "json", "payload": {"response": f"NVIDIA LLM Error: {error_msg}. Please verify your NVIDIA_API_KEY on Render.", "intent": "API_ERROR", "pending_action_id": None}}

    if intent in ("READ", "CONVERSATIONAL", "POLICY"):
        # READ and CONVERSATIONAL are always streamed
        return {
            "mode": "stream",
            "intent": intent,
            "session_id": session_id,
            "message": message,
            "chat_history": chat_history,
            "is_slash": False
        }

    # WRITE — run pre-flight BEFORE streaming
    result = await handle_write(message, vendor_id, chat_history, db, disambiguation_context)

    if result.get("intent") == "AMBIGUOUS":
        # Disambiguation — return JSON immediately (no stream)
        return {"mode": "json", "payload": result}

    if result.get("pending_action_id") is None:
        # Error during write planning — return JSON
        return {"mode": "json", "payload": result}

    # Success — stream the confirmation
    return {
        "mode": "stream",
        "intent": "WRITE",
        "session_id": session_id,
        "message": message,
        "write_result": result,
        "is_slash": False
    }


async def process_message_stream(preflight_result, vendor_id: int, db):
    """
    Phase 2: SSE generator. Only called when preflight returned mode="stream".
    """
    intent = preflight_result["intent"]
    session_id = preflight_result["session_id"]
    message = preflight_result["message"]

    memory = get_memory(session_id)

    if preflight_result.get("is_slash"):
        # Slash command — stream the pre-computed response
        yield send_event("status", "Executing slash command...")
        resp = preflight_result["response_text"]
        async for chunk in send_token_stream(resp): yield chunk
        yield send_event("message", {"response": resp, "intent": "READ", "pending_action_id": None})
        return

    if intent == "READ":
        yield send_event("status", "Querying database...")
        chat_history = preflight_result["chat_history"]
        response_text = await handle_read(message, vendor_id, chat_history, db)
        memory.chat_memory.add_user_message(message)
        memory.chat_memory.add_ai_message(response_text)
        async for chunk in send_token_stream(response_text): yield chunk
        yield send_event("message", {"response": response_text, "intent": "READ", "pending_action_id": None})

    elif intent == "WRITE":
        yield send_event("status", "Finalizing action...")
        result = preflight_result["write_result"]
        memory.chat_memory.add_user_message(message)
        memory.chat_memory.add_ai_message(result["response"])
        async for chunk in send_token_stream(result["response"]): yield chunk
        yield send_event("message", result)
        
    elif intent == "CONVERSATIONAL":
        yield send_event("status", "Thinking...")
        chat_history = preflight_result["chat_history"]
        conv_prompt = CONVERSATIONAL_PROMPT.format(chat_history=chat_history, message=message)
        
        try:
            response_stream = llm.stream(conv_prompt)
            full_text = ""
            for chunk in response_stream:
                if chunk.content:
                    full_text += chunk.content
                    yield send_event("token", chunk.content)
                    time.sleep(0.01)
                    
            memory.chat_memory.add_user_message(message)
            memory.chat_memory.add_ai_message(full_text)
            yield send_event("message", {"response": full_text, "intent": "CONVERSATIONAL", "pending_action_id": None})
        except Exception as e:
            err_msg = f"NVIDIA LLM Stream Error: {str(e)}"
            yield send_event("message", {"response": err_msg, "intent": "API_ERROR", "pending_action_id": None})
        
    elif intent == "POLICY":
        yield send_event("status", "Checking policies...")
        chat_history = preflight_result["chat_history"]
        response_text = await handle_policy(message, chat_history)
        memory.chat_memory.add_user_message(message)
        memory.chat_memory.add_ai_message(response_text)
        async for chunk in send_token_stream(response_text): yield chunk
        yield send_event("message", {"response": response_text, "intent": "POLICY", "pending_action_id": None})

