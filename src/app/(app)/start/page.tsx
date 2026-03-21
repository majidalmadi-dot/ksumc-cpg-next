'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { useAIWorkflow, ALL_MODULES, PICOQuestion } from '@/lib/ai-workflow'

/* ═══════════════════════════════════════════════════════════════
   Example Clinical Topics (pre-filled PICO)
   ═══════════════════════════════════════════════════════════════ */

const EXAMPLE_TOPICS = [
  {
    title: 'Type 2 Diabetes — GLP-1 vs Insulin',
    color: '#2563EB',
    pico: {
      topic: 'GLP-1 Receptor Agonists for Type 2 Diabetes',
      population: 'Adults (>18y) with Type 2 Diabetes, HbA1c > 7%',
      intervention: 'GLP-1 receptor agonists (semaglutide)',
      comparison: 'Insulin glargine (standard insulin therapy)',
      outcome: 'HbA1c reduction, cardiovascular events, weight change',
    },
  },
  {
    title: 'Hypertension — SGLT2i Add-on',
    color: '#DC2626',
    pico: {
      topic: 'SGLT2 Inhibitors as Add-on for Resistant Hypertension',
      population: 'Adults with resistant hypertension on 3+ antihypertensives',
      intervention: 'SGLT2 inhibitors (dapagliflozin / empagliflozin)',
      comparison: 'Spironolactone or placebo',
      outcome: '24-hour ambulatory BP reduction, renal outcomes, heart failure',
    },
  },
  {
    title: 'Breast Cancer Screening — AI-Assisted',
    color: '#7C3AED',
    pico: {
      topic: 'AI-Assisted Mammography Screening',
      population: 'Women aged 40-74 at average or high risk for breast cancer',
      intervention: 'AI-assisted digital mammography interpretation',
      comparison: 'Standard double-reading by radiologists',
      outcome: 'Cancer detection rate, false positive rate, interval cancers',
    },
  },
  {
    title: 'Pediatric Asthma — Biologic Therapy',
    color: '#059669',
    pico: {
      topic: 'Biologic Therapy for Severe Pediatric Asthma',
      population: 'Children (6-17y) with severe uncontrolled asthma on high-dose ICS/LABA',
      intervention: 'Anti-IL5 biologics (mepolizumab / benralizumab)',
      comparison: 'Standard high-dose ICS/LABA + OCS as needed',
      outcome: 'Exacerbation rate, lung function (FEV1), OCS sparing, quality of life',
    },
  },
]

/* ═══════════════════════════════════════════════════════════════
   Module Presets
   ═══════════════════════════════════════════════════════════════ */

const PRESETS = [
  { label: 'Full CPG Development', desc: 'All 7 modules — complete guideline from question to report', modules: ALL_MODULES.map(m => m.id) },
  { label: 'Rapid Evidence Review', desc: 'Evidence + GRADE + Report — fast turnaround assessment', modules: ['evidence', 'grade', 'report'] },
  { label: 'HTA Submission', desc: 'Evidence + CEA + HTA + Report — health technology assessment package', modules: ['evidence', 'economics', 'hta', 'report'] },
  { label: 'Systematic Review', desc: 'Evidence + SR/MA + GRADE — structured review and meta-analysis', modules: ['evidence', 'synthesis', 'grade', 'report'] },
]

/* ═══════════════════════════════════════════════════════════════
   Agent Architecture Badge
   ═══════════════════════════════════════════════════════════════ */

const AGENT_INFO: Record<string, { icon: string; label: string; color: string }> = {
  evidence: { icon: 'S', label: 'PubMed Search Agent', color: '#2563EB' },
  grade: { icon: 'G', label: 'GRADE Methodology Agent', color: '#7C3AED' },
  synthesis: { icon: 'M', label: 'Meta-Analysis Agent', color: '#0891B2' },
  economics: { icon: '$', label: 'Health Economics Agent', color: '#D97706' },
  hta: { icon: 'H', label: 'HTA Appraisal Agent', color: '#DC2626' },
  frameworks: { icon: 'Q', label: 'Quality Compliance Agent', color: '#059669' },
  report: { icon: 'R', label: 'Report Generation Agent', color: '#6366F1' },
}

/* ═══════════════════════════════════════════════════════════════
   Start Page Component
   ═══════════════════════════════════════════════════════════════ */

