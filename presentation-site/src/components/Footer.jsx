import { Code2, Github } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] py-12">
      <div className="container flex flex-col md:flex-row items-center justify-between gap-6">
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-green-dim)] border border-[var(--accent-green)] flex items-center justify-center">
            <Code2 size={16} className="text-[var(--accent-green)]" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">HobbyFi Copilot</h4>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Architecture Demo</p>
          </div>
        </div>

        <div className="text-sm text-[var(--text-secondary)]">
          Built for the HobbyFi Vendor Portal
        </div>

        <div className="flex items-center gap-4">
          <button className="btn btn-secondary py-2 px-4 text-xs" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Back to Top
          </button>
        </div>
      </div>
    </footer>
  )
}
