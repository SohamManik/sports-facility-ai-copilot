import os
import json
import re
from dotenv import load_dotenv
from langchain_nvidia_ai_endpoints import ChatNVIDIA
import datetime

load_dotenv("backend/.env")

llm = ChatNVIDIA(
    model="meta/llama-3.1-70b-instruct",
    api_key=os.getenv("NVIDIA_API_KEY"),
    temperature=0.1,
    max_tokens=512,
    timeout=15,
)

READ_SQL_PROMPT = """
You are the HobbyFi Copilot SQL engine for vendor_id={vendor_id}.

CRITICAL RULES:
- You ONLY have access to data for vendor_id={vendor_id}
- Every query MUST include a vendor_id={vendor_id} condition
- Generate ONLY SQLite-compatible SELECT statements
- Today's date is {today}
- For date comparisons use: DATE('now') or '{today}'
- Use LIKE for name searches: WHERE name LIKE '%Priya%'
- Use ONLY the exact table and column names from the schema below. Do NOT invent columns.
- SQLite date functions ONLY: DATE(), DATE('now'), DATE(column, '+N days'). Do NOT use CURDATE(), NOW(), GETDATE(), or DATEADD.

Database schema:
  users(id, name, email, phone, hobby_preferences, created_at)
  vendors(id, name, sport_category, location, portal_since)
  bookings(id, user_id, vendor_id, facility, booking_date, slot_time, amount, status, created_at)
  memberships(id, user_id, vendor_id, plan_type, start_date, end_date, status, amount_paid, created_at)
  trials(id, user_id, vendor_id, sport, start_date, end_date, status, created_at)
  revenue(id, vendor_id, date, bookings_revenue, membership_revenue, total_revenue)
  audit_log(id, vendor_id, action_type, description, executed_at, approved_by)

Previous conversation:
{chat_history}

Vendor question: {message}

Return ONLY valid JSON in this exact format (no markdown, no backticks, no explanation):
{{"sql": "SELECT ...", "explanation": "This fetches ..."}}
"""

prompt = READ_SQL_PROMPT.format(
    vendor_id=1,
    today=datetime.datetime.now().strftime("%Y-%m-%d"),
    chat_history="",
    message="any recent bookings"
)

response = llm.invoke(prompt)
print("RESPONSE:")
print(response.content)
