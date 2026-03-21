'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from '@/lib/auth'

const FEATURES = [
  { icon: '◉', title: 'Dashboard & Pipeline', desc: 'Kanban workflow for all guideline stages' },
  { icon: '⬆', title: 'GRADE Methodology', desc: 'Evidence certainty with EtR framework' },
  { icon: '⊕', title: 'PubMed Evidence Search', desc: 'Real-time NCBI E-utilities integration' },
  { icon: '✦', title: 'AI Command Center', desc: 'Gemini-powered clinical assistant' },
  { icon: '⬡', title: 'Framework Compliance', desc: 'AGREE II, NICE, GIN-McMaster tracking' },
  { icon: '◈', title: 'PHPSA Portal', desc: 'Policy briefs aligned to Vision 2030' },
]

function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signIn(email, password)
      router.push(redirect)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  function handleDemo() {
    document.cookie = 'cpg-demo-mode=true; path=/; max-age=86400; SameSite=Lax'
    router.push(redirect)
  }

  const inp: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #E5E5E0',
    fontSize: '14px',
    outline: 'none',
    background: '#FAF9F6',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, #1E1E2E 0%, #2D2D3D 50%, #1E1E2E 100%)',
    }}>
      {/* Left Panel — Feature Showcase */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px',
        color: 'white',
      }}>
        <div style={{ marginBottom: '48px' }}>
          <div style={{ fontSize: '36px', fontWeight: 700, color: '#D97757', marginBottom: '8px' }}>KSUMC</div>
          <div style={{ fontSize: '20px', fontWeight: 300, color: 'rgba(255,255,255,0.7)', marginBottom: '4px' }}>National CPG Authority</div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>Clinical Practice Guideline Development Platform</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', maxWidth: '480px' }}>
          {FEATURES.map((f) => (
            <div key={f.title} style={{
              padding: '14px 16px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{ fontSize: '18px', marginBottom: '6px' }}>{f.icon}</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: '2px' }}>{f.title}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{f.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '48px', fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
          Powered by Next.js · Supabase · Gemini AI · NCBI E-utilities
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div style={{
        width: '440px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1A1A1A', margin: '0 0 4px 0' }}>Welcome Back</h1>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Sign in to your account or explore in demo mode</p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@ksumc.med.sa" required style={inp} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required style={inp} />
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', color: '#EF4444', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
              background: '#D97757', color: 'white', fontSize: '14px', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              marginBottom: '12px',
            }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div style={{ position: 'relative', textAlign: 'center', margin: '16px 0' }}>
              <div style={{ borderTop: '1px solid #E5E5E0' }} />
              <span style={{ position: 'absolute', top: '-9px', left: '50%', transform: 'translateX(-50%)', background: 'white', padding: '0 12px', fontSize: '11px', color: '#9CA3AF' }}>or</span>
            </div>

            <button type="button" onClick={handleDemo} style={{
              width: '100%', padding: '12px', borderRadius: '8px',
              border: '1px solid #E5E5E0', background: 'white',
              color: '#374151', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}>
              Explore Demo Mode
            </button>

            <p style={{ fontSize: '11px', color: '#9CA3AF', textAlign: 'center', marginTop: '16px', lineHeight: 1.5 }}>
              Demo mode loads 16 real clinical guideline projects with full GRADE and lifecycle data. No account required.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#1E1E2E' }} />}>
      <AuthForm />
    </Suspense>
  )
}
