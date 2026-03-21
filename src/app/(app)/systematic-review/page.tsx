'use client'

import { useState, useMemo } from 'react'
import Header from '@/components/Header'
import AIAssistant from '@/components/AIAssistant'
import AISuggestionPanel from '@/components/AISuggestionPanel'
import ActivePICOBanner from '@/components/ActivePICOBanner'
import PipelineControls from '@/components/PipelineControls'

// === PRISMA Flow ===
interface PrismaStage {
  label: string
  key: string
  description: string
}

const PRISMA_STAGES: PrismaStage[] = [
  { label: 'Identification', key: 'identification', description: 'Records identified through database searching' },
  { label: 'Screening', key: 'screening', description: 'Records after duplicates removed, screened by title/abstract' },
  { label: 'Eligibility', key: 'eligibility', description: 'Full-text articles assessed for eligibility' },
  { label: 'Included', key: 'included', description: 'Studies included in qualitative/quantitative synthesis' },
]

// === Risk of Bias Domains ===
type RoBJudgment = 'low' | 'some_concerns' | 'high' | ''
const ROB_COLORS: Record<string, string> = { low: '#10B981', some_concerns: '#F59E0B', high: '#EF4444' }
const ROB_LABELS: Record<string, string> = { low: 'Low', some_concerns: 'Some Concerns', high: 'High', '': 'Not assessed' }

const ROB2_DOMAINS = [
  { key: 'randomization', label: 'Randomization process' },
  { key: 'deviations', label: 'Deviations from intervention' },
  { key: 'missing', label: 'Missing outcome data' },
  { key: 'measurement', label: 'Measurement of outcome' },
  { key: 'selection', label: 'Selection of reported result' },
]

// === Study data for forest plot ===
interface StudyData {
  id: string
  name: string
  effectSize: number
  lowerCI: number
  upperCI: number
  weight: number
  rob: Record<string, RoBJudgment>
}

const SEED_STUDIES: StudyData[] = [
  { id: 's1', name: 'Ahmed et al. 2023', effectSize: 0.72, lowerCI: 0.55, upperCI: 0.94, weight: 18.3, rob: { randomization: 'low', deviations: 'low', missing: 'low', measurement: 'some_concerns', selection: 'low' } },
  { id: 's2', name: 'Chen et al. 2022', effectSize: 0.85, lowerCI: 0.68, upperCI: 1.06, weight: 22.1, rob: { randomization: 'low', deviations: 'some_concerns', missing: 'low', measurement: 'low', selection: 'low' } },
  { id: 's3', name: 'Davis et al. 2023', effectSize: 0.61, lowerCI: 0.42, upperCI: 0.89, weight: 14.7, rob: { randomization: 'low', deviations: 'low', missing: 'some_concerns', measurement: 'low', selection: 'low' } },
  { id: 's4', name: 'El-Rashidi et al. 2021', effectSize: 0.78, lowerCI: 0.59, upperCI: 1.03, weight: 16.5, rob: { randomization: 'some_concerns', deviations: 'low', missing: 'low', measurement: 'low', selection: 'some_concerns' } },
  { id: 's5', name: 'Fukuda et al. 2022', effectSize: 0.69, lowerCI: 0.51, upperCI: 0.93, weight: 15.2, rob: { randomization: 'low', deviations: 'low', missing: 'low', measurement: 'low', selection: 'low' } },
  { id: 's6', name: 'Garcia et al. 2023', effectSize: 0.91, lowerCI: 0.74, upperCI: 1.12, weight: 13.2, rob: { randomization: 'low', deviations: 'high', missing: 'some_concerns', measurement: 'low', selection: 'low' } },
]

