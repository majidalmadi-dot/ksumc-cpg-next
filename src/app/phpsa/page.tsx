'use client'

import { useState } from 'react'
import Header from '@/components/Header'

interface PolicyBrief {
  id: string
  title: string
  titleAr: string
  category: string
  status: 'draft' | 'review' | 'published'
  date: string
  author: string
  visionPillar: string
}

const POLICY_BRIEFS: PolicyBrief[] = [
  { id: '1', title: 'National Primary Care Transformation', titleAr: 'تحول الرعاية الأولية الوطنية', category: 'Service Delivery', status: 'published', date: '2025-12-15', author: 'Dr. Almadi', visionPillar: 'Healthcare Access' },
  { id: '2', title: 'Health Workforce Nationalization Strategy', titleAr: 'استراتيجية توطين القوى العاملة الصحية', category: 'Workforce', status: 'published', date: '2025-11-20', author: 'Policy Committee', visionPillar: 'Human Capital' },
  { id: '3', title: 'Digital Health Integration Framework', titleAr: 'إطار تكامل الصحة الرقمية', category: 'Health Information', status: 'review', date: '2026-01-10', author: 'Technology WG', visionPillar: 'Digital Transformation' },
  { id: '4', title: 'NCD Prevention & Control Policy', titleAr: 'سياسة الوقاية والسيطرة على الأمراض غير المعدية', category: 'Population Health', status: 'review', date: '2026-02-01', author: 'NCD Task Force', visionPillar: 'Preventive Care' },
  { id: '5', title: 'Mental Health Services Expansion', titleAr: 'توسيع خدمات الصحة النفسية', category: 'Service Delivery', status: 'draft', date: '2026-03-15', author: 'Mental Health WG', visionPillar: 'Healthcare Access' },
  { id: '6', title: 'Pharmaceutical Supply Chain Reform', titleAr: 'إصلاح سلسلة إمداد الأدوية', category: 'Medical Products', status: 'draft', date: '2026-04-01', author: 'Pharma Committee', visionPillar: 'Operational Excellence' },
]

const WHO_BUILDING_BLOCKS = [
  { name: 'Service Delivery', color: '#6366F1', count: 2 },
  { name: 'Workforce', color: '#8B5CF6', count: 1 },
  { name: 'Health Information', color: '#3B82F6', count: 1 },
  { name: 'Medical Products', color: '#F59E0B', count: 1 },
  { name: 'Financing', color: '#10B981', count: 0 },
  { name: 'Leadership & Governance', color: '#D97757', count: 1 },
  { name: 'Population Health', color: '#EF4444', count: 1 },
]

const BOARD_MEMBERS = [
  { name: 'Dr. Majid Almadi', role: 'President', specialty: 'Gastroenterology / Health Policy' },
  { name: 'Dr. Sara Al-Dosari', role: 'Vice President', specialty: 'Public Health' },
  { name: 'Dr. Ahmed Al-Rashid', role: 'Secretary General', specialty: 'Health Economics' },
  { name: 'Dr. Fatimah Al-Zahrani', role: 'Research Director', specialty: 'Epidemiology' },
  { name: 'Dr. Khalid Al-Otaibi', role: 'Training Director', specialty: 'Healthcare Quality' },
]

const GOVERNANCE_DOCS = [
  { title: 'PHPSA Constitution & Bylaws', type: 'Governance', date: '2024-06-15' },
  { title: 'Strategic Plan 2024–2030', type: 'Strategy', date: '2024-09-01' },
  { title: 'Annual Report 2025', type: 'Report', date: '2026-01-30' },
  { title: 'Research Ethics Framework', type: 'Policy', date: '2025-03-20' },
  { title: 'Training Program Guide', type: 'Operations', date: '2025-07-10' },
  { title: 'Partnership MOU Template', type: 'Legal', date: '2025-05-01' },
]

