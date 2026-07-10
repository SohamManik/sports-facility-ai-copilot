# HobbyFi Copilot

HobbyFi Copilot is an AI-powered natural language interface for sports facility vendors. It integrates directly into a React-based vendor CRM portal, allowing vendors to query their data and execute complex bulk updates using natural language instead of complex dashboards.

## Features

- **Natural Language Queries**: Ask questions like "What is my total membership revenue so far?" or "Show me all active trials for my academy."
- **Safe Database Mutations**: Instruct the AI to update records, e.g., "Cancel Rahul Verma and Priya Sharma's badminton trials."
- **5-Layer Security & Guardrails**:
  1. **Length Control**: Blocks excessively long prompt injections.
  2. **Injection Prevention**: Scans for common jailbreaks (`ignore previous`) and destructive commands (`DROP TABLE`).
  3. **Scope Enforcement**: Refuses to answer queries that fall outside of the CRM domain (e.g. asking for a poem).
  4. **SQL Validation**: Strictly enforces that read intents only produce `SELECT` statements, and writes only produce `UPDATE` targeting allowed tables.
  5. **PII Masking**: Automatically redacts sensitive phone numbers and emails in the output.
- **Human-in-the-Loop (HITL)**: All database mutations calculate a JSON diff and pause for explicit vendor approval via a visual frosted-glass UI card.
- **Disambiguation Engine**: If a vendor asks to cancel "Rohan's trial", but multiple Rohans exist, the backend detects the ambiguity and pauses to ask the user which one they meant.
- **Premium Aesthetics**: Built with a sleek, dark-mode glassmorphism design language using TailwindCSS.

## Architecture

The backend is built with FastAPI and SQLite, orchestrating multiple LLM agents via LangChain and NVIDIA NIM (`meta/llama-3.1-70b-instruct` and `8b-instruct`).

1. **Orchestrator Agent (8B Model)**: Rapidly classifies the raw user prompt into `READ`, `WRITE`, `CONVERSATIONAL`, or `OUT_OF_SCOPE`.
2. **Query Agent (70B Model)**: Generates safe `SELECT` statements, executes them against SQLite, and formulates the data into clean Markdown tables.
3. **Action Agent (70B Model)**: Generates `UPDATE` statements for modifying user states. It calculates a "Proposed State" diff but **does not execute the query** until approved.

## Running Locally

### Backend Setup
1. Navigate to the `backend` directory.
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt` (or install FastAPI, Uvicorn, SQLAlchemy, LangChain, etc.)
5. Create a `.env` file and add your NVIDIA API key: `NVIDIA_API_KEY=your_key_here`
6. Run the database seed script to populate dummy data: `python seed.py`
7. Start the API server: `python -m uvicorn main:app --reload`

### Frontend Setup
1. Navigate to the `frontend` directory.
2. Install dependencies: `npm install`
3. Start the Vite development server: `npm run dev`

Navigate to `http://localhost:5173` to interact with the HobbyFi Copilot!
