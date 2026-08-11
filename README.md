# 🚀 Sports Facility AI Copilot

An enterprise-grade, agentic AI copilot designed for sports facility vendors. It replaces traditional clunky dashboards with a natural language interface that supports voice commands, complex bulk operations, generative charts, and proactive insights.

---

## 🌐 Live Demo
The application is live and deployed for production portfolio showcasing!
**Live Website:** [https://sports-copilot.vercel.app](https://sports-copilot.vercel.app)

*Note: The frontend is deployed on Vercel and the backend is deployed on a Render free-tier instance. The backend might take 30-50 seconds to wake up from inactivity on your first request.*

---

## 🏗️ Architecture V2

The V2 architecture represents a massive shift from a basic LLM wrapper to an asynchronous, stateful, and highly scalable multi-agent system.

### 🔹 Core Upgrades & Recent Polish
- **React + TypeScript Migration**: The entire frontend codebase has been migrated to strict TypeScript (`.tsx`, `types.ts`, `tsconfig.json`). The UI is now completely type-safe with explicit interfaces for API payloads.
- **Natural Language Generation (NLG)**: Replaced robotic data dumps with a secondary LLM formatting layer. Raw Postgres query results are passed through the LLM to generate fluid, conversational responses (e.g., formatting revenue with currency symbols and generating natural introductory sentences).
- **Asynchronous PostgreSQL (asyncpg)**: The database runs fully asynchronously. Handled edge-cases regarding SQLAlchemy transaction atomicity, session detachment, and Postgres-specific SQLite-incompatible constraints (e.g., swapping `drop_all` for raw `TRUNCATE ... CASCADE` logic for foreign keys).
- **Subquery Disambiguation (Cardinality Resolution)**: The Action Agent uses an intelligent pre-flight `ILIKE` database check. If a user tries to cancel a trial for an ambiguous name (e.g. "Rohan"), the system pauses execution, prompts the user via a UI disambiguation widget, and explicitly injects the concrete user ID into the SQL string to prevent Postgres `CardinalityViolationError`s.
- **Voice-to-Text (NVIDIA NIM Whisper)**: Integrated `MediaRecorder` in the React frontend to stream `.webm` audio to a FastAPI `/transcribe` endpoint powered by NVIDIA's `openai/whisper-large-v3` microservice.
- **Proactive Marketing Cron**: An `APScheduler` background task runs nightly to scan the database for anomalies (e.g., expiring trials, revenue drops) and flags them proactively to the vendor on startup using standard Postgres `INTERVAL` logic.

---

## 🔄 Agentic Flowchart

```mermaid
graph TD
    A["Vendor Input (Voice/Text)"] --> B{"LangGraph Intent Classifier"}
    
    B -->|READ| C["Query Agent"]
    B -->|WRITE| D["Action Agent"]
    B -->|POLICY| E["RAG Policy Agent"]
    B -->|CONVERSATIONAL| F["Chat Agent"]
    
    C --> G[("PostgreSQL DB")]
    D --> |Subquery Pre-flight Check| H["Pending Action Queue"]
    H --> |Vendor Approves| G
    
    E --> I["refund_policy.txt"]
    
    J["Nightly Cron Job"] --> |Scan DB| G
    J --> |Flag Issues| K["Proactive Insights"]
```

## 🛠️ Tech Stack

### Frontend
- **React 18 + TypeScript** (Vite)
- **TailwindCSS** for UI and theming
- **Recharts** for Generative UI 
- **Lucide-React** for iconography
- Native browser `MediaRecorder` API

### Backend
- **Python 3.11+**
- **FastAPI** (with standard Server-Sent Events for streaming)
- **SQLAlchemy (Async)** with `asyncpg` + PostgreSQL
- **LangChain & LangGraph** for agent orchestration
- **NVIDIA NIM** (Llama 3.1 70B & Whisper Large V3)
- **APScheduler** for background jobs

---

## 💻 Local Development Setup

To run this project locally on your machine, you will need Node.js, Python 3.11+, and a PostgreSQL server.

### 1. Database (PostgreSQL)
Ensure you have a Postgres server running locally. Create a database named `hobbyfi`.

### 2. Backend Bootup
1. Navigate to the `backend` directory: `cd backend`
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Mac/Linux: `source venv/bin/activate`
4. Install requirements: `pip install -r requirements.txt`
5. Create a `.env` file in the `backend` directory:
   ```env
   DATABASE_URL=postgresql+asyncpg://postgres:yourpassword@localhost:5432/hobbyfi
   NVIDIA_API_KEY=your_nvidia_nim_api_key_here
   FRONTEND_URL=http://localhost:5173
   ```
6. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```
   *Note: On first startup, the server will automatically connect to your local Postgres, execute the table creation scripts, and inject seed data.*

### 3. Frontend Bootup
1. Open a new terminal and navigate to the `frontend` directory: `cd frontend`
2. Install dependencies: `npm install`
3. Since we migrated to TypeScript, you can verify there are no type errors with: `npm run type-check`
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
5. Open your browser to `http://localhost:5173`. The app should load and instantly connect to your local FastAPI instance.

---

## 🚀 Production Deployment Instructions

### 1. Database (Render)
Provision a PostgreSQL database on Render. Update your environment variables to use the `postgresql+asyncpg://` prefix.

### 2. Backend (Render Web Service)
Connect your GitHub repository to a Render Web Service. Set the Root Directory to `backend`.
**Environment Variables Required:**
- `DATABASE_URL`: Your PostgreSQL connection string.
- `NVIDIA_API_KEY`: Your NIM access key.
- `FRONTEND_URL`: Your Vercel domain (for CORS).

### 3. Frontend (Vercel)
Import the repository into Vercel. Set the Root Directory to `frontend` and the Framework Preset to **Vite**.
**Environment Variables Required:**
- `VITE_API_URL`: Your deployed Render backend URL. (e.g. `https://sports-facility-ai-copilot.onrender.com`)
*(Note: Because of hardcoding optimizations for the portfolio display, verify the `API_BASE` const in `App.tsx` matches your backend URL).*
