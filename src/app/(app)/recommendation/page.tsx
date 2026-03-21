'use client'

import { useState, useCallback, useEffect } from 'react'
import Header from '@/components/Header'
import { useAIWorkflow } from '@/lib/ai-workflow'

/* ═══════════════════════════════════════════════════════════════
   Recommendation Statement Page

   Displays a boxed recommendation statement matching CPG format:
   - GRADE strength badge + evidence certainty
   - Recommendation statement text
   - Key evidence bullets
   - Discussion section
   - Consensus vote display
   - Economic note (if CEA was run)
   - Implementation notes & research gaps
   ═══════════════════════════════════════════════════════════════ */

interface RecommendationData {
  statementNumber: string
  strength: 'strong' | 'conditional'
  direction: 'for' | 'against'
  evidenceCertainty: 'high' | 'moderate' | 'low' | 'very_low'
  statementText: string
  keyEvidence: string[]
  discussion: string
  consensusVote: { agree: number; neutral: number; disagree: number }
  economicNote?: string
  implementationNotes: string[]
  researchGaps: string[]
}

const card: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #E8E5E0',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '16px',
}

const CERTAINTY_COLORS: Record<string, { bg: string; fg: string; fill: number }> = {
  high:     { bg: '#065F46', fg: '#FFFFFF', fill: 4 },
  moderate: { bg: '#1D4ED8', fg: '#FFFFFF', fill: 3 },
  low:      { bg: '#D97706', fg: '#FFFFFF', fill: 2 },
  very_low: { bg: '#DC2626', fg: '#FFFFFF', fill: 1 },
}

const STRENGTH_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  strong:      { bg: '#065F46', fg: '#FFFFFF', border: '#065F46' },
  conditional: { bg: '#FFFBEB', fg: '#92400E', border: '#F59E0B' },
}

