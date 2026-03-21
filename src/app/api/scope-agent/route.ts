import { NextRequest, NextResponse } from 'next/server'

/* ═══════════════════════════════════════════════════════════════
   Scope Agent v2 — Literature-Grounded Domain & PICO Generator

   1. Searches PubMed broadly for existing guidelines on the topic
   2. Proposes clinical domains (many, granular)
   3. For EACH domain, does a focused PubMed search
   4. Parses article titles/abstracts to extract real PICO elements
   5. Returns literature-grounded PICOs citing the source PMIDs

   This is the "Bayesian prior" — grounded in what exists.
   ═══════════════════════════════════════════════════════════════ */

interface ScopeRequest {
  title: string
  country: string
  countryAffiliation?: string
}

interface ExtractedPICO {
  id: string
  topic: string
  population: string
  intervention: string
  comparison: string
  outcome: string
  sourcePmids: string[]
  sourceSnippet: string
}

interface ProposedDomain {
  id: string
  label: string
  description: string
  searchQuery: string
  articlesFound: number
  picos: ExtractedPICO[]
}

/* ═══════════════════════════════════════════════════════════════
   Domain Templates — Expanded & Granular
   ═══════════════════════════════════════════════════════════════ */

interface DomainTemplate {
  id: string
  label: string
  description: string
  searchTerms: string[]  // additional terms to AND with main topic
}

const SCREENING_DOMAINS: DomainTemplate[] = [
  { id: 'screening-age-initiation', label: 'Screening Age & Initiation', description: 'Optimal age to begin screening, risk-stratified initiation, and early-onset trends', searchTerms: ['screening age', 'initiation', 'young onset', 'early onset'] },
  { id: 'screening-cessation', label: 'Screening Cessation & Upper Age', description: 'When to stop screening, life expectancy considerations, diminishing returns in elderly', searchTerms: ['screening cessation', 'upper age limit', 'elderly screening', 'stopping screening'] },
  { id: 'average-risk-modalities', label: 'Average-Risk Screening Modalities', description: 'FIT, gFOBT, colonoscopy, CT colonography, and sigmoidoscopy for average-risk populations', searchTerms: ['screening modality', 'FIT', 'colonoscopy', 'fecal immunochemical', 'gFOBT'] },
  { id: 'emerging-technologies', label: 'Emerging Screening Technologies', description: 'Multi-target stool DNA, liquid biopsy, ctDNA, methylation markers, and AI-assisted detection', searchTerms: ['stool DNA', 'liquid biopsy', 'ctDNA', 'methylation', 'artificial intelligence detection'] },
  { id: 'screening-intervals', label: 'Screening Intervals & Repeat Testing', description: 'Optimal interval between negative screens, surveillance after polypectomy, interval cancers', searchTerms: ['screening interval', 'surveillance', 'polypectomy', 'interval cancer', 'repeat screening'] },
  { id: 'risk-stratification', label: 'Risk Stratification & Personalized Screening', description: 'Risk scores, polygenic risk, biomarkers for personalized screening intensity', searchTerms: ['risk stratification', 'personalized screening', 'polygenic risk', 'risk score', 'risk model'] },
  { id: 'hereditary-syndromes', label: 'Hereditary Cancer Syndromes', description: 'Lynch syndrome, FAP, MUTYH, Li-Fraumeni — intensified surveillance protocols', searchTerms: ['Lynch syndrome', 'FAP', 'hereditary', 'familial adenomatous polyposis', 'MUTYH'] },
  { id: 'family-history', label: 'Family History & Moderate-Risk Groups', description: 'First-degree relative history, modified screening for intermediate-risk individuals', searchTerms: ['family history', 'first degree relative', 'moderate risk', 'familial risk'] },
  { id: 'inflammatory-bowel', label: 'Inflammatory Bowel Disease Surveillance', description: 'Screening in UC and Crohn\'s colitis, chromoendoscopy, dysplasia management', searchTerms: ['inflammatory bowel disease', 'ulcerative colitis surveillance', 'Crohn', 'chromoendoscopy', 'dysplasia'] },
  { id: 'adenoma-surveillance', label: 'Post-Polypectomy & Adenoma Surveillance', description: 'Surveillance intervals after adenoma removal, advanced adenoma follow-up, serrated polyps', searchTerms: ['post-polypectomy surveillance', 'adenoma', 'advanced adenoma', 'serrated polyp', 'surveillance colonoscopy'] },
  { id: 'quality-indicators', label: 'Colonoscopy Quality & Performance Metrics', description: 'Adenoma detection rate, cecal intubation rate, withdrawal time, bowel preparation quality', searchTerms: ['adenoma detection rate', 'quality indicator', 'cecal intubation', 'bowel preparation', 'withdrawal time'] },
  { id: 'bowel-preparation', label: 'Bowel Preparation Optimization', description: 'Split-dose vs same-day prep, low-volume regimens, patient adherence, preparation adequacy', searchTerms: ['bowel preparation', 'split dose', 'low volume prep', 'preparation adequacy', 'PEG'] },
  { id: 'sedation-safety', label: 'Sedation & Procedural Safety', description: 'Sedation protocols, unsedated colonoscopy, complication rates, perforation, bleeding', searchTerms: ['sedation colonoscopy', 'procedural safety', 'complication', 'perforation', 'bleeding risk'] },
  { id: 'equity-access', label: 'Equity, Access & Health Disparities', description: 'Screening uptake gaps, rural-urban disparities, gender/ethnic differences, barriers to access', searchTerms: ['screening disparities', 'health equity', 'barriers', 'uptake', 'access', 'rural'] },
  { id: 'organized-programs', label: 'Organized vs Opportunistic Screening Programs', description: 'Population-based programs, invitation systems, call-recall, program design', searchTerms: ['organized screening program', 'population-based', 'invitation', 'call recall', 'program implementation'] },
  { id: 'patient-preferences', label: 'Patient Preferences & Shared Decision-Making', description: 'Patient values, test preference, decision aids, informed choice, screening adherence', searchTerms: ['patient preference', 'shared decision', 'decision aid', 'informed choice', 'screening adherence'] },
  { id: 'cost-effectiveness', label: 'Cost-Effectiveness & Budget Impact', description: 'CEA of screening strategies, ICER, QALY, budget impact models, resource allocation', searchTerms: ['cost-effectiveness', 'cost effectiveness', 'ICER', 'QALY', 'budget impact', 'economic evaluation'] },
  { id: 'workforce-training', label: 'Workforce, Training & Capacity', description: 'Endoscopist training, credentialing, workforce capacity, competency assessment', searchTerms: ['endoscopist training', 'colonoscopy training', 'workforce', 'credentialing', 'competency'] },
]

