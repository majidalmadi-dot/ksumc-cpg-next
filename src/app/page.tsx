'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

const FEATURES = [
  { icon: '⬆', title: 'GRADE Workflow', desc: 'Evidence certainty assessment with automated downgrade/upgrade factors and EtR tables' },
  { icon: '⊕', title: 'Evidence Search', desc: 'Integrated PubMed/NCBI search with PICO builder and citation management' },
  { icon: '⊞', title: 'SR & Meta-Analysis', desc: 'Forest plots, heterogeneity analysis, PRISMA 2020 flow, and publication bias' },
  { icon: '◇', title: 'Cost-Effectiveness', desc: 'ICER calculation, Markov models, PSA with Monte Carlo, and CEAC curves' },
  { icon: '◎', title: 'Delphi Consensus', desc: 'Anonymous multi-round voting with Likert scales and consensus tracking' },
  { icon: '⊡', title: 'Committee Management', desc: 'Member roles, expertise matrix, COI tracking, and institutional coverage' },
  { icon: '⊟', title: 'Reports & Export', desc: 'Generate PDF reports, PRISMA checklists, AGREE II assessments, and citations' },
  { icon: '✦', title: 'AI-Assisted', desc: 'Context-aware AI embedded in every workflow for methodology guidance' },
]

const STATS = [
  { label: 'Guidelines Managed', value: '16+' },
  { label: 'Workflow Steps', value: '7' },
  { label: 'Report Templates', value: '6' },
  { label: 'Saudi Institutions', value: '6' },
]

export default function LandingPage() {
  const [animate, setAnimate] = useState(false)
  useEffect(() => { setAnimate(true) }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#FAF9F6' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1E1E2E 0%, #2D2D3D 50%, #3D3D4D 100%)',
        padding: '0',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative grid */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

        <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 48px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'linear-gradient(135deg, #D97757, #E8956E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: 'white' }}>K</div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'white' }}>KSUMC CPG Platform</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>National Clinical Practice Guideline Authority</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link href="/auth" style={{ padding: '8px 20px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}>Sign In</Link>
            <Link href="/dashboard" style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#D97757', color: 'white', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>Open Dashboard</Link>
          </div>
        </nav>

        <div style={{ padding: '80px 48px 100px', position: 'relative', zIndex: 1, maxWidth: '800px' }}>
          <div style={{ opacity: animate ? 1 : 0, transform: animate ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.6s ease' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D97757', marginBottom: '16px' }}>Kingdom of Saudi Arabia · Vision 2030 Health Sector</div>
            <h1 style={{ fontSize: '42px', fontWeight: 700, color: 'white', lineHeight: 1.2, margin: '0 0 20px' }}>
              Evidence-Based Clinical Practice Guidelines
            </h1>
            <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, margin: '0 0 32px', maxWidth: '600px' }}>
              A comprehensive platform for developing, appraising, and publishing national clinical practice guidelines with GRADE methodology, AI-assisted workflows, and Delphi consensus.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Link href="/dashboard" style={{ padding: '12px 28px', borderRadius: '8px', border: 'none', background: '#D97757', color: 'white', fontSize: '15px', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                Go to Dashboard <span style={{ fontSize: '18px' }}>→</span>
              </Link>
              <Link href="/guidelines" style={{ padding: '12px 28px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.25)', background: 'transparent', color: 'white', fontSize: '15px', fontWeight: 500, textDecoration: 'none' }}>
                Browse Guidelines
              </Link>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <svg viewBox="0 0 1440 80" fill="none" style={{ display: 'block', width: '100%' }}>
          <path d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z" fill="#FAF9F6" />
        </svg>
      </div>

      {/* Stats Bar */}
      <div style={{ padding: '0 48px', marginTop: '-20px', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', maxWidth: '900px', margin: '0 auto' }}>
          {STATS.map(s => (
            <div key={s.label} style={{ background: 'white', borderRadius: '10px', padding: '20px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #E5E5E0' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#D97757' }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div style={{ padding: '80px 48px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#1A1A1A', margin: '0 0 12px' }}>Industry-Standard Methodology</h2>
          <p style={{ fontSize: '15px', color: '#6B7280', maxWidth: '560px', margin: '0 auto' }}>
            Every tool a guideline development group needs — from evidence search to published output.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {FEATURES.map(f => (
            <div key={f.title} className="card-hover" style={{ background: 'white', borderRadius: '10px', padding: '20px', border: '1px solid #E5E5E0' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#FEF0EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '12px', color: '#D97757' }}>{f.icon}</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A1A', marginBottom: '6px' }}>{f.title}</div>
              <div style={{ fontSize: '12px', color: '#6B7280', lineHeight: 1.5 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Workflow Steps */}
      <div style={{ background: '#F0EDE8', padding: '64px 48px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, textAlign: 'center', marginBottom: '40px' }}>Development Lifecycle</h2>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
            {['Planning', 'Scoping', 'Evidence\nSearch', 'GRADE\nAppraisal', 'EtR &\nConsensus', 'External\nReview', 'Published'].map((step, i) => (
              <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: i === 6 ? '#10B981' : '#D97757', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700 }}>{i + 1}</div>
                <div style={{ fontSize: '11px', fontWeight: 600, textAlign: 'center', color: '#374151', whiteSpace: 'pre-line', lineHeight: 1.3 }}>{step}</div>
                {i < 6 && <div style={{ position: 'absolute' }} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '64px 48px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 12px' }}>Ready to build evidence-based guidelines?</h2>
        <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 24px' }}>Start with a new project or explore the published guideline repository.</p>
        <Link href="/dashboard" style={{ padding: '12px 32px', borderRadius: '8px', border: 'none', background: '#D97757', color: 'white', fontSize: '15px', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          Open Dashboard <span>→</span>
        </Link>
      </div>

      {/* Footer */}
      <footer style={{ background: '#1E1E2E', padding: '32px 48px', color: 'rgba(255,255,255,0.4)', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ color: '#D97757', fontWeight: 700, marginRight: '8px' }}>KSUMC CPG Platform</span>
          King Saud University Medical City · Riyadh, Saudi Arabia
        </div>
        <div>Powered by GRADE, AGREE II, PRISMA 2020, and AI</div>
      </footer>
    </div>
  )
}
