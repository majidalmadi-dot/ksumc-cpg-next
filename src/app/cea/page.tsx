'use client'

import { useState, useMemo } from 'react'
import Header from '@/components/Header'
import AIAssistant from '@/components/AIAssistant'

// === Model Parameters ===
interface Arm {
  name: string
  cost: number
  qaly: number
  costLow: number
  costHigh: number
  qalyLow: number
  qalyHigh: number
}

interface MarkovState {
  name: string
  cost: number
  utility: number
  pStay: number
  pProgress: number
  pDeath: number
}

type Perspective = 'healthcare' | 'societal'
type Currency = 'SAR' | 'USD'

const WTP_THRESHOLDS: Record<Currency, number> = { SAR: 187500, USD: 50000 } // per QALY

export default function CEAPage() {
  const [perspective, setPerspective] = useState<Perspective>('healthcare')
  const [currency, setCurrency] = useState<Currency>('SAR')
  const [timeHorizon, setTimeHorizon] = useState(10) // years
  const [discountRate, setDiscountRate] = useState(3.0) // %

  // Decision model arms
  const [arms, setArms] = useState<Arm[]>([
    { name: 'Standard Care (Metformin)', cost: 12500, qaly: 6.8, costLow: 10000, costHigh: 15000, qalyLow: 6.2, qalyHigh: 7.4 },
    { name: 'New Intervention (SGLT2i + Metformin)', cost: 28700, qaly: 7.6, costLow: 24000, costHigh: 33400, qalyLow: 7.0, qalyHigh: 8.2 },
  ])

  // Markov model states
  const [markovStates, setMarkovStates] = useState<MarkovState[]>([
    { name: 'Stable', cost: 4500, utility: 0.85, pStay: 0.80, pProgress: 0.15, pDeath: 0.05 },
    { name: 'Progressed', cost: 18000, utility: 0.55, pStay: 0.70, pProgress: 0.00, pDeath: 0.30 },
    { name: 'Death', cost: 0, utility: 0, pStay: 1, pProgress: 0, pDeath: 0 },
  ])

  const [showMarkov, setShowMarkov] = useState(false)
  const [psaRuns, setPsaRuns] = useState(1000)
  const [psaResults, setPsaResults] = useState<{ dCost: number; dQaly: number }[]>([])

  // ICER calculation
  const icer = useMemo(() => {
    if (arms.length < 2) return null
    const base = arms[0]
    return arms.slice(1).map((arm) => {
      const dCost = arm.cost - base.cost
      const dQaly = arm.qaly - base.qaly
      const icerVal = dQaly !== 0 ? dCost / dQaly : Infinity
      const wtp = WTP_THRESHOLDS[currency]

      let dominance = ''
      if (dCost < 0 && dQaly > 0) dominance = 'dominant'
      else if (dCost > 0 && dQaly < 0) dominance = 'dominated'
      else if (icerVal < wtp && dQaly > 0) dominance = 'cost-effective'
      else dominance = 'not cost-effective'

      return { arm: arm.name, dCost, dQaly, icer: icerVal, dominance, wtp }
    })
  }, [arms, currency])

  // Markov trace calculation
  const markovTrace = useMemo(() => {
    if (!showMarkov || markovStates.length < 2) return []
    const trace: { cycle: number; states: number[]; cost: number; qaly: number }[] = []
    const n = markovStates.length
    let dist = new Array(n).fill(0)
    dist[0] = 1.0 // start all in first state

    for (let c = 0; c <= timeHorizon; c++) {
      const discount = 1 / Math.pow(1 + discountRate / 100, c)
      const cost = dist.reduce((s, p, i) => s + p * markovStates[i].cost * discount, 0)
      const qaly = dist.reduce((s, p, i) => s + p * markovStates[i].utility * discount, 0)
      trace.push({ cycle: c, states: [...dist], cost, qaly })

      // Transition
      const newDist = new Array(n).fill(0)
      for (let i = 0; i < n; i++) {
        if (i === n - 1) { newDist[i] += dist[i]; continue } // absorbing state
        newDist[i] += dist[i] * markovStates[i].pStay
        if (i + 1 < n) newDist[i + 1] += dist[i] * markovStates[i].pProgress
        newDist[n - 1] += dist[i] * markovStates[i].pDeath
      }
      dist = newDist
    }
    return trace
  }, [showMarkov, markovStates, timeHorizon, discountRate])

  const markovTotals = useMemo(() => {
    if (markovTrace.length === 0) return { cost: 0, qaly: 0 }
    return {
      cost: markovTrace.reduce((s, t) => s + t.cost, 0),
      qaly: markovTrace.reduce((s, t) => s + t.qaly, 0),
    }
  }, [markovTrace])

  // Run PSA
  function runPSA() {
    if (arms.length < 2) return
    const results: { dCost: number; dQaly: number }[] = []
    const base = arms[0], interv = arms[1]
    for (let i = 0; i < psaRuns; i++) {
      const bCost = randTriang(base.costLow, base.cost, base.costHigh)
      const bQaly = randTriang(base.qalyLow, base.qaly, base.qalyHigh)
      const iCost = randTriang(interv.costLow, interv.cost, interv.costHigh)
      const iQaly = randTriang(interv.qalyLow, interv.qaly, interv.qalyHigh)
      results.push({ dCost: iCost - bCost, dQaly: iQaly - bQaly })
    }
    setPsaResults(results)
  }

  // CEAC from PSA
  const ceacData = useMemo(() => {
    if (psaResults.length === 0) return []
    const thresholds = Array.from({ length: 11 }, (_, i) => i * WTP_THRESHOLDS[currency] / 5)
    return thresholds.map((wtp) => {
      const ce = psaResults.filter((r) => r.dQaly > 0 && r.dCost / r.dQaly < wtp).length
      return { wtp, prob: ce / psaResults.length }
    })
  }, [psaResults, currency])

  function updateArm(idx: number, field: keyof Arm, value: string) {
    const updated = [...arms]
    if (field === 'name') updated[idx] = { ...updated[idx], name: value }
    else updated[idx] = { ...updated[idx], [field]: parseFloat(value) || 0 }
    setArms(updated)
  }

  function updateMarkovState(idx: number, field: keyof MarkovState, value: string) {
    const updated = [...markovStates]
    if (field === 'name') updated[idx] = { ...updated[idx], name: value }
    else updated[idx] = { ...updated[idx], [field]: parseFloat(value) || 0 }
    setMarkovStates(updated)
  }

  const card: React.CSSProperties = { background: 'white', borderRadius: '10px', border: '1px solid #E5E5E0', padding: '20px' }
  const inp: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E5E0', fontSize: '13px', background: '#FAF9F6', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 600, color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }
  const domColor: Record<string, string> = { dominant: '#10B981', 'cost-effective': '#6366F1', dominated: '#EF4444', 'not cost-effective': '#F59E0B' }

  return (
    <>
      <Header title="Cost-Effectiveness Analysis" subtitle="Decision-analytic modeling with ICER, Markov trace, PSA, and CEAC" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
        <div>
          {/* Model Settings */}
          <div style={{ ...card, marginBottom: '20px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px' }}>Model Parameters</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
              <div>
                <label style={lbl}>Perspective</label>
                <select style={inp} value={perspective} onChange={(e) => setPerspective(e.target.value as Perspective)}>
                  <option value="healthcare">Healthcare System</option>
                  <option value="societal">Societal</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Currency</label>
                <select style={inp} value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
                  <option value="SAR">SAR (Saudi Riyal)</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Time Horizon (years)</label>
                <input type="number" style={inp} value={timeHorizon} onChange={(e) => setTimeHorizon(parseInt(e.target.value) || 1)} />
              </div>
              <div>
                <label style={lbl}>Discount Rate (%)</label>
                <input type="number" step="0.5" style={inp} value={discountRate} onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </div>

          {/* Decision Model Arms */}
          <div style={{ ...card, marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Decision Model — Treatment Arms</h2>
              <button
                onClick={() => setArms([...arms, { name: `Strategy ${arms.length + 1}`, cost: 0, qaly: 0, costLow: 0, costHigh: 0, qalyLow: 0, qalyHigh: 0 }])}
                style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #D97757', background: 'white', color: '#D97757', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                + Add Arm
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5E5E0' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 600 }}>Strategy</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600 }}>Cost ({currency})</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600 }}>QALY</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600, fontSize: '10px' }}>Cost Range</th>
                    <th style={{ padding: '6px 8px', fontWeight: 600, fontSize: '10px' }}>QALY Range</th>
                    <th style={{ padding: '6px 4px', width: '30px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {arms.map((arm, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '6px 8px' }}><input style={{ ...inp, fontWeight: i === 0 ? 600 : 400 }} value={arm.name} onChange={(e) => updateArm(i, 'name', e.target.value)} /></td>
                      <td style={{ padding: '6px 8px' }}><input type="number" style={inp} value={arm.cost || ''} onChange={(e) => updateArm(i, 'cost', e.target.value)} /></td>
                      <td style={{ padding: '6px 8px' }}><input type="number" step="0.1" style={inp} value={arm.qaly || ''} onChange={(e) => updateArm(i, 'qaly', e.target.value)} /></td>
                      <td style={{ padding: '6px 4px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <input type="number" style={{ ...inp, fontSize: '11px' }} placeholder="Low" value={arm.costLow || ''} onChange={(e) => updateArm(i, 'costLow', e.target.value)} />
                          <input type="number" style={{ ...inp, fontSize: '11px' }} placeholder="High" value={arm.costHigh || ''} onChange={(e) => updateArm(i, 'costHigh', e.target.value)} />
                        </div>
                      </td>
                      <td style={{ padding: '6px 4px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <input type="number" step="0.1" style={{ ...inp, fontSize: '11px' }} placeholder="Low" value={arm.qalyLow || ''} onChange={(e) => updateArm(i, 'qalyLow', e.target.value)} />
                          <input type="number" step="0.1" style={{ ...inp, fontSize: '11px' }} placeholder="High" value={arm.qalyHigh || ''} onChange={(e) => updateArm(i, 'qalyHigh', e.target.value)} />
                        </div>
                      </td>
                      <td style={{ padding: '6px 4px' }}>
                        {i > 1 && <button onClick={() => setArms(arms.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '14px' }}>×</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ICER Results */}
          {icer && icer.length > 0 && (
            <div style={{ ...card, marginBottom: '20px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '14px' }}>ICER Results</h2>
              <div style={{ display: 'grid', gap: '12px' }}>
                {icer.map((r, i) => (
                  <div key={i} style={{ padding: '16px', borderRadius: '10px', background: '#FAF9F6', border: `2px solid ${domColor[r.dominance] || '#E5E5E0'}40` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{r.arm} vs. {arms[0].name}</div>
                      <span style={{
                        fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '14px',
                        background: (domColor[r.dominance] || '#6B7280') + '20',
                        color: domColor[r.dominance] || '#6B7280',
                        textTransform: 'capitalize',
                      }}>
                        {r.dominance.replace(/-/g, ' ')}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase' }}>Incremental Cost</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: r.dCost > 0 ? '#EF4444' : '#10B981' }}>
                          {r.dCost > 0 ? '+' : ''}{r.dCost.toLocaleString()} {currency}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase' }}>Incremental QALY</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: r.dQaly > 0 ? '#10B981' : '#EF4444' }}>
                          {r.dQaly > 0 ? '+' : ''}{r.dQaly.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase' }}>ICER</div>
                        <div style={{ fontSize: '16px', fontWeight: 700 }}>
                          {r.dominance === 'dominant' ? 'Dominant' : r.dominance === 'dominated' ? 'Dominated' : `${Math.round(r.icer).toLocaleString()} ${currency}/QALY`}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#6B7280', textTransform: 'uppercase' }}>WTP Threshold</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#6B7280' }}>
                          {r.wtp.toLocaleString()} {currency}
                        </div>
                      </div>
                    </div>

                    {/* CE Plane mini visualization */}
                    <div style={{ position: 'relative', height: '120px', marginTop: '12px', background: '#F5F5F0', borderRadius: '8px', overflow: 'hidden' }}>
                      {/* Axes */}
                      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: '#D1D5DB' }} />
                      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: '#D1D5DB' }} />
                      {/* WTP line */}
                      <div style={{ position: 'absolute', left: '50%', top: '0%', width: '1px', height: '100%', background: '#D97757', opacity: 0.4, transform: 'rotate(-30deg)', transformOrigin: 'center center' }} />
                      {/* Point */}
                      <div style={{
                        position: 'absolute',
                        left: `${50 + (r.dQaly / 2) * 40}%`, top: `${50 - (r.dCost / (arms[1].cost * 2)) * 80}%`,
                        width: '10px', height: '10px', borderRadius: '50%',
                        background: domColor[r.dominance] || '#6B7280', border: '2px solid white',
                        transform: 'translate(-50%, -50%)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      }} />
                      {/* Quadrant labels */}
                      <div style={{ position: 'absolute', right: '8px', top: '4px', fontSize: '9px', color: '#9CA3AF' }}>NE (more cost, more effect)</div>
                      <div style={{ position: 'absolute', left: '8px', bottom: '4px', fontSize: '9px', color: '#9CA3AF' }}>SW (less cost, less effect)</div>
                      <div style={{ position: 'absolute', right: '8px', bottom: '4px', fontSize: '9px', color: '#10B981' }}>SE (Dominant)</div>
                      <div style={{ position: 'absolute', left: '8px', top: '4px', fontSize: '9px', color: '#EF4444' }}>NW (Dominated)</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Markov Model */}
          <div style={{ ...card, marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Markov Cohort Model</h2>
              <button
                onClick={() => setShowMarkov(!showMarkov)}
                style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #E5E5E0', background: showMarkov ? '#D97757' : 'white', color: showMarkov ? 'white' : '#374151', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
              >
                {showMarkov ? 'Active' : 'Enable Markov'}
              </button>
            </div>

            {showMarkov && (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '16px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E5E5E0' }}>
                      <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 600 }}>State</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600 }}>Cost/Cycle</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600 }}>Utility</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600 }}>P(Stay)</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600 }}>P(Progress)</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600 }}>P(Death)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {markovStates.map((s, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '6px 8px' }}><input style={{ ...inp, fontWeight: 600 }} value={s.name} onChange={(e) => updateMarkovState(i, 'name', e.target.value)} /></td>
                        <td style={{ padding: '6px 8px' }}><input type="number" style={inp} value={s.cost || ''} onChange={(e) => updateMarkovState(i, 'cost', e.target.value)} /></td>
                        <td style={{ padding: '6px 8px' }}><input type="number" step="0.01" style={inp} value={s.utility || ''} onChange={(e) => updateMarkovState(i, 'utility', e.target.value)} /></td>
                        <td style={{ padding: '6px 8px' }}><input type="number" step="0.01" style={inp} value={s.pStay || ''} onChange={(e) => updateMarkovState(i, 'pStay', e.target.value)} /></td>
                        <td style={{ padding: '6px 8px' }}><input type="number" step="0.01" style={inp} value={s.pProgress || ''} onChange={(e) => updateMarkovState(i, 'pProgress', e.target.value)} /></td>
                        <td style={{ padding: '6px 8px' }}><input type="number" step="0.01" style={inp} value={s.pDeath || ''} onChange={(e) => updateMarkovState(i, 'pDeath', e.target.value)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Markov Trace visualization */}
                {markovTrace.length > 0 && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>Cohort Trace ({timeHorizon} cycles)</div>
                    <div style={{ display: 'flex', gap: '4px', height: '80px', alignItems: 'flex-end' }}>
                      {markovTrace.map((t) => (
                        <div key={t.cycle} style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'flex-end' }}>
                          {t.states.slice(0, -1).map((p, si) => (
                            <div key={si} style={{
                              height: `${p * 100}%`, minHeight: p > 0.01 ? '2px' : 0,
                              background: si === 0 ? '#10B981' : '#F59E0B',
                              borderRadius: si === 0 ? '2px 2px 0 0' : '0',
                            }} />
                          ))}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#9CA3AF', marginTop: '4px' }}>
                      <span>Cycle 0</span><span>Cycle {timeHorizon}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '11px' }}>
                      <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#10B981', borderRadius: '2px', marginRight: '4px' }} />Stable</span>
                      <span><span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#F59E0B', borderRadius: '2px', marginRight: '4px' }} />Progressed</span>
                      <span style={{ marginLeft: 'auto', fontWeight: 600 }}>Total Cost: {Math.round(markovTotals.cost).toLocaleString()} {currency} · QALYs: {markovTotals.qaly.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* PSA & CEAC */}
          <div style={{ ...card, marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>Probabilistic Sensitivity Analysis</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', color: '#6B7280' }}>Iterations:</label>
                <select style={{ ...inp, width: 'auto' }} value={psaRuns} onChange={(e) => setPsaRuns(parseInt(e.target.value))}>
                  <option value={500}>500</option>
                  <option value={1000}>1,000</option>
                  <option value={5000}>5,000</option>
                </select>
                <button onClick={runPSA} style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#D97757', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  Run PSA
                </button>
              </div>
            </div>

            {psaResults.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* CE Scatter */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>Cost-Effectiveness Plane ({psaResults.length} iterations)</div>
                  <div style={{ position: 'relative', height: '200px', background: '#FAF9F6', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: '#D1D5DB' }} />
                    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: '#D1D5DB' }} />
                    {psaResults.slice(0, 200).map((r, i) => {
                      const maxDQ = Math.max(...psaResults.map((p) => Math.abs(p.dQaly))) || 1
                      const maxDC = Math.max(...psaResults.map((p) => Math.abs(p.dCost))) || 1
                      return (
                        <div key={i} style={{
                          position: 'absolute',
                          left: `${50 + (r.dQaly / maxDQ) * 45}%`,
                          top: `${50 - (r.dCost / maxDC) * 45}%`,
                          width: '3px', height: '3px', borderRadius: '50%',
                          background: r.dQaly > 0 && r.dCost / r.dQaly < WTP_THRESHOLDS[currency] ? '#10B98180' : '#EF444480',
                        }} />
                      )
                    })}
                  </div>
                  <div style={{ fontSize: '10px', color: '#6B7280', textAlign: 'center', marginTop: '4px' }}>
                    {((psaResults.filter((r) => r.dQaly > 0 && r.dCost / r.dQaly < WTP_THRESHOLDS[currency]).length / psaResults.length) * 100).toFixed(1)}% cost-effective at WTP={WTP_THRESHOLDS[currency].toLocaleString()} {currency}
                  </div>
                </div>

                {/* CEAC */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>Cost-Effectiveness Acceptability Curve</div>
                  <div style={{ position: 'relative', height: '200px', background: '#FAF9F6', borderRadius: '8px', padding: '10px' }}>
                    <svg width="100%" height="100%" viewBox="0 0 300 180" preserveAspectRatio="none">
                      {/* Grid */}
                      {[0.25, 0.5, 0.75, 1].map((v) => (
                        <line key={v} x1="0" y1={180 - v * 170} x2="300" y2={180 - v * 170} stroke="#E5E5E0" strokeWidth="0.5" />
                      ))}
                      {/* WTP line */}
                      {(() => {
                        const maxWTP = WTP_THRESHOLDS[currency] * 2
                        const wtpX = (WTP_THRESHOLDS[currency] / maxWTP) * 300
                        return <line x1={wtpX} y1="0" x2={wtpX} y2="180" stroke="#D97757" strokeWidth="1" strokeDasharray="4,4" />
                      })()}
                      {/* CEAC line */}
                      {ceacData.length > 1 && (
                        <polyline
                          points={ceacData.map((d, i) => `${(i / (ceacData.length - 1)) * 300},${180 - d.prob * 170}`).join(' ')}
                          fill="none" stroke="#2563EB" strokeWidth="2"
                        />
                      )}
                    </svg>
                    {/* Y-axis labels */}
                    <div style={{ position: 'absolute', left: '2px', top: '8px', fontSize: '9px', color: '#9CA3AF' }}>1.0</div>
                    <div style={{ position: 'absolute', left: '2px', bottom: '8px', fontSize: '9px', color: '#9CA3AF' }}>0</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#9CA3AF', marginTop: '2px' }}>
                    <span>0</span>
                    <span style={{ color: '#D97757', fontWeight: 600 }}>WTP threshold</span>
                    <span>{(WTP_THRESHOLDS[currency] * 2).toLocaleString()} {currency}</span>
                  </div>
                </div>
              </div>
            )}

            {psaResults.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px', color: '#9CA3AF', fontSize: '13px' }}>
                Click &quot;Run PSA&quot; to generate probabilistic sensitivity analysis with {psaRuns.toLocaleString()} Monte Carlo iterations
              </div>
            )}
          </div>
        </div>

        {/* AI Sidebar */}
        <div>
          <AIAssistant
            context={`User is on the Cost-Effectiveness Analysis page. Perspective: ${perspective}. Currency: ${currency}. Time horizon: ${timeHorizon} years. Discount rate: ${discountRate}%. Arms: ${arms.map((a) => `${a.name} (cost=${a.cost}, QALY=${a.qaly})`).join(' vs ')}. ICER: ${icer?.[0] ? `${Math.round(icer[0].icer).toLocaleString()} ${currency}/QALY (${icer[0].dominance})` : 'not calculated'}. WTP threshold: ${WTP_THRESHOLDS[currency].toLocaleString()} ${currency}/QALY. Markov model: ${showMarkov ? `enabled, ${markovStates.length} states, total cost=${Math.round(markovTotals.cost).toLocaleString()}, QALYs=${markovTotals.qaly.toFixed(2)}` : 'disabled'}. PSA: ${psaResults.length > 0 ? `${psaResults.length} iterations completed` : 'not run'}.`}
            placeholder="Ask about cost-effectiveness..."
            quickActions={[
              { label: 'Interpret ICER', prompt: `The ICER is ${icer?.[0] ? `${Math.round(icer[0].icer).toLocaleString()} ${currency}/QALY` : 'not yet calculated'} comparing ${arms[1]?.name || 'intervention'} to ${arms[0]?.name || 'comparator'}. The WTP threshold is ${WTP_THRESHOLDS[currency].toLocaleString()} ${currency}/QALY. Explain what this means for decision-makers, whether the intervention is cost-effective, and what caveats to consider.` },
              { label: 'Saudi WTP context', prompt: `In Saudi Arabia, what is the appropriate WTP threshold per QALY? Currently using ${WTP_THRESHOLDS[currency].toLocaleString()} ${currency}. Discuss the GDP-based approach (1-3x GDP per capita), any Saudi-specific HTA guidelines, and how this compares to other GCC and international thresholds.` },
              { label: 'Sensitivity advice', prompt: `I have ${arms.length} treatment arms with cost ranges (${arms.map((a) => `${a.name}: ${a.costLow}-${a.costHigh} ${currency}`).join(', ')}). ${psaResults.length > 0 ? `PSA ran ${psaResults.length} iterations.` : 'PSA not yet run.'} Advise on what one-way and scenario analyses I should conduct, which parameters are most likely to drive results, and whether my uncertainty ranges are appropriate.` },
              { label: 'Markov guidance', prompt: `I have a Markov model with states: ${markovStates.map((s) => `${s.name} (cost=${s.cost}, utility=${s.utility})`).join(', ')}. Time horizon: ${timeHorizon} years, discount: ${discountRate}%. Are the transition probabilities plausible? Should I add tunnel states or half-cycle correction? What validation checks should I run?` },
              { label: 'Write results', prompt: `Help me write the results section for this CEA. ${arms[0].name} vs ${arms[1]?.name || 'intervention'}. ICER: ${icer?.[0] ? Math.round(icer[0].icer).toLocaleString() : 'N/A'} ${currency}/QALY. ${psaResults.length > 0 ? `PSA shows ${((psaResults.filter((r) => r.dQaly > 0 && r.dCost / r.dQaly < WTP_THRESHOLDS[currency]).length / psaResults.length) * 100).toFixed(1)}% probability of cost-effectiveness.` : ''} Follow CHEERS 2022 reporting guidelines.` },
            ]}
          />
        </div>
      </div>
    </>
  )
}

// Triangular distribution random sampler for PSA
function randTriang(lo: number, mode: number, hi: number): number {
  if (hi <= lo) return mode
  const u = Math.random()
  const fc = (mode - lo) / (hi - lo)
  return u < fc
    ? lo + Math.sqrt(u * (hi - lo) * (mode - lo))
    : hi - Math.sqrt((1 - u) * (hi - lo) * (hi - mode))
}
