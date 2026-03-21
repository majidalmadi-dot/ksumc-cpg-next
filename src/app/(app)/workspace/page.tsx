'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { useAIWorkflow, type ClinicalDomain, type EnrichedPICO, type PipelineStageStatus, ALL_MODULES } from '@/lib/ai-workflow'

/* ═══════════════════════════════════════════════════════════════
   Pipeline Stage Rendering Helpers
   ═══════════════════════════════════════════════════════════════ */

const STAGE_META: Record<string, { label: string; icon: string; color: string; moduleId: string; path: string }> = {
  literatureSearch:  { label: 'Evidence',  icon: '⊕', color: '#8B5CF6', moduleId: 'evidence',   path: '/evidence' },
  evidenceSynthesis: { label: 'GRADE',     icon: '⬆', color: '#3B82F6', moduleId: 'grade',      path: '/grade' },
  srma:              { label: 'SR/MA',     icon: '⊞', color: '#06B6D4', moduleId: 'synthesis',   path: '/systematic-review' },
  cea:               { label: 'CEA',       icon: '◇', color: '#10B981', moduleId: 'economics',   path: '/cea' },
  hta:               { label: 'HTA',       icon: '⊘', color: '#F59E0B', moduleId: 'hta',         path: '/hta' },
  grade:             { label: 'Frameworks', icon: '⬡', color: '#EF4444', moduleId: 'frameworks', path: '/frameworks' },
  recommendation:    { label: 'Report',    icon: '⊟', color: '#D97757', moduleId: 'report',      path: '/reports' },
}

const PIPELINE_ORDER = ['literatureSearch', 'evidenceSynthesis', 'srma', 'cea', 'hta', 'grade', 'recommendation'] as const

function statusDot(s: PipelineStageStatus) {
  if (s === 'complete') return { bg: '#10B981', border: '#059669', symbol: '✓' }
  if (s === 'running')  return { bg: '#F59E0B', border: '#D97706', symbol: '→' }
  if (s === 'skipped')  return { bg: '#9CA3AF', border: '#6B7280', symbol: '–' }
  return { bg: '#E5E7EB', border: '#D1D5DB', symbol: '' }
}

function pipelineProgress(pico: EnrichedPICO, selectedModules: Set<string>): { done: number; total: number } {
  let done = 0, total = 0
  for (const stage of PIPELINE_ORDER) {
    const meta = STAGE_META[stage]
    if (!selectedModules.has(meta.moduleId)) continue
    total++
    if (pico.pipeline[stage] === 'complete') done++
  }
  return { done, total }
}

/* ═══════════════════════════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════════════════════════ */

const card: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #E8E5E0',
  borderRadius: '12px',
  padding: '20px 24px',
  transition: 'box-shadow 0.15s',
}

const badge = (bg: string, fg: string): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '2px 10px',
  borderRadius: '9999px',
  fontSize: '11px',
  fontWeight: 600,
  background: bg,
  color: fg,
  letterSpacing: '0.02em',
})

/* ═══════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════ */

