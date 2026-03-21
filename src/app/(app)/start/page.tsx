'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import {
  useAIWorkflow, ALL_MODULES, COUNTRIES,
  ClinicalDomain, EnrichedPICO, GuidelineProject,
} from '@/lib/ai-workflow'

/* ═══════════════════════════════════════════════════════════════
   Bayesian Guideline Engine — Start Page
   Flow: Title + Country → Scope Agent (domains) → PICO Gen → Launch
   ═══════════════════════════════════════════════════════════════ */

type Step = 'title' | 'domains' | 'picos' | 'modules' | 'launching'

const PRESETS = [
  { label: 'Full CPG Development', desc: 'All 7 modules — complete guideline from question to report', modules: ALL_MODULES.map(m => m.id) },
  { label: 'Rapid Evidence Review', desc: 'Evidence + GRADE + Report — fast turnaround', modules: ['evidence', 'grade', 'report'] },
  { label: 'HTA Submission', desc: 'Evidence + CEA + HTA + Report', modules: ['evidence', 'economics', 'hta', 'report'] },
  { label: 'Systematic Review', desc: 'Evidence + SR/MA + GRADE', modules: ['evidence', 'synthesis', 'grade', 'report'] },
]

const AGENT_INFO: Record<string, { icon: string; label: string; color: string }> = {
  evidence: { icon: 'S', label: 'PubMed Search Agent', color: '#2563EB' },
  grade: { icon: 'G', label: 'GRADE Methodology Agent', color: '#7C3AED' },
  synthesis: { icon: 'M', label: 'Meta-Analysis Agent', color: '#0891B2' },
  economics: { icon: '$', label: 'Health Economics Agent', color: '#D97706' },
  hta: { icon: 'H', label: 'HTA Appraisal Agent', color: '#DC2626' },
  frameworks: { icon: 'Q', label: 'Quality Compliance Agent', color: '#059669' },
  report: { icon: 'R', label: 'Report Generation Agent', color: '#6366F1' },
}

const EXAMPLE_GUIDELINES = [
  { title: 'Colorectal Cancer Screening in Saudi Arabia', color: '#DC2626' },
  { title: 'Type 2 Diabetes Management in the Gulf Region', color: '#2563EB' },
  { title: 'Breast Cancer Screening Guidelines', color: '#7C3AED' },
  { title: 'Hypertension Management in Primary Care', color: '#059669' },
]

/* ─── Styles ─── */
const card: React.CSSProperties = { background: 'white', borderRadius: '12px', border: '1px solid #E5E5E0', padding: '24px' }
const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px', background: 'white', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' }

/* ═══════════════════════════════════════════════════════════════ */

