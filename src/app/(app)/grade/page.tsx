'use client'

import { useState, useMemo, useCallback } from 'react'
import Header from '@/components/Header'
import AIAssistant from '@/components/AIAssistant'
import AISuggestionPanel from '@/components/AISuggestionPanel'
import { SEED_PROJECTS } from '@/lib/projects'

type Severity = 'not_serious' | 'serious'
type StudyDesign = 'rct' | 'observational' | 'case_series' | 'expert_opinion'

interface GradeAssessment {
  outcome: string
  studyDesign: StudyDesign
  numStudies: number
  riskOfBias: Severity
  inconsistency: Severity
  indirectness: Severity
  imprecision: Severity
  publicationBias: 'unlikely' | 'likely'
  largeEffect: boolean
  doseResponse: boolean
  plausibleConfounding: boolean
}

const CERTAINTY_LABELS = ['Very Low', 'Low', 'Moderate', 'High'] as const
const CERTAINTY_COLORS: Record<string, string> = {
  High: '#10B981', Moderate: '#6366F1', Low: '#F59E0B', 'Very Low': '#EF4444',
}

const ETR_CRITERIA = [
  { key: 'problem', label: 'Problem Priority', options: ['Important', 'Not important', 'Varies', 'Uncertain'] },
  { key: 'desirable', label: 'Desirable Effects', options: ['Large', 'Moderate', 'Small', 'Trivial', 'Varies', 'Unknown'] },
  { key: 'undesirable', label: 'Undesirable Effects', options: ['Large', 'Moderate', 'Small', 'Trivial', 'Varies', 'Unknown'] },
  { key: 'certainty', label: 'Certainty of Evidence', options: ['High', 'Moderate', 'Low', 'Very Low'] },
  { key: 'values', label: 'Values & Preferences', options: ['No important uncertainty', 'Possibly important uncertainty', 'Important uncertainty'] },
  { key: 'balance', label: 'Balance of Effects', options: ['Favors intervention', 'Probably favors intervention', 'Does not favor either', 'Probably favors comparison', 'Favors comparison', 'Varies'] },
  { key: 'resources', label: 'Resources Required', options: ['Large savings', 'Moderate savings', 'Negligible', 'Moderate costs', 'Large costs', 'Varies'] },
  { key: 'costEffect', label: 'Cost-Effectiveness', options: ['Favors intervention', 'Probably favors intervention', 'Does not favor either', 'Probably favors comparison', 'Favors comparison'] },
  { key: 'equity', label: 'Equity', options: ['Increased', 'Probably increased', 'Probably no impact', 'Probably reduced', 'Reduced'] },
  { key: 'acceptability', label: 'Acceptability', options: ['Yes', 'Probably yes', 'Probably no', 'No', 'Varies'] },
  { key: 'feasibility', label: 'Feasibility', options: ['Yes', 'Probably yes', 'Probably no', 'No', 'Varies'] },
]

/* SVG Certainty Gauge */
function CertaintyGauge({ level, label }: { level: number; label: string }) {
  const color = CERTAINTY_COLORS[label] || '#9CA3AF'
  const segments = 4
  const gapAngle = 8
  const totalAngle = 180
  const segAngle = (totalAngle - gapAngle * (segments - 1)) / segments

  return (
    <svg viewBox="0 0 200 120" width="200" height="120">
      {Array.from({ length: segments }).map((_, i) => {
        const startAngle = 180 + i * (segAngle + gapAngle)
        const endAngle = startAngle + segAngle
        const active = i < level + 1
        const r = 80
        const cx = 100
        const cy = 100
        const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180)
        const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180)
        const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180)
        const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180)
        return (
          <path
            key={i}
            d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
            fill="none"
            stroke={active ? color : '#E5E5E0'}
            strokeWidth={active ? 10 : 6}
            strokeLinecap="round"
            style={{ transition: 'stroke 0.4s, stroke-width 0.3s' }}
          />
        )
      })}
      <text x="100" y="88" textAnchor="middle" fontSize="16" fontWeight="700" fill={color}>{label}</text>
      <text x="100" y="106" textAnchor="middle" fontSize="10" fill="#9CA3AF">Certainty</text>
    </svg>
  )
}

