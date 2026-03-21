'use client'

import { useState, useMemo } from 'react'
import Header from '@/components/Header'
import AISuggestionPanel from '@/components/AISuggestionPanel'
import AIAssistant from '@/components/AIAssistant'

// ═══════════════════════════════════════════════════════════════
// EUnetHTA Core Model + NICE/INAHTA best-practice domains
// ═══════════════════════════════════════════════════════════════

type DomainKey = 'description' | 'health_problem' | 'clinical_effectiveness' | 'safety' | 'cost_economic' | 'organizational' | 'ethical' | 'social' | 'legal'
type JudgmentValue = '' | 'favorable' | 'uncertain' | 'unfavorable'
type RecommendationType = '' | 'recommended' | 'recommended_with_conditions' | 'only_in_research' | 'not_recommended'
type MaturityStage = 'horizon_scanning' | 'rapid_assessment' | 'full_assessment' | 'reassessment'

interface HTADomain {
  key: DomainKey
  label: string
  shortLabel: string
  description: string
  color: string
  icon: string
  criteria: string[]
}

const HTA_DOMAINS: HTADomain[] = [
  {
    key: 'description', label: 'Technology Description', shortLabel: 'Description',
    description: 'Features, regulatory status, intended use, and current stage of development',
    color: '#6366F1', icon: '⊞',
    criteria: ['Technology type and mechanism of action', 'Regulatory status (SFDA/FDA/CE)', 'Intended use and target population', 'Administration route and setting', 'Comparators in current practice'],
  },
  {
    key: 'health_problem', label: 'Health Problem & Current Use', shortLabel: 'Health Problem',
    description: 'Epidemiology, disease burden, current management pathways in Saudi Arabia',
    color: '#8B5CF6', icon: '◉',
    criteria: ['Prevalence and incidence in KSA/GCC', 'Disease burden (DALYs, mortality)', 'Current clinical pathway and standard of care', 'Unmet clinical need', 'Target population characteristics'],
  },
  {
    key: 'clinical_effectiveness', label: 'Clinical Effectiveness', shortLabel: 'Effectiveness',
    description: 'Systematic review of efficacy and effectiveness evidence using GRADE',
    color: '#10B981', icon: '⬆',
    criteria: ['Systematic evidence search strategy', 'Study quality and risk of bias (GRADE)', 'Relative effectiveness vs. comparators', 'Magnitude and clinical significance of effect', 'Subgroup analyses and heterogeneity', 'Generalizability to Saudi population'],
  },
  {
    key: 'safety', label: 'Safety', shortLabel: 'Safety',
    description: 'Adverse events, contraindications, risk management, and post-market surveillance',
    color: '#EF4444', icon: '⚠',
    criteria: ['Frequency and severity of adverse events', 'Serious adverse events and mortality', 'Contraindications and warnings', 'Drug interactions or device failures', 'Risk management and mitigation measures', 'Post-market surveillance requirements'],
  },
  {
    key: 'cost_economic', label: 'Cost & Economic Evaluation', shortLabel: 'Economics',
    description: 'Cost-effectiveness, budget impact, and resource utilization analysis',
    color: '#F59E0B', icon: '◇',
    criteria: ['Cost of technology (acquisition + administration)', 'Incremental cost-effectiveness ratio (ICER)', 'Budget impact analysis (1–5 year horizon)', 'Cost per QALY vs. KSA willingness-to-pay threshold', 'Resource utilization changes', 'Sensitivity analysis robustness'],
  },
  {
    key: 'organizational', label: 'Organizational Aspects', shortLabel: 'Organizational',
    description: 'Implementation requirements, workforce, infrastructure, and workflow impact',
    color: '#0EA5E9', icon: '⊡',
    criteria: ['Infrastructure and equipment requirements', 'Workforce training and capacity needs', 'Care pathway redesign requirements', 'IT system and interoperability needs', 'Implementation timeline and phasing', 'Monitoring and audit requirements'],
  },
  {
    key: 'ethical', label: 'Ethical Analysis', shortLabel: 'Ethical',
    description: 'Autonomy, equity, justice, beneficence, and Sharia compliance considerations',
    color: '#D97757', icon: '⬡',
    criteria: ['Patient autonomy and informed consent', 'Equity of access across regions', 'Vulnerable population considerations', 'Privacy and data protection', 'Sharia compliance considerations', 'End-of-life and quality-of-life implications'],
  },
  {
    key: 'social', label: 'Social Aspects', shortLabel: 'Social',
    description: 'Patient experience, caregiver burden, cultural acceptability, and societal impact',
    color: '#EC4899', icon: '♥',
    criteria: ['Patient-reported outcomes and preferences', 'Caregiver burden and support needs', 'Cultural acceptability in Saudi context', 'Impact on daily living and work capacity', 'Public perception and media attention', 'Impact on health literacy'],
  },
  {
    key: 'legal', label: 'Legal Aspects', shortLabel: 'Legal',
    description: 'IP status, procurement, liability, and regulatory pathway',
    color: '#64748B', icon: '§',
    criteria: ['Patent and intellectual property status', 'Procurement and supply chain considerations', 'Liability and medico-legal implications', 'Data governance and privacy regulations', 'Cross-border regulatory alignment (GCC)', 'Off-label use governance'],
  },
]

