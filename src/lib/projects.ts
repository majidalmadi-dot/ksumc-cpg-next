import { supabase, isSupabaseConfigured } from './supabase'
import type { Project, ProjectStatus } from '@/types/database'

// Real clinical guideline projects as fallback when Supabase isn't connected
export const SEED_PROJECTS: Project[] = [
  { id: '1', title: 'Asthma Management in Adults', description: 'National CPG for adult asthma diagnosis and stepwise therapy', status: 'published', pathway: 'de_novo', lead_author_id: null, icd_codes: ['J45'], target_population: 'Adults ≥18 years', agree_ii_score: 87, created_at: '2024-06-01', updated_at: '2025-01-15', target_date: '2025-01-01', published_at: '2025-01-15' },
  { id: '2', title: 'Type 2 Diabetes Primary Care', description: 'Evidence-based guideline for T2DM management in primary care', status: 'external_review', pathway: 'adaptation', lead_author_id: null, icd_codes: ['E11'], target_population: 'Adults with T2DM', agree_ii_score: 74, created_at: '2024-08-15', updated_at: '2025-03-01', target_date: '2025-04-01', published_at: null },
  { id: '3', title: 'Hypertension Guidelines 2025', description: 'Updated HTN management incorporating SPRINT trial data', status: 'etr_consensus', pathway: 'de_novo', lead_author_id: null, icd_codes: ['I10'], target_population: 'Adults ≥18 years', agree_ii_score: null, created_at: '2024-09-01', updated_at: '2025-03-10', target_date: '2025-06-01', published_at: null },
  { id: '4', title: 'Colorectal Cancer Screening', description: 'Population-based CRC screening guideline for Saudi Arabia', status: 'grade_appraisal', pathway: 'adaptation', lead_author_id: null, icd_codes: ['C18', 'C19', 'C20'], target_population: 'Adults ≥45 years', agree_ii_score: null, created_at: '2024-10-01', updated_at: '2025-03-15', target_date: '2025-07-01', published_at: null },
  { id: '5', title: 'Childhood Vaccination Schedule', description: 'National immunization schedule update for 2025', status: 'published', pathway: 'adoption', lead_author_id: null, icd_codes: ['Z23'], target_population: 'Children 0-18 years', agree_ii_score: 92, created_at: '2024-03-01', updated_at: '2024-12-01', target_date: '2024-12-01', published_at: '2024-12-01' },
  { id: '6', title: 'Chronic Kidney Disease Management', description: 'CKD stages 3-5 management in adults', status: 'evidence_search', pathway: 'de_novo', lead_author_id: null, icd_codes: ['N18'], target_population: 'Adults with CKD stage 3+', agree_ii_score: null, created_at: '2025-01-15', updated_at: '2025-03-18', target_date: '2025-09-01', published_at: null },
  { id: '7', title: 'Acute Coronary Syndrome', description: 'Emergency management of ACS including STEMI and NSTEMI', status: 'scoping', pathway: 'de_novo', lead_author_id: null, icd_codes: ['I21', 'I20.0'], target_population: 'Adults presenting with ACS', agree_ii_score: null, created_at: '2025-02-01', updated_at: '2025-03-10', target_date: '2025-12-01', published_at: null },
  { id: '8', title: 'Gestational Diabetes Mellitus', description: 'Screening and management of GDM', status: 'grade_appraisal', pathway: 'adaptation', lead_author_id: null, icd_codes: ['O24.4'], target_population: 'Pregnant women', agree_ii_score: null, created_at: '2024-11-01', updated_at: '2025-03-12', target_date: '2025-08-01', published_at: null },
  { id: '9', title: 'Stroke Prevention & Treatment', description: 'Acute ischemic stroke management and secondary prevention', status: 'etr_consensus', pathway: 'de_novo', lead_author_id: null, icd_codes: ['I63', 'I64'], target_population: 'Adults at risk or post-stroke', agree_ii_score: null, created_at: '2024-07-15', updated_at: '2025-03-08', target_date: '2025-05-01', published_at: null },
  { id: '10', title: 'Neonatal Sepsis Protocol', description: 'Early-onset sepsis screening and treatment in neonates', status: 'published', pathway: 'de_novo', lead_author_id: null, icd_codes: ['P36'], target_population: 'Neonates 0-28 days', agree_ii_score: 89, created_at: '2024-01-15', updated_at: '2024-11-15', target_date: '2024-11-01', published_at: '2024-11-15' },
  { id: '11', title: 'COPD Exacerbation Management', description: 'Acute COPD exacerbation treatment in hospital settings', status: 'evidence_search', pathway: 'adaptation', lead_author_id: null, icd_codes: ['J44.1'], target_population: 'Adults with COPD', agree_ii_score: null, created_at: '2025-01-01', updated_at: '2025-03-16', target_date: '2025-10-01', published_at: null },
  { id: '12', title: 'Pediatric Asthma Action Plan', description: 'Asthma management for children under 12', status: 'scoping', pathway: 'de_novo', lead_author_id: null, icd_codes: ['J45'], target_population: 'Children 5-12 years', agree_ii_score: null, created_at: '2025-02-15', updated_at: '2025-03-14', target_date: '2026-01-01', published_at: null },
  { id: '13', title: 'Inflammatory Bowel Disease', description: 'Diagnosis and management of Crohn\'s disease and ulcerative colitis', status: 'grade_appraisal', pathway: 'de_novo', lead_author_id: null, icd_codes: ['K50', 'K51'], target_population: 'Adults and adolescents', agree_ii_score: null, created_at: '2024-09-15', updated_at: '2025-03-17', target_date: '2025-07-15', published_at: null },
  { id: '14', title: 'Hepatitis C Treatment Protocol', description: 'DAA-based treatment protocol for chronic HCV', status: 'published', pathway: 'adaptation', lead_author_id: null, icd_codes: ['B18.2'], target_population: 'Adults with chronic HCV', agree_ii_score: 85, created_at: '2024-04-01', updated_at: '2025-02-01', target_date: '2025-01-15', published_at: '2025-02-01' },
  { id: '15', title: 'Venous Thromboembolism Prevention', description: 'VTE prophylaxis in hospitalized patients', status: 'external_review', pathway: 'de_novo', lead_author_id: null, icd_codes: ['I82'], target_population: 'Hospitalized adults', agree_ii_score: 71, created_at: '2024-08-01', updated_at: '2025-03-05', target_date: '2025-04-15', published_at: null },
  { id: '16', title: 'Antimicrobial Stewardship', description: 'Hospital-based antimicrobial stewardship program guidelines', status: 'planning', pathway: 'de_novo', lead_author_id: null, icd_codes: null, target_population: 'All hospitalized patients', agree_ii_score: null, created_at: '2025-03-01', updated_at: '2025-03-19', target_date: '2026-03-01', published_at: null },
]

