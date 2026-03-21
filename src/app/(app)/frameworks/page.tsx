'use client'

import { useState, useMemo } from 'react'
import Header from '@/components/Header'
import AISuggestionPanel from '@/components/AISuggestionPanel'
import ActivePICOBanner from '@/components/ActivePICOBanner'
import PipelineControls from '@/components/PipelineControls'
import { SEED_PROJECTS } from '@/lib/projects'

interface FrameworkDomain {
  id: string
  name: string
  description: string
  maxScore: number
  items: { label: string; weight: number }[]
}

const AGREE_II_DOMAINS: FrameworkDomain[] = [
  {
    id: 'scope',
    name: 'Scope & Purpose',
    description: 'Overall objective, clinical questions, and target population',
    maxScore: 100,
    items: [
      { label: 'Overall objective(s) described', weight: 33 },
      { label: 'Health question(s) covered', weight: 34 },
      { label: 'Population described', weight: 33 },
    ],
  },
  {
    id: 'stakeholder',
    name: 'Stakeholder Involvement',
    description: 'Guideline development group composition and patient involvement',
    maxScore: 100,
    items: [
      { label: 'Relevant professional groups included', weight: 33 },
      { label: 'Target population views sought', weight: 34 },
      { label: 'Target users clearly defined', weight: 33 },
    ],
  },
  {
    id: 'rigor',
    name: 'Rigour of Development',
    description: 'Evidence search, selection, strength of recommendations',
    maxScore: 100,
    items: [
      { label: 'Systematic methods for evidence search', weight: 12 },
      { label: 'Evidence selection criteria described', weight: 12 },
      { label: 'Strengths and limitations described', weight: 13 },
      { label: 'Methods for formulating recommendations', weight: 13 },
      { label: 'Health benefits/risks considered', weight: 12 },
      { label: 'Explicit link between evidence & recommendations', weight: 13 },
      { label: 'External expert review', weight: 12 },
      { label: 'Procedure for updating guideline', weight: 13 },
    ],
  },
  {
    id: 'clarity',
    name: 'Clarity of Presentation',
    description: 'Recommendation specificity and identifiability',
    maxScore: 100,
    items: [
      { label: 'Specific and unambiguous recommendations', weight: 33 },
      { label: 'Management options clearly presented', weight: 34 },
      { label: 'Key recommendations easily identifiable', weight: 33 },
    ],
  },
  {
    id: 'applicability',
    name: 'Applicability',
    description: 'Implementation barriers, resource implications, monitoring',
    maxScore: 100,
    items: [
      { label: 'Facilitators and barriers described', weight: 25 },
      { label: 'Implementation advice/tools provided', weight: 25 },
      { label: 'Resource implications considered', weight: 25 },
      { label: 'Monitoring/auditing criteria', weight: 25 },
    ],
  },
  {
    id: 'independence',
    name: 'Editorial Independence',
    description: 'Funding body influence and conflicts of interest',
    maxScore: 100,
    items: [
      { label: 'Views of funding body did not influence', weight: 50 },
      { label: 'Competing interests recorded and addressed', weight: 50 },
    ],
  },
]

const NICE_CHECKLIST = [
  { category: 'Scope', items: ['Scope document approved', 'Stakeholder consultation completed', 'Equality impact assessed'] },
  { category: 'Evidence Review', items: ['Review protocol registered', 'Search strategy peer-reviewed', 'PRISMA flow documented', 'Quality assessment done'] },
  { category: 'Recommendations', items: ['GRADE certainty assessed', 'EtR framework completed', 'Delphi consensus reached', 'Wording uses standard format'] },
  { category: 'Validation', items: ['External peer review done', 'Public consultation completed', 'AGREE II self-assessment ≥80%', 'Final editorial check passed'] },
]