interface HTAProject {
  id: string
  technology: string
  sponsor: string
  stage: MaturityStage
  created: string
  target: string
  domainProgress: Record<DomainKey, number> // 0-100
  judgments: Record<DomainKey, JudgmentValue>
  recommendation: RecommendationType
  notes: Record<DomainKey, string>
}

const STAGE_LABELS: Record<MaturityStage, { label: string; color: string }> = {
  horizon_scanning: { label: 'Horizon Scanning', color: '#8B5CF6' },
  rapid_assessment: { label: 'Rapid Assessment', color: '#F59E0B' },
  full_assessment: { label: 'Full Assessment', color: '#D97757' },
  reassessment: { label: 'Reassessment', color: '#10B981' },
}

const REC_LABELS: Record<RecommendationType, { label: string; color: string }> = {
  '': { label: 'Pending', color: '#9CA3AF' },
  recommended: { label: 'Recommended', color: '#10B981' },
  recommended_with_conditions: { label: 'Recommended with Conditions', color: '#F59E0B' },
  only_in_research: { label: 'Only in Research', color: '#6366F1' },
  not_recommended: { label: 'Not Recommended', color: '#EF4444' },
}

const JUDGMENT_COLORS: Record<JudgmentValue, string> = { '': '#E5E5E0', favorable: '#10B981', uncertain: '#F59E0B', unfavorable: '#EF4444' }

// === Seed data ===
const emptyJudgments = (): Record<DomainKey, JudgmentValue> => ({ description: '', health_problem: '', clinical_effectiveness: '', safety: '', cost_economic: '', organizational: '', ethical: '', social: '', legal: '' })
const emptyProgress = (): Record<DomainKey, number> => ({ description: 0, health_problem: 0, clinical_effectiveness: 0, safety: 0, cost_economic: 0, organizational: 0, ethical: 0, social: 0, legal: 0 })
const emptyNotes = (): Record<DomainKey, string> => ({ description: '', health_problem: '', clinical_effectiveness: '', safety: '', cost_economic: '', organizational: '', ethical: '', social: '', legal: '' })

const SEED_HTA: HTAProject[] = [
  {
    id: 'hta-1', technology: 'CAR-T Cell Therapy for DLBCL', sponsor: 'KSUMC Oncology',
    stage: 'full_assessment', created: '2025-09-01', target: '2026-03-01',
    domainProgress: { description: 100, health_problem: 90, clinical_effectiveness: 75, safety: 80, cost_economic: 60, organizational: 45, ethical: 70, social: 55, legal: 40 },
    judgments: { description: 'favorable', health_problem: 'favorable', clinical_effectiveness: 'favorable', safety: 'uncertain', cost_economic: 'uncertain', organizational: 'uncertain', ethical: 'favorable', social: 'favorable', legal: '' },
    recommendation: '', notes: emptyNotes(),
  },
  {
    id: 'hta-2', technology: 'AI-Assisted Diabetic Retinopathy Screening', sponsor: 'KSUMC Ophthalmology',
    stage: 'full_assessment', created: '2025-10-15', target: '2026-04-15',
    domainProgress: { description: 100, health_problem: 100, clinical_effectiveness: 85, safety: 90, cost_economic: 70, organizational: 60, ethical: 80, social: 75, legal: 50 },
    judgments: { description: 'favorable', health_problem: 'favorable', clinical_effectiveness: 'favorable', safety: 'favorable', cost_economic: 'favorable', organizational: 'uncertain', ethical: 'favorable', social: 'favorable', legal: 'uncertain' },
    recommendation: 'recommended_with_conditions', notes: emptyNotes(),
  },
  {
    id: 'hta-3', technology: 'Continuous Glucose Monitoring (Flash CGM)', sponsor: 'MOH Diabetes Initiative',
    stage: 'rapid_assessment', created: '2025-12-01', target: '2026-02-28',
    domainProgress: { description: 100, health_problem: 85, clinical_effectiveness: 70, safety: 75, cost_economic: 40, organizational: 30, ethical: 50, social: 60, legal: 20 },
    judgments: { description: 'favorable', health_problem: 'favorable', clinical_effectiveness: 'favorable', safety: 'favorable', cost_economic: '', organizational: '', ethical: '', social: '', legal: '' },
    recommendation: '', notes: emptyNotes(),
  },
  {
    id: 'hta-4', technology: 'Robotic-Assisted Knee Replacement System', sponsor: 'KSUMC Orthopaedics',
    stage: 'horizon_scanning', created: '2026-01-10', target: '2026-06-30',
    domainProgress: { description: 60, health_problem: 40, clinical_effectiveness: 20, safety: 15, cost_economic: 10, organizational: 5, ethical: 0, social: 0, legal: 0 },
    judgments: emptyJudgments(), recommendation: '', notes: emptyNotes(),
  },
]

