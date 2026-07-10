import { FileText, Clock, CheckCircle } from 'lucide-react'

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function getBadgeConfig(actionType) {
  const type = (actionType || '').toUpperCase()
  if (type.includes('EXTEND')) return { label: 'EXTEND', className: 'badge-blue' }
  if (type.includes('CANCEL')) return { label: 'CANCEL', className: 'badge-red' }
  return { label: type.replace(/_/g, ' '), className: 'badge-amber' }
}

export default function AuditLog({ entries }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-12">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)' }}>
          <FileText size={24} style={{ color: 'var(--text-secondary)' }} />
        </div>
        <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No audit entries yet</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Approved actions will be logged here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const badge = getBadgeConfig(entry.action_type)
        return (
          <div
            key={entry.id}
            className="glass-card-sm p-3 flex items-start gap-3 animate-fade-in"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
              <CheckCircle size={14} style={{ color: 'var(--accent-green)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`badge ${badge.className}`} style={{ fontSize: '10px', padding: '1px 8px' }}>
                  {badge.label}
                </span>
              </div>
              <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                {entry.description}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Clock size={10} style={{ color: 'var(--text-muted)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {formatTime(entry.executed_at)}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
