import { Eye, ShieldAlert } from 'lucide-react'

export default function Philosophy() {
  return (
    <section id="philosophy" className="border-t border-[var(--border-subtle)] relative overflow-hidden">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Core Philosophy</h2>
          <p className="section-subtitle mx-auto">
            HobbyFi Copilot was built on a single, uncompromising principle: AI should have unrestricted read access to answer questions, but zero direct write access to change data.
          </p>
        </div>

        <div className="grid-2">
          {/* Optimistic Reads */}
          <div className="glass-card p-8 relative overflow-hidden group hover:border-[var(--accent-green)] transition-colors duration-500">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Eye size={120} color="var(--accent-green)" />
            </div>
            
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-green-dim)] border border-[rgba(16,185,129,0.3)] flex items-center justify-center mb-6">
              <Eye size={24} className="text-[var(--accent-green)]" />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-3">Optimistic Reads</h3>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6">
              When a vendor asks for data ("Show my revenue for July"), the Copilot translates it to safe SQL, executes it instantly, formats it as a markdown table, and streams the result. Speed is the priority.
            </p>
            
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li className="flex items-center gap-2"><span className="text-[var(--accent-green)]">✓</span> Instant execution</li>
              <li className="flex items-center gap-2"><span className="text-[var(--accent-green)]">✓</span> Strict tenant isolation</li>
              <li className="flex items-center gap-2"><span className="text-[var(--accent-green)]">✓</span> PII masking applied automatically</li>
            </ul>
          </div>

          {/* Pessimistic Writes */}
          <div className="glass-card p-8 relative overflow-hidden group hover:border-[var(--accent-amber)] transition-colors duration-500">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <ShieldAlert size={120} color="var(--accent-amber)" />
            </div>
            
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-amber-dim)] border border-[rgba(245,158,11,0.3)] flex items-center justify-center mb-6">
              <ShieldAlert size={24} className="text-[var(--accent-amber)]" />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-3">Pessimistic Writes</h3>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed mb-6">
              When a vendor requests a change ("Cancel Rohan's trial"), the AI never mutates the database. It generates a <span className="font-mono text-xs text-white">proposed_state</span> diff. The vendor must explicitly approve the proposal. Safety is the priority.
            </p>
            
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li className="flex items-center gap-2"><span className="text-[var(--accent-amber)]">✓</span> Zero direct DB mutation</li>
              <li className="flex items-center gap-2"><span className="text-[var(--accent-amber)]">✓</span> 2-step human-in-the-loop approval</li>
              <li className="flex items-center gap-2"><span className="text-[var(--accent-amber)]">✓</span> Every action permanently audited</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