// ═══════════════════════════════════════════════════════════════
// SVG Components
// ═══════════════════════════════════════════════════════════════

function DomainRadar({ progress, size = 220 }: { progress: Record<DomainKey, number>; size?: number }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 30
  const domains = HTA_DOMAINS
  const n = domains.length
  const angleStep = (2 * Math.PI) / n

  const gridLevels = [20, 40, 60, 80, 100]
  const getPoint = (i: number, pct: number) => {
    const angle = -Math.PI / 2 + i * angleStep
    return { x: cx + (r * pct / 100) * Math.cos(angle), y: cy + (r * pct / 100) * Math.sin(angle) }
  }

  const dataPoints = domains.map((d, i) => getPoint(i, progress[d.key]))
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label="HTA domain completion radar">
      {/* Grid */}
      {gridLevels.map((lvl) => {
        const pts = domains.map((_, i) => getPoint(i, lvl))
        const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z'
        return <path key={lvl} d={path} fill="none" stroke="#E5E5E0" strokeWidth={lvl === 100 ? 1.5 : 0.5} />
      })}
      {/* Axes */}
      {domains.map((d, i) => {
        const end = getPoint(i, 100)
        const labelPt = getPoint(i, 118)
        return (
          <g key={d.key}>
            <line x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="#E5E5E0" strokeWidth={0.5} />
            <text x={labelPt.x} y={labelPt.y} textAnchor="middle" dominantBaseline="middle" fontSize="8" fontWeight={600} fill="#6B7280">{d.shortLabel}</text>
          </g>
        )
      })}
      {/* Data polygon */}
      <path d={dataPath} fill="rgba(217,119,87,0.15)" stroke="#D97757" strokeWidth={2} />
      {/* Dots */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={domains[i].color} stroke="white" strokeWidth={1.5} />
      ))}
    </svg>
  )
}

