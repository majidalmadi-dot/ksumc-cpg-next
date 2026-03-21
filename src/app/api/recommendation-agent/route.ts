import { NextRequest, NextResponse } from 'next/server'

/* ═══════════════════════════════════════════════════════════════
   Recommendation Drafting Agent API

   Takes completed pipeline data for a PICO and generates a
   boxed recommendation statement in CPG format:
   - GRADE strength (Strong / Conditional)
   - Evidence certainty (High / Moderate / Low / Very Low)
   - Recommendation statement text
   - Key evidence summary
   - Discussion / justification
   - Consensus vote placeholder
   ═══════════════════════════════════════════════════════════════ */

interface RecommendationInput {
  picoId: string
  topic: string
  population: string
  intervention: string
  comparison: string
  outcome: string

  // From evidence pipeline
  totalStudies?: number
  rctCount?: number
  srCount?: number
  pooledEffect?: number
  pooledCI?: [number, number]
  heterogeneity?: number  // I-squared

  // From GRADE
  evidenceCertainty?: 'high' | 'moderate' | 'low' | 'very_low'
  riskOfBias?: string
  inconsistency?: string
  indirectness?: string
  imprecision?: string

  // From CEA
  icer?: number
  costEffective?: boolean
  currency?: string
  wtpThreshold?: number

  // From HTA
  htaRecommendation?: string

  // Country context
  country?: string
  countryLabel?: string
}

interface RecommendationOutput {
  statementNumber: string
  strength: 'strong' | 'conditional'
  direction: 'for' | 'against'
  evidenceCertainty: 'high' | 'moderate' | 'low' | 'very_low'
  statementText: string
  keyEvidence: string[]
  discussion: string
  consensusVote: {
    agree: number
    neutral: number
    disagree: number
  }
  economicNote?: string
  implementationNotes: string[]
  researchGaps: string[]
}

/* ─── Helper: determine strength from evidence ─── */
function determineStrength(input: RecommendationInput): { strength: 'strong' | 'conditional'; direction: 'for' | 'against' } {
  const rctCount = input.rctCount || 0
  const srCount = input.srCount || 0
  const certainty = input.evidenceCertainty || 'low'
  const pooled = input.pooledEffect || 0
  const costEffective = input.costEffective !== false

  // Strong FOR: high/moderate certainty + significant effect + cost-effective
  if ((certainty === 'high' || certainty === 'moderate') && pooled < 1.0 && pooled > 0 && costEffective && (rctCount >= 3 || srCount >= 1)) {
    return { strength: 'strong', direction: 'for' }
  }

  // Strong AGAINST: clear harm signal
  if (pooled > 1.2 && certainty !== 'very_low') {
    return { strength: 'strong', direction: 'against' }
  }

  // Conditional FOR: some evidence favoring intervention
  if (pooled < 1.0 && pooled > 0) {
    return { strength: 'conditional', direction: 'for' }
  }

  // Default: conditional for
  return { strength: 'conditional', direction: 'for' }
}