export default function WorkspacePage() {
  const router = useRouter()
  const { guidelineProject, selectedModules, activePicoId, setActivePico, isActive, stopWorkflow } = useAIWorkflow()
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | 'pending' | 'in-progress' | 'complete'>('all')
  const [downloading, setDownloading] = useState(false)

  const toggleDomain = useCallback((id: string) => {
    setExpandedDomains(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  // Expand all by default on first render
  const domains = guidelineProject?.domains || []
  const allDomainIds = useMemo(() => new Set(domains.map(d => d.id)), [domains])
  const effectiveExpanded = expandedDomains.size === 0 ? allDomainIds : expandedDomains

  // Stats
  const stats = useMemo(() => {
    const allPicos = domains.flatMap(d => d.picos)
    const total = allPicos.length
    let completed = 0, inProgress = 0, pending = 0
    for (const p of allPicos) {
      const prog = pipelineProgress(p, selectedModules)
      if (prog.done === prog.total && prog.total > 0) completed++
      else if (prog.done > 0) inProgress++
      else pending++
    }
    return { total, completed, inProgress, pending }
  }, [domains, selectedModules])

  // Filter PICOs per domain
  const filterPico = useCallback((p: EnrichedPICO) => {
    if (filter === 'all') return true
    const prog = pipelineProgress(p, selectedModules)
    if (filter === 'complete') return prog.done === prog.total && prog.total > 0
    if (filter === 'in-progress') return prog.done > 0 && prog.done < prog.total
    return prog.done === 0
  }, [filter, selectedModules])

  const handleOpenPico = useCallback((picoId: string, stagePath?: string) => {
    setActivePico(picoId)
    setTimeout(() => {
      router.push(stagePath || '/evidence')
    }, 100)
  }, [setActivePico, router])

  // Not active — redirect to start
  if (!isActive || !guidelineProject) {
    return (
      <>
        <Header title="Guideline Workspace" subtitle="No active project" />
        <div style={{ padding: '40px 32px', textAlign: 'center' }}>
          <div style={{ ...card, maxWidth: '500px', margin: '0 auto' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>No Active Project</h2>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '16px' }}>
              Start a new guideline project from the Bayesian Engine to see your workspace.
            </p>
            <button
              onClick={() => router.push('/start')}
              style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#D97757', color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
            >
              Launch Bayesian Engine
            </button>
          </div>
        </div>
      </>
    )
  }

  const totalModules = selectedModules.size
  const overallPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  return (
    <>
      <Header title="Guideline Workspace" subtitle={guidelineProject.title} />
      <div style={{ padding: '24px 32px', maxWidth: '1200px' }}>

        {/* ─── Project Header ─── */}
        <div style={{ ...card, marginBottom: '20px', background: 'linear-gradient(135deg, #FAF9F6 0%, #F0EDE8 100%)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1E1E2E', marginBottom: '6px' }}>
                {guidelineProject.title}
              </h2>
              <p style={{ fontSize: '13px', color: '#6B7280' }}>
                {guidelineProject.countryLabel} &middot; {domains.length} domains &middot; {stats.total} PICO questions &middot; {totalModules} pipeline modules
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => router.push('/start')}
                style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #E8E5E0', background: 'white', fontSize: '12px', fontWeight: 600, color: '#6B7280', cursor: 'pointer' }}
              >
                Edit Scope
              </button>
              <button
                onClick={stopWorkflow}
                style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #FCA5A5', background: '#FEF2F2', fontSize: '12px', fontWeight: 600, color: '#EF4444', cursor: 'pointer' }}
              >
                End Project
              </button>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6B7280', marginBottom: '6px' }}>
              <span>Overall Progress</span>
              <span>{stats.completed}/{stats.total} PICOs complete ({overallPct}%)</span>
            </div>
            <div style={{ height: '8px', background: '#E8E5E0', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${overallPct}%`,
                background: 'linear-gradient(90deg, #D97757, #8B5CF6)',
                borderRadius: '4px',
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>

          {/* Stat Pills */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '14px', flexWrap: 'wrap' }}>
            <span style={badge('#F0FDF4', '#166534')}>{stats.completed} Complete</span>
            <span style={badge('#FFFBEB', '#92400E')}>{stats.inProgress} In Progress</span>
            <span style={badge('#F3F4F6', '#374151')}>{stats.pending} Pending</span>
          </div>
        </div>

        {/* ─── Filter Bar ─── */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#6B7280', marginRight: '4px' }}>Filter:</span>
          {(['all', 'pending', 'in-progress', 'complete'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '5px 14px', borderRadius: '9999px', border: '1px solid', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                borderColor: filter === f ? '#D97757' : '#E8E5E0',
                background: filter === f ? '#FEF3EE' : 'white',
                color: filter === f ? '#D97757' : '#6B7280',
              }}
            >
              {f === 'all' ? `All (${stats.total})` : f === 'pending' ? `Pending (${stats.pending})` : f === 'in-progress' ? `In Progress (${stats.inProgress})` : `Complete (${stats.completed})`}
            </button>
          ))}
        </div>

        {/* ─── Pipeline Legend ─── */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', padding: '10px 16px', background: '#FAFAF8', borderRadius: '8px', border: '1px solid #E8E5E0' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '4px', alignSelf: 'center' }}>Pipeline:</span>
          {PIPELINE_ORDER.map(stage => {
            const meta = STAGE_META[stage]
            const active = selectedModules.has(meta.moduleId)
            return (
              <span key={stage} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: active ? '#374151' : '#9CA3AF', opacity: active ? 1 : 0.5 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: active ? meta.color : '#D1D5DB', display: 'inline-block' }} />
                {meta.label}
              </span>
            )
          })}
        </div>

        {/* ─── Domain Cards ─── */}
        {domains.map((domain, di) => {
          const domainPicos = domain.picos.filter(filterPico)
          const domainTotal = domain.picos.length
          const domainComplete = domain.picos.filter(p => {
            const prog = pipelineProgress(p, selectedModules)
            return prog.done === prog.total && prog.total > 0
          }).length
          const expanded = effectiveExpanded.has(domain.id)

          return (
            <div key={domain.id} style={{ ...card, marginBottom: '12px', padding: 0 }}>
              {/* Domain Header */}
              <button
                onClick={() => toggleDomain(domain.id)}
                style={{
                  width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#D97757', width: '24px', textAlign: 'center' }}>
                    {String.fromCharCode(65 + di)}
                  </span>
                  <div>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: '#1E1E2E' }}>{domain.label}</span>
                    {domain.description && (
                      <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>{domain.description}</p>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>
                    {domainComplete}/{domainTotal} PICOs
                  </span>
                  {/* Mini progress bar */}
                  <div style={{ width: '60px', height: '4px', background: '#E8E5E0', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: domainTotal > 0 ? `${(domainComplete / domainTotal) * 100}%` : '0%',
                      background: '#D97757',
                      borderRadius: '2px',
                    }} />
                  </div>
                  <span style={{ fontSize: '16px', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                    ▾
                  </span>
                </div>
              </button>

              {/* PICO rows */}
              {expanded && (
                <div style={{ borderTop: '1px solid #F0EDE8' }}>
                  {domainPicos.length === 0 ? (
                    <div style={{ padding: '16px 20px', fontSize: '13px', color: '#9CA3AF', textAlign: 'center' }}>
                      No PICOs match the current filter.
                    </div>
                  ) : domainPicos.map((pico, pi) => {
                    const prog = pipelineProgress(pico, selectedModules)
                    const isActivePico = activePicoId === pico.id
                    const picoLabel = `${String.fromCharCode(65 + di)}${pi + 1}`

                    // Find the first incomplete stage
                    let nextStage: string | null = null
                    for (const stage of PIPELINE_ORDER) {
                      const meta = STAGE_META[stage]
                      if (!selectedModules.has(meta.moduleId)) continue
                      if (pico.pipeline[stage] !== 'complete') {
                        nextStage = stage
                        break
                      }
                    }

                    return (
                      <div
                        key={pico.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '12px 20px', borderBottom: '1px solid #F5F3F0',
                          background: isActivePico ? '#F5F0FF' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onClick={() => handleOpenPico(pico.id, nextStage ? STAGE_META[nextStage].path : undefined)}
                        onMouseEnter={e => { if (!isActivePico) (e.currentTarget as HTMLDivElement).style.background = '#FAFAF8' }}
                        onMouseLeave={e => { if (!isActivePico) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                      >
                        {/* PICO label */}
                        <span style={{
                          fontSize: '11px', fontWeight: 700, color: isActivePico ? '#8B5CF6' : '#D97757',
                          background: isActivePico ? '#EDE9FE' : '#FEF3EE',
                          padding: '2px 8px', borderRadius: '6px', fontFamily: 'monospace',
                          minWidth: '32px', textAlign: 'center',
                        }}>
                          {picoLabel}
                        </span>

                        {/* PICO topic */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: '#1E1E2E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {pico.topic || `${pico.intervention} vs ${pico.comparison || 'SOC'}`}
                          </div>
                          <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '1px' }}>
                            P: {pico.population?.slice(0, 50)}{pico.population?.length > 50 ? '...' : ''}
                          </div>
                        </div>

                        {/* Pipeline dots */}
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          {PIPELINE_ORDER.map(stage => {
                            const meta = STAGE_META[stage]
                            if (!selectedModules.has(meta.moduleId)) return null
                            const st = statusDot(pico.pipeline[stage])
                            return (
                              <div
                                key={stage}
                                title={`${meta.label}: ${pico.pipeline[stage]}`}
                                style={{
                                  width: '20px', height: '20px', borderRadius: '50%',
                                  background: st.bg, border: `1.5px solid ${st.border}`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: '10px', fontWeight: 700, color: pico.pipeline[stage] === 'complete' ? 'white' : '#6B7280',
                                }}
                              >
                                {st.symbol}
                              </div>
                            )
                          })}
                        </div>

                        {/* Progress fraction */}
                        <span style={{ fontSize: '11px', fontWeight: 600, color: prog.done === prog.total && prog.total > 0 ? '#10B981' : '#6B7280', minWidth: '32px', textAlign: 'right' }}>
                          {prog.done}/{prog.total}
                        </span>

                        {/* Action button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenPico(pico.id, nextStage ? STAGE_META[nextStage].path : undefined)
                          }}
                          style={{
                            padding: '4px 12px', borderRadius: '6px', border: 'none',
                            background: isActivePico ? '#8B5CF6' : '#D97757',
                            color: 'white', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {prog.done === 0 ? 'Start' : prog.done === prog.total ? 'Review' : 'Continue'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* ─── Quick Actions ─── */}
        <div style={{ ...card, marginTop: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => {
              // Batch run: find first incomplete PICO and start it
              for (const domain of domains) {
                for (const p of domain.picos) {
                  const prog = pipelineProgress(p, selectedModules)
                  if (prog.done < prog.total) {
                    let nextStage: string | null = null
                    for (const stage of PIPELINE_ORDER) {
                      const meta = STAGE_META[stage]
                      if (!selectedModules.has(meta.moduleId)) continue
                      if (p.pipeline[stage] !== 'complete') { nextStage = stage; break }
                    }
                    handleOpenPico(p.id, nextStage ? STAGE_META[nextStage].path : undefined)
                    return
                  }
                }
              }
            }}
            style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#D97757', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            Continue Next PICO →
          </button>
          <button
            disabled={downloading}
            onClick={async () => {
              if (!guidelineProject) return
              setDownloading(true)
              try {
                const res = await fetch('/api/report-assembly', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(guidelineProject),
                })
                if (!res.ok) throw new Error('Failed')
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `${guidelineProject.title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')}_CPG.docx`
                a.click()
                URL.revokeObjectURL(url)
              } catch { /* silent */ }
              setDownloading(false)
            }}
            style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#1D4ED8', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: downloading ? 0.6 : 1 }}
          >
            {downloading ? 'Generating...' : 'Download DOCX Report'}
          </button>
          <button
            onClick={() => router.push('/reports')}
            style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid #E8E5E0', background: 'white', color: '#374151', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            Reports Page
          </button>
          <button
            onClick={() => router.push('/delphi')}
            style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid #E8E5E0', background: 'white', color: '#374151', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            Delphi Voting
          </button>
        </div>

      </div>
    </>
  )
}