const TREATMENT_DOMAINS: DomainTemplate[] = [
  { id: 'first-line-therapy', label: 'First-Line Therapy', description: 'Initial treatment selection, comparative efficacy, treatment algorithms', searchTerms: ['first-line', 'initial therapy', 'treatment algorithm'] },
  { id: 'second-line-therapy', label: 'Second-Line & Salvage Therapy', description: 'Treatment after first-line failure, sequencing strategies', searchTerms: ['second-line', 'salvage therapy', 'treatment failure', 'refractory'] },
  { id: 'combination-therapy', label: 'Combination Therapy', description: 'Multi-drug regimens, synergistic effects, optimal combinations', searchTerms: ['combination therapy', 'multi-drug', 'combined treatment'] },
  { id: 'targeted-therapy', label: 'Targeted & Precision Therapy', description: 'Biomarker-driven treatment, molecular targets, companion diagnostics', searchTerms: ['targeted therapy', 'precision medicine', 'biomarker', 'molecular'] },
  { id: 'immunotherapy', label: 'Immunotherapy', description: 'Immune checkpoint inhibitors, combination immunotherapy, biomarkers of response', searchTerms: ['immunotherapy', 'checkpoint inhibitor', 'PD-1', 'PD-L1'] },
  { id: 'neoadjuvant', label: 'Neoadjuvant & Perioperative Therapy', description: 'Pre-surgical treatment, pathological response, organ preservation', searchTerms: ['neoadjuvant', 'perioperative', 'presurgical', 'pathological response'] },
  { id: 'adjuvant', label: 'Adjuvant Therapy', description: 'Post-surgical treatment, duration, de-escalation strategies', searchTerms: ['adjuvant', 'post-surgical', 'adjuvant duration'] },
  { id: 'safety-monitoring', label: 'Safety & Adverse Event Management', description: 'Side effects, dose modifications, contraindications, monitoring protocols', searchTerms: ['adverse event', 'safety', 'toxicity', 'dose modification', 'side effect'] },
  { id: 'special-populations', label: 'Special Populations', description: 'Elderly, pediatric, pregnant, renal/hepatic impairment, comorbid patients', searchTerms: ['elderly', 'pediatric', 'pregnancy', 'renal impairment', 'comorbidity'] },
  { id: 'supportive-care', label: 'Supportive & Palliative Care', description: 'Symptom management, quality of life, palliative interventions', searchTerms: ['supportive care', 'palliative', 'quality of life', 'symptom management'] },
  { id: 'patient-outcomes', label: 'Patient-Reported Outcomes', description: 'PRO measures, functional outcomes, satisfaction, adherence', searchTerms: ['patient-reported outcome', 'PRO', 'adherence', 'satisfaction', 'functional outcome'] },
  { id: 'cost-effectiveness', label: 'Health Economics & Value', description: 'Cost-effectiveness, budget impact, value-based care, resource utilization', searchTerms: ['cost-effectiveness', 'economic evaluation', 'budget impact', 'value'] },
]

