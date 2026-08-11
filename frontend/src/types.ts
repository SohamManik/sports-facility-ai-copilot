// ─── Shared TypeScript types for Sports Facility AI Copilot ───────────────────

export type MessageRole = 'vendor' | 'copilot'
export type MessageIntent =
  | 'READ'
  | 'WRITE'
  | 'WRITE_APPROVED'
  | 'WRITE_REJECTED'
  | 'CONVERSATIONAL'
  | 'AMBIGUOUS'
  | 'OUT_OF_SCOPE'
  | 'BLOCKED'
  | 'PROACTIVE_INSIGHT'
  | 'SYSTEM'
  | 'ERROR'
  | ''

export interface DisambiguationOption {
  id: number
  description: string
}

export interface DisambiguationContext {
  action_sql: string
  action_type: string
  human_readable: string
  proposed_changes: Record<string, unknown>
  selected_user_id?: number
  selected_user_name?: string
}

export interface Message {
  role: MessageRole
  text: string
  intent: MessageIntent
  status?: string | null
  pending_action_id?: number | null
  disambiguationOptions?: DisambiguationOption[]
  disambiguationContext?: DisambiguationContext
}

export interface PendingAction {
  id: number
  action_type: string
  human_readable: string
  affected_user: string | null
  current_state: string | null
  proposed_state: string | null
  created_at: string
}

export interface AuditLogEntry {
  id: number
  action_type: string
  description: string
  executed_at: string
}

export interface Vendor {
  id: number
  name: string
  token: string
}

export interface InsightsResponse {
  has_insights: boolean
  message: string
}

export interface ChatApiResponse {
  response: string
  intent: MessageIntent
  pending_action_id: number | null
  disambiguation_options?: DisambiguationOption[]
  disambiguation_context?: DisambiguationContext
}

export interface ApprovalResponse {
  success: boolean
  message: string
}
