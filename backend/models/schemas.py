from pydantic import BaseModel
from typing import Optional


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    success: bool
    vendor_id: Optional[int] = None
    name: Optional[str] = None
    token: Optional[str] = None
    message: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    session_id: str
    disambiguation_context: Optional[dict] = None


class ChatResponse(BaseModel):
    response: str
    intent: str
    pending_action_id: Optional[int] = None
    disambiguation_options: Optional[list] = None
    disambiguation_context: Optional[dict] = None


class PendingActionResponse(BaseModel):
    id: int
    action_type: str
    human_readable: str
    affected_user: Optional[str] = None
    current_state: Optional[str] = None
    proposed_state: Optional[str] = None
    created_at: str


class ApprovalResponse(BaseModel):
    success: bool
    message: str


class AuditLogEntry(BaseModel):
    id: int
    action_type: str
    description: str
    executed_at: str
