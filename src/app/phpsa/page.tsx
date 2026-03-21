import Header from '@/components/Header'
export default function PHPSAPage() {
  return (
    <>
      <Header title="PHPSA" subtitle="Public Healthcare Policy Society of Saudi Arabia" />
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-light)' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>◈</div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>PHPSA Portal</h2>
        <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>Public Healthcare Policy Society of Saudi Arabia — governance, research, and policy development.</p>
      </div>
    </>
  )
}