export default function StartPage() {
  const router = useRouter()
  const { startWorkflow, isActive } = useAIWorkflow()

  const [step, setStep] = useState<'topic' | 'modules' | 'launching'>('topic')
  const [pico, setPico] = useState<PICOQuestion>({ topic: '', population: '', intervention: '', comparison: '', outcome: '' })
  const [modules, setModules] = useState<Set<string>>(new Set(ALL_MODULES.map(m => m.id)))

  const picoValid = pico.population.trim() && pico.intervention.trim() && pico.outcome.trim()

  const toggleModule = useCallback((id: string) => {
    setModules(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const applyPreset = useCallback((moduleIds: string[]) => {
    setModules(new Set(moduleIds))
  }, [])

  const loadExample = useCallback((example: typeof EXAMPLE_TOPICS[0]) => {
    setPico(example.pico)
  }, [])

  const handleLaunch = useCallback(() => {
    if (!picoValid) return
    setStep('launching')
    const finalPico = { ...pico, topic: pico.topic || `${pico.intervention} for ${pico.population}` }
    startWorkflow(finalPico, Array.from(modules))
    // Navigate to first selected module after a brief delay for the generation animation
    const firstModule = ALL_MODULES.find(m => modules.has(m.id))
    setTimeout(() => {
      router.push(firstModule?.path || '/evidence')
    }, 800)
  }, [pico, picoValid, modules, startWorkflow, router])

  const card: React.CSSProperties = { background: 'white', borderRadius: '12px', border: '1px solid #E5E5E0', padding: '24px' }
  const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', background: 'white', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' }

  /* ─── Active workflow redirect ─── */
  if (isActive && step !== 'launching') {
    return (
      <>
        <Header title="Start New Guideline" subtitle="AI-guided clinical practice guideline development" />
        <div style={{ padding: '40px 32px', textAlign: 'center' }}>
          <div style={{ ...card, maxWidth: '500px', margin: '0 auto' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>&#9889;</div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Workflow Already Active</h2>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '16px' }}>
              You have an active AI workflow running. Use the progress bar at the top to navigate between steps, or end the current workflow to start a new one.
            </p>
            <button
              onClick={() => router.push('/evidence')}
              style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#8B5CF6', color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
            >
              Continue Current Workflow
            </button>
          </div>
        </div>
      </>
    )
  }

  /* ─── Launching animation ─── */
  if (step === 'launching') {
    return (
      <>
        <Header title="Start New Guideline" subtitle="AI-guided clinical practice guideline development" />
        <div style={{ padding: '80px 32px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, #8B5CF6, #D97757)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: 'white', fontWeight: 800, animation: 'pulse 1.5s ease-in-out infinite' }}>AI</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: '#1E1B4B' }}>Launching AI Workflow</h2>
          <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
            Searching literature for: <strong>{pico.topic || `${pico.intervention} for ${pico.population}`}</strong>
          </p>
          <div style={{ maxWidth: '300px', margin: '0 auto', height: '4px', borderRadius: '2px', background: '#E5E7EB', overflow: 'hidden' }}>
            <div style={{ width: '60%', height: '100%', borderRadius: '2px', background: 'linear-gradient(90deg, #8B5CF6, #D97757)', animation: 'shimmer 1.2s ease-in-out infinite alternate' }} />
          </div>
          <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '12px' }}>{modules.size} specialized agents activating...</p>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Start New Guideline" subtitle="AI-guided clinical practice guideline development" />
      <div className="fade-in" style={{ padding: '24px 32px', maxWidth: '960px' }}>

        {/* ── Step Indicator ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
          {['Define Your Question', 'Select Modules', 'Launch'].map((label, i) => {
            const stepIdx = i === 0 ? 'topic' : i === 1 ? 'modules' : 'launching'
            const isCurrentOrPast = i === 0 ? true : i === 1 ? step === 'modules' : false
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: isCurrentOrPast ? (step === stepIdx ? '#8B5CF6' : '#10B981') : '#E5E7EB',
                  color: isCurrentOrPast ? 'white' : '#9CA3AF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 700, transition: 'all 0.3s',
                }}>
                  {(step === 'modules' && i === 0) ? '\u2713' : i + 1}
                </div>
                <span style={{ fontSize: '13px', fontWeight: step === stepIdx ? 700 : 500, color: isCurrentOrPast ? '#1E1B4B' : '#9CA3AF' }}>{label}</span>
                {i < 2 && <div style={{ width: '40px', height: '2px', background: isCurrentOrPast && i === 0 && step === 'modules' ? '#10B981' : '#E5E7EB', margin: '0 4px' }} />}
              </div>
            )
          })}
        </div>

        {/* ═══════════════════════════════════════════
           STEP 1: Define Your Clinical Question
           ═══════════════════════════════════════════ */}
        {step === 'topic' && (
          <>
            {/* Example Topics */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#6B7280', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Quick Start — Example Topics
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {EXAMPLE_TOPICS.map((ex) => (
                  <button
                    key={ex.title}
                    onClick={() => loadExample(ex)}
                    style={{
                      ...card, padding: '14px 16px', cursor: 'pointer',
                      borderLeft: `4px solid ${ex.color}`,
                      textAlign: 'left', transition: 'box-shadow 0.2s',
                    }}
                    onMouseOver={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
                    onMouseOut={e => (e.currentTarget.style.boxShadow = 'none')}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 700, color: ex.color, marginBottom: '4px' }}>{ex.title}</div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                      P: {ex.pico.population.slice(0, 50)}...
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* PICO Form */}
            <div style={{ ...card, borderTop: '3px solid #8B5CF6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: 800 }}>AI</div>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#1E1B4B' }}>Define Your Clinical Question</h2>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: '2px 0 0' }}>Use the PICO framework to structure your research question</p>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                  Clinical Topic
                </label>
                <input
                  style={inp}
                  value={pico.topic}
                  onChange={e => setPico(p => ({ ...p, topic: e.target.value }))}
                  placeholder="e.g., Management of Type 2 Diabetes in Adults"
                  onFocus={e => (e.target.style.borderColor = '#8B5CF6')}
                  onBlur={e => (e.target.style.borderColor = '#D1D5DB')}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                {[
                  { key: 'population', label: 'P — Population / Patient', placeholder: 'e.g., Adults with Type 2 Diabetes, HbA1c > 7%', color: '#2563EB', required: true },
                  { key: 'intervention', label: 'I — Intervention', placeholder: 'e.g., GLP-1 receptor agonists (semaglutide)', color: '#059669', required: true },
                  { key: 'comparison', label: 'C — Comparison', placeholder: 'e.g., Insulin glargine', color: '#D97706' },
                  { key: 'outcome', label: 'O — Outcome', placeholder: 'e.g., HbA1c reduction, cardiovascular events, weight', color: '#DC2626', required: true },
                ].map(({ key, label, placeholder, color, required }) => (
                  <div key={key}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                      <span style={{ color }}>{label}</span>
                      {required && <span style={{ color: '#EF4444', fontSize: '10px' }}>*</span>}
                    </label>
                    <textarea
                      style={{ ...inp, height: '64px', resize: 'vertical', borderColor: (pico as any)[key] ? color + '66' : '#D1D5DB', background: (pico as any)[key] ? color + '06' : 'white' }}
                      value={(pico as any)[key]}
                      onChange={e => setPico(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      onFocus={e => (e.target.style.borderColor = color)}
                      onBlur={e => (e.target.style.borderColor = (pico as any)[key] ? color + '66' : '#D1D5DB')}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => picoValid && setStep('modules')}
                  disabled={!picoValid}
                  style={{
                    padding: '10px 28px', borderRadius: '8px', border: 'none',
                    background: picoValid ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)' : '#E5E7EB',
                    color: picoValid ? 'white' : '#9CA3AF',
                    fontSize: '14px', fontWeight: 600, cursor: picoValid ? 'pointer' : 'default',
                    transition: 'all 0.2s',
                  }}
                >
                  Next: Select Modules &rarr;
                </button>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════
           STEP 2: Select Modules
           ═══════════════════════════════════════════ */}
        {step === 'modules' && (
          <>
            {/* PICO Summary */}
            <div style={{ ...card, padding: '14px 20px', marginBottom: '20px', background: '#F5F3FF', borderColor: '#DDD6FE' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#4C1D95' }}>
                    {pico.topic || `${pico.intervention} for ${pico.population}`}
                  </span>
                  <div style={{ fontSize: '11px', color: '#7C3AED', marginTop: '2px' }}>
                    P: {pico.population.slice(0, 40)}{pico.population.length > 40 ? '...' : ''} &middot; I: {pico.intervention.slice(0, 30)}{pico.intervention.length > 30 ? '...' : ''}
                  </div>
                </div>
                <button onClick={() => setStep('topic')} style={{ fontSize: '12px', color: '#7C3AED', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  &larr; Edit Question
                </button>
              </div>
            </div>

            {/* Presets */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#6B7280', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Workflow Presets
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {PRESETS.map((preset) => {
                  const isActive = preset.modules.length === modules.size && preset.modules.every(m => modules.has(m))
                  return (
                    <button
                      key={preset.label}
                      onClick={() => applyPreset(preset.modules)}
                      style={{
                        ...card, padding: '12px 16px', cursor: 'pointer', textAlign: 'left',
                        borderColor: isActive ? '#8B5CF6' : '#E5E5E0',
                        background: isActive ? '#F5F3FF' : 'white',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: 700, color: isActive ? '#4C1D95' : '#1F2937', marginBottom: '2px' }}>{preset.label}</div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>{preset.desc}</div>
                      <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '4px' }}>{preset.modules.length} modules</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Module Grid */}
            <div style={{ ...card, borderTop: '3px solid #8B5CF6' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#1E1B4B' }}>Select Workflow Modules</h2>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>{modules.size} of {ALL_MODULES.length} selected</span>
              </div>

              <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '20px', lineHeight: '1.5' }}>
                Each module is powered by a <strong>specialized AI agent</strong> trained on its domain. Select the modules you need — the AI will auto-populate each one in sequence, and you approve or adjust at every step.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                {ALL_MODULES.map((mod) => {
                  const selected = modules.has(mod.id)
                  const agent = AGENT_INFO[mod.id]
                  return (
                    <div
                      key={mod.id}
                      onClick={() => toggleModule(mod.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '14px',
                        padding: '14px 16px', borderRadius: '10px', cursor: 'pointer',
                        border: `2px solid ${selected ? agent?.color || '#8B5CF6' : '#E5E7EB'}`,
                        background: selected ? (agent?.color || '#8B5CF6') + '08' : '#FAFAF9',
                        transition: 'all 0.2s',
                      }}
                    >
                      {/* Checkbox */}
                      <div style={{
                        width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
                        border: `2px solid ${selected ? agent?.color || '#8B5CF6' : '#D1D5DB'}`,
                        background: selected ? agent?.color || '#8B5CF6' : 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '12px', fontWeight: 700,
                        transition: 'all 0.2s',
                      }}>
                        {selected && '\u2713'}
                      </div>

                      {/* Agent icon */}
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
                        background: selected ? `linear-gradient(135deg, ${agent?.color}20, ${agent?.color}10)` : '#F3F4F6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: 800,
                        color: selected ? agent?.color : '#9CA3AF',
                      }}>
                        {agent?.icon || '#'}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: selected ? '#1E1B4B' : '#6B7280' }}>
                            {mod.label}
                          </span>
                          {selected && (
                            <span style={{
                              fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
                              background: agent?.color + '15', color: agent?.color,
                            }}>
                              {agent?.label}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>{mod.description}</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Launch button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #E5E7EB' }}>
                <button
                  onClick={() => setStep('topic')}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #D1D5DB', background: 'white', fontSize: '14px', color: '#6B7280', cursor: 'pointer' }}
                >
                  &larr; Back
                </button>
                <button
                  onClick={handleLaunch}
                  disabled={modules.size === 0}
                  style={{
                    padding: '12px 32px', borderRadius: '10px', border: 'none',
                    background: modules.size > 0 ? 'linear-gradient(135deg, #8B5CF6, #D97757)' : '#E5E7EB',
                    color: 'white', fontSize: '15px', fontWeight: 700, cursor: modules.size > 0 ? 'pointer' : 'default',
                    boxShadow: modules.size > 0 ? '0 4px 14px rgba(139,92,246,0.3)' : 'none',
                    transition: 'all 0.3s',
                  }}
                >
                  Launch AI Workflow ({modules.size} modules)
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