export default function SystematicReviewPage() {
  // PRISMA state
  const [prisma, setPrisma] = useState({
    dbRecords: 1247, otherRecords: 89, duplicates: 312,
    titleAbstractExcluded: 856, fullTextRetrieved: 168,
    fullTextExcluded: 127, excludeReasons: 'Wrong population (42), Wrong intervention (35), Wrong outcome (28), Not RCT (22)',
    qualSynthesis: 41, quantSynthesis: 28,
  })

  // Studies
  const [studies, setStudies] = useState<StudyData[]>(SEED_STUDIES)
  const [newStudy, setNewStudy] = useState({ name: '', effectSize: '', lowerCI: '', upperCI: '', weight: '' })

  // Heterogeneity
  const [modelType, setModelType] = useState<'fixed' | 'random'>('random')

  // Meta-analysis calculations
  const pooled = useMemo(() => {
    if (studies.length === 0) return { effect: 0, lower: 0, upper: 0, i2: 0, q: 0, tau2: 0, pHet: 0 }
    const totalW = studies.reduce((s, st) => s + st.weight, 0)
    const weightedEffect = studies.reduce((s, st) => s + st.effectSize * st.weight, 0) / totalW

    // Cochran's Q
    const q = studies.reduce((s, st) => s + st.weight * Math.pow(st.effectSize - weightedEffect, 2), 0)
    const df = studies.length - 1
    const i2 = df > 0 ? Math.max(0, ((q - df) / q) * 100) : 0
    const tau2 = df > 0 ? Math.max(0, (q - df) / (totalW - studies.reduce((s, st) => s + st.weight * st.weight, 0) / totalW)) : 0
    const pHet = 1 - gammaCDF(q / 2, df / 2) // approximate

    // SE of pooled
    const se = modelType === 'fixed'
      ? Math.sqrt(1 / totalW)
      : Math.sqrt(1 / studies.reduce((s, st) => s + 1 / (1 / st.weight + tau2), 0))
    const lower = weightedEffect - 1.96 * se
    const upper = weightedEffect + 1.96 * se

    return { effect: weightedEffect, lower, upper, i2, q, tau2, pHet }
  }, [studies, modelType])

  // Publication bias (simple Egger-like)
  const eggerIntercept = useMemo(() => {
    if (studies.length < 3) return null
    const n = studies.length
    const ses = studies.map((s) => (s.upperCI - s.lowerCI) / (2 * 1.96))
    const zs = studies.map((s, i) => s.effectSize / ses[i])
    const precs = ses.map((se) => 1 / se)
    const meanZ = zs.reduce((a, b) => a + b, 0) / n
    const meanPrec = precs.reduce((a, b) => a + b, 0) / n
    const num = zs.reduce((s, z, i) => s + (precs[i] - meanPrec) * (z - meanZ), 0)
    const den = precs.reduce((s, p) => s + Math.pow(p - meanPrec, 2), 0)
    const slope = den > 0 ? num / den : 0
    const intercept = meanZ - slope * meanPrec
    return { intercept: Math.abs(intercept), pValue: Math.abs(intercept) > 1.96 ? '< 0.05' : '> 0.05' }
  }, [studies])

  // GRADE certainty from RoB + heterogeneity
  const gradeCertainty = useMemo(() => {
    let level = 4 // Start at High for RCTs
    // Downgrade for RoB
    const highRoB = studies.some((s) => Object.values(s.rob).includes('high'))
    if (highRoB) level--
    // Downgrade for heterogeneity
    if (pooled.i2 > 75) level -= 2
    else if (pooled.i2 > 50) level--
    // Downgrade for imprecision
    if (pooled.lower < 1 && pooled.upper > 1) level-- // crosses null for OR
    return ['Very Low', 'Low', 'Moderate', 'High'][Math.max(0, Math.min(3, level - 1))]
  }, [studies, pooled])

  function addStudy() {
    if (!newStudy.name || !newStudy.effectSize) return
    const s: StudyData = {
      id: `s-${Date.now()}`, name: newStudy.name,
      effectSize: parseFloat(newStudy.effectSize), lowerCI: parseFloat(newStudy.lowerCI),
      upperCI: parseFloat(newStudy.upperCI), weight: parseFloat(newStudy.weight) || 10,
      rob: { randomization: '', deviations: '', missing: '', measurement: '', selection: '' },
    }
    setStudies([...studies, s])
    setNewStudy({ name: '', effectSize: '', lowerCI: '', upperCI: '', weight: '' })
  }

  function updateRoB(studyId: string, domain: string, value: RoBJudgment) {
    setStudies(studies.map((s) => s.id === studyId ? { ...s, rob: { ...s.rob, [domain]: value } } : s))
  }

  const card: React.CSSProperties = { background: 'white', borderRadius: '10px', border: '1px solid #E5E5E0', padding: '20px' }
  const inp: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E5E0', fontSize: '13px', background: '#FAF9F6', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 600, color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }
  const CERT_COLORS: Record<string, string> = { High: '#10B981', Moderate: '#6366F1', Low: '#F59E0B', 'Very Low': '#EF4444' }

  return (
    <>
      <Header title="Systematic Review & Meta-Analysis" subtitle="PRISMA 2020 workflow with forest plot, heterogeneity, and publication bias assessment" />
      <ActivePICOBanner moduleId="synthesis" />
      <div style={{ padding: '24px 32px 0' }}>
        <AISuggestionPanel
          pageId="synthesis"
          title="AI SR/MA Suggestions"
          fields={[
            { key: 'totalIdentified', label: 'Records Identified' },
            { key: 'includedStudies', label: 'Included Studies' },
            { key: 'includedInMA', label: 'In Meta-Analysis' },
            { key: 'modelType', label: 'Model Type' },
            { key: 'pooledEffect', label: 'Pooled Effect (OR)' },
            { key: 'heterogeneity', label: 'Heterogeneity' },
          ]}
          onApply={(data) => {
            if (data.totalIdentified) setPrisma(prev => ({
              ...prev,
              dbRecords: data.totalIdentified,
              duplicates: data.duplicatesRemoved || prev.duplicates,
              quantSynthesis: data.includedInMA || prev.quantSynthesis,
              qualSynthesis: data.includedStudies || prev.qualSynthesis,
            }))
            if (data.modelType) setModelType(data.modelType)
            if (data.studies?.length) {
              setStudies(data.studies.map((s: any) => ({
                id: s.id, name: s.author, effectSize: s.effectSize,
                lowerCI: s.ciLower, upperCI: s.ciUpper, weight: s.weight,
              })))
            }
          }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
        <div>
          {/* PRISMA 2020 Flow */}
          <div style={{ ...card, marginBottom: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              PRISMA 2020 Flow Diagram
              <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '12px', background: '#EFF6FF', color: '#2563EB', fontWeight: 500 }}>Interactive</span>
            </h2>

            {/* Identification */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <div style={lbl}>Database Records</div>
                <input type="number" style={{ ...inp, background: 'white' }} value={prisma.dbRecords} onChange={(e) => setPrisma({ ...prisma, dbRecords: parseInt(e.target.value) || 0 })} />
              </div>
              <div style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <div style={lbl}>Other Sources</div>
                <input type="number" style={{ ...inp, background: 'white' }} value={prisma.otherRecords} onChange={(e) => setPrisma({ ...prisma, otherRecords: parseInt(e.target.value) || 0 })} />
              </div>
              <div style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <div style={lbl}>Duplicates Removed</div>
                <input type="number" style={{ ...inp, background: 'white' }} value={prisma.duplicates} onChange={(e) => setPrisma({ ...prisma, duplicates: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: '18px', marginBottom: '8px' }}>↓</div>

            {/* Screening */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div style={{ flex: 2, padding: '12px', borderRadius: '8px', background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                <div style={lbl}>Records Screened (Title/Abstract)</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#EA580C' }}>{prisma.dbRecords + prisma.otherRecords - prisma.duplicates}</div>
              </div>
              <div style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <div style={lbl}>Excluded</div>
                <input type="number" style={{ ...inp, background: 'white' }} value={prisma.titleAbstractExcluded} onChange={(e) => setPrisma({ ...prisma, titleAbstractExcluded: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: '18px', marginBottom: '8px' }}>↓</div>

            {/* Eligibility */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div style={{ flex: 2, padding: '12px', borderRadius: '8px', background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
                <div style={lbl}>Full-Text Assessed</div>
                <input type="number" style={{ ...inp, background: 'white' }} value={prisma.fullTextRetrieved} onChange={(e) => setPrisma({ ...prisma, fullTextRetrieved: parseInt(e.target.value) || 0 })} />
              </div>
              <div style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <div style={lbl}>Excluded (with reasons)</div>
                <input type="number" style={{ ...inp, background: 'white', marginBottom: '6px' }} value={prisma.fullTextExcluded} onChange={(e) => setPrisma({ ...prisma, fullTextExcluded: parseInt(e.target.value) || 0 })} />
                <textarea style={{ ...inp, background: 'white', height: '50px', resize: 'vertical', fontSize: '11px' }} value={prisma.excludeReasons} onChange={(e) => setPrisma({ ...prisma, excludeReasons: e.target.value })} placeholder="Reasons for exclusion..." />
              </div>
            </div>
            <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: '18px', marginBottom: '8px' }}>↓</div>

            {/* Included */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, padding: '14px', borderRadius: '8px', background: '#ECFDF5', border: '2px solid #6EE7B7' }}>
                <div style={lbl}>Qualitative Synthesis</div>
                <input type="number" style={{ ...inp, background: 'white' }} value={prisma.qualSynthesis} onChange={(e) => setPrisma({ ...prisma, qualSynthesis: parseInt(e.target.value) || 0 })} />
              </div>
              <div style={{ flex: 1, padding: '14px', borderRadius: '8px', background: '#ECFDF5', border: '2px solid #10B981' }}>
                <div style={lbl}>Quantitative Synthesis (Meta-Analysis)</div>
                <input type="number" style={{ ...inp, background: 'white' }} value={prisma.quantSynthesis} onChange={(e) => setPrisma({ ...prisma, quantSynthesis: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
          </div>

          {/* Forest Plot */}
          <div style={{ ...card, marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                Forest Plot
                <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px', background: CERT_COLORS[gradeCertainty] + '20', color: CERT_COLORS[gradeCertainty] }}>
                  GRADE: {gradeCertainty}
                </span>
              </h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', color: '#6B7280' }}>Model:</label>
                <select style={{ ...inp, width: 'auto' }} value={modelType} onChange={(e) => setModelType(e.target.value as 'fixed' | 'random')}>
                  <option value="fixed">Fixed Effect</option>
                  <option value="random">Random Effects</option>
                </select>
              </div>
            </div>

            {/* Visual Forest Plot */}
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: '600px' }}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 80px 100px', gap: '8px', padding: '6px 0', borderBottom: '2px solid #E5E5E0', fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>
                  <div>Study</div>
                  <div style={{ textAlign: 'center' }}>Effect Size (95% CI)</div>
                  <div style={{ textAlign: 'right' }}>Weight</div>
                  <div style={{ textAlign: 'right' }}>OR [95% CI]</div>
                </div>

                {/* Studies */}
                {studies.map((s) => {
                  const plotMin = 0.2, plotMax = 1.8
                  const range = plotMax - plotMin
                  const center = ((s.effectSize - plotMin) / range) * 100
                  const lo = ((s.lowerCI - plotMin) / range) * 100
                  const hi = ((s.upperCI - plotMin) / range) * 100
                  const nullLine = ((1 - plotMin) / range) * 100
                  const dotSize = Math.max(6, Math.min(16, s.weight * 0.7))

                  return (
                    <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 80px 100px', gap: '8px', padding: '8px 0', borderBottom: '1px solid #F3F4F6', alignItems: 'center' }}>
                      <div style={{ fontSize: '12px', fontWeight: 500 }}>{s.name}</div>
                      <div style={{ position: 'relative', height: '24px' }}>
                        {/* Null line */}
                        <div style={{ position: 'absolute', left: `${nullLine}%`, top: 0, bottom: 0, width: '1px', background: '#9CA3AF', opacity: 0.5 }} />
                        {/* CI line */}
                        <div style={{ position: 'absolute', left: `${Math.max(0, lo)}%`, right: `${Math.max(0, 100 - hi)}%`, top: '50%', height: '2px', background: '#374151', transform: 'translateY(-50%)' }} />
                        {/* Point estimate */}
                        <div style={{
                          position: 'absolute', left: `${center}%`, top: '50%',
                          width: `${dotSize}px`, height: `${dotSize}px`,
                          background: s.effectSize < 1 ? '#10B981' : '#EF4444',
                          borderRadius: '2px', transform: 'translate(-50%, -50%) rotate(45deg)',
                        }} />
                      </div>
                      <div style={{ fontSize: '11px', textAlign: 'right', color: '#6B7280' }}>{s.weight.toFixed(1)}%</div>
                      <div style={{ fontSize: '11px', textAlign: 'right', fontFamily: 'monospace' }}>
                        {s.effectSize.toFixed(2)} [{s.lowerCI.toFixed(2)}, {s.upperCI.toFixed(2)}]
                      </div>
                    </div>
                  )
                })}

                {/* Pooled diamond */}
                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 80px 100px', gap: '8px', padding: '10px 0', borderTop: '2px solid #1E1E2E', alignItems: 'center', marginTop: '4px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700 }}>Pooled ({modelType === 'random' ? 'RE' : 'FE'})</div>
                  <div style={{ position: 'relative', height: '24px' }}>
                    {(() => {
                      const plotMin = 0.2, plotMax = 1.8, range = plotMax - plotMin
                      const nullLine = ((1 - plotMin) / range) * 100
                      const ctr = ((pooled.effect - plotMin) / range) * 100
                      const lo = ((pooled.lower - plotMin) / range) * 100
                      const hi = ((pooled.upper - plotMin) / range) * 100
                      return (
                        <>
                          <div style={{ position: 'absolute', left: `${nullLine}%`, top: 0, bottom: 0, width: '1px', background: '#9CA3AF', opacity: 0.5 }} />
                          <svg style={{ position: 'absolute', left: `${lo}%`, width: `${hi - lo}%`, top: '2px', height: '20px' }} viewBox="0 0 100 20" preserveAspectRatio="none">
                            <polygon points={`0,10 ${((ctr - lo) / (hi - lo)) * 100},0 100,10 ${((ctr - lo) / (hi - lo)) * 100},20`} fill="#D97757" />
                          </svg>
                        </>
                      )
                    })()}
                  </div>
                  <div style={{ fontSize: '11px', textAlign: 'right', fontWeight: 700 }}>100%</div>
                  <div style={{ fontSize: '11px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>
                    {pooled.effect.toFixed(2)} [{pooled.lower.toFixed(2)}, {pooled.upper.toFixed(2)}]
                  </div>
                </div>

                {/* Scale */}
                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 80px 100px', gap: '8px', marginTop: '4px' }}>
                  <div />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#9CA3AF' }}>
                    <span>← Favours intervention</span>
                    <span>|</span>
                    <span>Favours control →</span>
                  </div>
                  <div /><div />
                </div>
              </div>
            </div>

            {/* Add Study */}
            <div style={{ marginTop: '16px', padding: '14px', borderRadius: '8px', background: '#FAF9F6', border: '1px solid #E5E5E0' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', marginBottom: '8px' }}>Add Study</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input style={{ ...inp, flex: '2 1 150px' }} placeholder="Study name" value={newStudy.name} onChange={(e) => setNewStudy({ ...newStudy, name: e.target.value })} />
                <input style={{ ...inp, flex: '1 1 80px' }} type="number" step="0.01" placeholder="OR" value={newStudy.effectSize} onChange={(e) => setNewStudy({ ...newStudy, effectSize: e.target.value })} />
                <input style={{ ...inp, flex: '1 1 80px' }} type="number" step="0.01" placeholder="Lower CI" value={newStudy.lowerCI} onChange={(e) => setNewStudy({ ...newStudy, lowerCI: e.target.value })} />
                <input style={{ ...inp, flex: '1 1 80px' }} type="number" step="0.01" placeholder="Upper CI" value={newStudy.upperCI} onChange={(e) => setNewStudy({ ...newStudy, upperCI: e.target.value })} />
                <input style={{ ...inp, flex: '1 1 60px' }} type="number" step="0.1" placeholder="Weight %" value={newStudy.weight} onChange={(e) => setNewStudy({ ...newStudy, weight: e.target.value })} />
                <button onClick={addStudy} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#D97757', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Add</button>
              </div>
            </div>
          </div>

          {/* Heterogeneity & Publication Bias */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {/* Heterogeneity */}
            <div style={card}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '14px' }}>Heterogeneity Assessment</h3>
              <div style={{ display: 'grid', gap: '10px' }}>
                {[
                  { label: 'Cochran Q', value: pooled.q.toFixed(2), sub: `df = ${studies.length - 1}` },
                  { label: 'I²', value: `${pooled.i2.toFixed(1)}%`, sub: pooled.i2 < 25 ? 'Low' : pooled.i2 < 50 ? 'Moderate' : pooled.i2 < 75 ? 'Substantial' : 'Considerable', color: pooled.i2 < 25 ? '#10B981' : pooled.i2 < 50 ? '#6366F1' : pooled.i2 < 75 ? '#F59E0B' : '#EF4444' },
                  { label: 'τ²', value: pooled.tau2.toFixed(4), sub: 'Between-study variance' },
                  { label: 'p (heterogeneity)', value: pooled.pHet < 0.001 ? '< 0.001' : pooled.pHet.toFixed(3), sub: pooled.pHet < 0.1 ? 'Significant' : 'Not significant', color: pooled.pHet < 0.1 ? '#EF4444' : '#10B981' },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: '6px', background: '#FAF9F6' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>{item.label}</div>
                      <div style={{ fontSize: '10px', color: item.color || '#9CA3AF' }}>{item.sub}</div>
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: item.color || '#1E1E2E' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Publication Bias */}
            <div style={card}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '14px' }}>Publication Bias</h3>
              {eggerIntercept ? (
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ padding: '10px', borderRadius: '6px', background: '#FAF9F6' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600 }}>Egger Regression</div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                      Intercept: {eggerIntercept.intercept.toFixed(3)} · p {eggerIntercept.pValue}
                    </div>
                    <div style={{ fontSize: '11px', marginTop: '4px', color: eggerIntercept.intercept > 1.96 ? '#EF4444' : '#10B981', fontWeight: 600 }}>
                      {eggerIntercept.intercept > 1.96 ? '⚠ Asymmetry detected — possible publication bias' : '✓ No significant asymmetry detected'}
                    </div>
                  </div>
                  <div style={{ padding: '10px', borderRadius: '6px', background: '#FAF9F6' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600 }}>Visual Funnel Plot</div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                      {studies.length} studies plotted · Pseudo 95% CI lines
                    </div>
                    {/* Simple funnel representation */}
                    <div style={{ position: 'relative', height: '80px', marginTop: '8px', background: '#F5F5F0', borderRadius: '6px', overflow: 'hidden' }}>
                      {/* Funnel shape */}
                      <div style={{ position: 'absolute', left: '50%', top: '5px', width: '2px', height: '70px', background: '#D97757', transform: 'translateX(-50%)' }} />
                      <div style={{ position: 'absolute', left: '15%', bottom: '5px', right: '15%', top: '5px', border: '1px dashed #9CA3AF', borderTop: 'none', clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
                      {studies.map((s, i) => {
                        const se = (s.upperCI - s.lowerCI) / (2 * 1.96)
                        const x = 50 + (s.effectSize - pooled.effect) * 80
                        const y = 10 + se * 100
                        return (
                          <div key={s.id} style={{
                            position: 'absolute', left: `${Math.max(5, Math.min(95, x))}%`, top: `${Math.max(5, Math.min(85, y))}%`,
                            width: '6px', height: '6px', borderRadius: '50%', background: '#374151',
                            transform: 'translate(-50%, -50%)',
                          }} />
                        )
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#9CA3AF', padding: '20px', textAlign: 'center' }}>Need at least 3 studies to assess</div>
              )}
            </div>
          </div>

          {/* Risk of Bias Table */}
          <div style={{ ...card, marginBottom: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>Risk of Bias Assessment (RoB 2)</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5E5E0' }}>
                    <th style={{ textAlign: 'left', padding: '6px 10px', fontWeight: 600, minWidth: '140px' }}>Study</th>
                    {ROB2_DOMAINS.map((d) => (
                      <th key={d.key} style={{ textAlign: 'center', padding: '6px 6px', fontWeight: 600, fontSize: '10px', minWidth: '90px' }}>{d.label}</th>
                    ))}
                    <th style={{ textAlign: 'center', padding: '6px 10px', fontWeight: 600 }}>Overall</th>
                  </tr>
                </thead>
                <tbody>
                  {studies.map((s) => {
                    const robs = Object.values(s.rob).filter((v) => v)
                    const overall: RoBJudgment = robs.includes('high') ? 'high' : robs.includes('some_concerns') ? 'some_concerns' : robs.length > 0 ? 'low' : ''
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '6px 10px', fontWeight: 500 }}>{s.name}</td>
                        {ROB2_DOMAINS.map((d) => (
                          <td key={d.key} style={{ padding: '4px 4px', textAlign: 'center' }}>
                            <select
                              value={s.rob[d.key] || ''}
                              onChange={(e) => updateRoB(s.id, d.key, e.target.value as RoBJudgment)}
                              style={{
                                padding: '3px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                                border: '1px solid #E5E5E0', cursor: 'pointer', width: '100%',
                                background: s.rob[d.key] ? ROB_COLORS[s.rob[d.key]] + '20' : 'white',
                                color: s.rob[d.key] ? ROB_COLORS[s.rob[d.key]] : '#6B7280',
                              }}
                            >
                              <option value="">—</option>
                              <option value="low">Low</option>
                              <option value="some_concerns">Some Concerns</option>
                              <option value="high">High</option>
                            </select>
                          </td>
                        ))}
                        <td style={{ textAlign: 'center', padding: '4px' }}>
                          <span style={{
                            fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                            background: overall ? ROB_COLORS[overall] + '20' : '#F5F5F0',
                            color: overall ? ROB_COLORS[overall] : '#9CA3AF',
                          }}>
                            {ROB_LABELS[overall]}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* AI Sidebar */}
        <div>
          <AIAssistant
            context={`User is on the Systematic Review & Meta-Analysis page. PRISMA flow: ${prisma.dbRecords + prisma.otherRecords} records identified, ${prisma.duplicates} duplicates removed, ${prisma.titleAbstractExcluded} excluded at screening, ${prisma.fullTextRetrieved} full-texts assessed, ${prisma.fullTextExcluded} excluded (reasons: ${prisma.excludeReasons}), ${prisma.qualSynthesis} in qualitative synthesis, ${prisma.quantSynthesis} in meta-analysis. ${studies.length} studies in forest plot. Pooled OR: ${pooled.effect.toFixed(2)} [${pooled.lower.toFixed(2)}, ${pooled.upper.toFixed(2)}]. Model: ${modelType} effects. I²=${pooled.i2.toFixed(1)}%, τ²=${pooled.tau2.toFixed(4)}, Q=${pooled.q.toFixed(2)}. GRADE certainty: ${gradeCertainty}. Publication bias: ${eggerIntercept ? `Egger intercept=${eggerIntercept.intercept.toFixed(3)}, p${eggerIntercept.pValue}` : 'insufficient studies'}.`}
            placeholder="Ask about your SR/MA..."
            quickActions={[
              { label: 'Interpret I²', prompt: `My meta-analysis shows I²=${pooled.i2.toFixed(1)}%, τ²=${pooled.tau2.toFixed(4)}, Cochran Q=${pooled.q.toFixed(2)} with ${studies.length} studies. Explain the heterogeneity level, what might be driving it, and whether subgroup analysis or meta-regression is warranted.` },
              { label: 'Check PRISMA', prompt: `Review my PRISMA flow for completeness: ${prisma.dbRecords + prisma.otherRecords} identified, ${prisma.duplicates} duplicates, ${prisma.titleAbstractExcluded} screened out, ${prisma.fullTextRetrieved} full-text, ${prisma.fullTextExcluded} excluded, ${prisma.qualSynthesis} qualitative, ${prisma.quantSynthesis} quantitative. Are these numbers consistent? Any red flags?` },
              { label: 'Interpret results', prompt: `Pooled OR is ${pooled.effect.toFixed(2)} [${pooled.lower.toFixed(2)}, ${pooled.upper.toFixed(2)}] from ${studies.length} studies using ${modelType} effects model. GRADE certainty: ${gradeCertainty}. Help me write the results section and interpret the clinical significance.` },
              { label: 'Assess RoB', prompt: `I have ${studies.length} studies with risk of bias assessments. Help me summarize the overall risk of bias across studies and determine if sensitivity analysis excluding high-risk studies is needed.` },
              { label: 'Publication bias', prompt: `Egger test shows intercept=${eggerIntercept?.intercept.toFixed(3) || 'N/A'}, p${eggerIntercept?.pValue || 'N/A'}. With ${studies.length} studies, discuss whether publication bias is a concern and whether trim-and-fill adjustment is appropriate.` },
            ]}
          />
        </div>
        <PipelineControls moduleId="synthesis" />
      </div>
    </>
  )
}

// Approximate gamma CDF for p-value calculation
function gammaCDF(x: number, a: number): number {
  if (x <= 0) return 0
  if (a <= 0) return 1
  let sum = 0, term = 1 / a
  for (let n = 1; n < 100; n++) {
    sum += term
    term *= x / (a + n)
  }
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * sum
}

function logGamma(x: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.001208650973866179, -5.395239384953e-6]
  let y = x, tmp = x + 5.5
  tmp -= (x + 0.5) * Math.log(tmp)
  let ser = 1.000000000190015
  for (let j = 0; j < 6; j++) ser += c[j] / ++y
  return -tmp + Math.log(2.5066282746310005 * ser / x)
}
