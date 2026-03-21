'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAIWorkflow, type EnrichedPICO, type PipelineStageStatus } from '@/lib/ai-workflow'

/* ═══════════════════════════════════════════════════════════════
   PICO Navigator — Floating panel for switching between PICOs
   Shows on every module page when a guideline project is active.
   ═══════════════════════════════════════════════════════════════ */

const PIPELINE_ORDER = ['literatureSearch', 'evidenceSynthesis', 'srma', 'cea', 'hta', 'grade', 'recommendation'] as const
const STAGE_LABELS: Record<string, string> = {
  literatureSearch: 'Evidence', evidenceSynthesis: 'GRADE', srma: 'SR/MA',
  cea: 'CEA', hta: 'HTA', grade: 'Frameworks', recommendation: 'Report',
}
const STAGE_MODULE: Record<string, string> = {
  literatureSearch: 'evidence', evidenceSynthesis: 'grade', srma: 'synthesis',
  cea: 'economics', hta: 'hta', grade: 'frameworks', recommendation: 'report',
}

function dotColor(s: PipelineStageStatus): string {
  if (s === 'complete') return '#10B981'
  if (s === 'running') return '#F59E0B'
  if (s === 'skipped') return '#9CA3AF'
  return '#D1D5DB'
}

export default function PICONavigator() {
  const router = useRouter()
  const pathname = usePathname()
  const { guidelineProject, selectedModules, activePicoId, setActivePico, isActive } = useAIWorkflow()
  const [collapsed, setCollapsed] = useState(false)
  const [hoveredPico, setHoveredPico] = useState<string | null>(null)

  const domains = guidelineProject?.domains || []
  const totalPicos = domains.reduce((s, d) => s + d.picos.length, 0)

  // Current active PICO info
  const activePico = useMemo(() => {
    if (!activePicoId) return null
    for (const d of domains) {
      const found = d.picos.find(p => p.id === activePicoId)
      if (found) return { pico: found, domain: d }
    }
    return null
  }, [domains, activePicoId])

  // Navigate: switch PICO, stay on current module page
  const switchToPico = useCallback((picoId: string) => {
    setActivePico(picoId)
    // Stay on the current page — the page will re-render with new PICO data
  }, [setActivePico])

  // Next/prev PICO navigation
  const allPicos = useMemo(() => domains.flatMap(d => d.picos), [domains])
  const currentIdx = allPicos.findIndex(p => p.id === activePicoId)

  const goNext = useCallback(() => {
    if (currentIdx < allPicos.length - 1) switchToPico(allPicos[currentIdx + 1].id)
  }, [currentIdx, allPicos, switchToPico])

  const goPrev = useCallback(() => {
    if (currentIdx > 0) switchToPico(allPicos[currentIdx - 1].id)
  }, [currentIdx, allPicos, switchToPico])

  if (!isActive || !guidelineProject || totalPicos === 0) return null

  // Don't show on start or workspace pages
  if (pathname === '/start' || pathname === '/workspace') return null

  return (
    <div style={{
      position: 'fixed',
      right: '16px',
      top: '80px',
      width: collapsed ? '48px' : '280px',
      maxHeight: 'calc(100vh - 100px)',
      background: '#1E1E2E',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      zIndex: 1000,
      transition: 'width 0.2s ease',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          padding: collapsed ? '12px 14px' : '12px 16px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}
      >
        {collapsed ? (
          <span style={{ fontSize: '16px' }} title="PICO Navigator">⊕</span>
        ) : (
          <>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#D97757', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              PICO Navigator
            </span>
            <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
              {currentIdx + 1}/{totalPicos}
            </span>
          </>
        )}
      </div>

      {!collapsed && (
        <>
          {/* Active PICO card */}
          {activePico && (
            <div style={{ padding: '12px 16px', background: 'rgba(139,92,246,0.1)', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#8B5CF6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Active
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', marginBottom: '4px', lineHeight: 1.3 }}>
                {activePico.pico.topic || `${activePico.pico.intervention} vs ${activePico.pico.comparison || 'SOC'}`}
              </div>
              <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '8px' }}>
                {activePico.domain.label}
              </div>
              {/* Pipeline dots for active PICO */}
              <div style={{ display: 'flex', gap: '3px' }}>
                {PIPELINE_ORDER.map(stage => {
                  if (!selectedModules.has(STAGE_MODULE[stage])) return null
                  return (
                    <div key={stage} title={`${STAGE_LABELS[stage]}: ${activePico.pico.pipeline[stage]}`} style={{
                      width: '16px', height: '16px', borderRadius: '50%',
                      background: dotColor(activePico.pico.pipeline[stage]),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '8px', color: 'white', fontWeight: 700,
                    }}>
                      {activePico.pico.pipeline[stage] === 'complete' ? '✓' : ''}
                    </div>
                  )
                })}
              </div>
              {/* Prev/Next */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  disabled={currentIdx <= 0}
                  onClick={goPrev}
                  style={{
                    flex: 1, padding: '4px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)', color: currentIdx > 0 ? '#FFFFFF' : '#4B5563',
                    fontSize: '11px', fontWeight: 600, cursor: currentIdx > 0 ? 'pointer' : 'default',
                  }}
                >
                  ← Prev
                </button>
                <button
                  disabled={currentIdx >= allPicos.length - 1}
                  onClick={goNext}
                  style={{
                    flex: 1, padding: '4px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.05)', color: currentIdx < allPicos.length - 1 ? '#FFFFFF' : '#4B5563',
                    fontSize: '11px', fontWeight: 600, cursor: currentIdx < allPicos.length - 1 ? 'pointer' : 'default',
                  }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* PICO List */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
            {domains.map((domain, di) => (
              <div key={domain.id}>
                {/* Domain label */}
                <div style={{ padding: '6px 16px 4px', fontSize: '10px', fontWeight: 700, color: '#D97757', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {String.fromCharCode(65 + di)}. {domain.label}
                </div>
                {/* PICOs */}
                {domain.picos.map((pico, pi) => {
                  const isActive = pico.id === activePicoId
                  const isHovered = hoveredPico === pico.id
                  const completedStages = PIPELINE_ORDER.filter(s => selectedModules.has(STAGE_MODULE[s]) && pico.pipeline[s] === 'complete').length
                  const totalStages = PIPELINE_ORDER.filter(s => selectedModules.has(STAGE_MODULE[s])).length

                  return (
                    <div
                      key={pico.id}
                      onClick={() => switchToPico(pico.id)}
                      onMouseEnter={() => setHoveredPico(pico.id)}
                      onMouseLeave={() => setHoveredPico(null)}
                      style={{
                        padding: '6px 16px 6px 28px',
                        cursor: 'pointer',
                        background: isActive ? 'rgba(139,92,246,0.15)' : isHovered ? 'rgba(255,255,255,0.03)' : 'transparent',
                        borderLeft: isActive ? '2px solid #8B5CF6' : '2px solid transparent',
                        transition: 'background 0.1s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{
                          fontSize: '12px', color: isActive ? '#FFFFFF' : '#D1D5DB',
                          fontWeight: isActive ? 600 : 400,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          maxWidth: '180px',
                        }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#D97757', marginRight: '6px' }}>
                            {String.fromCharCode(65 + di)}{pi + 1}
                          </span>
                          {pico.topic || pico.intervention?.slice(0, 30)}
                        </span>
                        <span style={{ fontSize: '10px', color: completedStages === totalStages && totalStages > 0 ? '#10B981' : '#6B7280', fontWeight: 600 }}>
                          {completedStages}/{totalStages}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Footer: Go to Workspace */}
          <div style={{ padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
            <button
              onClick={() => router.push('/workspace')}
              style={{
                width: '100%', padding: '6px', borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
                color: '#D97757', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Open Workspace
            </button>
          </div>
        </>
      )}
    </div>
  )
}
