import os
from langchain_community.document_loaders import TextLoader
from langchain_core.prompts import PromptTemplate
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from dotenv import load_dotenv
import asyncio

load_dotenv()

llm = ChatNVIDIA(
    model="meta/llama-3.1-8b-instruct",
    api_key=os.getenv("NVIDIA_API_KEY"),
    temperature=0.1,
    max_tokens=256,
)

# For a simple RAG, we will load the text directly. In production, use a Vector Store.
def load_policy():
    try:
        with open("backend/refund_policy.txt", "r") as f:
            return f.read()
    except FileNotFoundError:
        return "Policy document not found."

policy_text = load_policy()

RAG_PROMPT = PromptTemplate(
    input_variables=["message", "policy", "history"],
    template="""You are an AI assistant for HobbyFi vendors. Answer the vendor's question based strictly on the provided policy.
If the policy does not contain the answer, say "I cannot find the answer to that in the facility rules."

Facility Policy:
{policy}

Chat History:
{history}

Vendor Question: {message}

Answer:"""
)

async def handle_policy(message: str, chat_history: str) -> str:
    prompt = RAG_PROMPT.format(message=message, policy=policy_text, history=chat_history)
    response = await llm.ainvoke(prompt)
    return response.content.strip()
