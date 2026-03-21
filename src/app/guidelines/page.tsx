import Header from '@/components/Header'
export default function GuidelinesPage() {
  return (
    <>
      <Header title="Active Guidelines" subtitle="Published and in-development clinical practice guidelines" />
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-light)' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>▤</div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>Guideline Repository</h2>
        <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>Browse, search, and manage all published and in-development clinical practice guidelines.</p>
      </div>
    </>
  )
}
