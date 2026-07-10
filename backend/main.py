import os
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

from database import SessionLocal, get_db, PendingAction, AuditLog, Vendor
import seed_data
from models.schemas import (
    LoginRequest, LoginResponse,
    ChatRequest, ChatResponse,
    PendingActionResponse, ApprovalResponse, AuditLogEntry
)
# Removed process_message import because it is imported locally in /chat now

app = FastAPI(
    title="HobbyFi Copilot API",
    description="AI-powered vendor CRM copilot for HobbyFi",
    version="1.0.0"
)

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    """Seed database and warm up LLM on startup."""
    seed_data.seed()
    
    # Warm up NIM model (brainstorm D12)
    try:
        from langchain_nvidia_ai_endpoints import ChatNVIDIA
        warmup_llm = ChatNVIDIA(
            model="meta/llama-3.1-70b-instruct",
            api_key=os.getenv("NVIDIA_API_KEY"),
            temperature=0.1,
            max_tokens=16,
        )
        warmup_llm.invoke("Say OK")
        print("[OK] LLM warmed up successfully")
    except Exception as e:
        print(f"[WARNING] LLM warmup failed (will retry on first request): {e}")


from fastapi.responses import StreamingResponse, JSONResponse
import json

@app.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate vendor and return token."""
    vendor = db.query(Vendor).filter(Vendor.email == req.email).first()
    if not vendor or vendor.password != req.password:
        return LoginResponse(success=False, message="Invalid email or password.")
    
    # In a real app, generate a JWT. For demo, just return a dummy token.
    token = f"dummy-jwt-token-{vendor.id}"
    return LoginResponse(
        success=True,
        vendor_id=vendor.id,
        name=vendor.name,
        token=token,
        message="Login successful"
    )

@app.post("/chat")
def chat(req: ChatRequest, db: Session = Depends(get_db)):
    """
    Main chat endpoint.
    Returns either:
      - JSONResponse (application/json) for errors, guardrail blocks, and disambiguation
      - StreamingResponse (text/event-stream) for normal READ/WRITE responses
    The frontend detects Content-Type to decide how to process.
    """
    from agents.orchestrator import process_message_preflight, process_message_stream

    preflight = process_message_preflight(req, 1, db)

    if preflight["mode"] == "json":
        return JSONResponse(content=preflight["payload"])

    return StreamingResponse(
        process_message_stream(preflight, 1, db),
        media_type="text/event-stream"
    )


@app.get("/pending-actions", response_model=list[PendingActionResponse])
def get_pending_actions(db: Session = Depends(get_db)):
    """Get all pending actions for vendor_id=1."""
    actions = db.query(PendingAction).filter(
        PendingAction.vendor_id == 1,
        PendingAction.status == "pending"
    ).order_by(PendingAction.created_at.desc()).all()
    
    return [
        PendingActionResponse(
            id=a.id,
            action_type=a.action_type,
            human_readable=a.human_readable,
            affected_user=None,
            current_state=a.current_state,
            proposed_state=a.proposed_state,
            created_at=a.created_at.isoformat() if a.created_at else ""
        )
        for a in actions
    ]


@app.post("/approve-action/{action_id}", response_model=ApprovalResponse)
def approve_action(action_id: int, db: Session = Depends(get_db)):
    """Approve and execute a pending action."""
    action = db.query(PendingAction).filter(
        PendingAction.id == action_id,
        PendingAction.vendor_id == 1,
        PendingAction.status == "pending"
    ).first()
    
    if not action:
        raise HTTPException(status_code=404, detail="Pending action not found.")
    
    # Execute the SQL
    try:
        db.execute(text(action.action_sql))
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to execute action: {str(e)}")
    
    # Update pending_action status
    action.status = "approved"
    action.resolved_at = datetime.utcnow()
    
    # Insert audit log entry
    audit_entry = AuditLog(
        vendor_id=1,
        action_type=action.action_type,
        description=action.human_readable,
        approved_by="vendor"
    )
    db.add(audit_entry)
    db.commit()
    
    return ApprovalResponse(
        success=True,
        message=f"✅ Done. {action.human_readable}"
    )


@app.post("/reject-action/{action_id}", response_model=ApprovalResponse)
def reject_action(action_id: int, db: Session = Depends(get_db)):
    """Reject a pending action."""
    action = db.query(PendingAction).filter(
        PendingAction.id == action_id,
        PendingAction.vendor_id == 1,
        PendingAction.status == "pending"
    ).first()
    
    if not action:
        raise HTTPException(status_code=404, detail="Pending action not found.")
    
    action.status = "rejected"
    action.resolved_at = datetime.utcnow()
    db.commit()
    
    return ApprovalResponse(
        success=True,
        message="Action rejected."
    )


@app.get("/audit-log", response_model=list[AuditLogEntry])
def get_audit_log(db: Session = Depends(get_db)):
    """Get last 20 audit log entries for vendor_id=1."""
    entries = db.query(AuditLog).filter(
        AuditLog.vendor_id == 1
    ).order_by(AuditLog.executed_at.desc()).limit(20).all()
    
    return [
        AuditLogEntry(
            id=e.id,
            action_type=e.action_type,
            description=e.description,
            executed_at=e.executed_at.isoformat() if e.executed_at else ""
        )
        for e in entries
    ]


@app.get("/insights")
def get_insights(db: Session = Depends(get_db)):
    """Generate proactive insights on session start."""
    insights = []
    today_str = "2026-07-09"  # Fixed context date for demo
    
    trials_query = text(f"SELECT COUNT(*) FROM trials WHERE vendor_id = 1 AND status = 'active' AND end_date <= date('{today_str}', '+2 days')")
    expiring_trials = db.execute(trials_query).scalar()
    if expiring_trials > 0:
        insights.append(f"You have **{expiring_trials} trial(s)** expiring within 48 hours.")
        
    memberships_query = text(f"SELECT COUNT(*) FROM memberships WHERE vendor_id = 1 AND status = 'active' AND end_date <= date('{today_str}', '+7 days')")
    expiring_memberships = db.execute(memberships_query).scalar()
    if expiring_memberships > 0:
        insights.append(f"You have **{expiring_memberships} membership(s)** expiring within 7 days.")
        
    revenue_query = text(f"SELECT (SELECT total_revenue FROM revenue WHERE vendor_id = 1 AND date = '{today_str}') as today_rev, (SELECT AVG(total_revenue) FROM revenue WHERE vendor_id = 1 AND date >= date('{today_str}', '-7 days')) as avg_rev")
    rev_row = db.execute(revenue_query).fetchone()
    if rev_row and rev_row[0] is not None and rev_row[1] is not None:
        today_rev, avg_rev = rev_row[0], rev_row[1]
        if today_rev < avg_rev * 0.8:
            drop_pct = int((1 - (today_rev / avg_rev)) * 100)
            insights.append(f"Today's revenue (₹{today_rev}) is tracking **{drop_pct}% below** your 7-day average (₹{int(avg_rev)}).")
            
    if not insights:
        return {"has_insights": False, "message": ""}
        
    message = "Good morning! Here are a few things to note today:\n\n- " + "\n- ".join(insights) + "\n\nWould you like me to pull up the details for any of these?"
    return {"has_insights": True, "message": message}


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "model": "meta/llama-3.1-70b-instruct",
        "vendor": "Kota Badminton Academy"
    }


@app.get("/warmup")
def warmup():
    """Manual warmup endpoint (brainstorm D12)."""
    try:
        from langchain_nvidia_ai_endpoints import ChatNVIDIA
        warmup_llm = ChatNVIDIA(
            model="meta/llama-3.1-8b-instruct",
            api_key=os.getenv("NVIDIA_API_KEY"),
            temperature=0.1,
            max_tokens=16,
        )
        warmup_llm.invoke("Say OK")
        return {"status": "warmed up"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}
