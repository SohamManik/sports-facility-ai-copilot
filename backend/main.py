import os
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text
from dotenv import load_dotenv
import asyncio

load_dotenv()

from database import SessionLocal, get_db, init_db, PendingAction, AuditLog, Vendor
import seed_data
from models.schemas import (
    LoginRequest, LoginResponse,
    ChatRequest, ChatResponse,
    PendingActionResponse, ApprovalResponse, AuditLogEntry
)

app = FastAPI(
    title="HobbyFi Copilot API V2",
    description="AI-powered vendor CRM copilot for HobbyFi (LangGraph + Async)",
    version="2.0.0"
)

# CORS for React frontend
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
if frontend_url not in origins and frontend_url != "*":
    origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if frontend_url == "*" else origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.responses import JSONResponse
from fastapi.requests import Request
from starlette.middleware.cors import CORSMiddleware
import traceback

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print("GLOBAL EXCEPTION:", traceback.format_exc())
    # Return JSON with CORS headers manually to prevent network errors on frontend
    headers = {"Access-Control-Allow-Origin": "*"}
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
        headers=headers
    )

from cron import start_cron
from database import Base, engine

@app.on_event("startup")
async def startup():
    """Initialize DB, seed data, and start cron."""
    await init_db()
    await seed_data.seed()
    start_cron()

@app.post("/reset-db")
async def reset_db():
    """Reset the database to initial seed state."""
    try:
        async with engine.begin() as conn:
            # TRUNCATE with CASCADE handles FK constraints correctly in Postgres
            # (drop_all can fail on FK ordering; truncate is faster and safer)
            await conn.execute(text("""
                TRUNCATE TABLE audit_log, pending_actions, revenue, bookings, memberships, trials, users, vendors
                RESTART IDENTITY CASCADE
            """))
        await seed_data.seed()
        return {"success": True, "message": "Database reset successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi.responses import StreamingResponse, JSONResponse
from fastapi import UploadFile, File
import json
import httpx

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    # NVIDIA NIM Whisper API implementation
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="NVIDIA_API_KEY not configured.")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
    }
    
    # Write temp file for httpx upload
    content = await file.read()
    
    # According to NVIDIA NIM Whisper docs, the endpoint is usually:
    url = "https://ai.api.nvidia.com/v1/audio/transcriptions"
    
    files = {
        "file": (file.filename, content, file.content_type)
    }
    data = {
        "model": "nvidia/nemotron-4-340b-instruct", # placeholder if whisper name varies, but typically 'whisper'
    }
    
    # Fallback to standard OpenAI compatible Whisper endpoint name
    data["model"] = "openai/whisper-large-v3"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, files=files, data=data, timeout=30.0)
            response.raise_for_status()
            res_json = response.json()
            return {"text": res_json.get("text", "")}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


@app.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Vendor).where(Vendor.email == req.email))
    vendor = result.scalars().first()
    if not vendor or vendor.password != req.password:
        return LoginResponse(success=False, message="Invalid email or password.")
    
    token = f"dummy-jwt-token-{vendor.id}"
    return LoginResponse(
        success=True, vendor_id=vendor.id, name=vendor.name, token=token, message="Login successful"
    )

@app.post("/chat")
async def chat(req: ChatRequest, db: AsyncSession = Depends(get_db)):
    from agents.orchestrator import process_message_preflight, process_message_stream
    preflight = await process_message_preflight(req, 1, db)
    if preflight["mode"] == "json":
        return JSONResponse(content=preflight["payload"])
    return StreamingResponse(process_message_stream(preflight, 1, db), media_type="text/event-stream")


@app.get("/pending-actions", response_model=list[PendingActionResponse])
async def get_pending_actions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PendingAction).where(
            PendingAction.vendor_id == 1, PendingAction.status == "pending"
        ).order_by(PendingAction.created_at.desc())
    )
    actions = result.scalars().all()
    return [
        PendingActionResponse(
            id=a.id, action_type=a.action_type, human_readable=a.human_readable,
            affected_user=None, current_state=a.current_state, proposed_state=a.proposed_state,
            created_at=a.created_at.isoformat() if a.created_at else ""
        ) for a in actions
    ]

