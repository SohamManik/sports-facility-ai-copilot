import { useState, useEffect, useCallback, useRef } from 'react'
import axios, { AxiosError } from 'axios'
import ChatWindow from './components/ChatWindow'
import PendingApprovals from './components/PendingApprovals'
import AuditLog from './components/AuditLog'
import { Sparkles, Shield, ScrollText, RefreshCw } from 'lucide-react'
import type {
  Message,
  PendingAction,
  AuditLogEntry,
  DisambiguationContext,
  ChatApiResponse,
  InsightsResponse,
} from './types'

// Hardcoded for portfolio production deployment
const API_BASE = 'https://sports-facility-ai-copilot.onrender.com'

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const WELCOME_MESSAGE: Message = {
  role: 'copilot',
  text: "Welcome to Sports Facility AI Copilot! I'm your AI assistant for Kota Badminton Academy. Ask me about revenue, bookings, memberships, trials — or request changes and I'll prepare them for your approval.",
  intent: 'SYSTEM',
}

type ActiveTab = 'approvals' | 'audit'

export default function App() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([])
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([])
  const [activeTab, setActiveTab] = useState<ActiveTab>('approvals')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [sessionId] = useState<string>(() => generateId())
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [confirmActionId, setConfirmActionId] = useState<number | null>(null)
  const insightsFetched = useRef<boolean>(false)

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success'): void => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const fetchPendingActions = useCallback(async (): Promise<void> => {
    try {
      const res = await axios.get<PendingAction[]>(`${API_BASE}/pending-actions`)
      setPendingActions(res.data)
    } catch (err) {
      console.error('Failed to fetch pending actions:', err)
    }
  }, [])

  const fetchAuditLog = useCallback(async (): Promise<void> => {
    try {
      const res = await axios.get<AuditLogEntry[]>(`${API_BASE}/audit-log`)
      setAuditLog(res.data)
    } catch (err) {
      console.error('Failed to fetch audit log:', err)
    }
  }, [])

  const fetchInsights = useCallback(async (): Promise<void> => {
    if (insightsFetched.current) return
    insightsFetched.current = true
    try {
      const res = await axios.get<InsightsResponse>(`${API_BASE}/insights`)
      if (res.data.has_insights) {
        setMessages(prev => [...prev, {
          role: 'copilot',
          text: res.data.message,
          intent: 'PROACTIVE_INSIGHT',
        }])
      }
    } catch (err) {
      console.error('Failed to fetch insights:', err)
      insightsFetched.current = false
    }
  }, [])

  useEffect(() => {
    fetchAuditLog()
    fetchInsights()
  }, [fetchAuditLog, fetchInsights])

  useEffect(() => {
    fetchPendingActions()
    const interval = setInterval(fetchPendingActions, 5000)
    return () => clearInterval(interval)
  }, [fetchPendingActions])

  const sendMessage = async (text: string, disambiguationContext?: DisambiguationContext): Promise<void> => {
    const displayText = disambiguationContext
      ? `Selected: ${disambiguationContext.selected_user_name ?? ''}`
      : text

    setMessages(prev => [
      ...prev,
      { role: 'vendor', text: displayText, intent: '' },
      { role: 'copilot', text: '', intent: '', status: 'Thinking...' },
    ])
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
          disambiguation_context: disambiguationContext ?? null,
        }),
      })

      const contentType = response.headers.get('content-type') ?? ''

      if (!response.ok) {
        let errMsg = 'Something went wrong on the server.'
        if (contentType.includes('application/json')) {
          const errData = (await response.json()) as { detail?: string; response?: string }
          errMsg = errData.detail ?? errData.response ?? errMsg
        }
        setMessages(prev => {
          const next = [...prev]
          const last = { ...next[next.length - 1], text: errMsg, intent: 'CONVERSATIONAL' as const, status: null }
          next[next.length - 1] = last
          return next
        })
        setIsLoading(false)
        return
      }

      if (contentType.includes('application/json')) {
        const data = (await response.json()) as ChatApiResponse

        setMessages(prev => {
          const next = [...prev]
          const updated: Message = {
            ...next[next.length - 1],
            text: data.response,
            intent: data.intent,
            pending_action_id: data.pending_action_id,
            status: null,
          }
          if (data.disambiguation_options) {
            updated.disambiguationOptions = data.disambiguation_options
            updated.disambiguationContext = data.disambiguation_context
          }
          next[next.length - 1] = updated
          return next
        })

        if (data.pending_action_id) {
          fetchPendingActions()
          setActiveTab('approvals')
        }
      } else {
        // SSE stream
        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let done = false

        while (!done) {
          const { value, done: doneReading } = await reader.read()
          done = doneReading
          if (!value) continue

          const chunk = decoder.decode(value, { stream: true })
          const events = chunk.split('\n\n')

          for (const event of events) {
            if (!event.startsWith('data: ')) continue
            try {
              const payload = JSON.parse(event.slice(6)) as {
                type: 'status' | 'token' | 'message'
                data: string | ChatApiResponse
              }

              setMessages(prev => {
                const next = [...prev]
                const updated = { ...next[next.length - 1] }

                if (payload.type === 'status') {
                  updated.status = payload.data as string
                } else if (payload.type === 'token') {
                  updated.text = (updated.text ?? '') + (payload.data as string)
                  updated.status = null
                } else if (payload.type === 'message') {
                  const msgData = payload.data as ChatApiResponse
                  if (!updated.text && msgData.response) updated.text = msgData.response
                  updated.intent = msgData.intent
                  updated.pending_action_id = msgData.pending_action_id
                  updated.status = null
                }

                next[next.length - 1] = updated
                return next
              })

              if (payload.type === 'message') {
                const msgData = payload.data as ChatApiResponse
                if (msgData.pending_action_id) {
                  fetchPendingActions()
                  setActiveTab('approvals')
                }
              }
            } catch {
              // Ignore parse errors from incomplete SSE chunks
            }
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err)
      setMessages(prev => {
        const next = [...prev]
        next[next.length - 1] = {
          ...next[next.length - 1],
          text: 'Sorry, I encountered an error. Please try again.',
          intent: 'ERROR',
          status: null,
        }
        return next
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (actionId: number): Promise<void> => {
    if (confirmActionId !== actionId) {
      setConfirmActionId(actionId)
      return
    }

    try {
      const res = await axios.post<{ success: boolean; message: string }>(`${API_BASE}/approve-action/${actionId}`)
      showToast(res.data.message, 'success')
      fetchPendingActions()
      fetchAuditLog()
      setConfirmActionId(null)

      setMessages(prev =>
        prev.map(msg =>
          msg.pending_action_id === actionId ? { ...msg, intent: 'WRITE_APPROVED' } : msg
        )
      )
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: string }>
      const errMsg = axiosErr.response?.data?.detail ?? 'Failed to approve action'
      showToast(errMsg, 'error')
    }
  }

  const handleReject = async (actionId: number): Promise<void> => {
    try {
      await axios.post(`${API_BASE}/reject-action/${actionId}`)
      showToast('Action rejected', 'success')
      fetchPendingActions()
      setMessages(prev =>
        prev.map(msg =>
          msg.pending_action_id === actionId ? { ...msg, intent: 'WRITE_REJECTED' } : msg
        )
      )
    } catch {
      showToast('Failed to reject action', 'error')
    }
  }

  const cancelApprove = (): void => {
    setConfirmActionId(null)
  }

  const handleResetDb = async (): Promise<void> => {
    setIsLoading(true)
    try {
      await axios.post(`${API_BASE}/reset-db`)
      showToast('Database reset successfully! Reloading...', 'success')
      setTimeout(() => window.location.reload(), 1500)
    } catch {
      showToast('Failed to reset database', 'error')
      setIsLoading(false)
    }
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
            <Sparkles size={18} color="white" />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Sports Facility AI Copilot</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Kota Badminton Academy</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleResetDb}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border"
            style={{ background: 'transparent', color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--bg-card-hover)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Reset Demo DB
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10b981' }} />
            <span className="text-xs font-medium" style={{ color: '#10b981' }}>AI Active</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — Chat */}
        <div className="flex flex-col" style={{ width: '60%', borderRight: '1px solid var(--border-subtle)' }}>
          <ChatWindow
            messages={messages}
            onSendMessage={sendMessage}
            isLoading={isLoading}
            pendingActions={pendingActions}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        </div>

        {/* Right panel — Approvals & Audit */}
        <div className="flex flex-col" style={{ width: '40%', background: 'var(--bg-secondary)' }}>
          {/* Tabs */}
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
            <button
              id="tab-approvals"
              className={`tab ${activeTab === 'approvals' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('approvals')}
            >
              <span className="flex items-center gap-1.5">
                <Shield size={14} />
                Approvals
                {pendingActions.length > 0 && (
                  <span className="ml-1 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: 'var(--gradient-primary)' }}>
                    {pendingActions.length}
                  </span>
                )}
              </span>
            </button>
            <button
              id="tab-audit"
              className={`tab ${activeTab === 'audit' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('audit')}
            >
              <span className="flex items-center gap-1.5">
                <ScrollText size={14} />
                Audit Log
              </span>
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'approvals' ? (
              <PendingApprovals
                actions={pendingActions}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ) : (
              <AuditLog entries={auditLog} />
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.message}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmActionId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in">
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 rounded-2xl shadow-lg w-full max-w-sm">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Confirm Action</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              Are you sure you want to execute this change? This will update the database permanently.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-sm font-medium rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] transition-colors"
                onClick={cancelApprove}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm font-bold rounded-lg text-white"
                style={{ background: 'var(--gradient-primary)' }}
                onClick={() => handleApprove(confirmActionId)}
              >
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