// In-memory store for demo mode mutations
let demoProjects: Project[] = [...SEED_PROJECTS]

export function resetDemoProjects() {
  demoProjects = [...SEED_PROJECTS]
}

export async function getProjects(): Promise<Project[]> {
  if (!isSupabaseConfigured) return demoProjects
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false })
    if (error) throw error
    return data && data.length > 0 ? data : demoProjects
  } catch {
    return demoProjects
  }
}

export async function getProjectsByStatus(status: ProjectStatus): Promise<Project[]> {
  const projects = await getProjects()
  return projects.filter((p) => p.status === status)
}

export async function getProjectStats() {
  const projects = await getProjects()
  const total = projects.length
  const published = projects.filter((p) => p.status === 'published').length
  const inDevelopment = projects.filter((p) => !['published', 'archived', 'planning'].includes(p.status)).length
  const withScore = projects.filter((p) => p.agree_ii_score != null)
  const avgAgree = withScore.length > 0
    ? Math.round(withScore.reduce((sum, p) => sum + (p.agree_ii_score ?? 0), 0) / withScore.length)
    : 0
  return { total, published, inDevelopment, avgAgree }
}

export async function createProject(input: { title: string; description?: string; status: string; pathway: string; target_date?: string; target_population?: string }): Promise<Project> {
  const now = new Date().toISOString()
  const newProject: Project = {
    id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: input.title,
    description: input.description || '',
    status: input.status as ProjectStatus,
    pathway: input.pathway as Project['pathway'],
    lead_author_id: null,
    icd_codes: null,
    target_population: input.target_population || null,
    agree_ii_score: null,
    created_at: now,
    updated_at: now,
    target_date: input.target_date || null,
    published_at: null,
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('projects').insert(newProject).select().single()
      if (error) throw error
      return data
    } catch {
      // Fallback to demo mode
    }
  }

  // Demo mode: add to in-memory store
  demoProjects = [newProject, ...demoProjects]
  return newProject
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project> {
  const updatedFields = { ...updates, updated_at: new Date().toISOString() }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('projects').update(updatedFields).eq('id', id).select().single()
      if (error) throw error
      return data
    } catch {
      // Fallback to demo mode
    }
  }

  // Demo mode: update in-memory
  demoProjects = demoProjects.map((p) => p.id === id ? { ...p, ...updatedFields } : p)
  return demoProjects.find((p) => p.id === id) || demoProjects[0]
}

export async function deleteProject(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
      return
    } catch {
      // Fallback
    }
  }
  demoProjects = demoProjects.filter((p) => p.id !== id)
}
