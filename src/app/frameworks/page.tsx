import Header from '@/components/Header'
export default function FrameworksPage() {
  return (
    <>
      <Header title="Frameworks" subtitle="AGREE II, NICE, GIN-McMaster, ADAPTE compliance" />
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-light)' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⬡</div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>Framework Compliance</h2>
        <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>Track compliance with international guideline development frameworks and quality standards.</p>
      </div>
    </>
  )
}