const DEFAULT_DOMAINS: DomainTemplate[] = [
  { id: 'epidemiology', label: 'Epidemiology & Burden of Disease', description: 'Incidence, prevalence, risk factors, disease burden', searchTerms: ['epidemiology', 'incidence', 'prevalence', 'risk factor', 'burden'] },
  { id: 'diagnosis', label: 'Diagnosis & Assessment', description: 'Diagnostic criteria, assessment tools, staging, classification', searchTerms: ['diagnosis', 'assessment', 'diagnostic criteria', 'classification'] },
  { id: 'primary-intervention', label: 'Primary Intervention', description: 'Main treatment or intervention approach', searchTerms: ['treatment', 'intervention', 'therapy', 'management'] },
  { id: 'comparative-effectiveness', label: 'Comparative Effectiveness', description: 'Head-to-head comparisons of available interventions', searchTerms: ['comparative', 'versus', 'comparison', 'head-to-head'] },
  { id: 'safety-harms', label: 'Safety & Harms', description: 'Adverse events, contraindications, risk-benefit', searchTerms: ['safety', 'adverse', 'harm', 'risk', 'side effect'] },
  { id: 'special-populations', label: 'Special Populations', description: 'Subgroups requiring modified approaches', searchTerms: ['elderly', 'pediatric', 'pregnancy', 'comorbidity', 'special population'] },
  { id: 'prevention', label: 'Prevention & Risk Reduction', description: 'Primary and secondary prevention strategies', searchTerms: ['prevention', 'risk reduction', 'prophylaxis'] },
  { id: 'monitoring-followup', label: 'Monitoring & Follow-up', description: 'Surveillance, monitoring protocols, follow-up schedules', searchTerms: ['monitoring', 'follow-up', 'surveillance', 'long-term'] },
  { id: 'implementation', label: 'Implementation & Delivery', description: 'Care pathways, implementation strategies, barriers', searchTerms: ['implementation', 'care pathway', 'barrier', 'facilitator'] },
  { id: 'equity-access', label: 'Equity & Access', description: 'Health disparities, social determinants, access to care', searchTerms: ['equity', 'disparity', 'access', 'social determinant'] },
  { id: 'patient-preferences', label: 'Patient Preferences & SDM', description: 'Patient values, shared decision-making, informed consent', searchTerms: ['patient preference', 'shared decision', 'informed consent'] },
  { id: 'cost-effectiveness', label: 'Health Economics', description: 'Cost-effectiveness, budget impact, resource allocation', searchTerms: ['cost-effectiveness', 'economic evaluation', 'budget impact'] },
]

/* ═══════════════════════════════════════════════════════════════
   PubMed Search Helper
   ═══════════════════════════════════════════════════════════════ */

async function searchPubMed(query: string, maxResults: number = 8): Promise<{
  ids: string[]
  totalCount: number
}> {
  try {
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=${maxResults}&sort=relevance&term=${encodeURIComponent(query)}`
    const res = await fetch(url)
    const data = await res.json()
    return {
      ids: data.esearchresult?.idlist || [],
      totalCount: parseInt(data.esearchresult?.count || '0'),
    }
  } catch {
    return { ids: [], totalCount: 0 }
  }
}

async function fetchArticleSummaries(ids: string[]): Promise<any[]> {
  if (ids.length === 0) return []
  try {
    const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}`
    const res = await fetch(url)
    const data = await res.json()
    return ids.map(id => {
      const a = data.result?.[id]
      if (!a) return null
      return {
        pmid: id,
        title: a.title || '',
        authors: a.authors?.map((au: any) => au.name).join(', ') || '',
        journal: a.fulljournalname || a.source || '',
        year: parseInt(a.pubdate?.split(' ')[0] || '0'),
      }
    }).filter(Boolean)
  } catch {
    return []
  }
}