const GIN_MCMASTER = [
  { phase: 'Prioritization', tasks: ['Topic nominated', 'Scoping review completed', 'Priority ranking assigned'], color: '#6366F1' },
  { phase: 'Guideline Group', tasks: ['Methodologist appointed', 'Panel composition balanced', 'COI declarations collected', 'Patient representatives included'], color: '#8B5CF6' },
  { phase: 'Evidence', tasks: ['PICO questions finalized', 'Systematic review completed', 'Evidence profiles created', 'GRADE tables completed'], color: '#F59E0B' },
  { phase: 'Recommendations', tasks: ['EtR frameworks done', 'Panel voting completed', 'Formal consensus achieved', 'Recommendation wording finalized'], color: '#D97757' },
  { phase: 'Publication', tasks: ['Manuscript drafted', 'Peer review completed', 'Patient version created', 'Implementation tools developed'], color: '#10B981' },
]

export default function FrameworksPage() {
  const [activeTab, setActiveTab] = useState<'agree' | 'nice' | 'gin'>('agree')
  const [selectedProject, setSelectedProject] = useState(SEED_PROJECTS[0]?.id || '')
  const [scores, setScores] = useState<Record<string, Record<string, number>>>({})
  const [niceChecks, setNiceChecks] = useState<Set<string>>(new Set())
  const [ginChecks, setGinChecks] = useState<Set<string>>(new Set())

  const project = SEED_PROJECTS.find((p) => p.id === selectedProject)

  const domainScores = useMemo(() => {
    const projectScores = scores[selectedProject] || {}
    return AGREE_II_DOMAINS.map((d) => {
      const itemScores = d.items.map((item) => projectScores[`${d.id}_${item.label}`] ?? 0)
      const total = itemScores.reduce((s, v) => s + v, 0)
      const max = d.items.length * 7
      const pct = max > 0 ? Math.round((total / max) * 100) : 0
      return { ...d, score: pct }
    })
  }, [scores, selectedProject])

  const overallAgree = useMemo(() => {
    const ds = domainScores.map((d) => d.score)
    return ds.length ? Math.round(ds.reduce((s, v) => s + v, 0) / ds.length) : 0
  }, [domainScores])

  function setItemScore(domainId: string, itemLabel: string, value: number) {
    setScores((prev) => ({
      ...prev,
      [selectedProject]: { ...(prev[selectedProject] || {}), [`${domainId}_${itemLabel}`]: value },
    }))
  }

  const niceProgress = NICE_CHECKLIST.reduce((s, c) => s + c.items.length, 0)
  const niceComplete = NICE_CHECKLIST.reduce((s, c) => s + c.items.filter((i) => niceChecks.has(i)).length, 0)

  const ginTotal = GIN_MCMASTER.reduce((s, p) => s + p.tasks.length, 0)
  const ginComplete = GIN_MCMASTER.reduce((s, p) => s + p.tasks.filter((t) => ginChecks.has(t)).length, 0)

  const card: React.CSSProperties = { background: 'white', borderRadius: '10px', border: '1px solid #E5E5E0', padding: '20px' }
  const inp: React.CSSProperties = { padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E5E0', fontSize: '13px', background: '#FAF9F6' }

  const tabs = [
    { key: 'agree' as const, label: 'AGREE II', desc: 'Quality assessment' },
    { key: 'nice' as const, label: 'NICE Process', desc: 'Development checklist' },
    { key: 'gin' as const, label: 'GIN-McMaster', desc: 'Methodology tracking' },
  ]

  return (
    <>
      <Header title="Framework Compliance" subtitle="AGREE II, NICE, GIN-McMaster quality and process tracking" />
      <ActivePICOBanner moduleId="frameworks" />
      <div className="fade-in" style={{ padding: '24px 32px' }}>
        <AISuggestionPanel
          pageId="frameworks"
          title="AI Framework Compliance Suggestions"
          fields={[
            { key: 'overallAssessment', label: 'Overall Assessment (1-7)' },
            { key: 'recommended', label: 'Recommendation' },
          ]}
          onApply={(data) => {
            if (data.agreeII) {
              const newScores: Record<string, number> = {}
              Object.entries(data.agreeII).forEach(([domain, items]: [string, any]) => {
                Object.entries(items).forEach(([key, val]: [string, any]) => {
                  const domainMap: Record<string, string> = {
                    scopeAndPurpose: 'scope', stakeholderInvolvement: 'stakeholder',
                    rigourOfDevelopment: 'rigour', clarityOfPresentation: 'clarity',
                    applicability: 'applicability', editorialIndependence: 'editorial',
                  }
                  const d = domainMap[domain]
                  if (d) {
                    const itemObj = AGREE_II_DOMAINS.find(dd => dd.id === d)?.items
                    if (itemObj) {
                      const idx = parseInt(key.replace(/\D/g, '')) - 1
                      if (itemObj[idx]) newScores[`${d}_${itemObj[idx].label}`] = val as number
                    }
                  }
                })
              })
              setScores(prev => ({ ...prev, [selectedProject]: { ...(prev[selectedProject] || {}), ...newScores } }))
            }
          }}
        />
        {/* Project Selector + Summary */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center' }}>
          <select style={{ ...inp, minWidth: '300px' }} value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
            {SEED_PROJECTS.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          {project && (
            <div style={{ fontSize: '12px', color: '#6B7280' }}>
              Pathway: <strong>{project.pathway.replace(/_/g, ' ')}</strong> · Status: <strong>{project.status.replace(/_/g, ' ')}</strong>
              {project.agree_ii_score != null && <> · AGREE II: <strong>{project.agree_ii_score}%</strong></>}
            </div>
          )}
        </div>

        {/* Summary Cards + Radar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 200px', gap: '16px', marginBottom: '24px' }}>
          <div className="card-hover" style={{ ...card, textAlign: 'center', borderTop: '3px solid #6366F1' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: overallAgree >= 80 ? '#10B981' : overallAgree >= 60 ? '#F59E0B' : '#EF4444' }}>{overallAgree}%</div>
            <div style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AGREE II Score</div>
          </div>
          <div className="card-hover" style={{ ...card, textAlign: 'center', borderTop: '3px solid #10B981' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#10B981' }}>{niceComplete}/{niceProgress}</div>
            <div style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>NICE Checklist</div>
          </div>
          <div className="card-hover" style={{ ...card, textAlign: 'center', borderTop: '3px solid #D97757' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#D97757' }}>{ginComplete}/{ginTotal}</div>
            <div style={{ fontSize: '12px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>GIN-McMaster Tasks</div>
          </div>
          {/* Mini AGREE II Radar */}
          <div style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px' }}>
            <svg viewBox="0 0 200 200" width="170" height="170">
              {/* Radar grid */}
              {[20, 40, 60, 80, 100].map((r) => (
                <polygon key={r} points={domainScores.map((_, i) => {
                  const angle = (i * 360 / domainScores.length - 90) * Math.PI / 180
                  return `${100 + (r * 0.8) * Math.cos(angle)},${100 + (r * 0.8) * Math.sin(angle)}`
                }).join(' ')} fill="none" stroke="#E5E5E0" strokeWidth="0.5" />
              ))}
              {/* Radar axes */}
              {domainScores.map((_, i) => {
                const angle = (i * 360 / domainScores.length - 90) * Math.PI / 180
                return <line key={i} x1="100" y1="100" x2={100 + 80 * Math.cos(angle)} y2={100 + 80 * Math.sin(angle)} stroke="#E5E5E0" strokeWidth="0.5" />
              })}
              {/* Data polygon */}
              <polygon
                points={domainScores.map((d, i) => {
                  const angle = (i * 360 / domainScores.length - 90) * Math.PI / 180
                  const r = (d.score / 100) * 80
                  return `${100 + r * Math.cos(angle)},${100 + r * Math.sin(angle)}`
                }).join(' ')}
                fill="rgba(217,119,87,0.15)" stroke="#D97757" strokeWidth="1.5"
                style={{ transition: 'all 0.5s ease' }}
              />
              {/* Data dots + labels */}
              {domainScores.map((d, i) => {
                const angle = (i * 360 / domainScores.length - 90) * Math.PI / 180
                const r = (d.score / 100) * 80
                const lx = 100 + 92 * Math.cos(angle)
                const ly = 100 + 92 * Math.sin(angle)
                return (
                  <g key={d.id}>
                    <circle cx={100 + r * Math.cos(angle)} cy={100 + r * Math.sin(angle)} r="3" fill="#D97757" style={{ transition: 'cx 0.5s, cy 0.5s' }} />
                    <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fontSize="7" fill="#6B7280">{d.name.split(' ')[0]}</text>
                  </g>
                )
              })}
            </svg>
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
              {t.label} <span style={{ fontSize: '11px', color: '#9CA3AF' }}>— {t.desc}</span>
            </button>
          ))}
        </div>

        {/* AGREE II Tab */}
        {activeTab === 'agree' && (
          <div>
            {domainScores.map((domain) => (
              <div key={domain.id} style={{ ...card, marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>{domain.name}</h3>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>{domain.description}</div>
                  </div>
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '50%',
                    border: `3px solid ${domain.score >= 80 ? '#10B981' : domain.score >= 60 ? '#F59E0B' : '#EF4444'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: 700,
                    color: domain.score >= 80 ? '#10B981' : domain.score >= 60 ? '#F59E0B' : '#EF4444',
                  }}>
                    {domain.score}%
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  {domain.items.map((item) => {
                    const key = `${domain.id}_${item.label}`
                    const val = (scores[selectedProject] || {})[key] ?? 0
                    return (
                      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '6px 0' }}>
                        <div style={{ flex: 1, fontSize: '13px', color: '#374151' }}>{item.label}</div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                            <button key={n} onClick={() => setItemScore(domain.id, item.label, n)} style={{
                              width: '28px', height: '28px', borderRadius: '4px', border: '1px solid #E5E5E0',
                              background: val >= n ? (n >= 6 ? '#D1FAE5' : n >= 4 ? '#FEF3C7' : '#FEE2E2') : 'white',
                              color: val >= n ? (n >= 6 ? '#059669' : n >= 4 ? '#D97706' : '#DC2626') : '#9CA3AF',
                              fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                            }}>{n}</button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* NICE Tab */}
        {activeTab === 'nice' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {NICE_CHECKLIST.map((cat) => (
              <div key={cat.category} style={card}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>{cat.category}</h3>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                  {cat.items.map((item) => (
                    <div key={item} style={{
                      flex: 1, height: '4px', borderRadius: '2px',
                      background: niceChecks.has(item) ? '#10B981' : '#E5E5E0',
                    }} />
                  ))}
                </div>
                {cat.items.map((item) => (
                  <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="checkbox" checked={niceChecks.has(item)} onChange={(e) => {
                      const n = new Set(niceChecks)
                      e.target.checked ? n.add(item) : n.delete(item)
                      setNiceChecks(n)
                    }} />
                    <span style={{ color: niceChecks.has(item) ? '#059669' : '#374151', textDecoration: niceChecks.has(item) ? 'line-through' : 'none' }}>{item}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* GIN-McMaster Tab */}
        {activeTab === 'gin' && (
          <div>
            {GIN_MCMASTER.map((phase) => {
              const done = phase.tasks.filter((t) => ginChecks.has(t)).length
              const pct = Math.round((done / phase.tasks.length) * 100)
              return (
                <div key={phase.phase} style={{ ...card, marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: phase.color }} />
                      <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>{phase.phase}</h3>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: pct === 100 ? '#10B981' : '#6B7280' }}>{done}/{phase.tasks.length} ({pct}%)</span>
                  </div>
                  <div style={{ height: '6px', background: '#F3F4F6', borderRadius: '3px', marginBottom: '12px' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: phase.color, borderRadius: '3px', transition: 'width 0.3s' }} />
                  </div>
                  {phase.tasks.map((task) => (
                    <label key={task} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0', cursor: 'pointer', fontSize: '13px' }}>
                      <input type="checkbox" checked={ginChecks.has(task)} onChange={(e) => {
                        const n = new Set(ginChecks)
                        e.target.checked ? n.add(task) : n.delete(task)
                        setGinChecks(n)
                      }} />
                      <span style={{ color: ginChecks.has(task) ? '#059669' : '#374151' }}>{task}</span>
                    </label>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
      <PipelineControls moduleId="frameworks" />
    </>
  )
}
