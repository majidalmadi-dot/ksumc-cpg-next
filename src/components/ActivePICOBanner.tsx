'use client'

import { useMemo } from 'react'
import { useAIWorkflow } from '@/lib/ai-workflow'

/* ═══════════════════════════════════════════════════════════════
   Active PICO Banner
   Shows which PICO question is currently being processed,
   with domain context and pipeline stage indicator.
   ═══════════════════════════════════════════════════════════════ */

const PIPELINE_ORDER = ['literatureSearch', 'evidenceSynthesis', 'srma', 'cea', 'hta', 'grade', 'recommendation'] as const
const STAGE_LABELS: Record<string, string> = {
  literatureSearch: 'Evidence Search', evidenceSynthesis: 'GRADE Assessment',
  srma: 'SR & Meta-Analysis', cea: 'Cost-Effectiveness', hta: 'HTA Appraisal',
  grade: 'Framework Compliance', recommendation: 'Report',
}
const MODULE_MAP: Record<string, string> = {
  evidence: 'literatureSearch', grade: 'evidenceSynthesis', synthesis: 'srma',
  economics: 'cea', hta: 'hta', frameworks: 'grade', report: 'recommendation',
}

interface Props {
  moduleId: string  // 'evidence' | 'grade' | 'synthesis' | 'economics' | 'hta' | 'frameworks' | 'report'
}

export default function ActivePICOBanner({ moduleId }: Props) {
  const { guidelineProject, activePicoId, selectedModules, pico } = useAIWorkflow()

  const activePicoInfo = useMemo(() => {
    if (!guidelineProject || !activePicoId) return null
    for (let di = 0; di < guidelineProject.domains.length; di++) {
      const domain = guidelineProject.domains[di]
      const pi = domain.picos.findIndex(p => p.id === activePicoId)
      if (pi >= 0) {
        return {
          pico: domain.picos[pi],
          domain,
          label: `${String.fromCharCode(65 + di)}${pi + 1}`,
          domainLetter: String.fromCharCode(65 + di),
        }
      }
    }
    return null
  }, [guidelineProject, activePicoId])

  if (!activePicoInfo || !pico) return null

  const pipelineStage = MODULE_MAP[moduleId]
  const stageLabel = pipelineStage ? STAGE_LABELS[pipelineStage] : moduleId

  // Pipeline progress for this PICO
  const stages = PIPELINE_ORDER.filter(s => {
    const modId = Object.entries(MODULE_MAP).find(([, v]) => v === s)?.[0]
    return modId && selectedModules.has(modId)
  })
  const currentIdx = stages.indexOf(pipelineStage as any)
  const completedCount = stages.filter(s => activePicoInfo.pico.pipeline[s] === 'complete').length

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1E1E2E 0%, #2D2D3D 100%)',
      borderRadius: '12px',
      padding: '14px 20px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '12px',
    }}>
      {/* Left: PICO info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{
          fontSize: '12px', fontWeight: 700, color: '#D97757',
          background: 'rgba(217,119,87,0.15)', padding: '4px 10px',
          borderRadius: '6px', fontFamily: 'monospace',
        }}>
          {activePicoInfo.label}
        </span>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF' }}>
            {pico.topic || `${pico.intervention} vs ${pico.comparison || 'SOC'}`}
          </div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
            {activePicoInfo.domain.label} &middot; P: {pico.population?.slice(0, 60)}{(pico.population?.length || 0) > 60 ? '...' : ''}
          </div>
        </div>
      </div>

      {/* Right: Stage indicator + pipeline mini dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Current stage badge */}
        <span style={{
          fontSize: '11px', fontWeight: 700, color: '#8B5CF6',
          background: 'rgba(139,92,246,0.15)', padding: '4px 12px',
          borderRadius: '9999px', textTransform: 'uppercase', letterSpacing: '0.03em',
        }}>
          {stageLabel}
        </span>

        {/* Mini pipeline dots */}
        <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
          {stages.map((stage, i) => {
            const status = activePicoInfo.pico.pipeline[stage]
            const isCurrent = stage === pipelineStage
            let bg = '#4B5563' // pending
            if (status === 'complete') bg = '#10B981'
            else if (isCurrent) bg = '#8B5CF6'
            else if (status === 'skipped') bg = '#6B7280'

            return (
              <div key={stage} style={{
                width: isCurrent ? '20px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: bg,
                transition: 'all 0.2s',
              }} />
            )
          })}
        </div>

        <span style={{ fontSize: '11px', color: '#6B7280' }}>
          {completedCount}/{stages.length}
        </span>
      </div>
    </div>
  )
}