/* ═══════════════════════════════════════════════════════════════
   Title-Based PICO Extraction
   Extracts clinical questions from article titles by parsing
   patterns like "X versus Y for Z" or "X in patients with Z"
   ═══════════════════════════════════════════════════════════════ */

interface ParsedArticle {
  pmid: string
  title: string
  population?: string
  intervention?: string
  comparison?: string
  outcome?: string
}

function parseArticleTitle(article: { pmid: string; title: string }): ParsedArticle {
  const t = article.title
  const result: ParsedArticle = { pmid: article.pmid, title: t }

  // Extract comparison patterns: "X versus Y", "X vs Y", "X compared with Y"
  const vsMatch = t.match(/(.+?)\s+(?:versus|vs\.?|compared (?:with|to)|or)\s+(.+?)(?:\s+(?:for|in|among|on)\s+(.+?))?(?:\s*[:;.]\s*|$)/i)
  if (vsMatch) {
    result.intervention = vsMatch[1].trim().replace(/^(efficacy|safety|effectiveness|impact|effect|role)\s+of\s+/i, '')
    result.comparison = vsMatch[2].trim()
    if (vsMatch[3]) {
      result.population = vsMatch[3].trim()
    }
  }

  // Extract population: "in patients with X", "in adults with X", "in X patients"
  const popMatch = t.match(/(?:in|among|for)\s+((?:patients|adults|individuals|persons|people|women|men|children|populations?)\s+(?:with|who|aged|at).+?)(?:\s*[:;.]\s*|$)/i)
  if (popMatch && !result.population) {
    result.population = popMatch[1].trim()
  }

  // Extract outcomes: common outcome keywords
  const outcomePatterns = [
    /(?:effect on|impact on|outcomes? (?:of|for)|association with)\s+(.+?)(?:\s*[:;.]\s*|$)/i,
    /(?:mortality|survival|incidence|detection rate|sensitivity|specificity|adenoma detection|cancer detection|cost.?effectiveness)/i,
  ]
  for (const pat of outcomePatterns) {
    const m = t.match(pat)
    if (m) {
      result.outcome = m[1] ? m[1].trim() : m[0].trim()
      break
    }
  }

  return result
}

function generatePICOsFromArticles(
  domainId: string,
  domainLabel: string,
  articles: any[],
  mainTopic: string,
  country: string,
): ExtractedPICO[] {
  const picos: ExtractedPICO[] = []
  const seen = new Set<string>()

  // Parse each article title for PICO elements
  const parsed = articles.map(a => parseArticleTitle(a))

  // Group articles by similar intervention/topic
  const groups: Map<string, ParsedArticle[]> = new Map()
  for (const p of parsed) {
    // Create a rough grouping key from the first few meaningful words
    const key = (p.intervention || p.title.split(/\s+/).slice(0, 4).join(' ')).toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
    const shortKey = key.split(/\s+/).slice(0, 3).join(' ')
    if (!groups.has(shortKey)) groups.set(shortKey, [])
    groups.get(shortKey)!.push(p)
  }

  // Generate PICOs from groups
  let picoIdx = 0
  const groupEntries = Array.from(groups.entries())
  for (const [, groupArticles] of groupEntries) {
    if (picoIdx >= 5) break // max 5 PICOs per domain

    // Find the best article in the group (most complete PICO)
    const best = groupArticles.reduce((a, b) => {
      const scoreA = (a.population ? 1 : 0) + (a.intervention ? 1 : 0) + (a.comparison ? 1 : 0) + (a.outcome ? 1 : 0)
      const scoreB = (b.population ? 1 : 0) + (b.intervention ? 1 : 0) + (b.comparison ? 1 : 0) + (b.outcome ? 1 : 0)
      return scoreB > scoreA ? b : a
    })

    // Build a unique key to avoid duplicates
    const uniqueKey = `${best.intervention || ''}-${best.comparison || ''}-${best.outcome || ''}`.toLowerCase()
    if (seen.has(uniqueKey) && uniqueKey.length > 2) continue
    seen.add(uniqueKey)

    const pmids = groupArticles.map(a => a.pmid)
    picoIdx++

    picos.push({
      id: `${domainId}-pico-${picoIdx}`,
      topic: best.title.length > 120 ? best.title.substring(0, 117) + '...' : best.title,
      population: best.population || extractPopulation(best.title, mainTopic, country),
      intervention: best.intervention || extractMainConcept(best.title, domainLabel),
      comparison: best.comparison || 'Standard care or no intervention',
      outcome: best.outcome || extractOutcome(best.title, domainLabel),
      sourcePmids: pmids.slice(0, 3),
      sourceSnippet: `Based on ${pmids.length} article(s): PMID ${pmids.slice(0, 2).join(', ')}`,
    })
  }

  // If we got fewer than 2 PICOs from parsing, add knowledge-based defaults
  if (picos.length < 2) {
    const defaults = getDefaultPICOsForDomain(domainId, mainTopic, country)
    for (const d of defaults) {
      if (picos.length >= 4) break
      if (!picos.some(p => p.topic.toLowerCase().includes(d.topic.toLowerCase().split(' ')[0]))) {
        picos.push({ ...d, id: `${domainId}-pico-${picos.length + 1}` })
      }
    }
  }

  return picos
}