export default function PHPSAPage() {
  const [activeTab, setActiveTab] = useState<'briefs' | 'governance' | 'research'>('briefs')
  const [briefFilter, setBriefFilter] = useState('all')

  const filteredBriefs = briefFilter === 'all' ? POLICY_BRIEFS : POLICY_BRIEFS.filter((b) => b.status === briefFilter)
  const published = POLICY_BRIEFS.filter((b) => b.status === 'published').length
  const inReview = POLICY_BRIEFS.filter((b) => b.status === 'review').length
  const drafts = POLICY_BRIEFS.filter((b) => b.status === 'draft').length

  const card: React.CSSProperties = { background: 'white', borderRadius: '10px', border: '1px solid #E5E5E0', padding: '20px' }
  const inp: React.CSSProperties = { padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E5E0', fontSize: '13px', background: '#FAF9F6' }
  const statusColors: Record<string, { bg: string; color: string }> = {
    published: { bg: '#D1FAE5', color: '#059669' },
    review: { bg: '#FEF3C7', color: '#D97706' },
    draft: { bg: '#F3F4F6', color: '#6B7280' },
  }

  const tabs = [
    { key: 'briefs' as const, label: 'Policy Briefs' },
    { key: 'governance' as const, label: 'Governance' },
    { key: 'research' as const, label: 'Research & Training' },
  ]

  return (
    <>
      <Header title="PHPSA Portal" subtitle="جمعية تأسيس الصحة العامة — Public Healthcare Policy Society of Saudi Arabia" />
      <div style={{ padding: '24px 32px' }}>
        {/* Mission Banner */}
        <div style={{ ...card, marginBottom: '24px', borderLeft: '4px solid #D97757', background: 'linear-gradient(135deg, #FAF9F6, #FEF3EC)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0', color: '#1A1A1A' }}>Advancing Health Policy for Vision 2030</h2>
              <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, maxWidth: '600px', lineHeight: 1.5 }}>
                PHPSA drives evidence-based health policy development in Saudi Arabia through research, training, and stakeholder engagement aligned with the National Transformation Program.
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#D97757' }}>2030</div>
              <div style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase' }}>Vision Aligned</div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#10B981' }}>{published}</div>
            <div style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>Published Briefs</div>
          </div>
          <div style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#F59E0B' }}>{inReview}</div>
            <div style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>Under Review</div>
          </div>
          <div style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#6366F1' }}>{drafts}</div>
            <div style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>In Draft</div>
          </div>
          <div style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#D97757' }}>{BOARD_MEMBERS.length}</div>
            <div style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase' }}>Board Members</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#F3F4F6', borderRadius: '8px', padding: '4px' }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              flex: 1, padding: '10px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer',
              background: activeTab === t.key ? 'white' : 'transparent',
              color: activeTab === t.key ? '#1A1A1A' : '#6B7280',
              fontWeight: activeTab === t.key ? 600 : 400, fontSize: '13px',
              boxShadow: activeTab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Policy Briefs Tab */}
        {activeTab === 'briefs' && (
          <div>
            {/* WHO Building Blocks */}
            <div style={{ ...card, marginBottom: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>WHO Health System Building Blocks Coverage</h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {WHO_BUILDING_BLOCKS.map((block) => (
                  <div key={block.name} style={{
                    padding: '8px 14px', borderRadius: '8px', fontSize: '12px',
                    background: block.count > 0 ? block.color + '15' : '#F9FAFB',
                    border: `1px solid ${block.count > 0 ? block.color + '40' : '#E5E5E0'}`,
                    color: block.count > 0 ? block.color : '#9CA3AF',
                    fontWeight: block.count > 0 ? 600 : 400,
                  }}>
                    {block.name} ({block.count})
                  </div>
                ))}
              </div>
            </div>

            {/* Filter */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {['all', 'published', 'review', 'draft'].map((f) => (
                <button key={f} onClick={() => setBriefFilter(f)} style={{
                  padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  background: briefFilter === f ? '#D97757' : 'white',
                  color: briefFilter === f ? 'white' : '#6B7280',
                  border: briefFilter === f ? 'none' : '1px solid #E5E5E0',
                }}>
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)} {f === 'all' ? `(${POLICY_BRIEFS.length})` : ''}
                </button>
              ))}
            </div>

            {/* Brief Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {filteredBriefs.map((brief) => {
                const sc = statusColors[brief.status]
                return (
                  <div key={brief.id} style={{ ...card, padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: sc.bg, color: sc.color, fontWeight: 600 }}>
                        {brief.status.charAt(0).toUpperCase() + brief.status.slice(1)}
                      </span>
                      <span style={{ fontSize: '10px', color: '#9CA3AF' }}>{brief.category}</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{brief.title}</div>
                    <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '8px', direction: 'rtl' }}>{brief.titleAr}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#6B7280' }}>
                      <span>{brief.author}</span>
                      <span>{new Date(brief.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: '#FEF3EC', color: '#D97757', display: 'inline-block' }}>
                      Vision 2030: {brief.visionPillar}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Governance Tab */}
        {activeTab === 'governance' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Board */}
            <div style={card}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Board of Directors</h3>
              {BOARD_MEMBERS.map((m) => (
                <div key={m.name} style={{ padding: '10px 0', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #D97757, #E8956F)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: '13px', fontWeight: 600,
                  }}>
                    {m.name.split(' ').filter((_, i) => i === 0 || i === m.name.split(' ').length - 1).map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{m.name}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>{m.role} — {m.specialty}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Documents */}
            <div style={card}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Governance Documents</h3>
              {GOVERNANCE_DOCS.map((doc) => (
                <div key={doc.title} style={{ padding: '10px 0', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{doc.title}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>{doc.type} — {new Date(doc.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
                  </div>
                  <button style={{ padding: '4px 12px', borderRadius: '4px', border: '1px solid #E5E5E0', background: 'white', fontSize: '11px', cursor: 'pointer', color: '#374151' }}>View</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Research & Training Tab */}
        {activeTab === 'research' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Research Priorities */}
            <div style={card}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Research Priorities 2025–2027</h3>
              {[
                { title: 'Health System Financing Models', priority: 'High', status: 'Active' },
                { title: 'PHC Transformation Outcomes', priority: 'High', status: 'Active' },
                { title: 'Health Workforce Sustainability', priority: 'Medium', status: 'Planning' },
                { title: 'Digital Health Equity Assessment', priority: 'Medium', status: 'Planning' },
                { title: 'NCD Screening Cost-Effectiveness', priority: 'High', status: 'Active' },
                { title: 'Emergency Preparedness Capacity', priority: 'Low', status: 'Proposed' },
              ].map((r) => (
                <div key={r.title} style={{ padding: '10px 0', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500 }}>{r.title}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>Priority: {r.priority}</div>
                  </div>
                  <span style={{
                    fontSize: '10px', padding: '2px 8px', borderRadius: '10px', fontWeight: 600,
                    background: r.status === 'Active' ? '#D1FAE5' : r.status === 'Planning' ? '#FEF3C7' : '#F3F4F6',
                    color: r.status === 'Active' ? '#059669' : r.status === 'Planning' ? '#D97706' : '#6B7280',
                  }}>{r.status}</span>
                </div>
              ))}
            </div>

            {/* Training Programs */}
            <div style={card}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Training Programs</h3>
              {[
                { title: 'CPG Development Masterclass', hours: 40, participants: 28, next: '2026-04-15' },
                { title: 'GRADE Methodology Workshop', hours: 16, participants: 35, next: '2026-05-20' },
                { title: 'Health Policy Analysis Certificate', hours: 80, participants: 15, next: '2026-06-01' },
                { title: 'Systematic Review Methods', hours: 24, participants: 22, next: '2026-07-10' },
                { title: 'Health Economics for Decision Makers', hours: 32, participants: 18, next: '2026-08-05' },
              ].map((p) => (
                <div key={p.title} style={{ padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{p.title}</div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#6B7280' }}>
                    <span>{p.hours} hours</span>
                    <span>{p.participants} enrolled</span>
                    <span>Next: {new Date(p.next).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
