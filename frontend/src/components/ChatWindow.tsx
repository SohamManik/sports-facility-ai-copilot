import { useState, useRef, useEffect } from 'react'
import MessageBubble from './MessageBubble'
import { Send, Command } from 'lucide-react'
import type { Message, PendingAction, DisambiguationContext } from '../types'

interface SlashCommand {
  cmd: string
  desc: string
}

interface ChatWindowProps {
  messages: Message[]
  onSendMessage: (text: string, context?: DisambiguationContext) => void
  isLoading: boolean
  pendingActions: PendingAction[]
  onApprove: (id: number) => void
  onReject: (id: number) => void
}

const slashCommands: SlashCommand[] = [
  { cmd: '/revenue', desc: "Today's revenue breakdown" },
  { cmd: '/trials', desc: 'Active trials expiring this week' },
]

const suggestedPrompts = ['Revenue today', 'Expiring trials', 'Recent bookings']

export default function ChatWindow({
  messages,
  onSendMessage,
  isLoading,
  pendingActions,
  onApprove,
  onReject,
}: ChatWindowProps) {
  const [input, setInput] = useState<string>('')
  const [showCommands, setShowCommands] = useState<boolean>(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    inputRef.current?.focus()
  }, [isLoading])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value
    setInput(val)
    setShowCommands(val.startsWith('/'))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    onSendMessage(input.trim())
    setInput('')
    setShowCommands(false)
  }

  const handleCommandClick = (cmd: string): void => {
    onSendMessage(cmd)
    setInput('')
    setShowCommands(false)
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ background: 'var(--bg-primary)' }}>
        {messages.map((msg, i) => {
          const action = msg.pending_action_id && pendingActions
            ? pendingActions.find(a => a.id === msg.pending_action_id) ?? null
            : null
          return (
            <MessageBubble
              key={i}
              message={msg}
              onSelectDisambiguation={onSendMessage}
              pendingAction={action}
              onApprove={onApprove}
              onReject={onReject}
            />
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts & Input bar */}
      <div className="px-5 py-4" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
        {/* Suggested Prompts */}
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestedPrompts.map((prompt, idx) => (
            <button
              key={idx}
              className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors border"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                borderColor: 'var(--border-subtle)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--bg-card-hover)'
                e.currentTarget.style.color = 'var(--text-primary)'
                e.currentTarget.style.borderColor = 'var(--border-active)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--bg-secondary)'
                e.currentTarget.style.color = 'var(--text-secondary)'
                e.currentTarget.style.borderColor = 'var(--border-subtle)'
              }}
              onClick={() => handleCommandClick(prompt)}
              disabled={isLoading}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Slash command popup */}
        {showCommands && (
          <div
            className="absolute left-5 right-5 bottom-[110px] rounded-xl shadow-lg p-2 animate-fade-in z-10"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="text-xs font-semibold mb-2 px-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Slash Commands
            </div>
            {slashCommands.map(c => (
              <button
                key={c.cmd}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onClick={() => handleCommandClick(c.cmd)}
              >
                <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <Command size={12} style={{ color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.cmd}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.desc}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <input
            ref={inputRef}
            id="chat-input"
            type="text"
            className="chat-input"
            value={input}
            onChange={handleChange}
            placeholder="Ask about revenue, bookings, trials, or type / for commands..."
            disabled={isLoading}
            maxLength={500}
          />
          <button
            id="send-button"
            type="submit"
            className="btn btn-send"
            disabled={!input.trim() || isLoading}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}
