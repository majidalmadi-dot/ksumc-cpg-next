import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF9F6', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: '440px', padding: '48px 24px' }}>
        <div style={{ fontSize: '72px', fontWeight: 800, color: '#D97757', lineHeight: 1, marginBottom: '8px' }}>404</div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1E1E2E', margin: '0 0 8px' }}>Page not found</h1>
        <p style={{ fontSize: '14px', color: '#8C8C8C', margin: '0 0 28px', lineHeight: 1.6 }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          style={{ display: 'inline-block', padding: '10px 28px', borderRadius: '8px', background: '#D97757', color: 'white', fontWeight: 600, fontSize: '14px', textDecoration: 'none', transition: 'opacity 0.2s' }}
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