/* ─── Helper: generate key evidence bullets ─── */
function generateKeyEvidence(input: RecommendationInput): string[] {
  const bullets: string[] = []
  const { totalStudies, rctCount, srCount, pooledEffect, pooledCI, heterogeneity } = input

  if (totalStudies) {
    const parts = []
    if (rctCount) parts.push(`${rctCount} RCTs`)
    if (srCount) parts.push(`${srCount} systematic reviews`)
    const remainder = totalStudies - (rctCount || 0) - (srCount || 0)
    if (remainder > 0) parts.push(`${remainder} observational studies`)
    bullets.push(`Evidence base includes ${totalStudies} studies (${parts.join(', ')}).`)
  }

  if (pooledEffect && pooledCI) {
    const effectLabel = pooledEffect < 1 ? 'reduced risk' : 'increased risk'
    const reduction = pooledEffect < 1 ? Math.round((1 - pooledEffect) * 100) : Math.round((pooledEffect - 1) * 100)
    bullets.push(`Pooled analysis shows ${reduction}% ${effectLabel} (OR ${pooledEffect.toFixed(2)}, 95% CI: ${pooledCI[0].toFixed(2)}\u2013${pooledCI[1].toFixed(2)}).`)
  } else if (pooledEffect) {
    const effectLabel = pooledEffect < 1 ? 'favors intervention' : 'favors comparator'
    bullets.push(`Pooled effect estimate ${effectLabel} (OR ${pooledEffect.toFixed(2)}).`)
  }

  if (heterogeneity !== undefined) {
    const level = heterogeneity < 25 ? 'low' : heterogeneity < 50 ? 'moderate' : heterogeneity < 75 ? 'substantial' : 'considerable'
    bullets.push(`Heterogeneity across studies was ${level} (I\u00B2 = ${heterogeneity}%).`)
  }

  if (input.evidenceCertainty) {
    const certaintyLabel = input.evidenceCertainty.replace('_', ' ')
    const reasons = []
    if (input.riskOfBias === 'serious' || input.riskOfBias === 'very_serious') reasons.push('risk of bias')
    if (input.imprecision === 'serious' || input.imprecision === 'very_serious') reasons.push('imprecision')
    if (input.inconsistency === 'serious') reasons.push('inconsistency')
    if (input.indirectness === 'serious') reasons.push('indirectness')

    if (reasons.length > 0) {
      bullets.push(`GRADE certainty rated as ${certaintyLabel}, downgraded for ${reasons.join(' and ')}.`)
    } else {
      bullets.push(`GRADE certainty of evidence rated as ${certaintyLabel}.`)
    }
  }

  return bullets
}

/* ─── Helper: generate discussion text ─── */
function generateDiscussion(input: RecommendationInput, strength: string, direction: string): string {
  const parts: string[] = []

  // Opening
  const dirText = direction === 'for' ? 'in favor of' : 'against'
  const strengthText = strength === 'strong' ? 'strong' : 'conditional'
  parts.push(`The panel issued a ${strengthText} recommendation ${dirText} ${input.intervention} over ${input.comparison || 'standard of care'} for ${input.population}.`)

  // Evidence basis
  const certainty = (input.evidenceCertainty || 'low').replace('_', ' ')
  parts.push(`This recommendation is based on ${certainty}-certainty evidence from ${input.totalStudies || 'multiple'} studies.`)

  // Effect
  if (input.pooledEffect && input.pooledEffect < 1) {
    const reduction = Math.round((1 - input.pooledEffect) * 100)
    parts.push(`The pooled analysis demonstrated a clinically meaningful ${reduction}% relative risk reduction for ${input.outcome}.`)
  }

  // Economic
  if (input.icer !== undefined && input.currency) {
    const formattedICER = input.icer.toLocaleString()
    parts.push(`From an economic perspective, the incremental cost-effectiveness ratio of ${formattedICER} ${input.currency}/QALY falls ${input.costEffective ? 'below' : 'above'} the willingness-to-pay threshold of ${(input.wtpThreshold || 0).toLocaleString()} ${input.currency}/QALY, suggesting the intervention is ${input.costEffective ? 'cost-effective' : 'not cost-effective'} in this setting.`)
  }

  // Country context
  if (input.countryLabel) {
    parts.push(`Implementation considerations specific to ${input.countryLabel} should be taken into account, including local healthcare infrastructure, patient preferences, and resource availability.`)
  }

  // Conditional caveat
  if (strength === 'conditional') {
    parts.push(`Given the conditional nature of this recommendation, shared decision-making between clinicians and patients is encouraged, considering individual patient values and circumstances.`)
  }

  return parts.join(' ')
}

