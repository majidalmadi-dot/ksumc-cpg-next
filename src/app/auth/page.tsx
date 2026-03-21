'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from '@/lib/auth'

const FEATURES = [
  { icon: '◉', title: 'Dashboard & Pipeline', desc: 'Kanban workflow for all guideline stages' },
  { icon: '⬆', title: 'GRADE Methodology', desc: 'Evidence certainty with EtR framework' },
  { icon: '⊕', title: 'PubMed Evidence Search', desc: 'Real-time NCBI E-utilities integration' },
  { icon: '✦', title: 'AI Command Center', desc: 'Gemini-powered clinical assistant' },
  { icon: '⬡', title: 'Framework Compliance', desc: 'AGREE II, NICE, GIN-McMaster tracking' },
  { icon: '◈', title: 'PHPSA Portal', desc: 'Policy briefs aligned to Vision 2030' },
  { icon: '↻', title: 'Delphi Consensus', desc: 'Multi-round voting with analytics' },
  { icon: '▤', title: 'Reports & Export', desc: 'PRISMA, citations, audit trails' },
]

const STATS = [
  { value: '16', label: 'Active Guidelines' },
  { value: '8', label: 'Saudi Institutions' },
  { value: '24/7', label: 'AI Assistance' },
  { value: '100%', label: 'GRADE Compliant' },
]

function AuthForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'

  useEffect(() => { setMounted(true) }, [])

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
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1px solid #E5E5E0', fontSize: '14px', outline: 'none',
    background: '#FAF9F6', boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'linear-gradient(135deg, #1E1E2E 0%, #2D2D3D 50%, #1E1E2E 100%)', position: 'relative', overflow: 'hidden' }}>
      {/* Decorative grid */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Animated accent orbs */}
      <div style={{ position: 'absolute', top: '-120px', left: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(217,119,87,0.15), transparent 70%)', filter: 'blur(60px)' }} />
      <div style={{ position: 'absolute', bottom: '-100px', right: '30%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.1), transparent 70%)', filter: 'blur(80px)' }} />

      {/* Left Panel — Feature Showcase */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px', color: 'white', position: 'relative', zIndex: 1,
        opacity: mounted ? 1 : 0, transform: mounted ? 'translateX(0)' : 'translateX(-20px)',
        transition: 'opacity 0.8s ease, transform 0.8s ease',
      }}>
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#D97757', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>National CPG Authority</div>
          <div style={{ fontSize: '42px', fontWeight: 700, color: 'white', lineHeight: 1.15, marginBottom: '12px' }}>
            KSUMC Clinical Practice<br />Guideline Platform
          </div>
          <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', maxWidth: '440px', lineHeight: 1.6 }}>
            The national standard for evidence-based clinical guideline development, powered by AI and aligned with Vision 2030.
          </div>
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex', gap: '24px', marginBottom: '36px',
          opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s',
        }}>
          {STATS.map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#D97757' }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Feature grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', maxWidth: '520px',
          opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(10px)',
          transition: 'opacity 0.8s ease 0.4s, transform 0.8s ease 0.4s',
        }}>
          {FEATURES.map((f, i) => (
            <div key={f.title} style={{
              padding: '14px 16px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
              transition: 'background 0.2s, border-color 0.2s',
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(8px)',
              transitionDelay: `${0.5 + i * 0.05}s`,
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(217,119,87,0.3)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
            >
              <div style={{ fontSize: '16px', marginBottom: '6px', opacity: 0.7 }}>{f.icon}</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: '2px' }}>{f.title}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{f.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '40px', fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
          Powered by Next.js · Supabase · Gemini AI · NCBI E-utilities
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div style={{
        width: '460px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px', position: 'relative', zIndex: 1,
      }}>
        <div style={{
          background: 'white', borderRadius: '20px', padding: '40px', width: '100%',
          boxShadow: '0 25px 80px rgba(0,0,0,0.4)',
          opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.98)',
          transition: 'opacity 0.6s ease 0.3s, transform 0.6s ease 0.3s',
        }}>
          {/* Avatar circle */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%', margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #D97757, #E8956F)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', color: 'white', fontWeight: 700,
            }}>
              ◉
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A1A', margin: '0 0 4px 0' }}>Welcome Back</h1>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Sign in to your account or explore in demo mode</p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@ksumc.med.sa" required style={inp}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#D97757'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(217,119,87,0.1)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E5E0'; e.currentTarget.style.boxShadow = 'none' }}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required style={inp}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#D97757'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(217,119,87,0.1)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#E5E5E0'; e.currentTarget.style.boxShadow = 'none' }}
              />
            </div>

            {error && (
              <div style={{ background: '#FEF2F2', color: '#EF4444', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>⚠</span> {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, #D97757, #C4633F)', color: 'white',
              fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1, marginBottom: '12px',
              transition: 'opacity 0.2s, transform 0.1s',
              boxShadow: '0 2px 8px rgba(217,119,87,0.3)',
            }}
              onMouseDown={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(0.98)' }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>

            <div style={{ position: 'relative', textAlign: 'center', margin: '20px 0' }}>
              <div style={{ borderTop: '1px solid #E5E5E0' }} />
              <span style={{ position: 'absolute', top: '-9px', left: '50%', transform: 'translateX(-50%)', background: 'white', padding: '0 12px', fontSize: '11px', color: '#9CA3AF' }}>or</span>
            </div>

            <button type="button" onClick={handleDemo} style={{
              width: '100%', padding: '12px', borderRadius: '10px',
              border: '1px solid #E5E5E0', background: 'white',
              color: '#374151', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              transition: 'border-color 0.2s, background 0.2s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#D97757'; e.currentTarget.style.background = '#FEF8F5' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E5E5E0'; e.currentTarget.style.background = 'white' }}
            >
              Explore Demo Mode
            </button>

            <p style={{ fontSize: '11px', color: '#9CA3AF', textAlign: 'center', marginTop: '16px', lineHeight: 1.5 }}>
              Demo mode loads 16 real clinical guideline projects with full GRADE and lifecycle data. No account required.
            </p>
          </form>

          {/* Trust indicators */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #F3F4F6', display: 'flex', justifyContent: 'center', gap: '16px' }}>
            {['256-bit SSL', 'HIPAA Ready', 'SOC 2'].map((badge) => (
              <span key={badge} style={{ fontSize: '10px', color: '#9CA3AF', padding: '3px 8px', borderRadius: '4px', background: '#F9FAFB', fontWeight: 500 }}>{badge}</span>
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
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
