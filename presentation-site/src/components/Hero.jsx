import { motion } from 'framer-motion'
import { Sparkles, ArrowRight } from 'lucide-react'

export default function Hero() {
  return (
    <section className="min-h-screen flex items-center justify-center pt-20" id="hero">
      <div className="glow-bg"></div>
      
      <div className="container grid-2 items-center">
        {/* Left: Copy */}
        <div className="space-y-8 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--accent-green)] bg-[var(--accent-green-dim)] text-[var(--accent-green)] text-xs font-semibold uppercase tracking-wider">
            <Sparkles size={14} />
            HobbyFi Copilot
          </div>
          
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tight">
            Dashboards are slow. <br/>
            <span style={{ color: 'var(--text-secondary)' }}>Your data shouldn't be.</span>
          </h1>
          
          <p className="text-lg text-[var(--text-secondary)] max-w-md leading-relaxed">
            The AI copilot for sports facility vendors. Query metrics and mutate CRM data in plain English, with enterprise-grade safety and zero learning curve.
          </p>
          
          <div className="flex items-center gap-4 pt-4">
            <a href="#architecture" className="btn btn-primary">
              See how it works
              <ArrowRight size={16} />
            </a>
            <a href="#security" className="btn btn-secondary">
              Read security specs
            </a>
          </div>
          
          {/* Stat strip */}
          <div className="flex items-center gap-6 pt-12 border-t border-[var(--border-subtle)]">
            <div>
              <div className="text-2xl font-bold text-white">0</div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">Unaudited Mutations</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">4</div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">Intent Classes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">2</div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">Step Confirmation</div>
            </div>
          </div>
        </div>
        
        {/* Right: Animated Mockup */}
        <div className="relative z-10 pl-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="glass-card p-6 border border-[var(--border-subtle)] shadow-2xl relative overflow-hidden"
            style={{ background: 'rgba(18, 18, 20, 0.8)' }}
          >
            {/* Top bar */}
            <div className="flex items-center gap-2 mb-6 border-b border-[var(--border-subtle)] pb-4">
              <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
            </div>
            
            <div className="space-y-6 font-sans text-sm">
              {/* User message */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="bg-[var(--accent-green-dim)] border border-[rgba(16,185,129,0.3)] text-white p-3 rounded-2xl rounded-tr-sm ml-auto max-w-[80%]"
              >
                Cancel Rohan's trial and extend Priya's by 7 days.
              </motion.div>
              
              {/* AI Thinking */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.4 }}
                className="flex gap-2"
              >
                <div className="w-6 h-6 rounded-md bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center">
                  <Sparkles size={12} className="text-[var(--accent-green)]" />
                </div>
                <div className="flex-1 space-y-3">
                  {/* Mock diff card 1 */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    transition={{ delay: 1.5, duration: 0.4 }}
                    className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] p-4 rounded-xl"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="badge badge-amber">Needs Approval</span>
                    </div>
                    <p className="text-white font-medium mb-3">Cancel Rohan's trial</p>
                    <div className="grid grid-cols-2 gap-[1px] bg-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-md overflow-hidden font-mono text-[10px]">
                      <div className="bg-[var(--bg-primary)] p-2"><span className="text-red-400">status: active</span></div>
                      <div className="bg-[rgba(16,185,129,0.1)] text-[var(--accent-green)] p-2">status: cancelled</div>
                    </div>
                  </motion.div>
                  
                  {/* Mock diff card 2 */}
                  <motion.div 
                    initial={{ opacity: 0, y: 10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    transition={{ delay: 2.2, duration: 0.4 }}
                    className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] p-4 rounded-xl"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="badge badge-amber">Needs Approval</span>
                    </div>
                    <p className="text-white font-medium mb-3">Extend Priya's trial by 7 days</p>
                    <div className="grid grid-cols-2 gap-[1px] bg-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-md overflow-hidden font-mono text-[10px]">
                      <div className="bg-[var(--bg-primary)] p-2"><span className="text-red-400">end_date: 2026-07-10</span></div>
                      <div className="bg-[rgba(16,185,129,0.1)] text-[var(--accent-green)] p-2">end_date: 2026-07-17</div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
            
            {/* Ambient reflection */}
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[var(--accent-green)] opacity-5 blur-[100px] rounded-full pointer-events-none"></div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
