'use client'

import { useState, useMemo } from 'react'
import Header from '@/components/Header'
import AIAssistant from '@/components/AIAssistant'
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

  const certainty = useMemo(() => {
    let level = assessment.studyDesign === 'rct' ? 3 : assessment.studyDesign === 'observational' ? 1 : 0
    if (assessment.riskOfBias === 'serious') level--
    if (assessment.inconsistency === 'serious') level--
    if (assessment.indirectness === 'serious') level--
    if (assessment.imprecision === 'serious') level--
    if (assessment.publicationBias === 'likely') level--
    if (assessment.largeEffect) level++
    if (assessment.doseResponse) level++
    if (assessment.plausibleConfounding) level++
    return CERTAINTY_LABELS[Math.max(0, Math.min(3, level))]
  }, [assessment])

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
      <div style={{ padding: '24px 32px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
       <div>
        {/* Active Appraisals */}
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Active Appraisals ({activeAppraisals.length})</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {activeAppraisals.map((p) => (
              <div key={p.id} style={{ ...card, padding: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{p.title}</div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>{p.description}</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: '#FEF3C7', color: '#92400E' }}>{p.pathway === 'de_novo' ? 'De Novo' : 'Adaptation'}</span>
                  {p.icd_codes?.map((c) => <span key={c} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#F3F4F6', color: '#374151' }}>{c}</span>)}
                </div>
                <button style={{ width: '100%', padding: '6px', borderRadius: '6px', border: 'none', background: '#D97757', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Begin Assessment</button>
              </div>
            ))}
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
          <h3 style={{ fontSize: '12px', fontWeight: 600, marginBottom: '10px', color: '#6B7280', textTransform: 'uppercase' }}>Downgrade Factors</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '16px' }}>
            {(['riskOfBias', 'inconsistency', 'indirectness', 'imprecision'] as const).map((key) => (
              <div key={key}>
                <label style={lbl}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}</label>
                <select style={{ ...inp, borderColor: assessment[key] === 'serious' ? '#EF4444' : '#E5E5E0' }} value={assessment[key]} onChange={(e) => setAssessment({ ...assessment, [key]: e.target.value })}>
                  <option value="not_serious">Not serious</option><option value="serious">Serious</option>
                </select>
              </div>
            ))}
            <div>
              <label style={lbl}>Publication Bias</label>
              <select style={{ ...inp, borderColor: assessment.publicationBias === 'likely' ? '#EF4444' : '#E5E5E0' }} value={assessment.publicationBias} onChange={(e) => setAssessment({ ...assessment, publicationBias: e.target.value as 'unlikely' | 'likely' })}>
                <option value="unlikely">Unlikely</option><option value="likely">Likely</option>
              </select>
            </div>
          </div>
          <h3 style={{ fontSize: '12px', fontWeight: 600, marginBottom: '10px', color: '#6B7280', textTransform: 'uppercase' }}>Upgrade Factors</h3>
          <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
            {(['largeEffect', 'doseResponse', 'plausibleConfounding'] as const).map((key) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input type="checkbox" checked={assessment[key]} onChange={(e) => setAssessment({ ...assessment, [key]: e.target.checked })} />
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
              </label>
            ))}
          </div>
          <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }} style={{ padding: '8px 24px', borderRadius: '6px', border: 'none', background: '#D97757', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>{saved ? 'Saved!' : 'Save to Project'}</button>
        </div>

        {/* EtR Table */}
        <div style={{ ...card, marginBottom: '28px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Evidence-to-Recommendation Framework</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead><tr style={{ borderBottom: '2px solid #E5E5E0' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, width: '22%' }}>Criterion</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, width: '28%' }}>Judgment</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>Notes</th>
            </tr></thead>
            <tbody>
              {ETR_CRITERIA.map((c) => (
                <tr key={c.key} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 500 }}>{c.label}</td>
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
             // Extract recommendation text if AI drafts one
             const match = text.match(/["\u201C\u201D]([Ww]e (?:recommend|suggest)[^"\u201C\u201D]+)["\u201C\u201D]/) || text.match(/([Ww]e (?:recommend|suggest)[^.]+\.)/)
             if (match) setRecText(match[1])
           }}
         />
       </div>
      </div>
    </>
  )
}
