'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useAIWorkflow } from '@/lib/ai-workflow'

/* ═══════════════════════════════════════════════════════════════
   AI Suggestion Panel — shows per-page AI suggestions
   with Apply All / Approve & Continue flow
   ═══════════════════════════════════════════════════════════════ */

interface SuggestionField {
  key: string
  label: string
  type?: 'text' | 'list' | 'number' | 'select' | 'object'
}

interface Props {
  pageId: string
  title: string
  fields: SuggestionField[]
  onApply: (data: Record<string, any>) => void
  onApproveAndContinue?: () => void
}

function formatValue(val: any): string {
  if (val == null) return '—'
  if (Array.isArray(val)) return val.join(', ')
  if (typeof val === 'object') return JSON.stringify(val, null, 2)
  if (typeof val === 'boolean') return val ? 'Yes' : 'No'
  if (typeof val === 'number') return val.toLocaleString()
  return String(val)
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 90 ? '#10B981' : pct >= 75 ? '#3B82F6' : pct >= 60 ? '#F59E0B' : '#EF4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ width: '50px', height: '4px', borderRadius: '2px', background: '#E5E7EB' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: '2px', background: color, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 600 }}>{pct}%</span>
    </div>
  )
}

export default function AISuggestionPanel({ pageId, title, fields, onApply, onApproveAndContinue }: Props) {
  const {
    isActive, isGenerating, getPageSuggestions, applyPageSuggestions,
    markPageApproved, appliedPages, steps, currentStepIndex,
  } = useAIWorkflow()

  const [applied, setApplied] = useState(false)
  const [approved, setApproved] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const suggestions = getPageSuggestions(pageId)
  const isApplied = applied || appliedPages.has(pageId)
  const confidence = suggestions?._meta?.confidence ?? 0.85

  // Find next step
  const nextStep = useMemo(() => {
    const currentIdx = steps.findIndex(s => s.id === pageId)
    if (currentIdx >= 0 && currentIdx < steps.length - 1) {
      return steps[currentIdx + 1]
    }
    return null
  }, [steps, pageId])

  const handleApplyAll = useCallback(() => {
    if (!suggestions) return
    const data: Record<string, any> = {}
    fields.forEach(f => {
      if (suggestions[f.key] !== undefined) data[f.key] = suggestions[f.key]
    })
    onApply(data)
    applyPageSuggestions(pageId)
    setApplied(true)
  }, [suggestions, fields, onApply, applyPageSuggestions, pageId])

  const handleApprove = useCallback(() => {
    markPageApproved(pageId)
    setApproved(true)
    if (onApproveAndContinue) onApproveAndContinue()
  }, [markPageApproved, pageId, onApproveAndContinue])

  // Don't show if workflow not active or no suggestions
  if (!isActive) return null
  if (isGenerating) {
    return (
      <div style={{
        margin: '0 0 16px 0', padding: '16px 20px', borderRadius: '12px',
        background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)',
        border: '1px solid #FDE68A',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '6px',
            background: 'linear-gradient(135deg, #F59E0B, #D97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', color: 'white', fontWeight: 700,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}>AI</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#92400E' }}>
              Analyzing literature and generating suggestions...
            </div>
            <div style={{ fontSize: '11px', color: '#B45309', marginTop: '2px' }}>
              This may take a moment while AI reviews the evidence
            </div>
          </div>
        </div>
        <div style={{
          marginTop: '12px', height: '3px', borderRadius: '2px',
          background: '#FDE68A', overflow: 'hidden',
        }}>
          <div style={{
            width: '30%', height: '100%', borderRadius: '2px',
            background: 'linear-gradient(90deg, #F59E0B, #D97706)',
            animation: 'shimmer 1.5s ease-in-out infinite alternate',
          }} />
        </div>
      </div>
    )
  }
  if (!suggestions) return null

  // Already approved
  if (approved) {
    return (
      <div style={{
        margin: '0 0 16px 0', padding: '12px 20px', borderRadius: '12px',
        background: '#F0FDF4', border: '1px solid #BBF7D0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '22px', height: '22px', borderRadius: '50%', background: '#10B981',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '12px', fontWeight: 700,
          }}>{'\u2713'}</div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#065F46' }}>
            {title} — Approved
          </span>
        </div>
        {nextStep && nextStep.path !== '#' && (
          <Link
            href={nextStep.path}
            style={{
              padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
              background: '#8B5CF6', color: 'white', textDecoration: 'none',
            }}
          >
            Next: {nextStep.label} &rarr;
          </Link>
        )}
      </div>
    )
  }

  return (
    <div style={{
      margin: '0 0 16px 0', borderRadius: '12px', overflow: 'hidden',
      border: '1px solid #DDD6FE',
      boxShadow: '0 1px 3px rgba(139,92,246,0.08)',
    }}>
      {/* Header */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          padding: '12px 20px',
          background: isApplied
            ? 'linear-gradient(135deg, #F0FDF4, #ECFDF5)'
            : 'linear-gradient(135deg, #F5F3FF, #EDE9FE)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '6px',
            background: isApplied
              ? 'linear-gradient(135deg, #10B981, #059669)'
              : 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', color: 'white', fontWeight: 700,
          }}>AI</div>
          <div>
            <span style={{ fontSize: '13px', fontWeight: 700, color: isApplied ? '#065F46' : '#4C1D95' }}>
              {title}
            </span>
            <span style={{
              marginLeft: '8px', fontSize: '11px', fontWeight: 600,
              padding: '2px 6px', borderRadius: '4px',
              background: isApplied ? '#D1FAE5' : '#EDE9FE',
              color: isApplied ? '#059669' : '#7C3AED',
            }}>
              {fields.length} suggestions
            </span>
          </div>
          <ConfidenceBar value={confidence} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isApplied && (
            <button
              onClick={e => { e.stopPropagation(); handleApplyAll() }}
              style={{
                padding: '5px 14px', borderRadius: '6px', border: 'none',
                background: '#8B5CF6', color: 'white', fontSize: '12px',
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              Apply All
            </button>
          )}
          {isApplied && (
            <button
              onClick={e => { e.stopPropagation(); handleApprove() }}
              style={{
                padding: '5px 14px', borderRadius: '6px', border: 'none',
                background: '#10B981', color: 'white', fontSize: '12px',
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              Approve & Continue
            </button>
          )}
          <span style={{ fontSize: '16px', color: '#9CA3AF', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
            {'\u25BE'}
          </span>
        </div>
      </div>

      {/* Suggestion details */}
      {!collapsed && (
        <div style={{ padding: '12px 20px', background: 'white' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
            {fields.map(field => {
              const val = suggestions[field.key]
              if (val === undefined) return null
              return (
                <div key={field.key} style={{
                  padding: '8px 12px', borderRadius: '8px',
                  background: isApplied ? '#F0FDF4' : '#FAFAF9',
                  border: `1px solid ${isApplied ? '#BBF7D0' : '#E7E5E4'}`,
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    {field.label}
                  </div>
                  <div style={{
                    fontSize: '13px', color: '#1F2937',
                    maxHeight: '60px', overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {formatValue(val)}
                  </div>
                </div>
              )
            })}
          </div>
          {suggestions._meta?.rationale && (
            <div style={{
              marginTop: '10px', padding: '8px 12px', borderRadius: '6px',
              background: '#F9FAFB', fontSize: '12px', color: '#6B7280',
              fontStyle: 'italic',
            }}>
              {suggestions._meta.rationale}
            </div>
          )}
          {isApplied && (
            <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#059669' }}>
              Suggestions applied. Review the fields below, make any adjustments, then click <strong>Approve & Continue</strong> to proceed.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
