'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

export interface PICOQuestion {
  topic: string
  population: string
  intervention: string
  comparison: string
  outcome: string
}

export type StepStatus = 'locked' | 'ready' | 'in-progress' | 'approved' | 'skipped'

export interface WorkflowStep {
  id: string
  label: string
  shortLabel: string
  path: string
  status: StepStatus
  description?: string
  agentType?: string
}

export type ModuleId = 'evidence' | 'grade' | 'synthesis' | 'economics' | 'hta' | 'frameworks' | 'report'

export interface LiteratureResult {
  pmid: string
  title: string
  authors: string
  journal: string
  year: number
  studyType: string
  relevance: number
}

export interface PageSuggestions {
  [key: string]: any
}

/* ═══════════════════════════════════════════════════════════════
   Workflow Steps Definition
   ═══════════════════════════════════════════════════════════════ */

export const ALL_MODULES: WorkflowStep[] = [
  { id: 'evidence', label: 'Evidence Search', shortLabel: 'Evidence', path: '/evidence', status: 'locked', description: 'PubMed systematic search with PICO query building, filter management, and citation export', agentType: 'evidence-search' },
  { id: 'grade', label: 'GRADE Assessment', shortLabel: 'GRADE', path: '/grade', status: 'locked', description: 'Evidence certainty rating across 5 domains with Evidence-to-Recommendation framework', agentType: 'grade-assessment' },
  { id: 'synthesis', label: 'SR & Meta-Analysis', shortLabel: 'SR/MA', path: '/systematic-review', status: 'locked', description: 'PRISMA 2020 flow, forest plot, heterogeneity analysis, and publication bias assessment', agentType: 'sr-meta-analysis' },
  { id: 'economics', label: 'Cost-Effectiveness', shortLabel: 'CEA', path: '/cea', status: 'locked', description: 'Decision-analytic modeling with ICER calculation, Markov trace, PSA, and CEAC', agentType: 'cost-effectiveness' },
  { id: 'hta', label: 'HTA Appraisal', shortLabel: 'HTA', path: '/hta', status: 'locked', description: 'EUnetHTA Core Model with 9-domain structured deliberation and recommendation', agentType: 'hta-appraisal' },
  { id: 'frameworks', label: 'Framework Compliance', shortLabel: 'Frameworks', path: '/frameworks', status: 'locked', description: 'AGREE II quality scoring, NICE process checklist, and GIN-McMaster tracking', agentType: 'framework-compliance' },
  { id: 'report', label: 'Final Report', shortLabel: 'Report', path: '/reports', status: 'locked', description: 'PRISMA-compliant guideline report generation with all evidence summaries', agentType: 'report-generation' },
]

const DEFAULT_STEPS: WorkflowStep[] = [
  { id: 'question', label: 'Define Question', shortLabel: 'PICO', path: '#', status: 'ready' },
  ...ALL_MODULES,
]

/* ═══════════════════════════════════════════════════════════════
   Literature Result Generator (demo mode)
   ═══════════════════════════════════════════════════════════════ */

function generateLiteratureResults(pico: PICOQuestion): LiteratureResult[] {
  const { population: P, intervention: I, comparison: C, outcome: O } = pico
  const surnames = ['Zhang', 'Smith', 'Al-Rashidi', 'Patel', 'Kim', 'Williams', 'Garcia', 'Ahmed', 'Chen', 'Thompson']
  const journals = ['The Lancet', 'NEJM', 'BMJ', 'JAMA', 'Ann Intern Med', 'Cochrane Database Syst Rev', 'PLoS Med', 'BMC Med']
  const studyTypes = ['Systematic Review', 'RCT', 'RCT', 'Meta-Analysis', 'Cohort Study', 'RCT', 'Systematic Review', 'RCT', 'RCT', 'Pragmatic Trial']

  const templates = [
    `Efficacy and safety of ${I} versus ${C} in ${P}: a systematic review and meta-analysis`,
    `${I} compared with ${C} for ${O} in ${P}: a randomized controlled trial`,
    `Long-term ${O} with ${I} in ${P}: results from the LANDMARK trial`,
    `Comparative effectiveness of ${I} and ${C} on ${O}: a multi-center RCT`,
    `${I} for ${P}: a Cochrane systematic review`,
    `Real-world evidence on ${I} versus ${C} in ${P}: a prospective cohort study`,
    `Network meta-analysis of treatments for ${P}: focus on ${O}`,
    `${I} in ${P} — safety profile and ${O}: a phase III randomized trial`,
    `Cost-effectiveness of ${I} compared to ${C} in ${P}: a model-based analysis`,
    `Patient-reported ${O} with ${I} versus ${C}: secondary analysis of the PROGRESS trial`,
  ]

  return templates.map((title, i) => ({
    pmid: String(38900000 + Math.floor(Math.random() * 99999)),
    title,
    authors: `${surnames[i]} ${String.fromCharCode(65 + i)}, ${surnames[(i + 3) % 10]} ${String.fromCharCode(66 + i)}, et al.`,
    journal: journals[i % journals.length],
    year: 2024 - Math.floor(i / 3),
    studyType: studyTypes[i],
    relevance: Math.round((0.98 - i * 0.05) * 100) / 100,
  }))
}

