import { Bot, User, Clock, AlertTriangle, Lightbulb, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message, PendingAction, DisambiguationContext } from '../types'

interface MessageBubbleProps {
  message: Message
  onSelectDisambiguation: (text: string, context: DisambiguationContext) => void
  pendingAction: PendingAction | null | undefined
  onApprove: (id: number) => void
  onReject: (id: number) => void
}

function renderDiff(currentStr: string | null, proposedStr: string | null): React.ReactNode {
  if (!currentStr) return null
  try {
    const curr = JSON.parse(currentStr) as Record<string, unknown>
    const prop = proposedStr ? (JSON.parse(proposedStr) as Record<string, unknown>) : curr
    const keys = Object.keys(curr).filter(k => k !== 'id' && k !== 'user_id' && k !== 'vendor_id')

    return (
      <div className="mb-4 mt-3">
        <div className="grid grid-cols-2 gap-2 text-[10px] mb-1.5 px-2 font-semibold tracking-wider" style={{ color: 'var(--text-muted)' }}>
          <div>CURRENT STATE</div>
          <div>PROPOSED STATE</div>
        </div>
        <div className="rounded-lg overflow-hidden font-mono text-xs" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          {keys.map(k => {
            const val1 = curr[k]
            const val2 = prop[k]
            const isChanged = val1 !== val2
            if (!isChanged && (k === 'created_at' || val1 === null)) return null

            return (
              <div key={k} className="grid grid-cols-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="p-2 flex flex-col justify-center" style={{
                  background: isChanged ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                  color: isChanged ? 'var(--accent-red)' : 'var(--text-secondary)',
                  borderRight: '1px solid var(--border-subtle)'
                }}>
                  <span style={{ opacity: 0.5, fontSize: 9, textTransform: 'uppercase', marginBottom: 2 }}>{k}</span>
                  <span className="truncate">{String(val1)}</span>
                </div>
                <div className="p-2 flex flex-col justify-center" style={{
                  background: isChanged ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                  color: isChanged ? 'var(--accent-green)' : 'var(--text-secondary)',
                  fontWeight: isChanged ? 600 : 400
                }}>
                  <span style={{ opacity: 0.5, fontSize: 9, textTransform: 'uppercase', marginBottom: 2 }}>{k}</span>
                  <span className="truncate">{String(val2)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  } catch {
    return null
  }
}

export default function MessageBubble({ message, onSelectDisambiguation, pendingAction, onApprove, onReject }: MessageBubbleProps) {
  const isVendor = message.role === 'vendor'
  const isWrite = message.intent === 'WRITE'
  const isWriteApproved = message.intent === 'WRITE_APPROVED'
  const isWriteRejected = message.intent === 'WRITE_REJECTED'
  const isBlocked = message.intent === 'BLOCKED' || message.intent === 'OUT_OF_SCOPE'
  const isInsight = message.intent === 'PROACTIVE_INSIGHT'
  const hasDisambiguation = message.intent === 'AMBIGUOUS' && message.disambiguationOptions

  const isLoading = !message.text && !!message.status

  return (
    <div className={`flex items-start gap-3 animate-fade-in ${isVendor ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: isLoading ? 'transparent' : (isVendor ? 'var(--gradient-primary)' : 'var(--bg-secondary)'),
          border: isLoading ? 'none' : (isVendor ? 'none' : '1px solid var(--border-subtle)')
        }}
      >
        {!isLoading && (
          isVendor ? <User size={14} color="var(--text-primary)" /> : <Bot size={14} color="var(--text-primary)" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] text-sm leading-relaxed ${
          isLoading ? 'flex items-center gap-2 mt-1.5' : 'px-4 py-3 ' + (isVendor
            ? 'rounded-tl-2xl rounded-b-2xl'
            : 'rounded-tr-2xl rounded-b-2xl')
        }`}
        style={{
          background: isLoading ? 'transparent' : (isVendor ? 'var(--gradient-primary)' : 'var(--bg-secondary)'),
          border: isLoading ? 'none' : (isVendor ? 'none' : '1px solid var(--border-subtle)'),
          color: 'var(--text-primary)',
          wordBreak: 'break-word',
        }}
      >
        {isLoading && (
          <>
            <Loader2 size={16} className="animate-spin" style={{ color: '#d97706' }} />
            <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{message.status}</span>
          </>
        )}

        {isInsight && (
          <div className="flex items-center gap-1.5 font-semibold mb-2" style={{ color: '#d97706', fontSize: 13 }}>
            <Lightbulb size={14} />
            Proactive Insight
          </div>
        )}

        {/* Render text as markdown */}
        <div className="msg-markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text || ''}</ReactMarkdown>
        </div>

        {/* Intent badges */}
        {isWrite && (
          <div className="mt-2">
            {!pendingAction && (
              <span className="badge badge-pending">
                <Clock size={10} className="mr-1" />
                Pending Approval
              </span>
            )}
            {pendingAction && (
              <div className="mt-3 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge badge-pending">Needs Approval</span>
                </div>
                <p className="text-sm font-medium text-[var(--text-primary)] mb-2">
                  {pendingAction.human_readable}
                </p>
                {renderDiff(pendingAction.current_state, pendingAction.proposed_state)}
                <div className="flex items-center gap-2 mt-3">
                  <button className="btn btn-approve flex-1" onClick={() => onApprove(pendingAction.id)}>
                    <CheckCircle2 size={14} /> Approve
                  </button>
                  <button className="btn btn-reject flex-1" onClick={() => onReject(pendingAction.id)}>
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {isWriteApproved && (
          <div className="mt-2">
            <span className="badge badge-green">
              <CheckCircle2 size={10} className="mr-1" />
              Action Approved
            </span>
          </div>
        )}
        {isWriteRejected && (
          <div className="mt-2">
            <span className="badge badge-red">
              <XCircle size={10} className="mr-1" />
              Action Rejected
            </span>
          </div>
        )}
        {isBlocked && (
          <div className="mt-2">
            <span className="badge badge-red">
              <AlertTriangle size={10} className="mr-1" />
              Blocked
            </span>
          </div>
        )}

        {/* Disambiguation Options */}
        {hasDisambiguation && message.disambiguationOptions && (
          <div className="mt-3 flex flex-col gap-2">
            {message.disambiguationOptions.map(opt => (
              <button
                key={opt.id}
                className="text-left text-sm px-3 py-2 rounded-lg transition-colors"
                style={{
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card-hover)'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-active)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card)'
                  ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-subtle)'
                }}
                onClick={() => {
                  if (onSelectDisambiguation && message.disambiguationContext) {
                    onSelectDisambiguation('', {
                      ...message.disambiguationContext,
                      selected_user_id: opt.id,
                      selected_user_name: opt.description,
                    })
                  }
                }}
              >
                {opt.description}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
