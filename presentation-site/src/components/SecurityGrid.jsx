import { Shield, FileCheck2, Filter, Key, ScrollText, DatabaseZap } from 'lucide-react'

export default function SecurityGrid() {
  const specs = [
    {
      icon: <Filter size={20} className="text-[var(--accent-green)]" />,
      title: "Row-Level Tenancy",
      desc: "Vendor ID is injected strictly at the prompt level. AI is mathematically forced to append AND vendor_id = X to every query."
    },
    {
      icon: <FileCheck2 size={20} className="text-[var(--accent-green)]" />,
      title: "SQL Validation",
      desc: "Every generated query passes through a Python AST validator to block DROP, DELETE, or out-of-scope commands before execution."
    },
    {
      icon: <Shield size={20} className="text-[var(--accent-green)]" />,
      title: "Action Whitelisting",
      desc: "The Action Agent is restricted to a tight schema. It literally cannot touch the users or vendors tables, only transactions."
    },
    {
      icon: <Key size={20} className="text-[var(--accent-green)]" />,
      title: "PII Masking",
      desc: "Guardrails AI sits between the DB and the client, automatically masking emails and phone numbers before they stream."
    },
    {
      icon: <ScrollText size={20} className="text-[var(--accent-green)]" />,
      title: "Immutable Audit Log",
      desc: "Every approved mutation writes a permanent record (actor, current state, proposed state, timestamp) to the audit ledger."
    },
    {
      icon: <DatabaseZap size={20} className="text-[var(--accent-green)]" />,
      title: "DB-Backed Auth",
      desc: "Stateless JWT-style auth layer on the frontend verified against the real vendor credentials in the backend SQLite DB."
    }
  ]

  return (
    <section id="security" className="border-t border-[var(--border-subtle)] bg-[#050505]">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Security & Guardrails</h2>
          <p className="section-subtitle mx-auto">
            LLMs hallucinate. Databases don't. We built 6 layers of deterministic safety around the stochastic model.
          </p>
        </div>

        <div className="grid-3">
          {specs.map((spec, i) => (
            <div key={i} className="glass-card p-6 hover:bg-[var(--bg-card-hover)] transition-colors border-[var(--border-subtle)]">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-green-dim)] border border-[rgba(16,185,129,0.3)] flex items-center justify-center mb-4">
                {spec.icon}
              </div>
              <h4 className="text-white font-bold mb-2">{spec.title}</h4>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{spec.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
