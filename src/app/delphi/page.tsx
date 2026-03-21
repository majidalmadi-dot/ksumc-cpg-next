'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import { logAudit } from '@/lib/audit'

interface DelphiRound {
  id: string
  title: string
  guidelineTitle: string
  roundNumber: number
  status: 'completed' | 'in_progress' | 'not_started'
  voters: number
  consensusPercentage: number
}

interface Recommendation {
  id: string
  text: string
  votes: number[]
  medianScore: number
  iqr: { lower: number; upper: number }
  commentCount: number
}

const SEED_ROUNDS: DelphiRound[] = [
  { id: 'r1', title: 'Initial Recommendation Review', guidelineTitle: 'Type 2 Diabetes Primary Care', roundNumber: 1, status: 'completed', voters: 12, consensusPercentage: 85 },
  { id: 'r2', title: 'Revised Recommendations', guidelineTitle: 'Type 2 Diabetes Primary Care', roundNumber: 2, status: 'in_progress', voters: 10, consensusPercentage: 72 },
  { id: 'r3', title: 'Final Consensus', guidelineTitle: 'Type 2 Diabetes Primary Care', roundNumber: 3, status: 'not_started', voters: 0, consensusPercentage: 0 },
]

const SEED_RECS: Recommendation[] = [
  { id: 'rec1', text: 'Metformin should be the first-line pharmacological agent for type 2 diabetes management in adults with no contraindications.', votes: [0, 0, 0, 0, 0, 1, 1, 2, 8], medianScore: 9, iqr: { lower: 8, upper: 9 }, commentCount: 3 },
  { id: 'rec2', text: 'HbA1c targets should be individualized based on patient age, comorbidities, duration of diabetes, and hypoglycemia risk.', votes: [0, 0, 0, 1, 0, 1, 2, 1, 7], medianScore: 8, iqr: { lower: 7, upper: 9 }, commentCount: 5 },
  { id: 'rec3', text: 'GLP-1 receptor agonists should be offered to patients with inadequate glycemic control on metformin monotherapy, particularly those with established cardiovascular disease.', votes: [0, 0, 2, 1, 1, 0, 2, 2, 4], medianScore: 7, iqr: { lower: 5, upper: 9 }, commentCount: 7 },
  { id: 'rec4', text: 'SGLT2 inhibitors are recommended for patients with type 2 diabetes and established heart failure or chronic kidney disease.', votes: [0, 0, 0, 0, 1, 1, 1, 2, 7], medianScore: 9, iqr: { lower: 7, upper: 9 }, commentCount: 2 },
  { id: 'rec5', text: 'Annual comprehensive screening for microvascular complications (retinopathy, nephropathy, neuropathy) is recommended for all patients with type 2 diabetes.', votes: [0, 0, 0, 0, 0, 0, 1, 1, 10], medianScore: 9, iqr: { lower: 9, upper: 9 }, commentCount: 1 },
]

