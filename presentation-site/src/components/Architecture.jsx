import { Server, Database, MessageSquare, Route, CheckCircle2, ShieldAlert } from 'lucide-react'

export default function Architecture() {
  return (
    <section id="architecture" className="border-t border-[var(--border-subtle)] bg-[rgba(0,0,0,0.3)]">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Architecture & Agents</h2>
          <p className="section-subtitle mx-auto">
            HobbyFi Copilot doesn't rely on a single massive LLM prompt. It routes messages to specialized sub-agents based on mathematical intent classification.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-center justify-center mb-20 relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-1/2 left-20 right-20 h-px bg-[var(--border-active)] -z-10 border-dashed border-b"></div>

          {/* Step 1 */}
          <div className="glass-card p-6 w-full max-w-xs text-center z-10">
            <div className="w-10 h-10 mx-auto rounded-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center mb-4">
              <MessageSquare size={16} />
            </div>
            <h4 className="font-bold text-white mb-2">1. Message Recieved</h4>
            <p className="text-xs text-[var(--text-secondary)]">User asks a question via SSE stream.</p>
          </div>

          <div className="md:hidden w-px h-8 bg-[var(--border-active)]"></div>

          {/* Step 2 */}
          <div className="glass-card p-6 w-full max-w-xs text-center z-10 border-[var(--accent-green)] shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <div className="w-10 h-10 mx-auto rounded-full bg-[var(--accent-green-dim)] border border-[var(--accent-green)] flex items-center justify-center mb-4">
              <Route size={16} className="text-[var(--accent-green)]" />
            </div>
            <h4 className="font-bold text-white mb-2">2. Orchestrator</h4>
            <p className="text-xs text-[var(--text-secondary)]">Classifies intent into READ, WRITE, or CONVERSATIONAL.</p>
          </div>

          <div className="md:hidden w-px h-8 bg-[var(--border-active)]"></div>

          {/* Step 3 */}
          <div className="glass-card p-6 w-full max-w-xs text-center z-10">
            <div className="w-10 h-10 mx-auto rounded-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center mb-4">
              <Server size={16} />
            </div>
            <h4 className="font-bold text-white mb-2">3. Specialized Agent</h4>
            <p className="text-xs text-[var(--text-secondary)]">Generates scoped SQL and formats the result.</p>
          </div>
        </div>

        {/* Agents Code Cards */}
        <div className="grid-2 mt-12">
          <div className="glass-card overflow-hidden flex flex-col">
            <div className="bg-[#0f0f11] px-4 py-2 border-b border-[var(--border-subtle)] flex items-center gap-2 font-mono text-xs text-[var(--text-muted)]">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              query_agent.py
            </div>
            <div className="p-6 flex-1">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 size={16} className="text-[var(--accent-green)]" />
                <h4 className="font-bold text-white">The Query Agent (READ)</h4>
              </div>
              <ul className="space-y-3 text-sm text-[var(--text-secondary)] mb-6 list-disc pl-5">
                <li>Translates questions into SQL <code className="text-[var(--accent-green)] font-mono text-[11px] bg-[rgba(16,185,129,0.1)] px-1 rounded">SELECT</code> statements.</li>
                <li>Forces row-level tenancy at the prompt level.</li>
                <li>Truncates large results (max 25 rows).</li>
                <li>Passes outputs through a PII mask before streaming.</li>
              </ul>
              
              <div className="bg-[#0f0f11] rounded-lg p-3 font-mono text-[11px] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                <span className="text-purple-400">SELECT</span> name, email <span className="text-purple-400">FROM</span> users <br/>
                <span className="text-purple-400">WHERE</span> sport_preference = <span className="text-yellow-300">'badminton'</span><br/>
                <span className="bg-[rgba(16,185,129,0.2)] text-[var(--accent-green)] py-0.5 px-1 rounded">AND vendor_id = 42</span> <span className="opacity-50">-- Forced tenancy clause</span>
              </div>
            </div>
          </div>

          <div className="glass-card overflow-hidden flex flex-col">
            <div className="bg-[#0f0f11] px-4 py-2 border-b border-[var(--border-subtle)] flex items-center gap-2 font-mono text-xs text-[var(--text-muted)]">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              action_agent.py
            </div>
            <div className="p-6 flex-1">
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert size={16} className="text-[var(--accent-amber)]" />
                <h4 className="font-bold text-white">The Action Agent (WRITE)</h4>
              </div>
              <ul className="space-y-3 text-sm text-[var(--text-secondary)] mb-6 list-disc pl-5">
                <li>Translates mutation requests into <code className="text-[var(--accent-amber)] font-mono text-[11px] bg-[rgba(245,158,11,0.1)] px-1 rounded">UPDATE</code> statements.</li>
                <li>Calculates the precise JSON diff for the frontend.</li>
                <li>Saves the request to the <code className="text-[var(--text-muted)] font-mono text-[11px]">pending_actions</code> table instead of executing it.</li>
                <li>Cannot touch users or audit log tables.</li>
              </ul>
              
              <div className="bg-[#0f0f11] rounded-lg p-3 font-mono text-[11px] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                <span className="opacity-50"># Returns a proposal to the frontend:</span><br/>
                &#123;<br/>
                &nbsp;&nbsp;<span className="text-blue-300">"action_type"</span>: <span className="text-yellow-300">"EXTEND_TRIAL"</span>,<br/>
                &nbsp;&nbsp;<span className="text-blue-300">"proposed_state"</span>: &#123;<span className="text-blue-300">"end_date"</span>: <span className="text-yellow-300">"2026-07-17"</span>&#125;,<br/>
                &nbsp;&nbsp;<span className="text-blue-300">"human_readable"</span>: <span className="text-yellow-300">"Extend Priya's trial to July 17"</span><br/>
                &#125;
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
