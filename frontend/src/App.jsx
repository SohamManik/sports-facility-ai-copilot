import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import ChatWindow from './components/ChatWindow'
import PendingApprovals from './components/PendingApprovals'
import AuditLog from './components/AuditLog'
import { Sparkles, Shield, ScrollText } from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

export default function App() {
  // Auth state
  const [vendor, setVendor] = useState({
    id: 1,
    name: "Kota Badminton Academy",
    token: "mock-token"
  })

  const [messages, setMessages] = useState([
    {
      role: 'copilot',
      text: 'Welcome to Sports Facility AI Copilot! I\'m your AI assistant for Kota Badminton Academy. Ask me about revenue, bookings, memberships, trials — or request changes and I\'ll prepare them for your approval.',
      intent: 'SYSTEM'
    }
  ])
  const [pendingActions, setPendingActions] = useState([])
  const [auditLog, setAuditLog] = useState([])
  const [activeTab, setActiveTab] = useState('approvals')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(() => generateId())
  const [toast, setToast] = useState(null)
  const [confirmActionId, setConfirmActionId] = useState(null)
  const insightsFetched = useRef(false)  // Guard against StrictMode double-fetch

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const fetchPendingActions = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/pending-actions`)
      setPendingActions(res.data)
    } catch (err) {
      console.error('Failed to fetch pending actions:', err)
    }
  }, [])

  const fetchAuditLog = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/audit-log`)
      setAuditLog(res.data)
    } catch (err) {
      console.error('Failed to fetch audit log:', err)
    }
  }, [])

  const fetchInsights = useCallback(async () => {
    if (insightsFetched.current) return  // Prevent StrictMode double-call
    insightsFetched.current = true
    try {
      const res = await axios.get(`${API_BASE}/insights`)
      if (res.data.has_insights) {
        setMessages(prev => [...prev, {
          role: 'copilot',
          text: res.data.message,
          intent: 'PROACTIVE_INSIGHT'
        }])
      }
    } catch (err) {
      console.error('Failed to fetch insights:', err)
      insightsFetched.current = false  // Allow retry on error
    }
  }, [])

  // Fetch on mount (only when authenticated)
  useEffect(() => {
    if (!vendor) return
    fetchAuditLog()
    fetchInsights()
  }, [vendor, fetchAuditLog, fetchInsights])

  // Poll pending actions every 5 seconds
  useEffect(() => {
    if (!vendor) return
    fetchPendingActions()
    const interval = setInterval(fetchPendingActions, 5000)
    return () => clearInterval(interval)
  }, [vendor, fetchPendingActions])

  const sendMessage = async (text, disambiguationContext = null) => {
    let displayText = text
    if (disambiguationContext) {
      displayText = `Selected: ${disambiguationContext.selected_user_name}`
    }

    setMessages(prev => [
      ...prev,
      { role: 'vendor', text: displayText, intent: '' },
      { role: 'copilot', text: '', intent: '', status: 'Thinking...' }
    ])
    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: sessionId,
          disambiguation_context: disambiguationContext
        })
      })

      const contentType = response.headers.get('content-type') || ''

      if (!response.ok) {
        let errMsg = 'Something went wrong on the server.'
        if (contentType.includes('application/json')) {
          const errData = await response.json()
          errMsg = errData.detail || errData.response || errMsg
        }
        setMessages(prev => {
          const newMsg = [...prev]
          const lastIdx = newMsg.length - 1
          newMsg[lastIdx] = { ...newMsg[lastIdx], text: errMsg, intent: 'CONVERSATIONAL', status: null }
          return newMsg
        })
        setIsLoading(false)
        return
      }

      if (contentType.includes('application/json')) {
        // JSON response — errors, guardrail blocks, disambiguation
        const data = await response.json()

        setMessages(prev => {
          const newMsg = [...prev]
          const lastIdx = newMsg.length - 1
          // Deep-clone to avoid StrictMode double-mutation
          const updated = { ...newMsg[lastIdx] }
          updated.text = data.response
          updated.intent = data.intent
          updated.pending_action_id = data.pending_action_id
          updated.status = null

          if (data.disambiguation_options) {
            updated.disambiguationOptions = data.disambiguation_options
            updated.disambiguationContext = data.disambiguation_context
          }
          newMsg[lastIdx] = updated
          return newMsg
        })

        if (data.pending_action_id) {
          fetchPendingActions()
          setActiveTab('approvals')
        }

      } else {
        // SSE stream — normal READ/WRITE responses
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let done = false

        while (!done) {
          const { value, done: doneReading } = await reader.read()
          done = doneReading
          if (value) {
            const chunk = decoder.decode(value, { stream: true })
            const events = chunk.split('\n\n')

            for (const event of events) {
              if (event.startsWith('data: ')) {
                try {
                  const dataStr = event.slice(6)
                  const payload = JSON.parse(dataStr)

                  setMessages(prev => {
                    const newMsg = [...prev]
                    const lastIdx = newMsg.length - 1
                    // Deep-clone the last message to prevent StrictMode double-mutation
                    const updated = { ...newMsg[lastIdx] }

                    if (payload.type === 'status') {
                      updated.status = payload.data
                    } else if (payload.type === 'token') {
                      updated.text = (updated.text || '') + payload.data
                      updated.status = null
                    } else if (payload.type === 'message') {
                      if (!updated.text && payload.data.response) {
                        updated.text = payload.data.response
                      }
                      updated.intent = payload.data.intent
                      updated.pending_action_id = payload.data.pending_action_id
                      updated.status = null
                    }

                    newMsg[lastIdx] = updated
                    return newMsg
                  })

                  if (payload.type === 'message' && payload.data.pending_action_id) {
                    fetchPendingActions()
                    setActiveTab('approvals')
                  }
                } catch (e) {
                  // Ignore parse errors from incomplete chunks
                }
              }
            }
          }
        }
      }
    } catch (err) {
      setMessages(prev => {
        const newMsg = [...prev]
        const updated = { ...newMsg[newMsg.length - 1] }
        updated.text = 'Sorry, I encountered an error. Please try again.'
        updated.intent = 'ERROR'
        updated.status = null
        newMsg[newMsg.length - 1] = updated
        return newMsg
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (actionId) => {
    // If not confirmed yet, just open the modal
    if (confirmActionId !== actionId) {
      setConfirmActionId(actionId)
      return
    }

    try {
      const res = await axios.post(`${API_BASE}/approve-action/${actionId}`)
      showToast(res.data.message, 'success')
      fetchPendingActions()
      fetchAuditLog()
      
      setConfirmActionId(null)

      // Update chat badge
      setMessages(prev => prev.map(msg => 
        msg.pending_action_id === actionId 
          ? { ...msg, intent: 'WRITE_APPROVED' } 
          : msg
      ))
    } catch (err) {
      showToast('Failed to approve action', 'error')
    }
  }

  const handleReject = async (actionId) => {
    try {
      await axios.post(`${API_BASE}/reject-action/${actionId}`)
      showToast('Action rejected', 'success')
      fetchPendingActions()
      
      // Update chat badge
      setMessages(prev => prev.map(msg => 
        msg.pending_action_id === actionId 
          ? { ...msg, intent: 'WRITE_REJECTED' } 
          : msg
      ))
    } catch (err) {
      showToast('Failed to reject action', 'error')
    }
  }

  const cancelApprove = () => {
    setConfirmActionId(null)
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
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10b981' }}></div>
            <span className="text-xs font-medium" style={{ color: '#10b981' }}>AI Active</span>
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
      {confirmActionId && (
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