export default function DelphiPage() {
  const [rounds, setRounds] = useState(SEED_ROUNDS)
  const [activeRoundId, setActiveRoundId] = useState('r2')
  const [recommendations] = useState(SEED_RECS)
  const [myVotes, setMyVotes] = useState<Record<string, number>>({})
  const [myComments, setMyComments] = useState<Record<string, string>>({})
  const [threshold, setThreshold] = useState(70)

  const activeRound = rounds.find(r => r.id === activeRoundId)!

  function getAgreePercent(votes: number[]) {
    const total = votes.reduce((a, b) => a + b, 0)
    if (total === 0) return 0
    const agree = votes[6] + votes[7] + votes[8] // scores 7, 8, 9
    return Math.round((agree / total) * 100)
  }

  function handleVote(recId: string, score: number) {
    setMyVotes(prev => ({ ...prev, [recId]: score }))
    logAudit('delphi.vote_cast' as any, 'vote' as any, recId, { score })
  }

  function handleCloseRound() {
    setRounds(prev => prev.map(r => r.id === activeRoundId ? { ...r, status: 'completed' as const } : r))
    logAudit('delphi.round_closed' as any, 'delphi_round' as any, activeRoundId)
  }

  function handleOpenNewRound() {
    const nextNum = Math.max(...rounds.map(r => r.roundNumber)) + 1
    const newRound: DelphiRound = {
      id: `r${Date.now()}`, title: `Round ${nextNum} Review`, guidelineTitle: activeRound.guidelineTitle,
      roundNumber: nextNum, status: 'in_progress', voters: 0, consensusPercentage: 0,
    }
    setRounds(prev => [...prev, newRound])
    setActiveRoundId(newRound.id)
    setMyVotes({})
    setMyComments({})
    logAudit('delphi.round_opened' as any, 'delphi_round' as any, newRound.id)
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      completed: { bg: '#D1FAE5', color: '#065F46', label: 'Completed' },
      in_progress: { bg: '#DBEAFE', color: '#1E40AF', label: 'In Progress' },
      not_started: { bg: '#F3F4F6', color: '#6B7280', label: 'Not Started' },
    }
    const s = map[status] || map.not_started
    return <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', background: s.bg, color: s.color }}>{s.label}</span>
  }

  return (
    <>
      <Header title="Delphi Consensus" subtitle="Anonymous structured voting for guideline recommendations" />
      <div className="fade-in" style={{ padding: '24px 32px' }}>

        {/* Rounds Overview */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Voting Rounds</h2>
          <button onClick={handleOpenNewRound} style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: '#D97757', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>+ Open New Round</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px', marginBottom: '28px' }}>
          {rounds.map(r => (
            <div key={r.id} onClick={() => setActiveRoundId(r.id)} style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '16px', border: activeRoundId === r.id ? '2px solid #D97757' : '1px solid var(--border)', cursor: 'pointer', transition: 'border-color 0.15s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>Round {r.roundNumber}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '2px' }}>{r.title}</div>
                </div>
                {statusBadge(r.status)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-light)', marginBottom: '10px' }}>{r.guidelineTitle}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div><div style={{ fontSize: '10px', color: 'var(--text-light)' }}>Voters</div><div style={{ fontSize: '16px', fontWeight: 700 }}>{r.voters}</div></div>
                <div><div style={{ fontSize: '10px', color: 'var(--text-light)' }}>Consensus</div><div style={{ fontSize: '16px', fontWeight: 700, color: r.consensusPercentage >= 70 ? '#10B981' : r.consensusPercentage > 0 ? '#F59E0B' : 'var(--text-light)' }}>{r.consensusPercentage > 0 ? `${r.consensusPercentage}%` : '—'}</div></div>
              </div>
            </div>
          ))}
        </div>

        {/* Threshold Slider */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '16px 20px', border: '1px solid var(--border)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>Consensus Threshold: {threshold}%</label>
          <input type="range" min="60" max="90" step="5" value={threshold} onChange={e => setThreshold(Number(e.target.value))} style={{ flex: 1, accentColor: '#D97757' }} />
          <div style={{ display: 'flex', gap: '16px', fontSize: '10px', color: 'var(--text-light)' }}><span>60%</span><span>70%</span><span>80%</span><span>90%</span></div>
        </div>

        {/* Anonymous Banner */}
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '12px 16px', display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '24px', fontSize: '12px', color: '#1E40AF' }}>
          <span style={{ fontSize: '16px' }}>🔒</span>
          <span><strong>Anonymous Voting</strong> — All votes are strictly anonymous. Only aggregated statistics are displayed.</span>
        </div>

        {/* Active Round Voting */}
        {activeRound.status === 'in_progress' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Round {activeRound.roundNumber} — Cast Your Votes</h2>
              <button onClick={handleCloseRound} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#EF4444', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Close Round</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
              {recommendations.map((rec, idx) => {
                const agreeP = getAgreePercent(rec.votes)
                const consensusReached = agreeP >= threshold
                return (
                  <div key={rec.id} style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '20px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-light)' }}>Recommendation {idx + 1}</div>
                      <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', background: consensusReached ? '#D1FAE5' : agreeP >= 60 ? '#FEF3C7' : '#FEE2E2', color: consensusReached ? '#065F46' : agreeP >= 60 ? '#92400E' : '#991B1B' }}>
                        {consensusReached ? 'Consensus' : agreeP >= 60 ? 'Near Consensus' : 'No Consensus'} ({agreeP}%)
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', lineHeight: 1.6, margin: '0 0 16px', color: 'var(--text)' }}>{rec.text}</p>

                    {/* Likert Scale */}
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-light)', marginBottom: '8px' }}>Your Rating</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: '4px' }}>
                        {[1,2,3,4,5,6,7,8,9].map(score => (
                          <button key={score} onClick={() => handleVote(rec.id, score)} style={{
                            padding: '10px 0', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                            background: myVotes[rec.id] === score ? '#D97757' : score <= 3 ? '#FEE2E2' : score <= 6 ? '#FEF3C7' : '#D1FAE5',
                            color: myVotes[rec.id] === score ? 'white' : score <= 3 ? '#991B1B' : score <= 6 ? '#92400E' : '#065F46',
                            transition: 'all 0.15s',
                          }}>{score}</button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: 'var(--text-light)' }}>
                        <span>1-3 Disagree</span><span>4-6 Neutral</span><span>7-9 Agree</span>
                      </div>
                    </div>

                    {/* Vote Distribution Bar */}
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-light)', marginBottom: '6px' }}>Current Distribution (anonymous)</div>
                      <div style={{ display: 'flex', height: '20px', borderRadius: '4px', overflow: 'hidden', background: '#F3F4F6' }}>
                        {rec.votes.map((v, i) => v > 0 ? (
                          <div key={i} style={{ flex: v, background: i <= 2 ? '#EF4444' : i <= 5 ? '#F59E0B' : '#10B981', transition: 'flex 0.2s' }} title={`Score ${i+1}: ${v} votes`} />
                        ) : null)}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-light)', marginTop: '4px' }}>
                        {rec.votes.reduce((a,b) => a+b, 0)} votes · Median: {rec.medianScore} · IQR: [{rec.iqr.lower}–{rec.iqr.upper}]
                      </div>
                    </div>

                    {/* Comment */}
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-light)', marginBottom: '4px', display: 'block' }}>Comments ({rec.commentCount} existing)</label>
                      <textarea value={myComments[rec.id] || ''} onChange={e => setMyComments(prev => ({ ...prev, [rec.id]: e.target.value }))} placeholder="Add your feedback..." style={{ width: '100%', padding: '8px 12px', border: '1px solid #E5E5E0', borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit', minHeight: '50px', resize: 'vertical', boxSizing: 'border-box', background: '#FAF9F6' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Completed Round Results */}
        {activeRound.status === 'completed' && (
          <>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px' }}>Round {activeRound.roundNumber} — Results</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '16px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-light)', marginBottom: '6px' }}>CONSENSUS RATE</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#10B981' }}>{activeRound.consensusPercentage}%</div>
              </div>
              <div style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '16px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-light)', marginBottom: '6px' }}>PANEL SIZE</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#6366F1' }}>{activeRound.voters}</div>
              </div>
              <div style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '16px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-light)', marginBottom: '6px' }}>RECOMMENDATIONS</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#D97757' }}>{recommendations.length}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recommendations.map((rec, idx) => {
                const agreeP = getAgreePercent(rec.votes)
                const reached = agreeP >= threshold
                return (
                  <div key={rec.id} style={{ background: 'var(--bg-card)', borderRadius: '10px', padding: '16px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>Recommendation {idx + 1}</span>
                      <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '4px', background: reached ? '#D1FAE5' : '#FEE2E2', color: reached ? '#065F46' : '#991B1B' }}>{reached ? 'Consensus' : 'No Consensus'}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-light)', lineHeight: 1.5, margin: '0 0 10px' }}>{rec.text}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ flex: 1, height: '8px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${agreeP}%`, background: reached ? '#10B981' : '#EF4444', borderRadius: '4px', transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, minWidth: '40px' }}>{agreeP}%</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-light)' }}>Mdn: {rec.medianScore} · IQR: [{rec.iqr.lower}–{rec.iqr.upper}]</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Not Started */}
        {activeRound.status === 'not_started' && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-light)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>◎</div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px' }}>Round {activeRound.roundNumber} Not Yet Started</h3>
            <p style={{ fontSize: '13px', margin: 0 }}>This round will be opened when the previous round is closed and results are reviewed.</p>
          </div>
        )}
      </div>
    </>
  )
}
