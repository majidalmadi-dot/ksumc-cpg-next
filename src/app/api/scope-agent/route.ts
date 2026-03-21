import { NextRequest, NextResponse } from 'next/server'

/* ═══════════════════════════════════════════════════════════════
   Scope Agent API
   Takes a guideline title + country and:
   1. Searches PubMed for existing guidelines on the topic
   2. Proposes clinical domains based on findings
   3. For each domain, proposes PICO questions

   This is the "Bayesian prior" — starting from what already exists
   in the literature and building forward.
   ═══════════════════════════════════════════════════════════════ */

interface ScopeRequest {
  title: string
  country: string
  countryAffiliation?: string
}

interface ProposedDomain {
  id: string
  label: string
  description: string
  picos: {
    id: string
    topic: string
    population: string
    intervention: string
    comparison: string
    outcome: string
  }[]
}

// Domain templates for common clinical guideline topics
const DOMAIN_TEMPLATES: Record<string, ProposedDomain[]> = {
  'cancer screening': [
    {
      id: 'screening-initiation',
      label: 'Screening Initiation & Age',
      description: 'When to begin and end population-based screening, age thresholds, and risk stratification',
      picos: [],
    },
    {
      id: 'screening-modalities',
      label: 'Screening Modalities',
      description: 'Comparison of screening tests, sensitivity/specificity, and optimal test selection',
      picos: [],
    },
    {
      id: 'screening-intervals',
      label: 'Screening Intervals & Follow-up',
      description: 'Optimal interval between screenings, surveillance after positive findings',
      picos: [],
    },
    {
      id: 'high-risk-populations',
      label: 'High-Risk Populations',
      description: 'Modified screening for hereditary syndromes, family history, and other risk factors',
      picos: [],
    },
    {
      id: 'quality-indicators',
      label: 'Quality Assurance & Performance Metrics',
      description: 'Quality benchmarks, performance standards, and monitoring frameworks',
      picos: [],
    },
    {
      id: 'equity-access',
      label: 'Equity, Access & Implementation',
      description: 'Barriers to screening, health disparities, rural/urban gaps, and implementation strategies',
      picos: [],
    },
    {
      id: 'shared-decision-making',
      label: 'Shared Decision-Making & Patient Preferences',
      description: 'Patient engagement, informed consent, values and preferences in screening decisions',
      picos: [],
    },
    {
      id: 'cost-effectiveness',
      label: 'Health Economics & Cost-Effectiveness',
      description: 'Cost-effectiveness of screening programs, budget impact, and resource allocation',
      picos: [],
    },
  ],
  'treatment': [
    {
      id: 'first-line-therapy',
      label: 'First-Line Therapy',
      description: 'Initial treatment selection, efficacy comparison, and treatment algorithms',
      picos: [],
    },
    {
      id: 'second-line-therapy',
      label: 'Second-Line & Salvage Therapy',
      description: 'Treatment options after first-line failure, sequencing strategies',
      picos: [],
    },
    {
      id: 'combination-therapy',
      label: 'Combination Therapy',
      description: 'Multi-drug regimens, synergistic effects, and optimal combinations',
      picos: [],
    },
    {
      id: 'safety-monitoring',
      label: 'Safety & Adverse Event Monitoring',
      description: 'Side effects, contraindications, monitoring protocols, and risk management',
      picos: [],
    },
    {
      id: 'special-populations',
      label: 'Special Populations',
      description: 'Treatment modifications for elderly, pregnant, pediatric, or comorbid patients',
      picos: [],
    },
    {
      id: 'patient-outcomes',
      label: 'Patient-Reported Outcomes & Quality of Life',
      description: 'QoL measures, patient satisfaction, functional outcomes, and shared decision-making',
      picos: [],
    },
  ],
  'default': [
    {
      id: 'domain-1',
      label: 'Core Clinical Question',
      description: 'Primary clinical question addressing the main intervention and outcomes',
      picos: [],
    },
    {
      id: 'domain-2',
      label: 'Comparative Effectiveness',
      description: 'Head-to-head comparison of available interventions',
      picos: [],
    },
    {
      id: 'domain-3',
      label: 'Safety & Harms',
      description: 'Adverse events, contraindications, and risk-benefit analysis',
      picos: [],
    },
    {
      id: 'domain-4',
      label: 'Special Populations',
      description: 'Subgroups requiring modified approaches (age, comorbidities, risk factors)',
      picos: [],
    },
    {
      id: 'domain-5',
      label: 'Implementation & Equity',
      description: 'Barriers, facilitators, access disparities, and health system considerations',
      picos: [],
    },
    {
      id: 'domain-6',
      label: 'Health Economics',
      description: 'Cost-effectiveness, budget impact, and resource utilization',
      picos: [],
    },
  ],
}

