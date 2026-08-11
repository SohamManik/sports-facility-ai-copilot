import { useState, useRef, useEffect } from 'react'
import MessageBubble from './MessageBubble'
import { Send, Command, Mic, Loader2 } from 'lucide-react'
import type { Message, PendingAction, DisambiguationContext } from '../types'
import axios from 'axios'

// Hardcoded for portfolio production deployment
const API_BASE = 'https://sports-facility-ai-copilot.onrender.com'

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
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const formData = new FormData()
        formData.append('file', audioBlob, 'recording.webm')
        
        setIsTranscribing(true)
        try {
          const res = await axios.post(`${API_BASE}/transcribe`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
          if (res.data.text) {
            setInput(prev => (prev + ' ' + res.data.text).trim())
          }
        } catch (err) {
          console.error("Transcription failed", err)
        } finally {
          setIsTranscribing(false)
          stream.getTracks().forEach(track => track.stop())
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error("Microphone access denied or error:", err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
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
            type="button"
            className={`btn flex items-center justify-center p-2 rounded-lg transition-colors ${isRecording ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'}`}
            onClick={handleMicClick}
            disabled={isLoading || isTranscribing}
            title={isRecording ? "Stop recording" : "Record voice message"}
          >
            {isTranscribing ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} className={isRecording ? "animate-pulse" : ""} />}
          </button>
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