/* ═══════════════════════════════════════════════════════════════
   Page Suggestion Generators
   ═══════════════════════════════════════════════════════════════ */

function generateEvidenceSuggestions(pico: PICOQuestion, litResults: LiteratureResult[]): PageSuggestions {
  const { population: P, intervention: I, comparison: C, outcome: O } = pico
  return {
    searchQuery: `("${P}") AND ("${I}" OR "${C}") AND ("${O}")`,
    databases: ['PubMed/MEDLINE', 'Cochrane CENTRAL', 'EMBASE', 'Web of Science'],
    dateRange: 'Last 10 years',
    studyTypes: ['Systematic Reviews', 'Randomized Controlled Trials', 'Meta-Analyses'],
    languageFilter: 'English',
    inclusionCriteria: [
      `Adults diagnosed with ${P}`,
      `Studies comparing ${I} versus ${C}`,
      `Reporting ${O} as primary or secondary outcome`,
      'Published in peer-reviewed journals',
      'English language, full text available',
    ],
    exclusionCriteria: [
      'Case reports and case series (N < 10)',
      'Animal or in-vitro studies',
      'Conference abstracts without full text',
      'Studies with high risk of bias across all domains',
      'Non-comparative observational studies',
    ],
    articlesFound: litResults.length,
    _meta: { confidence: 0.92, rationale: `Generated from PICO: ${P} / ${I} / ${C} / ${O}` },
  }
}

function generateGradeSuggestions(pico: PICOQuestion, litResults: LiteratureResult[]): PageSuggestions {
  const rctCount = litResults.filter(r => r.studyType === 'RCT').length
  const srCount = litResults.filter(r => r.studyType.includes('Systematic')).length
  return {
    outcomeLabel: pico.outcome,
    studyDesign: rctCount >= 3 ? 'Randomized controlled trials' : 'Mixed (RCTs + observational)',
    numberOfStudies: litResults.length,
    totalParticipants: litResults.length * 320 + Math.floor(Math.random() * 500),
    riskOfBias: rctCount >= 4 ? 'not_serious' : 'serious',
    riskOfBiasRationale: rctCount >= 4
      ? `${rctCount} well-conducted RCTs with adequate allocation concealment and blinding`
      : `Some concerns: ${10 - rctCount} studies had unclear allocation concealment`,
    inconsistency: 'not_serious',
    inconsistencyRationale: 'I-squared = 32%, within acceptable range; consistent direction of effect',
    indirectness: 'not_serious',
    indirectnessRationale: `Studies directly address ${pico.population} receiving ${pico.intervention} vs ${pico.comparison}`,
    imprecision: 'serious',
    imprecisionRationale: `Confidence interval crosses the minimal clinically important difference threshold for ${pico.outcome}`,
    publicationBias: 'undetected',
    publicationBiasRationale: `Funnel plot symmetry adequate (Egger p = 0.34); ${srCount} systematic reviews identified`,
    overallCertainty: rctCount >= 4 ? 'moderate' : 'low',
    upgradeLargeEffect: false,
    upgradeDoseResponse: false,
    upgradeConfounders: false,
    etrDesirableEffects: 'moderate',
    etrUndesirableEffects: 'small',
    etrCertainty: rctCount >= 4 ? 'moderate' : 'low',
    etrBalance: 'probably_favors_intervention',
    etrResources: 'moderate_costs',
    etrEquity: 'probably_increased',
    etrAcceptability: 'probably_yes',
    etrFeasibility: 'yes',
    recommendationDirection: 'for',
    recommendationStrength: 'conditional',
    recommendationText: `We suggest ${pico.intervention} over ${pico.comparison} for ${pico.population} to improve ${pico.outcome} (conditional recommendation, ${rctCount >= 4 ? 'moderate' : 'low'}-certainty evidence).`,
    _meta: { confidence: 0.85, rationale: `Based on ${litResults.length} studies (${rctCount} RCTs, ${srCount} SRs)` },
  }
}

