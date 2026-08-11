import { CheckCircle2, XCircle, Clock, AlertTriangle, User, Shield } from 'lucide-react'
import type { PendingAction } from '../types'

interface PendingApprovalsProps {
  actions: PendingAction[]
  onApprove: (id: number) => void
  onReject: (id: number) => void
}

interface BadgeConfig {
  label: string
  className: string
}

function getTimeSince(dateStr: string): string {
  if (!dateStr) return ''
  const now = new Date()
  const then = new Date(dateStr)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} min ago`
  const diffHrs = Math.floor(diffMins / 60)
  return `${diffHrs}h ago`
}

function getBadgeConfig(actionType: string): BadgeConfig {
  const type = (actionType || '').toUpperCase()
  if (type.includes('EXTEND')) return { label: 'EXTEND TRIAL', className: 'badge-blue' }
  if (type.includes('CANCEL')) return { label: 'CANCEL', className: 'badge-red' }
  return { label: actionType?.replace(/_/g, ' ') || 'UPDATE', className: 'badge-amber' }
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
        <div className="rounded-lg overflow-hidden font-mono text-xs" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
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
                  borderRight: '1px solid var(--border-subtle)',
                }}>
                  <span style={{ opacity: 0.5, fontSize: 9, textTransform: 'uppercase', marginBottom: 2 }}>{k}</span>
                  <span className="truncate">{String(val1)}</span>
                </div>
                <div className="p-2 flex flex-col justify-center" style={{
                  background: isChanged ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                  color: isChanged ? 'var(--accent-green)' : 'var(--text-secondary)',
                  fontWeight: isChanged ? 600 : 400,
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

export default function PendingApprovals({ actions, onApprove, onReject }: PendingApprovalsProps) {
  if (!actions || actions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-12">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <Shield size={24} style={{ color: 'var(--accent-green)' }} />
        </div>
        <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No pending actions</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>All clear! New proposals will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {actions.map((action) => {
        const badge = getBadgeConfig(action.action_type)
        return (
          <div
            key={action.id}
            className="glass-card-sm p-4 animate-slide-up"
            style={{ transition: 'all 0.2s ease' }}
          >
            {/* Action type badge */}
            <div className="flex items-center justify-between mb-3">
              <span className={`badge ${badge.className}`}>{badge.label}</span>
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Clock size={11} />
                {getTimeSince(action.created_at)}
              </span>
            </div>

            {/* Description */}
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)', lineHeight: '1.5' }}>
              {action.human_readable}
            </p>

            {/* Diff View */}
            {renderDiff(action.current_state, action.proposed_state)}

            {/* Affected user */}
            {action.affected_user && (
              <div className="flex items-center gap-1.5 mb-3">
                <User size={12} style={{ color: 'var(--text-muted)' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{action.affected_user}</span>
              </div>
            )}

            {/* Warning */}
            <div className="flex items-start gap-2 mb-3 px-3 py-2 rounded-lg mt-2" style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <AlertTriangle size={13} style={{ color: 'var(--accent-amber)', marginTop: 2, flexShrink: 0 }} />
              <p className="text-xs" style={{ color: 'var(--accent-amber)' }}>
                Review the changes carefully. Approving will update the database permanently.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              <button
                id={`approve-${action.id}`}
                className="btn btn-approve flex-1"
                onClick={() => onApprove(action.id)}
              >
                <CheckCircle2 size={14} />
                Approve
              </button>
              <button
                id={`reject-${action.id}`}
                className="btn btn-reject flex-1"
                onClick={() => onReject(action.id)}
              >
                <XCircle size={14} />
                Reject
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
