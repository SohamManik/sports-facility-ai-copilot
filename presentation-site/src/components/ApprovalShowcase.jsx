import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react'

export default function ApprovalShowcase() {
  const [step, setStep] = useState(0);

  // Auto loop the animation for the demo
  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => (prev >= 3 ? 0 : prev + 1))
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section id="approval-flow" className="border-t border-[var(--border-subtle)] overflow-hidden">
      <div className="container grid-2 items-center gap-16">
        
        {/* Left: Interactive Demo */}
        <div className="relative">
          <div className="absolute inset-0 bg-[var(--accent-green)] opacity-5 blur-[100px] rounded-full"></div>
          
          <div className="glass-card p-6 border border-[var(--border-subtle)] relative z-10 h-[400px] flex items-center justify-center">
            
            <AnimatePresence mode="wait">
              {/* Step 0 & 1: The Pending Card */}
              {step < 2 && (
                <motion.div 
                  key="card"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] p-5 rounded-2xl w-full max-w-sm shadow-2xl"
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="badge badge-amber">Needs Approval</span>
                    <span className="text-xs text-[var(--text-muted)] font-mono">ID: 4092</span>
                  </div>
                  
                  <p className="text-white font-medium mb-4 text-sm">Cancel Rohan's Badminton Trial</p>
                  
                  <div className="mb-4">
                    <div className="grid grid-cols-2 gap-2 text-[9px] mb-1 px-1 font-bold tracking-wider text-[var(--text-muted)]">
                      <div>CURRENT STATE</div>
                      <div>PROPOSED STATE</div>
                    </div>
                    <div className="grid grid-cols-2 gap-[1px] bg-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-lg overflow-hidden font-mono text-[11px]">
                      <div className="bg-[var(--bg-primary)] p-3"><span className="text-red-400">status: active</span></div>
                      <div className="bg-[rgba(16,185,129,0.1)] text-[var(--accent-green)] p-3 font-semibold">status: cancelled</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className={`btn w-full ${step === 1 ? 'btn-primary scale-[0.98]' : 'bg-[var(--bg-card)] text-white border border-[var(--border-subtle)]'}`}>
                      <CheckCircle2 size={16} /> Approve
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: The Modal */}
              {step === 2 && (
                <motion.div 
                  key="modal"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 rounded-2xl w-full max-w-sm shadow-2xl backdrop-blur-xl"
                >
                  <h3 className="text-lg font-bold text-white mb-2">Confirm Action</h3>
                  <p className="text-sm text-[var(--text-secondary)] mb-6">Are you sure you want to execute this change? This will update the database permanently.</p>
                  
                  <div className="flex justify-end gap-3">
                    <div className="px-4 py-2 text-sm text-[var(--text-muted)]">Cancel</div>
                    <div className="px-4 py-2 text-sm font-bold bg-[var(--accent-green)] text-black rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-[0.98]">Confirm Change</div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Success State */}
              {step === 3 && (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center text-center space-y-4"
                >
                  <div className="w-16 h-16 rounded-full bg-[var(--accent-green-dim)] border border-[rgba(16,185,129,0.3)] flex items-center justify-center text-[var(--accent-green)] shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                    <CheckCircle2 size={32} />
                  </div>
                  <div>
                    <div className="badge badge-green mb-2">Action Approved</div>
                    <p className="text-sm text-[var(--text-secondary)] font-mono">Audit Log Updated.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

        {/* Right: Copy */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold">The Approval Flow</h2>
          <p className="text-[var(--text-secondary)]">
            AI shouldn't be trusted to blindly execute database mutations. HobbyFi Copilot uses a deterministic, three-step safety pipeline.
          </p>

          <div className="space-y-6 pt-4">
            <div className={`flex items-start gap-4 transition-opacity duration-300 ${step === 0 || step === 1 ? 'opacity-100' : 'opacity-40'}`}>
              <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center flex-shrink-0 font-mono text-xs text-[var(--text-muted)]">1</div>
              <div>
                <h4 className="font-bold text-white mb-1">Generate Proposal</h4>
                <p className="text-sm text-[var(--text-secondary)]">The agent stages the SQL update and calculates the exact <span className="font-mono text-white text-xs">Proposed State</span> diff for you to review.</p>
              </div>
            </div>

            <div className={`flex items-start gap-4 transition-opacity duration-300 ${step === 2 ? 'opacity-100' : 'opacity-40'}`}>
              <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center flex-shrink-0 font-mono text-xs text-[var(--text-muted)]">2</div>
              <div>
                <h4 className="font-bold text-white mb-1">Explicit Confirmation</h4>
                <p className="text-sm text-[var(--text-secondary)]">Clicking approve triggers a secondary confirmation modal. No accidental clicks.</p>
              </div>
            </div>

            <div className={`flex items-start gap-4 transition-opacity duration-300 ${step === 3 ? 'opacity-100' : 'opacity-40'}`}>
              <div className="w-8 h-8 rounded-full bg-[var(--accent-green-dim)] border border-[var(--accent-green)] text-[var(--accent-green)] flex items-center justify-center flex-shrink-0 font-mono text-xs">3</div>
              <div>
                <h4 className="font-bold text-white mb-1">Execute & Audit</h4>
                <p className="text-sm text-[var(--text-secondary)]">The SQL is executed against the SQLite DB, and an immutable record is written to the Audit Log.</p>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </section>
  )
}