function generateSRMASuggestions(pico: PICOQuestion, litResults: LiteratureResult[]): PageSuggestions {
  const rcts = litResults.filter(r => r.studyType === 'RCT')
  return {
    totalIdentified: 847 + Math.floor(Math.random() * 200),
    duplicatesRemoved: 189 + Math.floor(Math.random() * 50),
    titleAbstractScreened: 658,
    excludedScreening: 571,
    fullTextAssessed: 87,
    excludedFullText: 87 - litResults.length,
    includedStudies: litResults.length,
    includedInMA: rcts.length,
    studies: rcts.slice(0, 5).map((r, i) => ({
      id: `study-${i + 1}`,
      author: r.authors.split(',')[0],
      year: r.year,
      design: 'RCT',
      n: [450, 380, 612, 285, 520][i] || 400,
      effectSize: [0.75, 0.68, 0.82, 0.71, 0.79][i] || 0.75,
      ciLower: [0.62, 0.54, 0.70, 0.55, 0.65][i] || 0.60,
      ciUpper: [0.91, 0.86, 0.96, 0.92, 0.96][i] || 0.95,
      weight: [28, 22, 18, 16, 16][i] || 20,
    })),
    modelType: 'random',
    pooledEffect: 0.75,
    pooledCILower: 0.67,
    pooledCIUpper: 0.84,
    heterogeneity: { i2: 35, tau2: 0.04, q: 18.7, df: rcts.length - 1, pValue: 0.04 },
    eggerIntercept: -0.82,
    eggerPValue: 0.34,
    _meta: { confidence: 0.88, rationale: `Meta-analysis of ${rcts.length} RCTs using DerSimonian-Laird random-effects model` },
  }
}

function generateCEASuggestions(pico: PICOQuestion): PageSuggestions {
  return {
    perspective: 'healthcare',
    currency: 'SAR',
    timeHorizon: 5,
    discountRate: 3.5,
    cycleLength: 1,
    interventionLabel: pico.intervention,
    comparatorLabel: pico.comparison || 'Standard of care',
    interventionCost: 45000,
    interventionQaly: 3.82,
    comparatorCost: 28000,
    comparatorQaly: 3.21,
    incrementalCost: 17000,
    incrementalQaly: 0.61,
    icer: 27869,
    wtpThreshold: 150000,
    costEffective: true,
    markovStates: [
      { name: 'Well-controlled', cost: 8500, utility: 0.85 },
      { name: 'Moderate disease', cost: 22000, utility: 0.65 },
      { name: 'Severe / complications', cost: 65000, utility: 0.40 },
      { name: 'Death', cost: 0, utility: 0 },
    ],
    psaIterations: 10000,
    ceacThresholds: [50000, 100000, 150000, 200000],
    ceacProbabilities: [0.42, 0.78, 0.91, 0.96],
    _meta: { confidence: 0.80, rationale: `Markov model with ${pico.intervention} vs ${pico.comparison} over 5-year horizon` },
  }
}

function generateHTASuggestions(pico: PICOQuestion): PageSuggestions {
  return {
    technologyName: pico.intervention,
    targetPopulation: pico.population,
    comparator: pico.comparison || 'Current standard of care',
    domains: {
      technology: { judgment: 'favorable', evidence: `${pico.intervention} is a well-characterized intervention with established mechanism of action.`, progress: 80 },
      healthProblem: { judgment: 'favorable', evidence: `${pico.population} represents a significant health burden in Saudi Arabia and globally.`, progress: 85 },
      clinicalEffectiveness: { judgment: 'favorable', evidence: `Meta-analysis shows pooled OR 0.75 (95% CI: 0.67-0.84) favoring ${pico.intervention} for ${pico.outcome}.`, progress: 75 },
      safety: { judgment: 'uncertain', evidence: `Generally acceptable safety profile; some concerns regarding long-term effects require monitoring.`, progress: 60 },
      costEconomics: { judgment: 'favorable', evidence: `ICER of 27,869 SAR/QALY is well below the willingness-to-pay threshold of 150,000 SAR/QALY.`, progress: 70 },
      organizational: { judgment: 'uncertain', evidence: `Implementation requires workforce training and protocol updates across healthcare facilities.`, progress: 50 },
      ethical: { judgment: 'favorable', evidence: `No significant ethical concerns identified; promotes equitable access to evidence-based treatment.`, progress: 65 },
      social: { judgment: 'favorable', evidence: `Patient preference studies indicate high acceptability among ${pico.population}.`, progress: 55 },
      legal: { judgment: 'favorable', evidence: `Regulatory approval obtained; aligns with national formulary inclusion criteria.`, progress: 60 },
    },
    overallRecommendation: 'recommended_conditions',
    conditions: [
      'Establish a post-market surveillance program for long-term safety monitoring',
      'Develop standardized treatment protocols for healthcare providers',
      'Implement patient registry for outcomes tracking',
      'Review pricing agreement after 2 years based on real-world data',
    ],
    _meta: { confidence: 0.82, rationale: `EUnetHTA Core Model assessment for ${pico.intervention} in ${pico.population}` },
  }
}

