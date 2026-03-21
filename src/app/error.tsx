'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('Application error:', error) }, [error])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF9F6', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: '440px', padding: '48px 24px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, #D97757 0%, #C4613F 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '28px', color: 'white' }}>!</div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1E1E2E', margin: '0 0 8px' }}>Something went wrong</h1>
        <p style={{ fontSize: '14px', color: '#8C8C8C', margin: '0 0 28px', lineHeight: 1.6 }}>
          An unexpected error occurred. Your data is safe — please try again.
        </p>
        <button
          onClick={reset}
          aria-label="Try again"
          style={{ padding: '10px 28px', borderRadius: '8px', border: 'none', background: '#D97757', color: 'white', fontWeight: 600, fontSize: '14px', cursor: 'pointer', transition: 'opacity 0.2s' }}
          onMouseOver={e => (e.currentTarget.style.opacity = '0.9')}
          onMouseOut={e => (e.currentTarget.style.opacity = '1')}
        >
          Try Again
        </button>
        {error.digest && <p style={{ fontSize: '11px', color: '#B0B0B0', marginTop: '20px' }}>Error ID: {error.digest}</p>}
      </div>
    </div>
  )
}
