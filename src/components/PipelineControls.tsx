'use client'

import { useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAIWorkflow, ALL_MODULES } from '@/lib/ai-workflow'

/* ═══════════════════════════════════════════════════════════════
   Pipeline Controls
   Approve / Skip / Navigate buttons for each module page.
   Automatically advances the pipeline and navigates to the
   next module or back to workspace.
   ═══════════════════════════════════════════════════════════════ */

interface Props {
  moduleId: string  // 'evidence' | 'grade' | 'synthesis' | 'economics' | 'hta' | 'frameworks' | 'report'
  onApprove?: () => void  // optional callback before approval
  disabled?: boolean
}

const MODULE_ORDER = ['evidence', 'grade', 'synthesis', 'economics', 'hta', 'frameworks', 'report']

export default function PipelineControls({ moduleId, onApprove, disabled }: Props) {
  const router = useRouter()
  const { isActive, markPageApproved, skipPage, selectedModules, guidelineProject, activePicoId } = useAIWorkflow()

  // Find next module in pipeline
  const nextModule = useMemo(() => {
    const activeModules = MODULE_ORDER.filter(m => selectedModules.has(m))
    const currentIdx = activeModules.indexOf(moduleId)
    if (currentIdx >= 0 && currentIdx < activeModules.length - 1) {
      const nextId = activeModules[currentIdx + 1]
      const mod = ALL_MODULES.find(m => m.id === nextId)
      return mod || null
    }
    return null
  }, [moduleId, selectedModules])

  const handleApprove = useCallback(() => {
    onApprove?.()
    markPageApproved(moduleId)
    if (nextModule) {
      router.push(nextModule.path)
    } else {
      router.push('/workspace')
    }
  }, [moduleId, markPageApproved, nextModule, router, onApprove])

  const handleSkip = useCallback(() => {
    skipPage(moduleId)
    if (nextModule) {
      router.push(nextModule.path)
    } else {
      router.push('/workspace')
    }
  }, [moduleId, skipPage, nextModule, router])

  if (!isActive || !guidelineProject) return null

  return (
    <div style={{
      position: 'sticky',
      bottom: 0,
      background: 'linear-gradient(180deg, rgba(250,249,246,0) 0%, #FAF9F6 15%, #FAF9F6 100%)',
      padding: '20px 0 8px',
      marginTop: '24px',
      zIndex: 50,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#FFFFFF',
        border: '1px solid #E8E5E0',
        borderRadius: '12px',
        padding: '12px 20px',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.04)',
      }}>
        {/* Left: current stage info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>
            Current: {ALL_MODULES.find(m => m.id === moduleId)?.label || moduleId}
          </span>
          {nextModule && (
            <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
              → Next: {nextModule.label}
            </span>
          )}
        </div>

        {/* Right: action buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => router.push('/workspace')}
            style={{
              padding: '8px 16px', borderRadius: '8px',
              border: '1px solid #E8E5E0', background: 'white',
              color: '#6B7280', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Workspace
          </button>
          <button
            onClick={handleSkip}
            style={{
              padding: '8px 16px', borderRadius: '8px',
              border: '1px solid #FCA5A5', background: '#FEF2F2',
              color: '#EF4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Skip Module
          </button>
          <button
            onClick={handleApprove}
            disabled={disabled}
            style={{
              padding: '8px 24px', borderRadius: '8px',
              border: 'none', background: disabled ? '#D1D5DB' : '#10B981',
              color: 'white', fontSize: '13px', fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            <span>&#10003;</span>
            Approve & {nextModule ? 'Next' : 'Finish'}
          </button>
        </div>
      </div>
    </div>
  )
}