function generateFrameworksSuggestions(pico: PICOQuestion): PageSuggestions {
  return {
    agreeII: {
      scopeAndPurpose: { item1: 6, item2: 6, item3: 5 },
      stakeholderInvolvement: { item4: 5, item5: 5, item6: 4 },
      rigourOfDevelopment: { item7: 6, item8: 6, item9: 5, item10: 5, item11: 5, item12: 5, item13: 6, item14: 5 },
      clarityOfPresentation: { item15: 6, item16: 6, item17: 5 },
      applicability: { item18: 4, item19: 4, item20: 5, item21: 4 },
      editorialIndependence: { item22: 6, item23: 6 },
    },
    overallAssessment: 5,
    recommended: 'yes_with_modifications',
    _meta: { confidence: 0.78, rationale: `AGREE II assessment for guideline on ${pico.intervention} in ${pico.population}` },
  }
}

function generateReportSuggestions(pico: PICOQuestion, litResults: LiteratureResult[]): PageSuggestions {
  const rctCount = litResults.filter(r => r.studyType === 'RCT').length
  return {
    reportTypes: ['Full Guideline Document', 'Executive Summary', 'GRADE Evidence Profile'],
    prismaCompliance: `${Math.min(litResults.length * 3 + 12, 27)} of 27 PRISMA items addressed`,
    keyFindings: `Based on ${litResults.length} studies (${rctCount} RCTs), ${pico.intervention} shows favorable outcomes for ${pico.outcome} in ${pico.population}. Conditional recommendation with moderate certainty evidence.`,
    _meta: { confidence: 0.82, rationale: `Report generation from ${litResults.length} articles for ${pico.topic || pico.intervention}` },
  }
}

function generateAllSuggestions(pico: PICOQuestion, litResults: LiteratureResult[]): Record<string, PageSuggestions> {
  return {
    evidence: generateEvidenceSuggestions(pico, litResults),
    grade: generateGradeSuggestions(pico, litResults),
    synthesis: generateSRMASuggestions(pico, litResults),
    economics: generateCEASuggestions(pico),
    hta: generateHTASuggestions(pico),
    frameworks: generateFrameworksSuggestions(pico),
    report: generateReportSuggestions(pico, litResults),
  }
}

/* ═══════════════════════════════════════════════════════════════
   React Context
   ═══════════════════════════════════════════════════════════════ */

interface AIWorkflowContextType {
  isActive: boolean
  isGenerating: boolean
  pico: PICOQuestion | null
  steps: WorkflowStep[]
  currentStepIndex: number
  literatureResults: LiteratureResult[]
  pageSuggestions: Record<string, PageSuggestions>
  appliedPages: Set<string>
  selectedModules: Set<string>

  startWorkflow: (pico: PICOQuestion, modules?: string[]) => void
  stopWorkflow: () => void
  getPageSuggestions: (pageId: string) => PageSuggestions | null
  applyPageSuggestions: (pageId: string) => void
  markPageApproved: (pageId: string) => void
  skipPage: (pageId: string) => void
  setCurrentStep: (index: number) => void
  getFirstModulePath: () => string
}

const AIWorkflowContext = createContext<AIWorkflowContextType | null>(null)

/* ═══════════════════════════════════════════════════════════════
   Provider Component
   ═══════════════════════════════════════════════════════════════ */

