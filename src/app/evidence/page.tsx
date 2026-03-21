import Header from '@/components/Header'
export default function EvidencePage() {
  return (
    <>
      <Header title="Evidence Search" subtitle="PubMed and systematic literature search" />
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-light)' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⊕</div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>Evidence Search Engine</h2>
        <p style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>Integrated PubMed search with AI-powered relevance ranking and systematic review support.</p>
      </div>
    </>
  )
}
