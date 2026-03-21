import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #F5F5F0, #FAF9F6)',
      padding: '40px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '440px' }}>
        <div style={{ fontSize: '72px', fontWeight: 800, color: '#D97757', lineHeight: 1 }}>404</div>
        <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#1A1A1A', margin: '16px 0 8px' }}>
          Page Not Found
        </h1>
        <p style={{ fontSize: '14px', color: '#6B7280', lineHeight: 1.6, marginBottom: '24px' }}>
          The page you are looking for does not exist or has been moved.
          Check the URL or return to the dashboard.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <Link
            href="/dashboard"
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              background: '#D97757',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Go to Dashboard
          </Link>
          <Link
            href="/auth"
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: '1px solid #E5E5E0',
              background: 'white',
              color: '#374151',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
