from langchain.memory import ConversationBufferWindowMemory

# Module-level dict to store per-session memories
session_memories = {}


def get_memory(session_id: str) -> ConversationBufferWindowMemory:
    """Get or create memory for a session."""
    if session_id not in session_memories:
        session_memories[session_id] = ConversationBufferWindowMemory(
            k=8,
            memory_key="chat_history",
            return_messages=True,
            human_prefix="Vendor",
            ai_prefix="HobbyFi Copilot"
        )
    return session_memories[session_id]


def get_history_string(session_id: str) -> str:
    """Get conversation history as a formatted string."""
    memory = get_memory(session_id)
    messages = memory.chat_memory.messages
    if not messages:
        return ""
    
    history_parts = []
    for msg in messages:
        if msg.type == "human":
            history_parts.append(f"Vendor: {msg.content}")
        elif msg.type == "ai":
            history_parts.append(f"HobbyFi Copilot: {msg.content}")
    
    return "\n".join(history_parts)


def clear_memory(session_id: str):
    """Clear memory for a session."""
    if session_id in session_memories:
        del session_memories[session_id]
