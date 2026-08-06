import { useState } from 'react'
import { Sparkles, Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      
      if (data.success) {
        const vendorInfo = {
          id: data.vendor_id,
          name: data.name,
          email: email,
          token: data.token
        }
        if (rememberMe) {
          localStorage.setItem('hobbyfi_vendor', JSON.stringify(vendorInfo))
        } else {
          sessionStorage.setItem('hobbyfi_vendor', JSON.stringify(vendorInfo))
        }
        onLogin(vendorInfo)
      } else {
        setError(data.message || 'Invalid credentials')
      }
    } catch (err) {
      setError('Unable to connect to server. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Logo & Branding */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'var(--gradient-primary)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16, boxShadow: '0 4px 16px rgba(99, 102, 241, 0.25)'
          }}>
            <Sparkles size={24} color="white" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            HobbyFi Copilot
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Sign in to your vendor portal
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="email"
                className="login-input"
                style={{ paddingLeft: 38 }}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="sohammanik15@gmail.com"
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="login-input"
                style={{ paddingLeft: 38, paddingRight: 38 }}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center' }}>
            <input 
              type="checkbox" 
              id="remember" 
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: 'var(--accent-green)' }}
            />
            <label htmlFor="remember" style={{ marginLeft: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Remember me
            </label>
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 16,
              background: '#fef2f2', border: '1px solid #fecaca',
              fontSize: 13, color: '#dc2626'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                Sign In <ArrowRight size={16} />
              </span>
            )}
          </button>
        </form>

      </div>
    </div>
  )
}
