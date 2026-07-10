import React, { useState, useEffect } from 'react'
import Hero from './components/Hero'
import Philosophy from './components/Philosophy'
import Architecture from './components/Architecture'
import ApprovalShowcase from './components/ApprovalShowcase'
import SecurityGrid from './components/SecurityGrid'
import Footer from './components/Footer'
import { Sparkles, Menu, X } from 'lucide-react'

function TechTicker() {
  const tech = ["React 18", "Vite", "FastAPI", "SQLite", "LangChain", "NVIDIA NIM", "meta/llama-3.1-70b", "Guardrails AI", "Server-Sent Events"];
  
  return (
    <div className="border-t border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] overflow-hidden py-3">
      <div className="flex whitespace-nowrap animate-ticker">
        {/* Double the array for seamless looping */}
        {[...tech, ...tech, ...tech].map((t, i) => (
          <span key={i} className="mx-8 text-xs font-mono font-semibold text-[var(--text-muted)] uppercase tracking-widest">
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}

function StickyNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    }
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[rgba(10,10,11,0.8)] backdrop-blur-md border-b border-[var(--border-subtle)] py-3' : 'bg-transparent py-5'}`}>
      <div className="container flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-white">
          <Sparkles size={18} className="text-[var(--accent-green)]" />
          HobbyFi Copilot
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--text-secondary)]">
          <a href="#philosophy" className="hover:text-white transition-colors">Philosophy</a>
          <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
          <a href="#approval-flow" className="hover:text-white transition-colors">Approval Flow</a>
          <a href="#security" className="hover:text-white transition-colors">Security</a>
        </div>
        
        <div className="hidden md:block">
          <a href="https://github.com/hobbyfi" target="_blank" rel="noreferrer" className="btn btn-primary py-2 px-4 text-xs">
            View Source
          </a>
        </div>
      </div>
    </nav>
  )
}

function App() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <StickyNav />
      <Hero />
      <TechTicker />
      <Philosophy />
      <Architecture />
      <ApprovalShowcase />
      <SecurityGrid />
      <Footer />
      
      {/* Ticker Animation CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        .animate-ticker {
          animation: ticker 20s linear infinite;
        }
        html { scroll-behavior: smooth; }
      `}} />
    </div>
  )
}

export default App