function extractPopulation(title: string, mainTopic: string, country: string): string {
  // Try to extract a meaningful population from the article title
  const popPatterns = [
    /(?:in|among|for)\s+((?:patients?|adults?|individuals?|persons?|people|women|men|children|populations?|subjects?)\s+(?:with|who|aged|at|undergoing|diagnosed|presenting).+?)(?:\s*[:;.]\s*|$)/i,
    /(?:in|among)\s+(\w+\s+(?:adults?|patients?|populations?))/i,
    /\b((?:Saudi|Arab|Gulf|GCC|[A-Z]\w+)\s+(?:patients?|population|adults?))/i,
  ]
  for (const pat of popPatterns) {
    const m = title.match(pat)
    if (m) return m[1].trim().replace(/\.$/, '')
  }
  // Build a concise fallback from the topic
  const condition = mainTopic.replace(/\b(guideline|guidelines|clinical practice|in)\b/gi, '').trim()
  return `Adults eligible for ${condition} in ${country}`
}

function extractMainConcept(title: string, domainLabel: string): string {
  // Try to extract the main concept from the title
  const prefixPatterns = [
    /^(?:The\s+)?(?:role|efficacy|safety|effectiveness|impact|effect|use)\s+of\s+(.+?)(?:\s+(?:in|for|on|among)\s+|$)/i,
    /^(.+?)\s+(?:screening|surveillance|detection|prevention)/i,
  ]
  for (const pat of prefixPatterns) {
    const m = title.match(pat)
    if (m) return m[1].trim()
  }
  // Concise fallback from domain label
  const cleaned = domainLabel.replace(/\b(and|the|in|for|of|with)\b/gi, '').trim()
  return cleaned.length > 3 ? cleaned : domainLabel
}

function extractOutcome(title: string, domainLabel: string): string {
  const outcomeKeywords = ['mortality', 'survival', 'detection rate', 'incidence', 'sensitivity', 'specificity',
    'adenoma detection', 'cancer detection', 'quality of life', 'cost-effectiveness', 'complications',
    'adherence', 'uptake', 'participation rate', 'positive predictive value', 'reduction']
  for (const kw of outcomeKeywords) {
    if (title.toLowerCase().includes(kw)) return kw.charAt(0).toUpperCase() + kw.slice(1)
  }
  return 'Primary clinical outcomes'
}

/* ═══════════════════════════════════════════════════════════════
   Default/Fallback PICOs per Domain (knowledge-based)
   Used when PubMed parsing yields too few results
   ═══════════════════════════════════════════════════════════════ */