/* SVG EtR Completion Ring */
function EtrRing({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? completed / total : 0
  const r = 36
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - pct)
  return (
    <svg viewBox="0 0 100 100" width="80" height="80">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#F3F4F6" strokeWidth="6" />
      <circle cx="50" cy="50" r={r} fill="none" stroke="#D97757" strokeWidth="6"
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x="50" y="47" textAnchor="middle" fontSize="16" fontWeight="700" fill="#1A1A1A">{completed}</text>
      <text x="50" y="60" textAnchor="middle" fontSize="8" fill="#9CA3AF">of {total}</text>
    </svg>
  )
}

export default function GradePage() {
  const [assessment, setAssessment] = useState<GradeAssessment>({
    outcome: '', studyDesign: 'rct', numStudies: 0,
    riskOfBias: 'not_serious', inconsistency: 'not_serious',
    indirectness: 'not_serious', imprecision: 'not_serious',
    publicationBias: 'unlikely',
    largeEffect: false, doseResponse: false, plausibleConfounding: false,
  })
  const [etrJudgments, setEtrJudgments] = useState<Record<string, string>>({})
  const [etrNotes, setEtrNotes] = useState<Record<string, string>>({})
  const [recText, setRecText] = useState('')
  const [saved, setSaved] = useState(false)

  const activeAppraisals = SEED_PROJECTS.filter((p) => p.status === 'grade_appraisal')

  const certaintyLevel = useMemo(() => {
    let level = assessment.studyDesign === 'rct' ? 3 : assessment.studyDesign === 'observational' ? 1 : 0
    if (assessment.riskOfBias === 'serious') level--
    if (assessment.inconsistency === 'serious') level--
    if (assessment.indirectness === 'serious') level--
    if (assessment.imprecision === 'serious') level--
    if (assessment.publicationBias === 'likely') level--
    if (assessment.largeEffect) level++
    if (assessment.doseResponse) level++
    if (assessment.plausibleConfounding) level++
    return Math.max(0, Math.min(3, level))
  }, [assessment])

  const certainty = CERTAINTY_LABELS[certaintyLevel]

  const etrCompleted = useMemo(() =>
    ETR_CRITERIA.filter((c) => etrJudgments[c.key]).length
  , [etrJudgments])

  const recStrength = useMemo(() => {
    const balance = etrJudgments.balance || ''
    const cert = etrJudgments.certainty || ''
    if (balance === 'Favors intervention' && (cert === 'High' || cert === 'Moderate')) return 'Strong For'
    if (balance === 'Favors comparison' && (cert === 'High' || cert === 'Moderate')) return 'Strong Against'
    if (balance.includes('favors intervention') || balance === 'Favors intervention') return 'Conditional For'
    if (balance.includes('favors comparison') || balance === 'Favors comparison') return 'Conditional Against'
    return 'Conditional For'
  }, [etrJudgments])

  const recColor: Record<string, string> = { 'Strong For': '#10B981', 'Conditional For': '#6366F1', 'Conditional Against': '#F59E0B', 'Strong Against': '#EF4444' }
  const inp: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E5E0', fontSize: '13px', background: '#FAF9F6', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 600, color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }
  const card: React.CSSProperties = { background: 'white', borderRadius: '10px', border: '1px solid #E5E5E0', padding: '20px' }

  return (
    <>
      <Header title="GRADE Workflow" subtitle="Evidence quality assessment and recommendation strength" />
      <div className="fade-in" style={{ padding: '24px 32px' }}>
        <AISuggestionPanel
          pageId="grade"
          title="AI GRADE Assessment Suggestions"
          fields={[
            { key: 'outcomeLabel', label: 'Outcome' },
            { key: 'studyDesign', label: 'Study Design' },
            { key: 'riskOfBias', label: 'Risk of Bias' },
            { key: 'inconsistency', label: 'Inconsistency' },
            { key: 'indirectness', label: 'Indirectness' },
            { key: 'imprecision', label: 'Imprecision' },
            { key: 'overallCertainty', label: 'Overall Certainty' },
            { key: 'recommendationText', label: 'Recommendation' },
            { key: 'recommendationStrength', label: 'Strength' },
          ]}
          onApply={(data) => {
            setAssessment(prev => ({
              ...prev,
              outcome: data.outcomeLabel || prev.outcome,
              studyDesign: data.studyDesign?.includes('Random') ? 'rct' : 'observational',
              numStudies: data.numberOfStudies || prev.numStudies,
              riskOfBias: data.riskOfBias || prev.riskOfBias,
              inconsistency: data.inconsistency || prev.inconsistency,
              indirectness: data.indirectness || prev.indirectness,
              imprecision: data.imprecision || prev.imprecision,
              publicationBias: data.publicationBias ? (data.publicationBias === 'undetected' ? 'unlikely' : 'likely') : prev.publicationBias,
              largeEffect: data.upgradeLargeEffect || false,
              doseResponse: data.upgradeDoseResponse || false,
              plausibleConfounding: data.upgradeConfounders || false,
            }))
            if (data.etrDesirableEffects) {
              setEtrJudgments(prev => ({
                ...prev,
                desirable: data.etrDesirableEffects === 'moderate' ? 'Moderate' : 'Large',
                undesirable: data.etrUndesirableEffects === 'small' ? 'Small' : 'Moderate',
                certainty: data.etrCertainty === 'moderate' ? 'Moderate' : 'Low',
                balance: data.etrBalance === 'probably_favors_intervention' ? 'Probably favors intervention' : 'Favors intervention',
                resources: data.etrResources === 'moderate_costs' ? 'Moderate costs' : 'Negligible',
                equity: data.etrEquity === 'probably_increased' ? 'Probably increased' : 'Probably no impact',
                acceptability: data.etrAcceptability === 'probably_yes' ? 'Probably yes' : 'Yes',
                feasibility: data.etrFeasibility === 'yes' ? 'Yes' : 'Probably yes',
              }))
            }
            if (data.recommendationText) setRecText(data.recommendationText)
          }}
        />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
       <div>
        {/* Active Appraisals */}
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Active Appraisals ({activeAppraisals.length})</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {activeAppraisals.map((p) => (
              <div key={p.id} className="card-hover" style={{ ...card, padding: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{p.title}</div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>{p.description}</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: '#FEF3C7', color: '#92400E' }}>{p.pathway === 'de_novo' ? 'De Novo' : 'Adaptation'}</span>
                  {p.icd_codes?.map((c) => <span key={c} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#F3F4F6', color: '#374151' }}>{c}</span>)}
                </div>
                <button aria-label={`Begin GRADE assessment for ${p.title}`} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: 'none', background: '#D97757', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Begin Assessment</button>
              </div>
            ))}
          </div>
        </div>

        {/* Certainty Gauge + EtR ring summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '28px' }}>
          <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <CertaintyGauge level={certaintyLevel} label={certainty} />
          </div>
          <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <EtrRing completed={etrCompleted} total={ETR_CRITERIA.length} />
            <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 500 }}>EtR Criteria Completed</div>
          </div>
          <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: recColor[recStrength] || '#6366F1' }}>{recStrength.split(' ')[0]}</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: recColor[recStrength] || '#6366F1' }}>{recStrength.split(' ')[1]}</div>
            <div style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recommendation</div>
          </div>
        </div>

        {/* GRADE Evidence Profile */}
        <div style={{ ...card, marginBottom: '28px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            GRADE Evidence Profile
            <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', background: CERTAINTY_COLORS[certainty] + '20', color: CERTAINTY_COLORS[certainty] }}>{certainty}</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div><label style={lbl}>Outcome</label><input style={inp} value={assessment.outcome} onChange={(e) => setAssessment({ ...assessment, outcome: e.target.value })} placeholder="e.g., Mortality at 30 days" /></div>
            <div><label style={lbl}>Study Design</label><select style={inp} value={assessment.studyDesign} onChange={(e) => setAssessment({ ...assessment, studyDesign: e.target.value as StudyDesign })}><option value="rct">Randomized Controlled Trial</option><option value="observational">Observational Study</option><option value="case_series">Case Series</option><option value="expert_opinion">Expert Opinion</option></select></div>
            <div><label style={lbl}>Number of Studies</label><input type="number" style={inp} value={assessment.numStudies || ''} onChange={(e) => setAssessment({ ...assessment, numStudies: parseInt(e.target.value) || 0 })} /></div>
          </div>

          {/* Downgrade Factors with visual indicators */}
          <h3 style={{ fontSize: '12px', fontWeight: 600, marginBottom: '10px', color: '#EF4444', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} />
            Downgrade Factors
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {(['riskOfBias', 'inconsistency', 'indirectness', 'imprecision'] as const).map((key) => (
              <div key={key}>
                <label style={lbl}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}</label>
                <select style={{ ...inp, borderColor: assessment[key] === 'serious' ? '#EF4444' : '#E5E5E0', background: assessment[key] === 'serious' ? '#FEF2F2' : '#FAF9F6', transition: 'border-color 0.2s, background 0.2s' }} value={assessment[key]} onChange={(e) => setAssessment({ ...assessment, [key]: e.target.value })}>
                  <option value="not_serious">Not serious</option><option value="serious">Serious</option>
                </select>
              </div>
            ))}
            <div>
              <label style={lbl}>Publication Bias</label>
              <select style={{ ...inp, borderColor: assessment.publicationBias === 'likely' ? '#EF4444' : '#E5E5E0', background: assessment.publicationBias === 'likely' ? '#FEF2F2' : '#FAF9F6', transition: 'border-color 0.2s, background 0.2s' }} value={assessment.publicationBias} onChange={(e) => setAssessment({ ...assessment, publicationBias: e.target.value as 'unlikely' | 'likely' })}>
                <option value="unlikely">Unlikely</option><option value="likely">Likely</option>
              </select>
            </div>
          </div>

          <h3 style={{ fontSize: '12px', fontWeight: 600, marginBottom: '10px', color: '#10B981', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
            Upgrade Factors
          </h3>
          <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
            {(['largeEffect', 'doseResponse', 'plausibleConfounding'] as const).map((key) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', background: assessment[key] ? '#ECFDF5' : 'transparent', border: `1px solid ${assessment[key] ? '#10B981' : '#E5E5E0'}`, transition: 'all 0.2s' }}>
                <input type="checkbox" checked={assessment[key]} onChange={(e) => setAssessment({ ...assessment, [key]: e.target.checked })} />
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
              </label>
            ))}
          </div>
          <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }} style={{ padding: '8px 24px', borderRadius: '6px', border: 'none', background: '#D97757', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s' }}>{saved ? 'Saved!' : 'Save to Project'}</button>
        </div>

        {/* EtR Table */}
        <div style={{ ...card, marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Evidence-to-Recommendation Framework</h2>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>{etrCompleted}/{ETR_CRITERIA.length} completed</span>
          </div>
          {/* Progress bar */}
          <div style={{ height: '4px', background: '#F3F4F6', borderRadius: '2px', marginBottom: '16px' }}>
            <div style={{ height: '100%', width: `${(etrCompleted / ETR_CRITERIA.length) * 100}%`, background: 'linear-gradient(90deg, #D97757, #E8956F)', borderRadius: '2px', transition: 'width 0.4s ease' }} />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead><tr style={{ borderBottom: '2px solid #E5E5E0' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, width: '22%' }}>Criterion</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, width: '28%' }}>Judgment</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>Notes</th>
            </tr></thead>
            <tbody>
              {ETR_CRITERIA.map((c) => (
                <tr key={c.key} style={{ borderBottom: '1px solid #F3F4F6', background: etrJudgments[c.key] ? '#FAFFF9' : 'transparent', transition: 'background 0.2s' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 500 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: etrJudgments[c.key] ? '#10B981' : '#E5E5E0', transition: 'background 0.2s' }} />
                      {c.label}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <select style={inp} value={etrJudgments[c.key] || ''} onChange={(e) => setEtrJudgments({ ...etrJudgments, [c.key]: e.target.value })}>
                      <option value="">Select...</option>
                      {c.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <textarea style={{ ...inp, height: '32px', resize: 'vertical' }} value={etrNotes[c.key] || ''} onChange={(e) => setEtrNotes({ ...etrNotes, [c.key]: e.target.value })} placeholder="Rationale..." />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recommendation */}
        <div style={card}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            Recommendation
            <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 14px', borderRadius: '20px', background: (recColor[recStrength] || '#6366F1') + '20', color: recColor[recStrength] || '#6366F1' }}>{recStrength}</span>
          </h2>
          <textarea style={{ ...inp, height: '80px', resize: 'vertical', marginBottom: '12px' }} value={recText} onChange={(e) => setRecText(e.target.value)} placeholder="We recommend / suggest that..." />
          <div style={{ background: '#FAF9F6', borderRadius: '8px', padding: '12px', fontSize: '12px', color: '#6B7280' }}>
            <strong>Summary: </strong>
            {Object.entries(etrJudgments).filter(([, v]) => v).map(([k, v]) => `${ETR_CRITERIA.find((c) => c.key === k)?.label}: ${v}`).join(' · ') || 'Complete the EtR table to see a summary here.'}
          </div>
        </div>
       </div>

       {/* AI Sidebar */}
       <div>
         <AIAssistant
           context={`User is on the GRADE Workflow page. Current assessment: Outcome="${assessment.outcome}", Study design="${assessment.studyDesign}", ${assessment.numStudies} studies. Downgrade factors: Risk of bias=${assessment.riskOfBias}, Inconsistency=${assessment.inconsistency}, Indirectness=${assessment.indirectness}, Imprecision=${assessment.imprecision}, Publication bias=${assessment.publicationBias}. Upgrade factors: Large effect=${assessment.largeEffect}, Dose-response=${assessment.doseResponse}, Plausible confounding=${assessment.plausibleConfounding}. Certainty: ${certainty}. EtR judgments: ${JSON.stringify(etrJudgments)}. Recommendation strength: ${recStrength}. Current recommendation text: "${recText}".`}
           placeholder="Ask about GRADE methodology..."
           quickActions={[
             { label: 'Explain this certainty', prompt: `The calculated certainty is "${certainty}" for outcome "${assessment.outcome || '(not set)'}". Study design: ${assessment.studyDesign}. Explain why this certainty level was reached given the current downgrade/upgrade factors, and what would need to change to increase it.` },
             { label: 'Help with EtR', prompt: `I'm completing the Evidence-to-Recommendation table. Current judgments: ${Object.entries(etrJudgments).filter(([,v]) => v).map(([k,v]) => `${k}: ${v}`).join(', ') || 'none yet'}. Help me think through the remaining criteria. The certainty of evidence is ${certainty}.` },
             { label: 'Draft recommendation', prompt: `Based on this assessment — Certainty: ${certainty}, Strength: ${recStrength}, Outcome: "${assessment.outcome || '(not set)'}", EtR balance: "${etrJudgments.balance || 'not set'}" — draft a formal clinical recommendation using standard GRADE wording ("We recommend/suggest..."). Include the strength and certainty in the statement.` },
             { label: 'Risk of bias guide', prompt: 'Walk me through how to assess risk of bias for this GRADE profile. What specific signals should I look for in the included studies? Cover allocation concealment, blinding, attrition, and selective reporting.' },
             { label: 'Saudi context', prompt: `For the outcome "${assessment.outcome || 'this clinical topic'}", what Saudi-specific considerations should inform the EtR judgments? Consider Vision 2030 health priorities, local disease burden, MOH guidelines, cost implications in the Saudi health system, and cultural acceptability.` },
           ]}
           onSuggestion={(text) => {
             const match = text.match(/["\u201C\u201D]([Ww]e (?:recommend|suggest)[^"\u201C\u201D]+)["\u201C\u201D]/) || text.match(/([Ww]e (?:recommend|suggest)[^.]+\.)/)
             if (match) setRecText(match[1])
           }}
         />
       </div>
      </div>
      </div>
    </>
  )
}