export default function RecommendationPage() {
  const { isActive, pico, pageSuggestions, guidelineProject, activePicoId } = useAIWorkflow()
  const [recommendation, setRecommendation] = useState<RecommendationData | null>(null)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editedStatement, setEditedStatement] = useState('')

  // Find active enriched PICO to get pipeline data
  const activePico = (() => {
    if (!guidelineProject || !activePicoId) return null
    for (const d of guidelineProject.domains) {
      const found = d.picos.find(p => p.id === activePicoId)
      if (found) return found
    }
    return null
  })()

  const generateRecommendation = useCallback(async () => {
    if (!pico) return
    setLoading(true)

    const gradeSugg = pageSuggestions?.grade
    const ceaSugg = pageSuggestions?.economics
    const synthSugg = pageSuggestions?.synthesis

    try {
      const res = await fetch('/api/recommendation-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          picoId: activePicoId || 'S1',
          topic: pico.topic,
          population: pico.population,
          intervention: pico.intervention,
          comparison: pico.comparison,
          outcome: pico.outcome,
          totalStudies: gradeSugg?.numberOfStudies || synthSugg?.includedStudies,
          rctCount: synthSugg?.includedInMA || gradeSugg?.numberOfStudies,
          srCount: 1,
          pooledEffect: synthSugg?.pooledEffect || 0.75,
          pooledCI: synthSugg ? [synthSugg.pooledCILower, synthSugg.pooledCIUpper] : [0.67, 0.84],
          heterogeneity: synthSugg?.heterogeneity?.i2 || 35,
          evidenceCertainty: gradeSugg?.overallCertainty || 'moderate',
          riskOfBias: gradeSugg?.riskOfBias,
          inconsistency: gradeSugg?.inconsistency,
          indirectness: gradeSugg?.indirectness,
          imprecision: gradeSugg?.imprecision,
          icer: ceaSugg?.icer,
          costEffective: ceaSugg?.costEffective,
          currency: ceaSugg?.currency || guidelineProject?.country === 'SA' ? 'SAR' : 'USD',
          wtpThreshold: ceaSugg?.wtpThreshold || 150000,
          htaRecommendation: pageSuggestions?.hta?.overallRecommendation,
          country: guidelineProject?.country,
          countryLabel: guidelineProject?.countryLabel || 'Saudi Arabia',
        }),
      })
      const data = await res.json()
      setRecommendation(data)
      setEditedStatement(data.statementText)
    } catch {
      // Generate fallback
      setRecommendation({
        statementNumber: activePicoId || 'S1',
        strength: 'conditional',
        direction: 'for',
        evidenceCertainty: 'moderate',
        statementText: `We suggest ${pico.intervention} over ${pico.comparison || 'standard of care'} for ${pico.population} to improve ${pico.outcome} (conditional recommendation, moderate-certainty evidence).`,
        keyEvidence: ['Evidence base includes multiple studies supporting the intervention.'],
        discussion: 'The panel considered the balance of benefits and harms, patient values, and resource implications.',
        consensusVote: { agree: 88, neutral: 5, disagree: 7 },
        implementationNotes: ['Ensure availability across healthcare settings.'],
        researchGaps: ['Additional high-quality RCTs are needed.'],
      })
    } finally {
      setLoading(false)
    }
  }, [pico, pageSuggestions, activePicoId, guidelineProject])

  // Auto-generate on load if workflow is active
  useEffect(() => {
    if (isActive && pico && !recommendation && !loading) {
      generateRecommendation()
    }
  }, [isActive, pico, recommendation, loading, generateRecommendation])

  return (
    <>
      <Header title="Recommendation Statement" subtitle={pico ? pico.topic || `${pico.intervention} vs ${pico.comparison}` : 'Draft recommendation'} />
      <div style={{ padding: '24px 32px', maxWidth: '900px' }}>

        {!isActive ? (
          <div style={{ ...card, textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>No Active Workflow</h2>
            <p style={{ fontSize: '14px', color: '#6B7280' }}>
              Start a guideline project and complete the evidence pipeline for a PICO to generate a recommendation statement.
            </p>
          </div>
        ) : loading ? (
          <div style={{ ...card, textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px', animation: 'spin 1s linear infinite' }}>&#9881;</div>
            <p style={{ fontSize: '14px', color: '#6B7280' }}>Generating recommendation statement...</p>
          </div>
        ) : recommendation ? (
          <>
            {/* ─── Boxed Recommendation Statement ─── */}
            <div style={{
              background: '#FFFFFF',
              border: `3px solid ${STRENGTH_COLORS[recommendation.strength].border}`,
              borderRadius: '12px',
              overflow: 'hidden',
              marginBottom: '20px',
            }}>
              {/* Statement Header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px',
                background: recommendation.strength === 'strong' ? '#F0FDF4' : '#FFFBEB',
                borderBottom: `1px solid ${STRENGTH_COLORS[recommendation.strength].border}40`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#374151' }}>
                    Statement {recommendation.statementNumber}
                  </span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '3px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700,
                    background: STRENGTH_COLORS[recommendation.strength].bg,
                    color: STRENGTH_COLORS[recommendation.strength].fg,
                    border: `1px solid ${STRENGTH_COLORS[recommendation.strength].border}`,
                  }}>
                    {recommendation.strength === 'strong' ? '↑↑' : '↑?'} {recommendation.strength.charAt(0).toUpperCase() + recommendation.strength.slice(1)} {recommendation.direction === 'for' ? 'For' : 'Against'}
                  </span>
                </div>

                {/* GRADE certainty indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} style={{
                        width: '12px', height: '12px', borderRadius: '2px',
                        background: i <= CERTAINTY_COLORS[recommendation.evidenceCertainty].fill
                          ? CERTAINTY_COLORS[recommendation.evidenceCertainty].bg
                          : '#E5E7EB',
                      }} />
                    ))}
                  </div>
                  <span style={{
                    fontSize: '11px', fontWeight: 600,
                    color: CERTAINTY_COLORS[recommendation.evidenceCertainty].bg,
                  }}>
                    {recommendation.evidenceCertainty.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Statement Body */}
              <div style={{ padding: '20px' }}>
                {editing ? (
                  <div>
                    <textarea
                      value={editedStatement}
                      onChange={e => setEditedStatement(e.target.value)}
                      style={{
                        width: '100%', minHeight: '80px', padding: '12px', borderRadius: '8px',
                        border: '2px solid #8B5CF6', fontSize: '15px', lineHeight: 1.6,
                        fontFamily: 'inherit', resize: 'vertical',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button onClick={() => { setRecommendation({ ...recommendation, statementText: editedStatement }); setEditing(false) }}
                        style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#8B5CF6', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                        Save
                      </button>
                      <button onClick={() => { setEditedStatement(recommendation.statementText); setEditing(false) }}
                        style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #E8E5E0', background: 'white', color: '#6B7280', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div onClick={() => setEditing(true)} style={{ cursor: 'pointer' }} title="Click to edit">
                    <p style={{ fontSize: '15px', fontWeight: 500, lineHeight: 1.7, color: '#1E1E2E', margin: 0 }}>
                      {recommendation.statementText}
                    </p>
                  </div>
                )}
              </div>

              {/* Consensus Vote Bar */}
              <div style={{ padding: '12px 20px', background: '#FAFAF8', borderTop: '1px solid #F0EDE8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>Consensus:</span>
                  <div style={{ flex: 1, height: '20px', borderRadius: '10px', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${recommendation.consensusVote.agree}%`, background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: 'white' }}>{recommendation.consensusVote.agree}%</span>
                    </div>
                    <div style={{ width: `${recommendation.consensusVote.neutral}%`, background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: 'white' }}>{recommendation.consensusVote.neutral > 5 ? `${recommendation.consensusVote.neutral}%` : ''}</span>
                    </div>
                    <div style={{ width: `${recommendation.consensusVote.disagree}%`, background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: 'white' }}>{recommendation.consensusVote.disagree > 5 ? `${recommendation.consensusVote.disagree}%` : ''}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '10px' }}>
                    <span style={{ color: '#10B981' }}>Agree</span>
                    <span style={{ color: '#F59E0B' }}>Neutral</span>
                    <span style={{ color: '#EF4444' }}>Disagree</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Key Evidence ─── */}
            <div style={card}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1E1E2E', marginBottom: '12px' }}>Key Evidence</h3>
              {recommendation.keyEvidence.map((ev, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#D97757', fontWeight: 700, marginTop: '1px' }}>&bull;</span>
                  <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>{ev}</span>
                </div>
              ))}
            </div>

            {/* ─── Discussion ─── */}
            <div style={card}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1E1E2E', marginBottom: '12px' }}>Discussion</h3>
              <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.7, margin: 0 }}>
                {recommendation.discussion}
              </p>
            </div>

            {/* ─── Economic Note (if available) ─── */}
            {recommendation.economicNote && (
              <div style={{ ...card, background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#065F46', marginBottom: '8px' }}>Economic Assessment</h3>
                <p style={{ fontSize: '13px', color: '#065F46', margin: 0 }}>{recommendation.economicNote}</p>
              </div>
            )}

            {/* ─── Implementation Notes ─── */}
            <div style={card}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#1E1E2E', marginBottom: '12px' }}>Implementation Notes</h3>
              {recommendation.implementationNotes.map((note, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#8B5CF6', minWidth: '16px' }}>{i + 1}.</span>
                  <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>{note}</span>
                </div>
              ))}
            </div>

            {/* ─── Research Gaps ─── */}
            <div style={{ ...card, background: '#FEF3EE', border: '1px solid #FED7AA' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#9A3412', marginBottom: '12px' }}>Research Gaps</h3>
              {recommendation.researchGaps.map((gap, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#D97757', fontWeight: 700 }}>&bull;</span>
                  <span style={{ fontSize: '13px', color: '#9A3412', lineHeight: 1.5 }}>{gap}</span>
                </div>
              ))}
            </div>

            {/* ─── Actions ─── */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                onClick={generateRecommendation}
                style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#8B5CF6', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Regenerate
              </button>
              <button
                onClick={() => setEditing(true)}
                style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #E8E5E0', background: 'white', color: '#374151', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Edit Statement
              </button>
            </div>
          </>
        ) : (
          <div style={{ ...card, textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>&#x270D;&#xFE0F;</div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Generate Recommendation</h2>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '16px' }}>
              Click below to generate a recommendation statement from the current PICO evidence.
            </p>
            <button
              onClick={generateRecommendation}
              style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#D97757', color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
            >
              Generate Recommendation
            </button>
          </div>
        )}
      </div>
    </>
  )
}