function getDefaultPICOsForDomain(domainId: string, topic: string, country: string): ExtractedPICO[] {
  const condition = topic.replace(/\b(guideline|guidelines|screening|clinical practice|in|for)\b/gi, '').trim()

  const defaults: Record<string, ExtractedPICO[]> = {
    'screening-age-initiation': [
      { id: '', topic: `Initiating ${condition} screening at age 45 vs 50`, population: `Average-risk adults aged 45-49 in ${country}`, intervention: 'Screening initiation at age 45', comparison: 'Screening initiation at age 50', outcome: 'Cancer detection rate, stage distribution, cancer-specific mortality, cost per case detected', sourcePmids: [], sourceSnippet: 'Knowledge-based suggestion' },
      { id: '', topic: `Risk-stratified screening initiation for ${condition}`, population: `Adults aged 40-50 with varying risk profiles`, intervention: 'Risk-stratified screening (earlier for higher risk)', comparison: 'Universal age-based screening initiation', outcome: 'Cancer detection yield, number needed to screen, overdiagnosis rate', sourcePmids: [], sourceSnippet: 'Knowledge-based suggestion' },
    ],
    'screening-cessation': [
      { id: '', topic: `Continuing ${condition} screening beyond age 75`, population: `Adults aged 75+ with life expectancy > 10 years`, intervention: 'Continued screening beyond age 75', comparison: 'Cessation of screening at age 75', outcome: 'Cancer-specific mortality, overdiagnosis, quality-adjusted life years, complication rate', sourcePmids: [], sourceSnippet: 'Knowledge-based suggestion' },
    ],
    'average-risk-modalities': [
      { id: '', topic: `FIT vs colonoscopy for primary ${condition} screening`, population: `Average-risk adults aged 45-75`, intervention: 'Annual/biennial FIT', comparison: 'Colonoscopy every 10 years', outcome: 'Cancer detection rate, advanced adenoma detection, participation rate, cost per cancer detected', sourcePmids: [], sourceSnippet: 'Knowledge-based suggestion' },
      { id: '', topic: `FIT vs gFOBT for ${condition} screening`, population: `Average-risk screening population`, intervention: 'Fecal immunochemical test (FIT)', comparison: 'Guaiac-based fecal occult blood test (gFOBT)', outcome: 'Sensitivity, specificity, positive predictive value, participation rate', sourcePmids: [], sourceSnippet: 'Knowledge-based suggestion' },
    ],
    'emerging-technologies': [
      { id: '', topic: `Multi-target stool DNA test for ${condition}`, population: `Average-risk adults eligible for screening`, intervention: 'Multi-target stool DNA test (e.g., Cologuard)', comparison: 'FIT alone', outcome: 'Sensitivity for CRC and advanced adenomas, specificity, cost per case detected', sourcePmids: [], sourceSnippet: 'Knowledge-based suggestion' },
      { id: '', topic: `AI-assisted colonoscopy for adenoma detection`, population: `Patients undergoing screening colonoscopy`, intervention: 'AI-assisted real-time polyp detection', comparison: 'Standard colonoscopy without AI', outcome: 'Adenoma detection rate, polyp miss rate, withdrawal time', sourcePmids: [], sourceSnippet: 'Knowledge-based suggestion' },
    ],
    'screening-intervals': [
      { id: '', topic: `Optimal FIT screening interval`, population: `Average-risk adults with negative baseline FIT`, intervention: 'Annual FIT', comparison: 'Biennial FIT', outcome: 'Interval cancer rate, cancer-specific mortality, cumulative sensitivity', sourcePmids: [], sourceSnippet: 'Knowledge-based suggestion' },
    ],
    'risk-stratification': [
      { id: '', topic: `Risk scoring models for personalized screening`, population: `Adults eligible for CRC screening`, intervention: 'Risk-stratified screening using validated models', comparison: 'Uniform age-based screening', outcome: 'Screening yield, cancer detection per screen, resource utilization', sourcePmids: [], sourceSnippet: 'Knowledge-based suggestion' },
    ],
    'hereditary-syndromes': [
      { id: '', topic: `Surveillance in Lynch syndrome carriers`, population: `Individuals with confirmed Lynch syndrome (MLH1, MSH2, MSH6, PMS2)`, intervention: 'Annual colonoscopy from age 20-25', comparison: 'Standard average-risk screening', outcome: 'CRC incidence, survival, stage at diagnosis, interval cancers', sourcePmids: [], sourceSnippet: 'Knowledge-based suggestion' },
    ],
    'family-history': [
      { id: '', topic: `Modified screening for first-degree relative history`, population: `Adults with first-degree relative diagnosed with CRC before age 60`, intervention: 'Colonoscopy starting 10 years before earliest diagnosis or age 40', comparison: 'Standard average-risk screening starting at age 45-50', outcome: 'CRC detection rate, advanced adenoma detection, cost-effectiveness', sourcePmids: [], sourceSnippet: 'Knowledge-based suggestion' },
    ],
    'inflammatory-bowel': [
      { id: '', topic: `CRC surveillance in ulcerative colitis`, population: `Patients with long-standing UC (>8 years) with colonic involvement`, intervention: 'Chromoendoscopy surveillance every 1-3 years', comparison: 'Standard white-light colonoscopy surveillance', outcome: 'Dysplasia detection rate, cancer prevention, patient acceptability', sourcePmids: [], sourceSnippet: 'Knowledge-based suggestion' },
    ],
    'adenoma-surveillance': [
      { id: '', topic: `Post-polypectomy surveillance intervals`, population: `Patients with 1-2 tubular adenomas <10mm removed at index colonoscopy`, intervention: 'Surveillance colonoscopy at 7-10 years', comparison: 'Surveillance colonoscopy at 5 years', outcome: 'Advanced neoplasia detection, interval cancer rate, resource use', sourcePmids: [], sourceSnippet: 'Knowledge-based suggestion' },
    ],
    'quality-indicators': [
      { id: '', topic: `Minimum adenoma detection rate standards`, population: `Endoscopists performing screening colonoscopy`, intervention: 'Mandatory ADR threshold ≥25% with feedback', comparison: 'No minimum ADR requirement', outcome: 'Interval cancer rate, post-colonoscopy CRC, quality improvement', sourcePmids: [], sourceSnippet: 'Knowledge-based suggestion' },
    ],
    'bowel-preparation': [
      { id: '', topic: `Split-dose vs day-before bowel preparation`, population: `Patients undergoing screening colonoscopy`, intervention: 'Split-dose preparation (evening + morning)', comparison: 'Full day-before preparation', outcome: 'Adequate preparation rate (Boston Bowel Preparation Scale), adenoma detection rate, patient compliance', sourcePmids: [], sourceSnippet: 'Knowledge-based suggestion' },
    ],
    'sedation-safety': [
      { id: '', topic: `Sedation options for screening colonoscopy`, population: `Adults undergoing screening colonoscopy`, intervention: 'Propofol-based sedation', comparison: 'Standard midazolam/fentanyl conscious sedation', outcome: 'Patient satisfaction, procedure completion rate, recovery time, adverse events', sourcePmids: [], sourceSnippet: 'Knowledge-based suggestion' },
    ],
    'equity-access': [
      { id: '', topic: `Barriers to CRC screening uptake in ${country}`, population: `Underserved populations (rural, low-income, uninsured)`, intervention: 'Targeted outreach, patient navigation, mailed FIT programs', comparison: 'Standard clinic-based screening invitation', outcome: 'Screening participation rate, stage at diagnosis, disparities reduction', sourcePmids: [], sourceSnippet: 'Knowledge-based suggestion' },
    ],
    'organized-programs': [
      { id: '', topic: `Organized vs opportunistic CRC screening in ${country}`, population: `Target screening population in ${country}`, intervention: 'Organized population-based screening program with call-recall', comparison: 'Opportunistic screening (physician-initiated)', outcome: 'Population coverage, participation rate, cancer stage distribution, mortality reduction', sourcePmids: [], sourceSnippet: 'Knowledge-based suggestion' },
    ],
    'patient-preferences': [
      { id: '', topic: `Patient preferences for CRC screening test modality`, population: `Adults eligible for CRC screening`, intervention: 'Shared decision-making with test choice (FIT vs colonoscopy)', comparison: 'Physician-directed single test recommendation', outcome: 'Screening uptake, informed choice, decisional conflict, satisfaction', sourcePmids: [], sourceSnippet: 'Knowledge-based suggestion' },
    ],
    'cost-effectiveness': [
      { id: '', topic: `Cost-effectiveness of CRC screening strategies in ${country}`, population: `Target screening population in ${country}`, intervention: 'Organized FIT-based screening program', comparison: 'No screening / opportunistic screening', outcome: 'ICER (cost per QALY gained), budget impact, number needed to screen to prevent one CRC death', sourcePmids: [], sourceSnippet: 'Knowledge-based suggestion' },
    ],
    'workforce-training': [
      { id: '', topic: `Endoscopy training and credentialing standards`, population: `Gastroenterology trainees and practicing endoscopists`, intervention: 'Competency-based training with minimum procedure volumes', comparison: 'Time-based training without volume thresholds', outcome: 'Procedure competency, ADR, complication rates, trainee confidence', sourcePmids: [], sourceSnippet: 'Knowledge-based suggestion' },
    ],
  }

  return defaults[domainId] || [
    { id: '', topic: `${domainId.replace(/-/g, ' ')} for ${condition}`, population: `Target population in ${country}`, intervention: 'Recommended approach', comparison: 'Current standard or no intervention', outcome: 'Primary clinical outcomes', sourcePmids: [], sourceSnippet: 'Knowledge-based suggestion' },
  ]
}

