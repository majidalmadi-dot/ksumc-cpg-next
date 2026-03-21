'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useAIWorkflow, PICOQuestion } from '@/lib/ai-workflow'

/* ═══════════════════════════════════════════════════════════════
   AI Workflow Bar — sits at top of every authenticated page
   ═══════════════════════════════════════════════════════════════ */

const STEP_COLORS: Record<string, string> = {
  locked: '#CBD5E1',
  ready: '#8B5CF6',
  'in-progress': '#D97757',
  approved: '#10B981',
  skipped: '#9CA3AF',
}

export default function AIWorkflowBar() {
  const {
    isActive, isGenerating, pico, steps, currentStepIndex,
    literatureResults, startWorkflow, stopWorkflow,
  } = useAIWorkflow()

  const [expanded, setExpanded] = useState(false)
  const [form, setForm] = useState<PICOQuestion>({
    topic: '', population: '', intervention: '', comparison: '', outcome: '',
  })

  const handleStart = useCallback(() => {
    if (!form.population.trim() || !form.intervention.trim() || !form.outcome.trim()) return
    startWorkflow({
      ...form,
      topic: form.topic || `${form.intervention} for ${form.population}`,
    })
    setExpanded(false)
  }, [form, startWorkflow])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) handleStart()
  }, [handleStart])

  const approvedCount = steps.filter(s => s.status === 'approved').length
  const totalSteps = steps.length

  /* ─── Not active: show compact start bar ─── */
  if (!isActive && !expanded) {
    return (
      <div style={{
        padding: '10px 24px',
        background: 'linear-gradient(135deg, #F5F3FF 0%, #FFF7ED 100%)',
        borderBottom: '1px solid #E9D5FF',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px',
          background: 'linear-gradient(135deg, #8B5CF6, #D97757)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', color: 'white', fontWeight: 700,
        }}>AI</div>
        <span style={{ fontSize: '13px', color: '#6B7280', flex: 1 }}>
          Start an AI-guided workflow to auto-populate every step of your guideline development
        </span>
        <button
          onClick={() => setExpanded(true)}
          style={{
            padding: '6px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', color: 'white',
            fontSize: '13px', fontWeight: 600, transition: 'opacity 0.2s',
          }}
          onMouseOver={e => (e.currentTarget.style.opacity = '0.9')}
          onMouseOut={e => (e.currentTarget.style.opacity = '1')}
        >
          New AI Workflow
        </button>
      </div>
    )
  }

  /* ─── Expanded: PICO input form ─── */
  if (!isActive && expanded) {
    return (
      <div style={{
        padding: '20px 24px',
        background: 'linear-gradient(135deg, #F5F3FF 0%, #FFF7ED 100%)',
        borderBottom: '2px solid #8B5CF6',
      }} onKeyDown={handleKeyDown}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #8B5CF6, #D97757)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', color: 'white', fontWeight: 700,
          }}>AI</div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1E1B4B' }}>
            AI-Guided CPG Development
          </h3>
          <span style={{ fontSize: '12px', color: '#8B5CF6', background: '#EDE9FE', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
            PICO Framework
          </span>
        </div>

        {/* Topic row */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Clinical Topic (optional)
          </label>
          <input
            value={form.topic}
            onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
            placeholder="e.g., Management of Type 2 Diabetes in Adults"
            style={{
              width: '100%', padding: '8px 12px', borderRadius: '8px',
              border: '1px solid #D1D5DB', fontSize: '13px', background: 'white',
              outline: 'none', boxSizing: 'border-box',
            }}
            onFocus={e => (e.target.style.borderColor = '#8B5CF6')}
            onBlur={e => (e.target.style.borderColor = '#D1D5DB')}
          />
        </div>

        {/* PICO grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          {[
            { key: 'population', label: 'P — Population / Patient', placeholder: 'e.g., Adults (>18y) with Type 2 Diabetes, HbA1c > 7%', color: '#2563EB', required: true },
            { key: 'intervention', label: 'I — Intervention', placeholder: 'e.g., GLP-1 receptor agonists (semaglutide)', color: '#059669', required: true },
            { key: 'comparison', label: 'C — Comparison', placeholder: 'e.g., Insulin glargine (standard insulin therapy)', color: '#D97706' },
            { key: 'outcome', label: 'O — Outcome', placeholder: 'e.g., HbA1c reduction, cardiovascular events, weight', color: '#DC2626', required: true },
          ].map(({ key, label, placeholder, color, required }) => (
            <div key={key}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                fontSize: '11px', fontWeight: 700, marginBottom: '4px',
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                <span style={{ color }}>{label}</span>
                {required && <span style={{ color: '#EF4444', fontSize: '10px' }}>*</span>}
              </label>
              <input
                value={(form as any)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '8px',
                  border: `1px solid ${(form as any)[key] ? color + '66' : '#D1D5DB'}`,
                  fontSize: '13px', background: (form as any)[key] ? color + '08' : 'white',
                  outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = color)}
                onBlur={e => (e.target.style.borderColor = (form as any)[key] ? color + '66' : '#D1D5DB')}
              />
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#9CA3AF' }}>
            AI will search the literature, then auto-populate each step for your approval. Press Ctrl+Enter to start.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setExpanded(false)}
              style={{
                padding: '8px 16px', borderRadius: '8px',
                border: '1px solid #D1D5DB', background: 'white',
                fontSize: '13px', color: '#6B7280', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleStart}
              disabled={!form.population.trim() || !form.intervention.trim() || !form.outcome.trim()}
              style={{
                padding: '8px 20px', borderRadius: '8px', border: 'none',
                background: (!form.population.trim() || !form.intervention.trim() || !form.outcome.trim())
                  ? '#D1D5DB' : 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Start AI Workflow
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ─── Active workflow: show progress bar ─── */
  return (
    <div style={{
      padding: '10px 24px',
      background: isGenerating
        ? 'linear-gradient(135deg, #F5F3FF 0%, #FEFCE8 100%)'
        : 'linear-gradient(135deg, #F0FDF4 0%, #F5F3FF 50%, #FFF7ED 100%)',
      borderBottom: `2px solid ${isGenerating ? '#F59E0B' : '#10B981'}`,
    }}>
      {/* Top row: title + info + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px',
          background: isGenerating
            ? 'linear-gradient(135deg, #F59E0B, #D97706)'
            : 'linear-gradient(135deg, #10B981, #059669)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px', color: 'white', fontWeight: 700,
          animation: isGenerating ? 'pulse 1.5s ease-in-out infinite' : 'none',
        }}>AI</div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E1B4B' }}>
              {pico?.topic || `${pico?.intervention} for ${pico?.population}`}
            </span>
            {isGenerating ? (
              <span style={{
                fontSize: '11px', color: '#D97706', background: '#FEF3C7',
                padding: '2px 8px', borderRadius: '4px', fontWeight: 600,
                animation: 'pulse 1.5s ease-in-out infinite',
              }}>
                Searching literature...
              </span>
            ) : (
              <span style={{
                fontSize: '11px', color: '#059669', background: '#D1FAE5',
                padding: '2px 8px', borderRadius: '4px', fontWeight: 600,
              }}>
                {literatureResults.length} articles found
              </span>
            )}
          </div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
            Step {currentStepIndex + 1} of {totalSteps} &middot; {approvedCount} approved
          </div>
        </div>

        <button
          onClick={stopWorkflow}
          style={{
            padding: '4px 12px', borderRadius: '6px', fontSize: '12px',
            border: '1px solid #FCA5A5', background: '#FEF2F2', color: '#DC2626',
            cursor: 'pointer', fontWeight: 600,
          }}
        >
          End Workflow
        </button>
      </div>

      {/* Step indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        {steps.map((step, i) => {
          const isCurrent = i === currentStepIndex
          const color = STEP_COLORS[step.status]
          return (
            <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              {step.path !== '#' ? (
                <Link
                  href={step.path}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '4px 8px', borderRadius: '6px',
                    background: isCurrent ? color + '18' : 'transparent',
                    border: isCurrent ? `1.5px solid ${color}` : '1.5px solid transparent',
                    textDecoration: 'none', transition: 'all 0.2s', flex: 1,
                  }}
                >
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: step.status === 'approved' ? '#10B981'
                      : step.status === 'skipped' ? '#9CA3AF'
                      : isCurrent ? color : 'transparent',
                    border: step.status === 'approved' || isCurrent ? 'none' : `2px solid ${color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', color: 'white', fontWeight: 700, flexShrink: 0,
                    transition: 'all 0.2s',
                  }}>
                    {step.status === 'approved' ? '\u2713'
                      : step.status === 'skipped' ? '\u2014'
                      : isCurrent ? String(i + 1) : ''}
                  </div>
                  <span style={{
                    fontSize: '11px', fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? color
                      : step.status === 'approved' ? '#059669'
                      : step.status === 'locked' ? '#CBD5E1' : '#6B7280',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {step.shortLabel}
                  </span>
                </Link>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '4px 8px', flex: 1,
                }}>
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: '#10B981',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', color: 'white', fontWeight: 700, flexShrink: 0,
                  }}>{'\u2713'}</div>
                  <span style={{ fontSize: '11px', fontWeight: 500, color: '#059669' }}>{step.shortLabel}</span>
                </div>
              )}
              {i < steps.length - 1 && (
                <div style={{
                  width: '12px', height: '2px', flexShrink: 0,
                  background: steps[i + 1]?.status === 'approved' || step.status === 'approved' ? '#10B981' : '#E5E7EB',
                  transition: 'background 0.3s',
                }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