@app.post("/approve-action/{action_id}", response_model=ApprovalResponse)
async def approve_action(action_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PendingAction).where(PendingAction.id == action_id))
    action = result.scalars().first()
    if not action or action.status != "pending":
        raise HTTPException(status_code=404, detail="Pending action not found.")
    
    # Capture values BEFORE any commit (session may expire objects after commit)
    action_sql = action.action_sql
    action_type = action.action_type
    human_readable = action.human_readable
    
    try:
        # Execute the business SQL
        await db.execute(text(action_sql))
        
        # Update pending action status
        await db.execute(
            text("UPDATE pending_actions SET status = 'approved', resolved_at = NOW() WHERE id = :id"),
            {"id": action_id}
        )
        
        # Write audit log
        await db.execute(
            text("INSERT INTO audit_log (vendor_id, action_type, description, approved_by) VALUES (:vid, :atype, :desc, 'vendor')"),
            {"vid": 1, "atype": action_type, "desc": human_readable}
        )
        
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to execute action: {str(e)}")
    
    return ApprovalResponse(success=True, message=f"✅ Done. {human_readable}")


@app.post("/reject-action/{action_id}", response_model=ApprovalResponse)
async def reject_action(action_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PendingAction).where(PendingAction.id == action_id))
    action = result.scalars().first()
    if not action or action.status != "pending":
        raise HTTPException(status_code=404, detail="Pending action not found.")
    
    action.status = "rejected"
    action.resolved_at = datetime.utcnow()
    await db.commit()
    return ApprovalResponse(success=True, message="Action rejected.")


@app.get("/audit-log", response_model=list[AuditLogEntry])
async def get_audit_log(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AuditLog).where(AuditLog.vendor_id == 1).order_by(AuditLog.executed_at.desc()).limit(20)
    )
    entries = result.scalars().all()
    return [
        AuditLogEntry(id=e.id, action_type=e.action_type, description=e.description, executed_at=e.executed_at.isoformat() if e.executed_at else "")
        for e in entries
    ]

@app.get("/insights")
async def get_insights(db: AsyncSession = Depends(get_db)):
    insights = []
    
    # Use PostgreSQL INTERVAL syntax (not SQLite date())
    try:
        t_res = await db.execute(text(
            "SELECT COUNT(*) FROM trials WHERE vendor_id = 1 AND status = 'active' AND end_date <= CURRENT_DATE + INTERVAL '2 days'"
        ))
        expiring_trials = t_res.scalar()
        if expiring_trials and expiring_trials > 0:
            insights.append(f"You have **{expiring_trials} trial(s)** expiring within 48 hours.")
    except Exception as e:
        print("Insights trials error:", e)
        
    try:
        m_res = await db.execute(text(
            "SELECT COUNT(*) FROM memberships WHERE vendor_id = 1 AND status = 'active' AND end_date <= CURRENT_DATE + INTERVAL '7 days'"
        ))
        expiring_memberships = m_res.scalar()
        if expiring_memberships and expiring_memberships > 0:
            insights.append(f"You have **{expiring_memberships} membership(s)** expiring within 7 days.")
    except Exception as e:
        print("Insights memberships error:", e)
        
    try:
        rev_res = await db.execute(text(
            "SELECT (SELECT total_revenue FROM revenue WHERE vendor_id = 1 AND date = CURRENT_DATE) as today_rev, "
            "(SELECT AVG(total_revenue) FROM revenue WHERE vendor_id = 1 AND date >= CURRENT_DATE - INTERVAL '7 days') as avg_rev"
        ))
        rev_row = rev_res.fetchone()
        if rev_row and rev_row[0] is not None and rev_row[1] is not None:
            today_rev, avg_rev = rev_row[0], rev_row[1]
            if today_rev < avg_rev * 0.8:
                drop_pct = int((1 - (today_rev / avg_rev)) * 100)
                insights.append(f"Today's revenue (₹{today_rev}) is tracking **{drop_pct}% below** your 7-day average (₹{int(avg_rev)}).")
    except Exception as e:
        print("Insights revenue error:", e)
            
    if not insights:
        return {"has_insights": False, "message": ""}
    return {"has_insights": True, "message": "Good morning! Here are a few things to note today:\n\n- " + "\n- ".join(insights) + "\n\nWould you like me to pull up the details?"}