/* ═══════════════════════════════════════════════════════════════
   Topic Classifier
   ═══════════════════════════════════════════════════════════════ */

function classifyTopic(title: string): { type: string; domains: DomainTemplate[] } {
  const lower = title.toLowerCase()
  if (lower.includes('screening') || lower.includes('detection') || lower.includes('early diagnosis') || lower.includes('prevention')) {
    return { type: 'screening', domains: SCREENING_DOMAINS }
  }
  if (lower.includes('treatment') || lower.includes('therapy') || lower.includes('management') || lower.includes('therapeutic')) {
    return { type: 'treatment', domains: TREATMENT_DOMAINS }
  }
  return { type: 'general', domains: DEFAULT_DOMAINS }
}

/* ═══════════════════════════════════════════════════════════════
   Main API Handler
   ═══════════════════════════════════════════════════════════════ */

export async function POST(req: NextRequest) {
  try {
    const body: ScopeRequest = await req.json()
    const { title, country, countryAffiliation } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Step 1: Broad PubMed search for existing guidelines
    const guidelineQuery = `(${title}[tiab]) AND (guideline[pt] OR practice guideline[pt] OR systematic review[pt] OR consensus[tiab] OR recommendation[tiab])`
    const { ids: guidelineIds } = await searchPubMed(guidelineQuery, 10)
    const existingGuidelines = await fetchArticleSummaries(guidelineIds)

    // Step 2: Country-specific literature count
    let countrySpecificCount = 0
    if (countryAffiliation) {
      const { totalCount } = await searchPubMed(`(${title}[tiab]) AND ${countryAffiliation}`, 0)
      countrySpecificCount = totalCount
    }

    // Step 3: Classify topic and get domain templates
    const { type: topicType, domains: domainTemplates } = classifyTopic(title)

    // Step 4: For EACH domain, do a focused PubMed search and extract PICOs
    // Process domains in parallel batches to respect rate limits
    const batchSize = 4
    const processedDomains: ProposedDomain[] = []

    for (let i = 0; i < domainTemplates.length; i += batchSize) {
      const batch = domainTemplates.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(async (domain) => {
          // Build domain-specific search query
          const domainTerms = domain.searchTerms.slice(0, 3).map(t => `"${t}"`).join(' OR ')
          const domainQuery = `(${title}[tiab]) AND (${domainTerms})`

          const { ids, totalCount } = await searchPubMed(domainQuery, 8)
          const articles = await fetchArticleSummaries(ids)

          // Extract PICOs from article titles
          const picos = generatePICOsFromArticles(
            domain.id, domain.label, articles, title, country
          )

          return {
            id: domain.id,
            label: domain.label,
            description: domain.description,
            searchQuery: domainQuery,
            articlesFound: totalCount,
            picos,
          }
        })
      )
      processedDomains.push(...batchResults)

      // Small delay between batches to respect NCBI rate limits
      if (i + batchSize < domainTemplates.length) {
        await new Promise(resolve => setTimeout(resolve, 350))
      }
    }

    // Step 5: Sort domains by articles found (most literature first), then filter empty
    processedDomains.sort((a, b) => b.articlesFound - a.articlesFound)

    const totalPicos = processedDomains.reduce((sum, d) => sum + d.picos.length, 0)

    return NextResponse.json({
      title,
      country,
      topicType,
      existingGuidelines,
      countrySpecificCount,
      domains: processedDomains,
      totalPicos,
      totalDomains: processedDomains.length,
      message: `Scanned PubMed across ${processedDomains.length} clinical domains. Found ${existingGuidelines.length} existing guidelines and generated ${totalPicos} literature-grounded PICO questions.`,
    })
  } catch (error) {
    console.error('Scope agent error:', error)
    return NextResponse.json({
      error: 'Scope analysis failed',
      domains: [],
    }, { status: 500 })
  }
}