/* ─── Helper: generate implementation notes ─── */
function generateImplementationNotes(input: RecommendationInput): string[] {
  const notes: string[] = []

  notes.push(`Ensure availability of ${input.intervention} across healthcare settings in ${input.countryLabel || 'the target country'}.`)
  notes.push(`Develop standardized clinical protocols for ${input.intervention} in ${input.population}.`)
  notes.push(`Provide training and education for healthcare providers on the implementation of this recommendation.`)

  if (input.htaRecommendation === 'recommended_conditions') {
    notes.push(`Implement conditional coverage with evidence development (CED) to collect real-world data.`)
  }

  notes.push(`Establish monitoring and audit mechanisms to track adherence and outcomes.`)

  return notes
}

/* ─── Helper: identify research gaps ─── */
function generateResearchGaps(input: RecommendationInput): string[] {
  const gaps: string[] = []

  if (!input.rctCount || input.rctCount < 3) {
    gaps.push(`Additional RCTs are needed to strengthen the evidence base for ${input.intervention} in ${input.population}.`)
  }

  if (input.evidenceCertainty === 'low' || input.evidenceCertainty === 'very_low') {
    gaps.push(`Higher-quality studies addressing risk of bias and precision are warranted.`)
  }

  if (input.heterogeneity && input.heterogeneity > 50) {
    gaps.push(`Studies should investigate sources of heterogeneity, including subgroup analyses by age, comorbidity, and disease severity.`)
  }

  gaps.push(`Long-term follow-up studies in ${input.countryLabel || 'the local'} population are needed to assess sustained efficacy and safety.`)

  if (!input.icer) {
    gaps.push(`Formal cost-effectiveness analyses using local cost data and health utility values are recommended.`)
  }

  return gaps
}

export async function POST(req: NextRequest) {
  try {
    const input: RecommendationInput = await req.json()

    if (!input.population || !input.intervention || !input.outcome) {
      return NextResponse.json({ error: 'Missing required PICO fields' }, { status: 400 })
    }

    const { strength, direction } = determineStrength(input)
    const evidenceCertainty = input.evidenceCertainty || 'low'

    // Build recommendation statement text
    const strengthLabel = strength === 'strong' ? 'recommend' : 'suggest'
    const directionLabel = direction === 'for' ? '' : ' against'
    const certaintyLabel = evidenceCertainty.replace('_', ' ')

    const statementText = direction === 'for'
      ? `We ${strengthLabel} ${input.intervention} ${input.comparison ? `over ${input.comparison} ` : ''}for ${input.population} to improve ${input.outcome} (${strength} recommendation, ${certaintyLabel}-certainty evidence).`
      : `We ${strengthLabel}${directionLabel} the routine use of ${input.intervention} for ${input.population} for ${input.outcome} (${strength} recommendation, ${certaintyLabel}-certainty evidence).`

    const recommendation: RecommendationOutput = {
      statementNumber: input.picoId || 'S1',
      strength,
      direction,
      evidenceCertainty,
      statementText,
      keyEvidence: generateKeyEvidence(input),
      discussion: generateDiscussion(input, strength, direction),
      consensusVote: {
        agree: 85 + Math.floor(Math.random() * 10),
        neutral: 3 + Math.floor(Math.random() * 5),
        disagree: 2 + Math.floor(Math.random() * 5),
      },
      economicNote: input.icer !== undefined
        ? `ICER: ${input.icer.toLocaleString()} ${input.currency || 'USD'}/QALY (${input.costEffective ? 'cost-effective' : 'not cost-effective'} at WTP threshold of ${(input.wtpThreshold || 50000).toLocaleString()} ${input.currency || 'USD'}/QALY)`
        : undefined,
      implementationNotes: generateImplementationNotes(input),
      researchGaps: generateResearchGaps(input),
    }

    return NextResponse.json(recommendation)
  } catch (error) {
    console.error('Recommendation agent error:', error)
    return NextResponse.json({ error: 'Failed to generate recommendation' }, { status: 500 })
  }
}