export function AIWorkflowProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [pico, setPico] = useState<PICOQuestion | null>(null)
  const [steps, setSteps] = useState<WorkflowStep[]>(DEFAULT_STEPS.map(s => ({ ...s })))
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [literatureResults, setLiteratureResults] = useState<LiteratureResult[]>([])
  const [pageSuggestions, setPageSuggestions] = useState<Record<string, PageSuggestions>>({})
  const [appliedPages, setAppliedPages] = useState<Set<string>>(new Set())
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set())

  const startWorkflow = useCallback((newPico: PICOQuestion, modules?: string[]) => {
    const moduleSet = new Set(modules || ALL_MODULES.map(m => m.id))
    setSelectedModules(moduleSet)
    setPico(newPico)
    setIsGenerating(true)
    setIsActive(true)
    setAppliedPages(new Set())

    // Build steps from selected modules only
    const activeSteps: WorkflowStep[] = [
      { id: 'question', label: 'Define Question', shortLabel: 'PICO', path: '#', status: 'approved' },
      ...ALL_MODULES.filter(m => moduleSet.has(m.id)).map(m => ({ ...m, status: 'locked' as StepStatus })),
    ]
    setSteps(activeSteps)
    setCurrentStepIndex(1)

    // Real PubMed search with fallback to mock data
    fetch('/api/ai-literature-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        population: newPico.population,
        intervention: newPico.intervention,
        comparison: newPico.comparison,
        outcome: newPico.outcome,
      }),
    })
      .then(res => res.json())
      .then(data => {
        let results: LiteratureResult[]
        if (data.articles?.length > 0 && !data.fallback) {
          // Use real PubMed results
          results = data.articles.map((a: any) => ({
            pmid: a.pmid,
            title: a.title,
            authors: a.authors,
            journal: a.journal,
            year: a.year,
            studyType: a.studyType,
            relevance: 0.9,
          }))
        } else {
          // Fallback to generated mock data
          results = generateLiteratureResults(newPico)
        }
        setLiteratureResults(results)
        const suggestions = generateAllSuggestions(newPico, results)
        setPageSuggestions(suggestions)
        setIsGenerating(false)

        // Unlock all selected steps
        setSteps(prev => prev.map((s, i) =>
          i === 0 ? { ...s, status: 'approved' as StepStatus }
          : { ...s, status: 'ready' as StepStatus }
        ))
      })
      .catch(() => {
        // Fallback on network error
        const results = generateLiteratureResults(newPico)
        setLiteratureResults(results)
        const suggestions = generateAllSuggestions(newPico, results)
        setPageSuggestions(suggestions)
        setIsGenerating(false)
        setSteps(prev => prev.map((s, i) =>
          i === 0 ? { ...s, status: 'approved' as StepStatus }
          : { ...s, status: 'ready' as StepStatus }
        ))
      })
  }, [])

  const stopWorkflow = useCallback(() => {
    setIsActive(false)
    setIsGenerating(false)
    setPico(null)
    setSteps(DEFAULT_STEPS.map(s => ({ ...s })))
    setCurrentStepIndex(0)
    setLiteratureResults([])
    setPageSuggestions({})
    setAppliedPages(new Set())
  }, [])

  const getPageSuggestions = useCallback((pageId: string): PageSuggestions | null => {
    return pageSuggestions[pageId] || null
  }, [pageSuggestions])

  const applyPageSuggestions = useCallback((pageId: string) => {
    setAppliedPages(prev => new Set(prev).add(pageId))
  }, [])

  const markPageApproved = useCallback((pageId: string) => {
    setSteps(prev => prev.map(s =>
      s.id === pageId ? { ...s, status: 'approved' as StepStatus } : s
    ))
    setAppliedPages(prev => new Set(prev).add(pageId))

    // Advance to next non-approved step
    setSteps(prev => {
      const idx = prev.findIndex(s => s.id === pageId)
      if (idx >= 0 && idx < prev.length - 1) {
        setCurrentStepIndex(idx + 1)
      }
      return prev
    })
  }, [])

  const skipPage = useCallback((pageId: string) => {
    setSteps(prev => prev.map(s =>
      s.id === pageId ? { ...s, status: 'skipped' as StepStatus } : s
    ))
  }, [])

  const getFirstModulePath = useCallback((): string => {
    const firstActive = steps.find(s => s.id !== 'question' && s.status !== 'skipped')
    return firstActive?.path || '/evidence'
  }, [steps])

  const value: AIWorkflowContextType = {
    isActive, isGenerating, pico, steps, currentStepIndex,
    literatureResults, pageSuggestions, appliedPages, selectedModules,
    startWorkflow, stopWorkflow, getPageSuggestions,
    applyPageSuggestions, markPageApproved, skipPage,
    setCurrentStep: setCurrentStepIndex, getFirstModulePath,
  }

  return (
    <AIWorkflowContext.Provider value={value}>
      {children}
    </AIWorkflowContext.Provider>
  )
}

/* ═══════════════════════════════════════════════════════════════
   Hook
   ═══════════════════════════════════════════════════════════════ */

export function useAIWorkflow() {
  const ctx = useContext(AIWorkflowContext)
  if (!ctx) throw new Error('useAIWorkflow must be used within AIWorkflowProvider')
  return ctx
}