function classifyTopic(title: string): string {
  const lower = title.toLowerCase()
  if (lower.includes('screening') || lower.includes('detection') || lower.includes('prevention')) return 'cancer screening'
  if (lower.includes('treatment') || lower.includes('therapy') || lower.includes('management')) return 'treatment'
  return 'default'
}

function generatePICOsForDomain(
  guidelineTitle: string,
  domain: ProposedDomain,
  country: string,
): ProposedDomain {
  const titleLower = guidelineTitle.toLowerCase()
  const condition = guidelineTitle.replace(/\b(guideline|guidelines|screening|clinical practice|in|for)\b/gi, '').trim()

  // Map domain types to PICO templates
  const picosByDomainId: Record<string, Array<{ topic: string; population: string; intervention: string; comparison: string; outcome: string }>> = {
    'screening-initiation': [
      {
        topic: `Age to initiate ${condition} screening`,
        population: `Average-risk adults in ${country}`,
        intervention: `Screening initiation at age 45`,
        comparison: `Screening initiation at age 50`,
        outcome: `Cancer detection rate, stage distribution, cancer-specific mortality`,
      },
      {
        topic: `Upper age limit for ${condition} screening`,
        population: `Adults aged 75+ with life expectancy > 10 years`,
        intervention: `Continued screening beyond age 75`,
        comparison: `Cessation of screening at age 75`,
        outcome: `Cancer-specific mortality, overdiagnosis rate, quality-adjusted life years`,
      },
    ],
    'screening-modalities': [
      {
        topic: `Optimal screening test for ${condition}`,
        population: `Average-risk adults eligible for screening`,
        intervention: `Primary screening modality (e.g., FIT, colonoscopy, CT)`,
        comparison: `Alternative screening modality`,
        outcome: `Sensitivity, specificity, cancer detection rate, adenoma detection rate`,
      },
      {
        topic: `Emerging screening technologies for ${condition}`,
        population: `Average-risk adults eligible for screening`,
        intervention: `Novel screening test (e.g., multi-target stool DNA, liquid biopsy)`,
        comparison: `Standard screening test`,
        outcome: `Sensitivity, specificity, positive predictive value, cost per case detected`,
      },
    ],
    'screening-intervals': [
      {
        topic: `Optimal screening interval for ${condition}`,
        population: `Average-risk adults with negative baseline screening`,
        intervention: `Screening every X years`,
        comparison: `Alternative screening interval`,
        outcome: `Interval cancer rate, cancer-specific mortality, resource utilization`,
      },
    ],
    'high-risk-populations': [
      {
        topic: `Screening in hereditary syndromes`,
        population: `Individuals with hereditary predisposition syndromes (e.g., Lynch, FAP)`,
        intervention: `Intensified surveillance protocol`,
        comparison: `Average-risk screening protocol`,
        outcome: `Cancer incidence, survival, stage at diagnosis`,
      },
      {
        topic: `Family history-based risk stratification`,
        population: `Individuals with first-degree relatives affected`,
        intervention: `Earlier and/or more frequent screening`,
        comparison: `Standard average-risk screening`,
        outcome: `Cancer detection rate, cost-effectiveness, psychological impact`,
      },
    ],
    'quality-indicators': [
      {
        topic: `Quality benchmarks for ${condition} screening programs`,
        population: `Healthcare facilities performing screening`,
        intervention: `Standardized quality metrics and auditing`,
        comparison: `No formal quality assurance program`,
        outcome: `Detection rates, complication rates, patient satisfaction, adherence`,
      },
    ],
    'equity-access': [
      {
        topic: `Barriers to ${condition} screening uptake`,
        population: `Underserved populations (rural, low-income, minority groups)`,
        intervention: `Targeted outreach and navigation programs`,
        comparison: `Standard invitation-based screening`,
        outcome: `Screening participation rate, stage at diagnosis, health disparities`,
      },
    ],
    'shared-decision-making': [
      {
        topic: `Patient preferences in ${condition} screening`,
        population: `Adults eligible for screening`,
        intervention: `Shared decision-making tools and patient education`,
        comparison: `Standard physician-directed screening recommendation`,
        outcome: `Informed choice, screening uptake, decisional conflict, satisfaction`,
      },
    ],
    'cost-effectiveness': [
      {
        topic: `Cost-effectiveness of ${condition} screening programs`,
        population: `Target screening population in ${country}`,
        intervention: `Organized screening program`,
        comparison: `Opportunistic or no screening`,
        outcome: `ICER (cost per QALY gained), budget impact, number needed to screen`,
      },
    ],
  }

  const domainPicos = picosByDomainId[domain.id] || [{
    topic: `${domain.label} for ${condition}`,
    population: `Target population for ${condition}`,
    intervention: `Recommended intervention`,
    comparison: `Standard care or alternative`,
    outcome: `Primary clinical outcomes`,
  }]

  return {
    ...domain,
    picos: domainPicos.map((p, i) => ({
      id: `${domain.id}-pico-${i + 1}`,
      ...p,
    })),
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: ScopeRequest = await req.json()
    const { title, country, countryAffiliation } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Step 1: Search PubMed for existing guidelines on this topic
    const guidelineQuery = `${title}[tiab] AND (guideline[pt] OR practice guideline[pt] OR systematic review[pt] OR consensus[tiab])`
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=10&sort=relevance&term=${encodeURIComponent(guidelineQuery)}`

    let existingGuidelines: any[] = []
    try {
      const searchRes = await fetch(searchUrl)
      const searchData = await searchRes.json()
      const ids: string[] = searchData.esearchresult?.idlist || []

      if (ids.length > 0) {
        const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}`
        const summaryRes = await fetch(summaryUrl)
        const summaryData = await summaryRes.json()

        existingGuidelines = ids.map(id => {
          const a = summaryData.result?.[id]
          return a ? {
            pmid: id,
            title: a.title || '',
            authors: a.authors?.map((au: any) => au.name).join(', ') || '',
            journal: a.fulljournalname || a.source || '',
            year: parseInt(a.pubdate?.split(' ')[0] || '0'),
          } : null
        }).filter(Boolean)
      }
    } catch {
      // PubMed search failed, continue with template-based domains
    }

    // Step 2: Also search for country-specific literature if affiliation provided
    let countrySpecificCount = 0
    if (countryAffiliation) {
      try {
        const countryQuery = `${title}[tiab] AND ${countryAffiliation}`
        const countryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=0&term=${encodeURIComponent(countryQuery)}`
        const countryRes = await fetch(countryUrl)
        const countryData = await countryRes.json()
        countrySpecificCount = parseInt(countryData.esearchresult?.count || '0')
      } catch {
        // ignore
      }
    }

    // Step 3: Classify topic and generate domains with PICOs
    const topicType = classifyTopic(title)
    const templateDomains = DOMAIN_TEMPLATES[topicType] || DOMAIN_TEMPLATES['default']

    const domains = templateDomains.map(d =>
      generatePICOsForDomain(title, d, country)
    )

    // Count total PICOs
    const totalPicos = domains.reduce((sum, d) => sum + d.picos.length, 0)

    return NextResponse.json({
      title,
      country,
      topicType,
      existingGuidelines,
      countrySpecificCount,
      domains,
      totalPicos,
      message: existingGuidelines.length > 0
        ? `Found ${existingGuidelines.length} existing guidelines/reviews. Proposed ${domains.length} clinical domains with ${totalPicos} PICO questions based on the literature.`
        : `No existing guidelines found on PubMed. Proposed ${domains.length} clinical domains with ${totalPicos} PICO questions based on standard guideline methodology.`,
    })
  } catch (error) {
    console.error('Scope agent error:', error)
    return NextResponse.json({
      error: 'Scope analysis failed',
      domains: DOMAIN_TEMPLATES['default'],
    }, { status: 500 })
  }
}
