import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

const SYSTEM_PROMPT = `You are an expert clinical guideline development assistant for the KSUMC National CPG Authority platform. You help with:

1. **PICO Question Development**: Help clinicians structure Population, Intervention, Comparison, and Outcome questions.
2. **Evidence Search Strategy**: Build PubMed search queries, suggest MeSH terms, and recommend study type filters.
3. **GRADE Methodology**: Guide users through evidence quality assessment — risk of bias, inconsistency, indirectness, imprecision, publication bias, and upgrade factors.
4. **Evidence-to-Recommendation (EtR)**: Help complete EtR tables covering problem priority, balance of effects, resource use, equity, acceptability, and feasibility.
5. **Recommendation Drafting**: Write clinical recommendations using standard GRADE wording (We recommend/suggest, Strong/Conditional).
6. **AGREE II Compliance**: Assess guideline quality across 6 domains and suggest improvements.
7. **Saudi Health Context**: Consider Vision 2030 health priorities, MOH regulations, SCFHS requirements, and local disease burden.

Keep responses focused, evidence-based, and methodologically rigorous. Use structured formatting with clear headings. When uncertain, clearly state limitations and suggest consulting primary sources.`

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 20 requests per minute per IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous'
    const limiter = rateLimit(`chat:${ip}`, { maxRequests: 20, windowMs: 60_000 })
    if (!limiter.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before sending more messages.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((limiter.reset - Date.now()) / 1000)) } }
      )
    }

    const body = await request.json()
    const { message, history } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Input length guard
    if (message.length > 4000) {
      return NextResponse.json({ error: 'Message too long (max 4000 characters)' }, { status: 400 })
    }

    if (history && (!Array.isArray(history) || history.length > 50)) {
      return NextResponse.json({ error: 'Invalid history format' }, { status: 400 })
    }

    const geminiKey = process.env.GEMINI_API_KEY
    if (!geminiKey) {
      // Return a helpful fallback when Gemini isn't configured
      return NextResponse.json({
        response: generateFallbackResponse(message),
        model: 'fallback',
      })
    }

    // Build conversation for Gemini
    const contents = []

    // Add history
    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        })
      }
    }

    // Add current message
    contents.push({ role: 'user', parts: [{ text: message }] })

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
            topP: 0.95,
          },
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', errorText)
      return NextResponse.json({
        response: generateFallbackResponse(message),
        model: 'fallback',
        error: 'Gemini API error',
      })
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.'

    return NextResponse.json({
      response: text,
      model: 'gemini-2.0-flash',
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateFallbackResponse(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('pico') || lower.includes('question')) {
    return `**PICO Question Builder**

To structure your clinical question, fill in these components:

**P (Population):** Who are the patients? (e.g., adults with type 2 diabetes, age >18, newly diagnosed)

**I (Intervention):** What is the intervention? (e.g., SGLT2 inhibitors, metformin, lifestyle modification)

**C (Comparison):** What is the alternative? (e.g., placebo, standard care, another drug class)

**O (Outcome):** What outcomes matter? (e.g., HbA1c reduction, cardiovascular mortality, kidney function)

**Example:** In adults with type 2 diabetes and established cardiovascular disease (P), do SGLT2 inhibitors (I) compared to DPP-4 inhibitors (C) reduce major adverse cardiovascular events (O)?

*Tip: Use the Evidence Search page to run this PICO query against PubMed.*`
  }

  if (lower.includes('grade') || lower.includes('evidence quality') || lower.includes('certainty')) {
    return `**GRADE Evidence Assessment Guide**

The GRADE framework rates certainty of evidence across 5 downgrade and 3 upgrade domains:

**Downgrade Factors:**
1. **Risk of Bias** — Allocation concealment, blinding, attrition, selective reporting
2. **Inconsistency** — Heterogeneity across studies (I² >50% raises concern)
3. **Indirectness** — Different populations, interventions, or outcomes than your PICO
4. **Imprecision** — Wide confidence intervals crossing the null or clinical thresholds
5. **Publication Bias** — Funnel plot asymmetry, small-study effects

**Upgrade Factors:**
1. **Large Effect** — RR >2 or <0.5 with no plausible confounders
2. **Dose-Response** — Clear gradient relationship
3. **Plausible Confounding** — Would reduce the effect (strengthens finding)

*Use the GRADE Workflow page to calculate certainty for your outcomes.*`
  }

  if (lower.includes('recommend') || lower.includes('etr') || lower.includes('evidence-to')) {
    return `**Evidence-to-Recommendation Framework**

The EtR framework guides the panel from evidence to recommendations through 11 criteria:

1. **Problem Priority** — Is this a priority health problem?
2. **Desirable Effects** — How substantial are the benefits?
3. **Undesirable Effects** — How significant are the harms?
4. **Certainty of Evidence** — GRADE certainty level
5. **Values & Preferences** — Is there uncertainty about patient values?
6. **Balance of Effects** — Do benefits outweigh harms?
7. **Resources Required** — What are the costs?
8. **Cost-Effectiveness** — Is it cost-effective?
9. **Equity** — What impact on health equity?
10. **Acceptability** — Is it acceptable to stakeholders?
11. **Feasibility** — Is it feasible to implement?

**Standard Wording:**
- **Strong For:** "We recommend..." (most patients should receive)
- **Conditional For:** "We suggest..." (many patients would want, but not all)
- **Conditional Against:** "We suggest against..."
- **Strong Against:** "We recommend against..."

*Use the GRADE Workflow page to complete your EtR assessment.*`
  }

  if (lower.includes('search') || lower.includes('pubmed') || lower.includes('evidence search')) {
    return `**Evidence Search Strategy**

For a systematic PubMed search, I recommend this approach:

1. **Break down your PICO** into individual search concepts
2. **Use MeSH terms** combined with free-text synonyms for each concept
3. **Combine within concepts** using OR
4. **Combine across concepts** using AND
5. **Apply filters** for study type (systematic reviews, RCTs) and date range

**Example structure:**
\`\`\`
("diabetes mellitus, type 2"[MeSH] OR "type 2 diabetes"[tiab])
AND
("SGLT2 inhibitors"[MeSH] OR "empagliflozin"[tiab] OR "dapagliflozin"[tiab])
AND
("cardiovascular diseases"[MeSH] OR "MACE"[tiab])
AND
(systematic[sb] OR randomized controlled trial[pt])
\`\`\`

*Go to the Evidence Search page to run your search against PubMed directly.*`
  }

  return `**CPG Development Assistant**

I can help you with various aspects of clinical practice guideline development:

- **PICO Questions** — Structure your clinical questions
- **Evidence Search** — Build PubMed search strategies with MeSH terms
- **GRADE Assessment** — Evaluate evidence certainty and quality
- **EtR Framework** — Move from evidence to recommendations
- **Recommendation Drafting** — Write standard GRADE-format recommendations
- **AGREE II** — Assess and improve guideline quality
- **Saudi Context** — Vision 2030 alignment and local health priorities

Try asking me something specific, like:
- "Help me write a PICO question for hypertension management"
- "What GRADE downgrade factors should I consider?"
- "Draft a conditional recommendation for statin use"

*Note: Connect a Gemini API key in Settings → Integrations for AI-powered responses.*`
}