function JudgmentMatrix({ judgments }: { judgments: Record<DomainKey, JudgmentValue> }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '4px' }}>
      {HTA_DOMAINS.map((d) => {
        const j = judgments[d.key]
        const color = JUDGMENT_COLORS[j]
        return (
          <div key={d.key} title={`${d.label}: ${j || 'Not assessed'}`} style={{
            height: '28px', borderRadius: '4px', background: j ? color + '20' : '#F3F4F6',
            border: `2px solid ${j ? color : '#E5E5E0'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '8px', fontWeight: 600, color: j ? color : '#9CA3AF',
            cursor: 'default',
          }}>
            {d.icon}
          </div>
        )
      })}
    </div>
  )
}

function OverallProgressBar({ progress }: { progress: Record<DomainKey, number> }) {
  const avg = Math.round(HTA_DOMAINS.reduce((s, d) => s + progress[d.key], 0) / HTA_DOMAINS.length)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: '#E5E5E0', overflow: 'hidden' }}>
        <div style={{ width: `${avg}%`, height: '100%', borderRadius: '3px', background: avg >= 80 ? '#10B981' : avg >= 50 ? '#F59E0B' : '#D97757', transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: '11px', fontWeight: 700, color: avg >= 80 ? '#10B981' : avg >= 50 ? '#F59E0B' : '#D97757', minWidth: '30px' }}>{avg}%</span>
    </div>
  )
}

function EvidenceImpactMatrix({ projects }: { projects: HTAProject[] }) {
  const w = 300, h = 220, pad = 40
  const plotW = w - pad * 2, plotH = h - pad * 2

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-label="Evidence strength vs impact matrix">
      {/* Background quadrants */}
      <rect x={pad} y={pad} width={plotW / 2} height={plotH / 2} fill="#FEE2E2" opacity={0.3} />
      <rect x={pad + plotW / 2} y={pad} width={plotW / 2} height={plotH / 2} fill="#D1FAE5" opacity={0.3} />
      <rect x={pad} y={pad + plotH / 2} width={plotW / 2} height={plotH / 2} fill="#F3F4F6" opacity={0.3} />
      <rect x={pad + plotW / 2} y={pad + plotH / 2} width={plotW / 2} height={plotH / 2} fill="#DBEAFE" opacity={0.3} />
      {/* Labels */}
      <text x={pad + plotW / 4} y={pad + 14} textAnchor="middle" fontSize="8" fill="#DC2626" fontWeight={600}>HIGH IMPACT / WEAK</text>
      <text x={pad + plotW * 3 / 4} y={pad + 14} textAnchor="middle" fontSize="8" fill="#059669" fontWeight={600}>HIGH IMPACT / STRONG</text>
      <text x={pad + plotW / 4} y={h - pad - 6} textAnchor="middle" fontSize="8" fill="#6B7280" fontWeight={600}>LOW IMPACT / WEAK</text>
      <text x={pad + plotW * 3 / 4} y={h - pad - 6} textAnchor="middle" fontSize="8" fill="#2563EB" fontWeight={600}>LOW IMPACT / STRONG</text>
      {/* Axes */}
      <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#9CA3AF" strokeWidth={1} />
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#9CA3AF" strokeWidth={1} />
      <text x={pad - 6} y={h / 2} textAnchor="middle" fontSize="8" fill="#6B7280" transform={`rotate(-90, ${pad - 6}, ${h / 2})`}>Clinical Impact</text>
      <text x={w / 2} y={h - pad + 14} textAnchor="middle" fontSize="8" fill="#6B7280">Evidence Strength</text>
      {/* Plot projects */}
      {projects.map((p) => {
        const effProg = p.domainProgress.clinical_effectiveness
        const healthProg = p.domainProgress.health_problem
        const x = pad + (effProg / 100) * plotW
        const y = h - pad - (healthProg / 100) * plotH
        const rec = REC_LABELS[p.recommendation]
        return (
          <g key={p.id}>
            <circle cx={x} cy={y} r={10} fill={rec.color + '30'} stroke={rec.color} strokeWidth={2} />
            <text x={x} y={y + 18} textAnchor="middle" fontSize="7" fill="#374151" fontWeight={500}>{p.technology.split(' ').slice(0, 2).join(' ')}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════
// Main Page Component
// ═══════════════════════════════════════════════════════════════

export default function HTAPage() {
  const [projects, setProjects] = useState<HTAProject[]>(SEED_HTA)
  const [selected, setSelected] = useState<string>(SEED_HTA[0].id)
  const [activeTab, setActiveTab] = useState<'overview' | 'domains' | 'deliberation'>('overview')
  const [expandedDomain, setExpandedDomain] = useState<DomainKey | null>(null)

  const project = useMemo(() => projects.find((p) => p.id === selected)!, [projects, selected])
  const overallProgress = useMemo(
    () => Math.round(HTA_DOMAINS.reduce((s, d) => s + project.domainProgress[d.key], 0) / HTA_DOMAINS.length),
    [project]
  )
  const judgedCount = useMemo(() => HTA_DOMAINS.filter((d) => project.judgments[d.key] !== '').length, [project])

  const updateJudgment = (domain: DomainKey, value: JudgmentValue) => {
    setProjects((prev) => prev.map((p) =>
      p.id === selected ? { ...p, judgments: { ...p.judgments, [domain]: value } } : p
    ))
  }

  const updateProgress = (domain: DomainKey, value: number) => {
    setProjects((prev) => prev.map((p) =>
      p.id === selected ? { ...p, domainProgress: { ...p.domainProgress, [domain]: value } } : p
    ))
  }

  const updateRecommendation = (rec: RecommendationType) => {
    setProjects((prev) => prev.map((p) =>
      p.id === selected ? { ...p, recommendation: rec } : p
    ))
  }

  const updateNotes = (domain: DomainKey, text: string) => {
    setProjects((prev) => prev.map((p) =>
      p.id === selected ? { ...p, notes: { ...p.notes, [domain]: text } } : p
    ))
  }

  const inp: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E5E0', fontSize: '13px', background: '#FAF9F6', boxSizing: 'border-box' }
  const card: React.CSSProperties = { background: 'white', borderRadius: '10px', border: '1px solid #E5E5E0', padding: '20px' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 600, color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }

  return (
    <>
      <Header title="Health Technology Assessment" subtitle="EUnetHTA Core Model — structured multi-domain appraisal" />
      <div className="fade-in" style={{ padding: '24px 32px' }}>
        <AISuggestionPanel
          pageId="hta"
          title="AI HTA Domain Suggestions"
          fields={[
            { key: 'technologyName', label: 'Technology' },
            { key: 'targetPopulation', label: 'Population' },
            { key: 'comparator', label: 'Comparator' },
            { key: 'overallRecommendation', label: 'Recommendation' },
            { key: 'conditions', label: 'Conditions' },
          ]}
          onApply={(data) => {
            if (data.domains) {
              const domainMap: Record<string, string> = {
                technology: 'technology', healthProblem: 'healthProblem',
                clinicalEffectiveness: 'clinicalEffectiveness', safety: 'safety',
                costEconomics: 'costEconomics', organizational: 'organizational',
                ethical: 'ethical', social: 'social', legal: 'legal',
              }
              setProjects(prev => prev.map(p => {
                if (p.id !== selected) return p
                const newJudgments = { ...p.judgments }
                const newProgress = { ...p.domainProgress }
                const newNotes = { ...p.notes }
                Object.entries(data.domains).forEach(([key, val]: [string, any]) => {
                  const dk = domainMap[key]
                  if (dk) {
                    newJudgments[dk as DomainKey] = val.judgment as JudgmentValue
                    newProgress[dk as DomainKey] = val.progress
                    newNotes[dk as DomainKey] = val.evidence
                  }
                })
                const rec = data.overallRecommendation === 'recommended_conditions'
                  ? 'recommended_conditions' : data.overallRecommendation || p.recommendation
                return { ...p, judgments: newJudgments, domainProgress: newProgress, notes: newNotes, recommendation: rec as RecommendationType }
              }))
            }
          }}
        />

        {/* ── Summary Stat Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Assessments', value: projects.length, color: '#D97757', icon: '⊞' },
            { label: 'In Full Assessment', value: projects.filter((p) => p.stage === 'full_assessment').length, color: '#10B981', icon: '⬆' },
            { label: 'Recommendations Made', value: projects.filter((p) => p.recommendation !== '').length, color: '#6366F1', icon: '◎' },
            { label: 'Avg Completion', value: `${Math.round(projects.reduce((s, p) => s + HTA_DOMAINS.reduce((a, d) => a + p.domainProgress[d.key], 0) / HTA_DOMAINS.length, 0) / projects.length)}%`, color: '#F59E0B', icon: '◉' },
          ].map((stat) => (
            <div key={stat.label} className="card-hover" style={{ ...card, display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: stat.color }}>
                {stat.icon}
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Assessment Selector ── */}
        <div style={{ ...card, marginBottom: '24px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ ...lbl, margin: 0 }}>Active Assessment:</span>
            <select
              aria-label="Select HTA project"
              value={selected}
              onChange={(e) => { setSelected(e.target.value); setExpandedDomain(null) }}
              style={{ ...inp, flex: 1, maxWidth: '400px' }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.technology}</option>
              ))}
            </select>
            <span style={{
              padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
              background: STAGE_LABELS[project.stage].color + '15',
              color: STAGE_LABELS[project.stage].color,
            }}>
              {STAGE_LABELS[project.stage].label}
            </span>
            <span style={{
              padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
              background: REC_LABELS[project.recommendation].color + '15',
              color: REC_LABELS[project.recommendation].color,
            }}>
              {REC_LABELS[project.recommendation].label}
            </span>
          </div>
          <div style={{ marginTop: '12px' }}>
            <OverallProgressBar progress={project.domainProgress} />
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #E5E5E0', paddingBottom: '0' }}>
          {(['overview', 'domains', 'deliberation'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              aria-pressed={activeTab === tab}
              style={{
                padding: '10px 20px', border: 'none', background: 'transparent',
                fontSize: '13px', fontWeight: activeTab === tab ? 700 : 500,
                color: activeTab === tab ? '#D97757' : '#6B7280',
                borderBottom: activeTab === tab ? '2px solid #D97757' : '2px solid transparent',
                cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s',
              }}
            >
              {tab === 'overview' ? 'Overview & Radar' : tab === 'domains' ? '9-Domain Assessment' : 'Deliberation & Decision'}
            </button>
          ))}
        </div>

        {/* ══════ TAB: Overview ══════ */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Radar */}
            <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px', alignSelf: 'flex-start' }}>Domain Completion Radar</h3>
              <DomainRadar progress={project.domainProgress} size={260} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px', justifyContent: 'center' }}>
                {HTA_DOMAINS.map((d) => (
                  <span key={d.key} style={{ fontSize: '10px', color: d.color, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                    {d.shortLabel} ({project.domainProgress[d.key]}%)
                  </span>
                ))}
              </div>
            </div>

            {/* Evidence-Impact Matrix */}
            <div style={{ ...card }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px' }}>Evidence Strength vs. Clinical Impact</h3>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <EvidenceImpactMatrix projects={projects} />
              </div>
              <div style={{ marginTop: '12px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '8px' }}>Judgment Summary</h4>
                <JudgmentMatrix judgments={project.judgments} />
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  {(['favorable', 'uncertain', 'unfavorable'] as JudgmentValue[]).map((j) => (
                    <span key={j} style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: JUDGMENT_COLORS[j], display: 'inline-block' }} />
                      <span style={{ color: '#6B7280', textTransform: 'capitalize' }}>{j}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Project Details Card */}
            <div style={{ ...card }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px' }}>Assessment Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><span style={lbl}>Technology</span><div style={{ fontSize: '13px', fontWeight: 500 }}>{project.technology}</div></div>
                <div><span style={lbl}>Sponsor</span><div style={{ fontSize: '13px', fontWeight: 500 }}>{project.sponsor}</div></div>
                <div><span style={lbl}>Stage</span><div style={{ fontSize: '13px', fontWeight: 500 }}>{STAGE_LABELS[project.stage].label}</div></div>
                <div><span style={lbl}>Target Date</span><div style={{ fontSize: '13px', fontWeight: 500 }}>{new Date(project.target).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div></div>
                <div><span style={lbl}>Domains Judged</span><div style={{ fontSize: '13px', fontWeight: 500 }}>{judgedCount} / {HTA_DOMAINS.length}</div></div>
                <div><span style={lbl}>Overall Progress</span><div style={{ fontSize: '13px', fontWeight: 500 }}>{overallProgress}%</div></div>
              </div>
            </div>

            {/* All Projects Mini Table */}
            <div style={{ ...card }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px' }}>All Assessments</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {projects.map((p) => {
                  const avg = Math.round(HTA_DOMAINS.reduce((s, d) => s + p.domainProgress[d.key], 0) / HTA_DOMAINS.length)
                  return (
                    <div
                      key={p.id}
                      onClick={() => { setSelected(p.id); setExpandedDomain(null) }}
                      role="button" tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') { setSelected(p.id); setExpandedDomain(null) }}}
                      style={{
                        padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                        border: p.id === selected ? '2px solid #D97757' : '1px solid #E5E5E0',
                        background: p.id === selected ? '#FFF7F4' : 'white',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#1A1A1A' }}>{p.technology}</span>
                        <span style={{ fontSize: '10px', fontWeight: 600, color: STAGE_LABELS[p.stage].color }}>{STAGE_LABELS[p.stage].label}</span>
                      </div>
                      <OverallProgressBar progress={p.domainProgress} />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════ TAB: 9-Domain Assessment ══════ */}
        {activeTab === 'domains' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {HTA_DOMAINS.map((domain) => {
              const isExpanded = expandedDomain === domain.key
              const progress = project.domainProgress[domain.key]
              const judgment = project.judgments[domain.key]

              return (
                <div key={domain.key} style={{ ...card, padding: '0', overflow: 'hidden', border: isExpanded ? `2px solid ${domain.color}` : '1px solid #E5E5E0' }}>
                  {/* Domain Header */}
                  <div
                    role="button" tabIndex={0} aria-expanded={isExpanded}
                    onClick={() => setExpandedDomain(isExpanded ? null : domain.key)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedDomain(isExpanded ? null : domain.key) }}}
                    style={{
                      padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px',
                      background: isExpanded ? `${domain.color}08` : 'white', transition: 'background 0.2s',
                    }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${domain.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: domain.color, fontWeight: 700, flexShrink: 0 }}>
                      {domain.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A1A', marginBottom: '2px' }}>{domain.label}</div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>{domain.description}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                      {judgment && (
                        <span style={{
                          padding: '3px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 700,
                          background: JUDGMENT_COLORS[judgment] + '15', color: JUDGMENT_COLORS[judgment],
                          textTransform: 'capitalize',
                        }}>
                          {judgment}
                        </span>
                      )}
                      <div style={{ width: '60px', height: '6px', borderRadius: '3px', background: '#E5E5E0', overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', borderRadius: '3px', background: domain.color, transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: domain.color, minWidth: '28px' }}>{progress}%</span>
                      <span style={{ color: '#9CA3AF', fontSize: '12px', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>▼</span>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div style={{ padding: '0 20px 20px', borderTop: '1px solid #E5E5E0' }}>
                      {/* Criteria checklist */}
                      <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                        <span style={lbl}>Assessment Criteria</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                          {domain.criteria.map((c, i) => (
                            <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#374151', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                defaultChecked={progress > (i + 1) * (100 / domain.criteria.length)}
                                style={{ accentColor: domain.color }}
                                onChange={() => {
                                  // Recalculate progress based on checked items
                                  const parent = document.querySelectorAll(`[data-domain="${domain.key}"] input[type="checkbox"]`)
                                  const checked = Array.from(parent).filter((el) => (el as HTMLInputElement).checked).length
                                  updateProgress(domain.key, Math.round((checked / domain.criteria.length) * 100))
                                }}
                                data-domain={domain.key}
                              />
                              {c}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Judgment selector */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <span style={lbl}>Domain Judgment</span>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            {(['favorable', 'uncertain', 'unfavorable'] as JudgmentValue[]).map((j) => (
                              <button
                                key={j}
                                onClick={() => updateJudgment(domain.key, judgment === j ? '' : j)}
                                aria-pressed={judgment === j}
                                style={{
                                  flex: 1, padding: '8px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                                  border: judgment === j ? `2px solid ${JUDGMENT_COLORS[j]}` : '1px solid #E5E5E0',
                                  background: judgment === j ? JUDGMENT_COLORS[j] + '15' : 'white',
                                  color: judgment === j ? JUDGMENT_COLORS[j] : '#6B7280',
                                  cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s',
                                }}
                              >
                                {j}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <span style={lbl}>Notes & Evidence Summary</span>
                          <textarea
                            aria-label={`Notes for ${domain.label}`}
                            value={project.notes[domain.key]}
                            onChange={(e) => updateNotes(domain.key, e.target.value)}
                            placeholder={`Key findings for ${domain.label}...`}
                            rows={3}
                            style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ══════ TAB: Deliberation & Decision ══════ */}
        {activeTab === 'deliberation' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
            {/* Structured Deliberation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Judgment Summary Table */}
              <div style={card}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 16px' }}>Domain Judgment Summary</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E5E5E0' }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: '#6B7280' }}>Domain</th>
                      <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 600, color: '#6B7280' }}>Progress</th>
                      <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 600, color: '#6B7280' }}>Judgment</th>
                      <th style={{ textAlign: 'center', padding: '8px 12px', fontWeight: 600, color: '#6B7280' }}>Key Concern</th>
                    </tr>
                  </thead>
                  <tbody>
                    {HTA_DOMAINS.map((d) => {
                      const j = project.judgments[d.key]
                      return (
                        <tr key={d.key} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: d.color, fontWeight: 700, fontSize: '14px' }}>{d.icon}</span>
                            <span style={{ fontWeight: 500 }}>{d.shortLabel}</span>
                          </td>
                          <td style={{ textAlign: 'center', padding: '8px 12px' }}>
                            <div style={{ width: '50px', height: '5px', borderRadius: '3px', background: '#E5E5E0', overflow: 'hidden', margin: '0 auto' }}>
                              <div style={{ width: `${project.domainProgress[d.key]}%`, height: '100%', background: d.color, borderRadius: '3px' }} />
                            </div>
                          </td>
                          <td style={{ textAlign: 'center', padding: '8px 12px' }}>
                            {j ? (
                              <span style={{
                                padding: '2px 10px', borderRadius: '10px', fontSize: '10px', fontWeight: 700,
                                background: JUDGMENT_COLORS[j] + '15', color: JUDGMENT_COLORS[j], textTransform: 'capitalize',
                              }}>{j}</span>
                            ) : (
                              <span style={{ color: '#9CA3AF', fontSize: '10px' }}>—</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center', padding: '8px 12px', fontSize: '10px', color: j === 'unfavorable' ? '#EF4444' : j === 'uncertain' ? '#F59E0B' : '#6B7280' }}>
                            {j === 'unfavorable' ? 'Needs mitigation' : j === 'uncertain' ? 'More evidence needed' : j === 'favorable' ? 'Sufficient' : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Balance of factors */}
              <div style={card}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px' }}>Balance of Factors</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  {(['favorable', 'uncertain', 'unfavorable'] as JudgmentValue[]).map((j) => {
                    const count = HTA_DOMAINS.filter((d) => project.judgments[d.key] === j).length
                    return (
                      <div key={j} style={{
                        padding: '16px', borderRadius: '10px', textAlign: 'center',
                        background: JUDGMENT_COLORS[j] + '10', border: `1px solid ${JUDGMENT_COLORS[j]}30`,
                      }}>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: JUDGMENT_COLORS[j] }}>{count}</div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: JUDGMENT_COLORS[j], textTransform: 'capitalize' }}>{j}</div>
                      </div>
                    )
                  })}
                </div>

                <span style={lbl}>Recommendation</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '6px' }}>
                  {(Object.entries(REC_LABELS) as [RecommendationType, { label: string; color: string }][])
                    .filter(([k]) => k !== '')
                    .map(([key, { label, color }]) => (
                      <button
                        key={key}
                        onClick={() => updateRecommendation(project.recommendation === key ? '' : key)}
                        aria-pressed={project.recommendation === key}
                        style={{
                          padding: '12px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                          border: project.recommendation === key ? `2px solid ${color}` : '1px solid #E5E5E0',
                          background: project.recommendation === key ? color + '15' : 'white',
                          color: project.recommendation === key ? color : '#6B7280',
                          cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                        }}
                      >
                        <span style={{ display: 'block', fontSize: '14px', marginBottom: '2px' }}>
                          {key === 'recommended' ? '✓' : key === 'recommended_with_conditions' ? '◇' : key === 'only_in_research' ? '⊡' : '✕'}
                        </span>
                        {label}
                      </button>
                    ))
                  }
                </div>
              </div>
            </div>

            {/* Decision Panel Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Current Decision */}
              <div style={{ ...card, background: project.recommendation ? REC_LABELS[project.recommendation].color + '08' : '#FAF9F6', borderColor: project.recommendation ? REC_LABELS[project.recommendation].color + '30' : '#E5E5E0' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px' }}>Current Decision</h3>
                <div style={{
                  fontSize: '16px', fontWeight: 700, marginBottom: '8px',
                  color: project.recommendation ? REC_LABELS[project.recommendation].color : '#9CA3AF',
                }}>
                  {REC_LABELS[project.recommendation].label}
                </div>
                <div style={{ fontSize: '11px', color: '#6B7280', lineHeight: 1.6 }}>
                  {project.recommendation === 'recommended' && 'The technology should be adopted for routine use. Benefits clearly outweigh risks and costs.'}
                  {project.recommendation === 'recommended_with_conditions' && 'Adoption is recommended subject to specified conditions (e.g., specific subpopulations, monitoring requirements, or price renegotiation).'}
                  {project.recommendation === 'only_in_research' && 'The technology should only be used within a clinical research framework until further evidence is available.'}
                  {project.recommendation === 'not_recommended' && 'The evidence does not support adoption. Costs and/or risks outweigh demonstrated benefits.'}
                  {!project.recommendation && 'Complete domain assessments and judgments before making a recommendation.'}
                </div>
              </div>

              {/* HTA Checklist */}
              <div style={card}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px' }}>Readiness Checklist</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { label: 'All domains ≥50% complete', check: HTA_DOMAINS.every((d) => project.domainProgress[d.key] >= 50) },
                    { label: 'All domains judged', check: judgedCount === HTA_DOMAINS.length },
                    { label: 'Clinical effectiveness assessed', check: project.domainProgress.clinical_effectiveness >= 70 },
                    { label: 'Economic evaluation complete', check: project.domainProgress.cost_economic >= 60 },
                    { label: 'Safety profile reviewed', check: project.domainProgress.safety >= 70 },
                    { label: 'Stakeholder input gathered', check: project.domainProgress.social >= 40 },
                    { label: 'Recommendation documented', check: project.recommendation !== '' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                      <span style={{
                        width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: item.check ? '#D1FAE5' : '#F3F4F6', color: item.check ? '#059669' : '#9CA3AF',
                        fontSize: '10px', fontWeight: 700, flexShrink: 0,
                      }}>
                        {item.check ? '✓' : '○'}
                      </span>
                      <span style={{ color: item.check ? '#374151' : '#9CA3AF' }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Framework References */}
              <div style={card}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 8px' }}>Methodology</h3>
                <div style={{ fontSize: '11px', color: '#6B7280', lineHeight: 1.6 }}>
                  This assessment follows the <strong>EUnetHTA Core Model 3.0</strong> with adaptations for the Saudi healthcare context (Vision 2030). Domain structure aligns with <strong>INAHTA</strong> and <strong>NICE</strong> standards. Economic evaluations use the <strong>Saudi HTA Guidelines</strong> willingness-to-pay threshold (SAR 187,500/QALY).
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Assistant */}
        <div style={{ marginTop: '24px' }}>
          <AIAssistant context="hta" />
        </div>
      </div>
    </>
  )
}