export default function StartPage() {
  const router = useRouter()
  const { startGuidelineProject, isActive } = useAIWorkflow()

  const [step, setStep] = useState<Step>('title')
  const [title, setTitle] = useState('')
  const [country, setCountry] = useState('SA')
  const [isScanning, setIsScanning] = useState(false)
  const [scanResults, setScanResults] = useState<any>(null)
  const [domains, setDomains] = useState<ClinicalDomain[]>([])
  const [modules, setModules] = useState<Set<string>>(new Set(ALL_MODULES.map(m => m.id)))
  const [showPastePico, setShowPastePico] = useState<string | null>(null)
  const [pasteText, setPasteText] = useState('')

  const selectedCountry = useMemo(() => COUNTRIES.find(c => c.code === country) || COUNTRIES[0], [country])
  const totalPicos = useMemo(() => domains.reduce((sum, d) => sum + d.picos.length, 0), [domains])

  /* ─── Scope Agent: Scan literature & generate domains ─── */
  const handleScan = useCallback(async () => {
    if (!title.trim()) return
    setIsScanning(true)
    try {
      const res = await fetch('/api/scope-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          country: selectedCountry.label,
          countryAffiliation: selectedCountry.pubmedAffiliation,
        }),
      })
      const data = await res.json()
      setScanResults(data)

      // Convert API domains to ClinicalDomain[]
      const newDomains: ClinicalDomain[] = (data.domains || []).map((d: any) => ({
        id: d.id,
        label: d.label,
        description: d.description,
        collapsed: false,
        picos: (d.picos || []).map((p: any) => ({
          id: p.id,
          topic: p.topic,
          population: p.population,
          intervention: p.intervention,
          comparison: p.comparison,
          outcome: p.outcome,
          domainId: d.id,
          pipeline: {
            literatureSearch: 'pending' as const,
            evidenceSynthesis: 'pending' as const,
            srma: 'pending' as const,
            cea: 'pending' as const,
            hta: 'pending' as const,
            grade: 'pending' as const,
            recommendation: 'pending' as const,
          },
          literatureResults: [],
          suggestions: {},
        })),
      }))
      setDomains(newDomains)
      setStep('domains')
    } catch {
      // Fallback: go to domains with empty state
      setStep('domains')
    } finally {
      setIsScanning(false)
    }
  }, [title, selectedCountry])

  /* ─── Domain management ─── */
  const toggleDomainCollapse = useCallback((domainId: string) => {
    setDomains(prev => prev.map(d => d.id === domainId ? { ...d, collapsed: !d.collapsed } : d))
  }, [])

  const removeDomain = useCallback((domainId: string) => {
    setDomains(prev => prev.filter(d => d.id !== domainId))
  }, [])

  const addDomain = useCallback(() => {
    const id = `custom-domain-${Date.now()}`
    setDomains(prev => [...prev, {
      id,
      label: 'New Domain',
      description: 'Click to edit description',
      picos: [],
      collapsed: false,
    }])
  }, [])

  const updateDomainLabel = useCallback((domainId: string, label: string) => {
    setDomains(prev => prev.map(d => d.id === domainId ? { ...d, label } : d))
  }, [])

  /* ─── PICO management ─── */
  const removePico = useCallback((domainId: string, picoId: string) => {
    setDomains(prev => prev.map(d =>
      d.id === domainId ? { ...d, picos: d.picos.filter(p => p.id !== picoId) } : d
    ))
  }, [])

  const addPico = useCallback((domainId: string) => {
    const picoId = `${domainId}-pico-${Date.now()}`
    const newPico: EnrichedPICO = {
      id: picoId,
      topic: '',
      population: '',
      intervention: '',
      comparison: '',
      outcome: '',
      domainId,
      pipeline: {
        literatureSearch: 'pending',
        evidenceSynthesis: 'pending',
        srma: 'pending',
        cea: 'pending',
        hta: 'pending',
        grade: 'pending',
        recommendation: 'pending',
      },
      literatureResults: [],
      suggestions: {},
    }
    setDomains(prev => prev.map(d =>
      d.id === domainId ? { ...d, picos: [...d.picos, newPico] } : d
    ))
  }, [])

  const updatePicoField = useCallback((domainId: string, picoId: string, field: string, value: string) => {
    setDomains(prev => prev.map(d =>
      d.id === domainId
        ? { ...d, picos: d.picos.map(p => p.id === picoId ? { ...p, [field]: value } : p) }
        : d
    ))
  }, [])

  const handlePastePicos = useCallback((domainId: string) => {
    if (!pasteText.trim()) return
    // Parse pasted PICOs — support various formats
    const lines = pasteText.split('\n').filter(l => l.trim())
    const newPicos: EnrichedPICO[] = []

    let current: Partial<EnrichedPICO> = {}
    for (const line of lines) {
      const trimmed = line.trim()
      if (/^P[\s:—-]/i.test(trimmed)) {
        current.population = trimmed.replace(/^P[\s:—-]+/i, '').trim()
      } else if (/^I[\s:—-]/i.test(trimmed)) {
        current.intervention = trimmed.replace(/^I[\s:—-]+/i, '').trim()
      } else if (/^C[\s:—-]/i.test(trimmed)) {
        current.comparison = trimmed.replace(/^C[\s:—-]+/i, '').trim()
      } else if (/^O[\s:—-]/i.test(trimmed)) {
        current.outcome = trimmed.replace(/^O[\s:—-]+/i, '').trim()
        // Outcome completes a PICO
        if (current.population || current.intervention) {
          newPicos.push({
            id: `${domainId}-paste-${Date.now()}-${newPicos.length}`,
            topic: `${current.intervention || ''} in ${current.population || ''}`.trim(),
            population: current.population || '',
            intervention: current.intervention || '',
            comparison: current.comparison || '',
            outcome: current.outcome || '',
            domainId,
            pipeline: {
              literatureSearch: 'pending',
              evidenceSynthesis: 'pending',
              srma: 'pending',
              cea: 'pending',
              hta: 'pending',
              grade: 'pending',
              recommendation: 'pending',
            },
            literatureResults: [],
            suggestions: {},
          })
          current = {}
        }
      } else if (trimmed.length > 10 && !trimmed.startsWith('#')) {
        // Treat as a topic line — create a minimal PICO
        newPicos.push({
          id: `${domainId}-paste-${Date.now()}-${newPicos.length}`,
          topic: trimmed,
          population: '',
          intervention: '',
          comparison: '',
          outcome: '',
          domainId,
          pipeline: {
            literatureSearch: 'pending',
            evidenceSynthesis: 'pending',
            srma: 'pending',
            cea: 'pending',
            hta: 'pending',
            grade: 'pending',
            recommendation: 'pending',
          },
          literatureResults: [],
          suggestions: {},
        })
      }
    }

    if (newPicos.length > 0) {
      setDomains(prev => prev.map(d =>
        d.id === domainId ? { ...d, picos: [...d.picos, ...newPicos] } : d
      ))
    }
    setPasteText('')
    setShowPastePico(null)
  }, [pasteText])

  /* ─── Module management ─── */
  const toggleModule = useCallback((id: string) => {
    setModules(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  /* ─── Launch ─── */
  const handleLaunch = useCallback(() => {
    if (totalPicos === 0) return
    setStep('launching')

    const project: GuidelineProject = {
      title,
      country: selectedCountry.code,
      countryLabel: selectedCountry.label,
      domains,
      createdAt: new Date().toISOString(),
    }

    startGuidelineProject(project, Array.from(modules))

    const firstModule = ALL_MODULES.find(m => modules.has(m.id))
    setTimeout(() => {
      router.push(firstModule?.path || '/evidence')
    }, 800)
  }, [title, selectedCountry, domains, modules, totalPicos, startGuidelineProject, router])

  /* ─── Active workflow redirect ─── */
  if (isActive && step !== 'launching') {
    return (
      <>
        <Header title="Bayesian Guideline Engine" subtitle="AI-powered multi-PICO clinical guideline development" />
        <div style={{ padding: '40px 32px', textAlign: 'center' }}>
          <div style={{ ...card, maxWidth: '500px', margin: '0 auto' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>&#9889;</div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Workflow Already Active</h2>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '16px' }}>
              You have an active AI workflow running. Use the progress bar to navigate between steps, or end the current workflow to start a new one.
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
        <Header title="Bayesian Guideline Engine" subtitle="AI-powered multi-PICO clinical guideline development" />
        <div style={{ padding: '80px 32px', textAlign: 'center' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #8B5CF6, #D97757)',
            margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', color: 'white', fontWeight: 800, animation: 'pulse 1.5s ease-in-out infinite',
          }}>AI</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: '#1E1B4B' }}>Launching Bayesian Guideline Engine</h2>
          <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
            <strong>{title}</strong> &middot; {selectedCountry.flag} {selectedCountry.label}
          </p>
          <p style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '24px' }}>
            {domains.length} domains &middot; {totalPicos} PICO questions &middot; {modules.size} pipeline modules
          </p>
          <div style={{ maxWidth: '300px', margin: '0 auto', height: '4px', borderRadius: '2px', background: '#E5E7EB', overflow: 'hidden' }}>
            <div style={{ width: '60%', height: '100%', borderRadius: '2px', background: 'linear-gradient(90deg, #8B5CF6, #D97757)', animation: 'shimmer 1.2s ease-in-out infinite alternate' }} />
          </div>
          <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '12px' }}>{modules.size} specialized agents activating for first PICO...</p>
        </div>
      </>
    )
  }

  /* ─── Step indicators ─── */
  const stepLabels = ['Guideline Title', 'Clinical Domains', 'Review PICOs', 'Pipeline Modules', 'Launch']
  const stepKeys: Step[] = ['title', 'domains', 'picos', 'modules', 'launching']
  const currentIdx = stepKeys.indexOf(step)

  return (
    <>
      <Header title="Bayesian Guideline Engine" subtitle="AI-powered multi-PICO clinical guideline development" />
      <div className="fade-in" style={{ padding: '24px 32px', maxWidth: '1000px' }}>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '28px', flexWrap: 'wrap' }}>
          {stepLabels.map((label, i) => {
            const isPast = i < currentIdx
            const isCurrent = i === currentIdx
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{
                  width: '26px', height: '26px', borderRadius: '50%',
                  background: isPast ? '#10B981' : isCurrent ? '#8B5CF6' : '#E5E7EB',
                  color: isPast || isCurrent ? 'white' : '#9CA3AF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700,
                }}>{isPast ? '\u2713' : i + 1}</div>
                <span style={{ fontSize: '12px', fontWeight: isCurrent ? 700 : 500, color: isPast || isCurrent ? '#1E1B4B' : '#9CA3AF' }}>{label}</span>
                {i < stepLabels.length - 1 && <div style={{ width: '28px', height: '2px', background: isPast ? '#10B981' : '#E5E7EB', margin: '0 2px' }} />}
              </div>
            )
          })}
        </div>

        {/* ═══════════════════════════════════════════
           STEP 1: Guideline Title + Country
           ═══════════════════════════════════════════ */}
        {step === 'title' && (
          <>
            {/* Quick start examples */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#6B7280', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Quick Start — Example Guidelines
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {EXAMPLE_GUIDELINES.map(ex => (
                  <button
                    key={ex.title}
                    onClick={() => setTitle(ex.title)}
                    style={{
                      ...card, padding: '14px 16px', cursor: 'pointer',
                      borderLeft: `4px solid ${ex.color}`, textAlign: 'left',
                      transition: 'box-shadow 0.2s',
                      background: title === ex.title ? ex.color + '08' : 'white',
                    }}
                    onMouseOver={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
                    onMouseOut={e => (e.currentTarget.style.boxShadow = 'none')}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 700, color: ex.color }}>{ex.title}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Title + Country form */}
            <div style={{ ...card, borderTop: '3px solid #8B5CF6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: '14px', fontWeight: 800,
                }}>AI</div>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#1E1B4B' }}>Define Your Guideline</h2>
                  <p style={{ fontSize: '12px', color: '#6B7280', margin: '2px 0 0' }}>
                    The Scope Agent will scan PubMed for existing guidelines and propose clinical domains
                  </p>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                  Guideline Title <span style={{ color: '#EF4444', fontSize: '10px' }}>*</span>
                </label>
                <input
                  style={inp}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g., Colorectal Cancer Screening in Saudi Arabia"
                  onFocus={e => (e.target.style.borderColor = '#8B5CF6')}
                  onBlur={e => (e.target.style.borderColor = '#D1D5DB')}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                  Target Country / Region
                </label>
                <select
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  style={{ ...inp, cursor: 'pointer' }}
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.label} ({c.currency})</option>
                  ))}
                </select>
                <p style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                  Country selection enables: PubMed affiliation filtering, local cost thresholds ({selectedCountry.currency} {selectedCountry.wtpThreshold.toLocaleString()}/QALY), and region-specific epidemiological data
                </p>
              </div>

              {/* Bayesian prior explanation */}
              <div style={{
                padding: '12px 16px', borderRadius: '8px',
                background: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)',
                border: '1px solid #DDD6FE', marginBottom: '20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ fontSize: '18px', flexShrink: 0 }}>&#129504;</div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#4C1D95', marginBottom: '4px' }}>
                      Bayesian Approach: Start from What Exists
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280', lineHeight: '1.5' }}>
                      The Scope Agent searches PubMed for existing guidelines, systematic reviews, and consensus statements on your topic. These form the <strong>prior</strong> — the engine then proposes clinical domains and PICO questions that build on the existing evidence base, ensuring your guideline is comprehensive and non-redundant.
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleScan}
                  disabled={!title.trim() || isScanning}
                  style={{
                    padding: '10px 28px', borderRadius: '8px', border: 'none',
                    background: title.trim() && !isScanning ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)' : '#E5E7EB',
                    color: title.trim() && !isScanning ? 'white' : '#9CA3AF',
                    fontSize: '14px', fontWeight: 600,
                    cursor: title.trim() && !isScanning ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}
                >
                  {isScanning ? (
                    <>
                      <span style={{ animation: 'pulse 1s ease-in-out infinite' }}>&#128270;</span>
                      Scanning PubMed...
                    </>
                  ) : (
                    <>Scan Literature & Generate Domains &rarr;</>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════
           STEP 2: Review Clinical Domains
           ═══════════════════════════════════════════ */}
        {step === 'domains' && (
          <>
            {/* Title summary bar */}
            <div style={{ ...card, padding: '14px 20px', marginBottom: '20px', background: '#F5F3FF', borderColor: '#DDD6FE' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#4C1D95' }}>{title}</span>
                  <span style={{ fontSize: '12px', color: '#7C3AED', marginLeft: '10px' }}>
                    {selectedCountry.flag} {selectedCountry.label}
                  </span>
                  {scanResults?.existingGuidelines?.length > 0 && (
                    <span style={{ fontSize: '11px', color: '#059669', marginLeft: '10px' }}>
                      &#9989; {scanResults.existingGuidelines.length} existing guidelines found
                    </span>
                  )}
                  {scanResults?.countrySpecificCount > 0 && (
                    <span style={{ fontSize: '11px', color: '#D97706', marginLeft: '10px' }}>
                      &#127463; {scanResults.countrySpecificCount} country-specific papers
                    </span>
                  )}
                </div>
                <button onClick={() => setStep('title')} style={{ fontSize: '12px', color: '#7C3AED', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  &larr; Edit Title
                </button>
              </div>
            </div>

            {/* Existing guidelines found */}
            {scanResults?.existingGuidelines?.length > 0 && (
              <div style={{ ...card, padding: '16px 20px', marginBottom: '16px', borderLeft: '4px solid #10B981' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#065F46', marginBottom: '8px' }}>
                  &#128218; Existing Guidelines & Reviews (Bayesian Prior)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {scanResults.existingGuidelines.slice(0, 5).map((g: any) => (
                    <div key={g.pmid} style={{ fontSize: '12px', color: '#374151', padding: '6px 10px', background: '#F0FDF4', borderRadius: '6px' }}>
                      <span style={{ fontWeight: 600 }}>{g.title}</span>
                      <span style={{ color: '#6B7280', marginLeft: '6px' }}>{g.journal} ({g.year})</span>
                      <a
                        href={`https://pubmed.ncbi.nlm.nih.gov/${g.pmid}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#2563EB', marginLeft: '6px', textDecoration: 'none', fontSize: '11px' }}
                      >PMID:{g.pmid}</a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Domain cards */}
            <div style={{ ...card, borderTop: '3px solid #8B5CF6' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#1E1B4B' }}>Proposed Clinical Domains</h2>
                  <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                    {domains.length} domains with {totalPicos} PICO questions. Edit, reorder, add, or remove as needed.
                  </p>
                </div>
                <button
                  onClick={addDomain}
                  style={{
                    padding: '6px 14px', borderRadius: '6px', border: '1px dashed #8B5CF6',
                    background: 'white', color: '#8B5CF6', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  }}
                >+ Add Domain</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {domains.map((domain, di) => (
                  <div key={domain.id} style={{
                    borderRadius: '10px', border: '1px solid #E5E7EB', overflow: 'hidden',
                  }}>
                    {/* Domain header */}
                    <div
                      style={{
                        padding: '12px 16px', background: '#FAFAF9',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer',
                      }}
                      onClick={() => toggleDomainCollapse(domain.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '8px',
                          background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontSize: '12px', fontWeight: 800,
                        }}>{String.fromCharCode(65 + di)}</div>
                        <div>
                          <input
                            value={domain.label}
                            onChange={e => updateDomainLabel(domain.id, e.target.value)}
                            onClick={e => e.stopPropagation()}
                            style={{
                              fontSize: '14px', fontWeight: 700, color: '#1E1B4B', border: 'none',
                              background: 'transparent', outline: 'none', width: '100%',
                            }}
                          />
                          <div style={{ fontSize: '11px', color: '#6B7280' }}>
                            {domain.description} &middot; {domain.picos.length} PICOs
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={e => { e.stopPropagation(); removeDomain(domain.id) }}
                          style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '14px', padding: '4px' }}
                          title="Remove domain"
                        >&#10005;</button>
                        <span style={{
                          fontSize: '14px', color: '#9CA3AF',
                          transform: domain.collapsed ? 'rotate(-90deg)' : 'rotate(0)',
                          transition: 'transform 0.2s', display: 'inline-block',
                        }}>{'\u25BE'}</span>
                      </div>
                    </div>

                    {/* Domain PICOs */}
                    {!domain.collapsed && (
                      <div style={{ padding: '12px 16px', background: 'white' }}>
                        {domain.picos.map((pico, pi) => (
                          <div key={pico.id} style={{
                            padding: '10px 12px', marginBottom: '8px', borderRadius: '8px',
                            background: '#F9FAFB', border: '1px solid #E5E7EB',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#4C1D95' }}>
                                PICO {String.fromCharCode(65 + di)}{pi + 1}: {pico.topic || '(untitled)'}
                              </span>
                              <button
                                onClick={() => removePico(domain.id, pico.id)}
                                style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '12px' }}
                              >&#10005;</button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                              {[
                                { key: 'population', label: 'P', color: '#2563EB' },
                                { key: 'intervention', label: 'I', color: '#059669' },
                                { key: 'comparison', label: 'C', color: '#D97706' },
                                { key: 'outcome', label: 'O', color: '#DC2626' },
                              ].map(({ key, label, color }) => (
                                <div key={key}>
                                  <label style={{ fontSize: '10px', fontWeight: 700, color, display: 'block', marginBottom: '2px' }}>{label}</label>
                                  <textarea
                                    value={(pico as any)[key] || ''}
                                    onChange={e => updatePicoField(domain.id, pico.id, key, e.target.value)}
                                    style={{
                                      ...inp, padding: '6px 10px', fontSize: '12px', height: '48px', resize: 'vertical',
                                      borderColor: (pico as any)[key] ? color + '44' : '#D1D5DB',
                                    }}
                                    placeholder={`${label}...`}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                        {/* Add PICO / Paste PICOs buttons */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <button
                            onClick={() => addPico(domain.id)}
                            style={{
                              padding: '6px 12px', borderRadius: '6px', border: '1px dashed #D1D5DB',
                              background: 'white', fontSize: '12px', color: '#6B7280', cursor: 'pointer',
                            }}
                          >+ Add PICO</button>
                          <button
                            onClick={() => setShowPastePico(showPastePico === domain.id ? null : domain.id)}
                            style={{
                              padding: '6px 12px', borderRadius: '6px', border: '1px dashed #8B5CF6',
                              background: 'white', fontSize: '12px', color: '#8B5CF6', cursor: 'pointer',
                            }}
                          >&#128203; Paste PICOs</button>
                        </div>

                        {/* Paste area */}
                        {showPastePico === domain.id && (
                          <div style={{ marginTop: '8px', padding: '10px', background: '#F5F3FF', borderRadius: '8px', border: '1px solid #DDD6FE' }}>
                            <p style={{ fontSize: '11px', color: '#4C1D95', marginBottom: '6px' }}>
                              Paste PICO questions (one per line, prefix with P: I: C: O: or just paste topic lines):
                            </p>
                            <textarea
                              value={pasteText}
                              onChange={e => setPasteText(e.target.value)}
                              style={{ ...inp, height: '80px', fontSize: '12px' }}
                              placeholder="P: Adults aged 45-75&#10;I: FIT every 2 years&#10;C: No screening&#10;O: CRC mortality"
                            />
                            <button
                              onClick={() => handlePastePicos(domain.id)}
                              style={{
                                marginTop: '6px', padding: '6px 14px', borderRadius: '6px', border: 'none',
                                background: '#8B5CF6', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                              }}
                            >Import PICOs</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #E5E7EB' }}>
                <button
                  onClick={() => setStep('title')}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #D1D5DB', background: 'white', fontSize: '14px', color: '#6B7280', cursor: 'pointer' }}
                >&larr; Back</button>
                <button
                  onClick={() => setStep('modules')}
                  disabled={totalPicos === 0}
                  style={{
                    padding: '10px 28px', borderRadius: '8px', border: 'none',
                    background: totalPicos > 0 ? 'linear-gradient(135deg, #8B5CF6, #7C3AED)' : '#E5E7EB',
                    color: totalPicos > 0 ? 'white' : '#9CA3AF',
                    fontSize: '14px', fontWeight: 600,
                    cursor: totalPicos > 0 ? 'pointer' : 'default',
                  }}
                >Next: Select Pipeline Modules ({totalPicos} PICOs) &rarr;</button>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════
           STEP 3: Select Pipeline Modules
           ═══════════════════════════════════════════ */}
        {step === 'modules' && (
          <>
            {/* Summary bar */}
            <div style={{ ...card, padding: '14px 20px', marginBottom: '20px', background: '#F5F3FF', borderColor: '#DDD6FE' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#4C1D95' }}>{title}</span>
                  <span style={{ fontSize: '12px', color: '#7C3AED', marginLeft: '10px' }}>
                    {selectedCountry.flag} {selectedCountry.label} &middot; {domains.length} domains &middot; {totalPicos} PICOs
                  </span>
                </div>
                <button onClick={() => setStep('domains')} style={{ fontSize: '12px', color: '#7C3AED', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  &larr; Edit Domains
                </button>
              </div>
            </div>

            {/* Presets */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#6B7280', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Pipeline Presets
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {PRESETS.map(preset => {
                  const match = preset.modules.length === modules.size && preset.modules.every(m => modules.has(m))
                  return (
                    <button
                      key={preset.label}
                      onClick={() => setModules(new Set(preset.modules))}
                      style={{
                        ...card, padding: '12px 16px', cursor: 'pointer', textAlign: 'left',
                        borderColor: match ? '#8B5CF6' : '#E5E5E0',
                        background: match ? '#F5F3FF' : 'white',
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: 700, color: match ? '#4C1D95' : '#1F2937', marginBottom: '2px' }}>{preset.label}</div>
                      <div style={{ fontSize: '11px', color: '#6B7280' }}>{preset.desc}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Module grid */}
            <div style={{ ...card, borderTop: '3px solid #8B5CF6' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#1E1B4B' }}>Per-PICO Pipeline Modules</h2>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>{modules.size} of {ALL_MODULES.length} selected</span>
              </div>

              <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '20px', lineHeight: '1.5' }}>
                Each module runs as a <strong>specialized AI agent</strong> for every PICO question. With {totalPicos} PICOs and {modules.size} modules selected, the engine will run <strong>{totalPicos * modules.size} agent tasks</strong> in sequence.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                {ALL_MODULES.map(mod => {
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
                      <div style={{
                        width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
                        border: `2px solid ${selected ? agent?.color || '#8B5CF6' : '#D1D5DB'}`,
                        background: selected ? agent?.color || '#8B5CF6' : 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '12px', fontWeight: 700,
                      }}>{selected && '\u2713'}</div>

                      <div style={{
                        width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
                        background: selected ? `linear-gradient(135deg, ${agent?.color}20, ${agent?.color}10)` : '#F3F4F6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: 800, color: selected ? agent?.color : '#9CA3AF',
                      }}>{agent?.icon || '#'}</div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: selected ? '#1E1B4B' : '#6B7280' }}>{mod.label}</span>
                          {selected && (
                            <span style={{
                              fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
                              background: agent?.color + '15', color: agent?.color,
                            }}>{agent?.label}</span>
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
                  onClick={() => setStep('domains')}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #D1D5DB', background: 'white', fontSize: '14px', color: '#6B7280', cursor: 'pointer' }}
                >&larr; Back to Domains</button>
                <button
                  onClick={handleLaunch}
                  disabled={modules.size === 0}
                  style={{
                    padding: '12px 32px', borderRadius: '10px', border: 'none',
                    background: modules.size > 0 ? 'linear-gradient(135deg, #8B5CF6, #D97757)' : '#E5E7EB',
                    color: 'white', fontSize: '15px', fontWeight: 700,
                    cursor: modules.size > 0 ? 'pointer' : 'default',
                    boxShadow: modules.size > 0 ? '0 4px 14px rgba(139,92,246,0.3)' : 'none',
                  }}
                >
                  Launch Engine ({domains.length} domains, {totalPicos} PICOs, {modules.size} modules)
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
