import { useState, useRef, useEffect } from 'react'
import MessageBubble from './MessageBubble'
import { Send, Loader2, Command, Mic, Square } from 'lucide-react'

export default function ChatWindow({ messages, onSendMessage, isLoading, pendingActions, onApprove, onReject }) {
  const [input, setInput] = useState('')
  const [showCommands, setShowCommands] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)

  const slashCommands = [
    { cmd: '/revenue', desc: "Today's revenue breakdown" },
    { cmd: '/trials', desc: "Active trials expiring this week" }
  ]

  const suggestedPrompts = [
    "Revenue today",
    "Expiring trials",
    "Recent bookings"
  ]

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    inputRef.current?.focus()
  }, [isLoading])

  const handleChange = (e) => {
    const val = e.target.value
    setInput(val)
    setShowCommands(val.startsWith('/'))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    onSendMessage(input.trim())
    setInput('')
    setShowCommands(false)
  }

  const handleCommandClick = (cmd) => {
    onSendMessage(cmd)
    setInput('')
    setShowCommands(false)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      const chunks = []
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }
      
      mediaRecorderRef.current.onstop = async () => {
        setIsTranscribing(true)
        const blob = new Blob(chunks, { type: 'audio/webm' })
        const formData = new FormData()
        formData.append('file', blob, 'audio.webm')
        
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/transcribe`, {
            method: 'POST',
            body: formData
          })
          const data = await res.json()
          if (data.text) {
            setInput(prev => prev + (prev ? ' ' : '') + data.text)
          }
        } catch (err) {
          console.error("Transcription failed:", err)
        } finally {
          setIsTranscribing(false)
          stream.getTracks().forEach(track => track.stop())
        }
      }
      
      mediaRecorderRef.current.start()
      setIsRecording(true)
    } catch (err) {
      console.error("Microphone access denied:", err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ background: 'var(--bg-primary)' }}>
        {messages.map((msg, i) => {
          const action = msg.pending_action_id && pendingActions ? pendingActions.find(a => a.id === msg.pending_action_id) : null;
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
                borderColor: 'var(--border-subtle)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--bg-card-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.borderColor = 'var(--border-active)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--bg-secondary)';
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
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
          <div className="absolute left-5 right-5 bottom-[110px] rounded-xl shadow-lg p-2 animate-fade-in z-10"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <div className="text-xs font-semibold mb-2 px-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Slash Commands</div>
            {slashCommands.map(c => (
              <button
                key={c.cmd}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
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
          <button
            type="button"
            className={`p-3 rounded-xl transition-all ${isRecording ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading || isTranscribing}
            title={isRecording ? "Stop recording" : "Voice input"}
          >
            {isTranscribing ? <Loader2 size={16} className="animate-spin" /> : isRecording ? <Square size={16} /> : <Mic size={16} />}
          </button>
        </form>
      </div>
    </div>
  )
}
