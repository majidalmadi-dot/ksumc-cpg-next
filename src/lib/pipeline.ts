/**
 * Pipeline persistence layer — saves/loads guideline sessions and
 * per-PICO module results to Supabase with localStorage fallback.
 */
import { supabase, isSupabaseConfigured } from './supabase'
import type { GuidelineProject, EnrichedPICO, ModuleId, PageSuggestions, LiteratureResult } from './ai-workflow'

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */

export interface GuidelineSessionRow {
  id: string
  project_id: string | null
  title: string
  country: string
  country_label: string
  domains: unknown // JSONB — serialized ClinicalDomain[] (without heavy result data)
  selected_modules: string[]
  active_pico_id: string | null
  created_at: string
  updated_at: string
}

export interface PipelineResultRow {
  id: string
  session_id: string
  pico_id: string
  domain_id: string
  module: string
  status: string // 'pending' | 'complete' | 'skipped'
  result: unknown // JSONB — the PageSuggestions for this module
  literature_results: unknown // JSONB — LiteratureResult[] (only for 'evidence' module)
  created_at: string
  updated_at: string
}

/* ═══════════════════════════════════════════════════════════════
   In-Memory Demo Store (fallback when Supabase not configured)
   ═══════════════════════════════════════════════════════════════ */

let demoSessions: GuidelineSessionRow[] = []
let demoPipelineResults: PipelineResultRow[] = []

/* ═══════════════════════════════════════════════════════════════
   Session CRUD
   ═══════════════════════════════════════════════════════════════ */

/**
 * Save or update a guideline session.
 * Strips heavy result data from domains — those go in pipeline_results.
 */
export async function saveGuidelineSession(
  project: GuidelineProject,
  selectedModules: string[],
  activePicoId: string | null,
  existingSessionId?: string
): Promise<string> {
  // Strip suggestions and literatureResults from domains to keep session row lean
  const leanDomains = project.domains.map(d => ({
    id: d.id,
    label: d.label,
    description: d.description,
    collapsed: d.collapsed,
    picos: d.picos.map(p => ({
      id: p.id,
      domainId: p.domainId,
      topic: p.topic,
      population: p.population,
      intervention: p.intervention,
      comparison: p.comparison,
      outcome: p.outcome,
      pipeline: p.pipeline,
      recommendationText: p.recommendationText,
      gradeStrength: p.gradeStrength,
      evidenceCertainty: p.evidenceCertainty,
      consensusVote: p.consensusVote,
      // Omit: literatureResults, suggestions (stored in pipeline_results)
    })),
  }))

  const row = {
    title: project.title,
    country: project.country,
    country_label: project.countryLabel,
    domains: leanDomains,
    selected_modules: selectedModules,
    active_pico_id: activePicoId,
  }

  if (isSupabaseConfigured) {
    try {
      if (existingSessionId) {
        const { error } = await supabase
          .from('guideline_sessions')
          .update(row)
          .eq('id', existingSessionId)
        if (!error) return existingSessionId
      }
      // Insert new
      const { data, error } = await supabase
        .from('guideline_sessions')
        .insert({ ...row, id: existingSessionId || `gs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` })
        .select('id')
        .single()
      if (!error && data) return data.id
    } catch (e) {
      console.warn('Supabase session save failed, using demo store:', e)
    }
  }

  // Demo fallback
  const id = existingSessionId || `gs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const now = new Date().toISOString()
  const existing = demoSessions.findIndex(s => s.id === id)
  const fullRow: GuidelineSessionRow = {
    id,
    project_id: null,
    ...row,
    created_at: existing >= 0 ? demoSessions[existing].created_at : now,
    updated_at: now,
  }
  if (existing >= 0) {
    demoSessions[existing] = fullRow
  } else {
    demoSessions.push(fullRow)
  }
  return id
}

/**
 * Load the most recent guideline session.
 */
export async function loadLatestGuidelineSession(): Promise<{
  session: GuidelineSessionRow
  results: PipelineResultRow[]
} | null> {
  if (isSupabaseConfigured) {
    try {
      const { data: session, error: sErr } = await supabase
        .from('guideline_sessions')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()
      if (sErr || !session) return null

      const { data: results, error: rErr } = await supabase
        .from('pipeline_results')
        .select('*')
        .eq('session_id', session.id)
      if (rErr) return { session, results: [] }
      return { session, results: results || [] }
    } catch {
      // Fall through to demo
    }
  }

  // Demo fallback
  if (demoSessions.length === 0) return null
  const sorted = [...demoSessions].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  const session = sorted[0]
  const results = demoPipelineResults.filter(r => r.session_id === session.id)
  return { session, results }
}

/**
 * Load a specific guideline session by ID.
 */
export async function loadGuidelineSession(sessionId: string): Promise<{
  session: GuidelineSessionRow
  results: PipelineResultRow[]
} | null> {
  if (isSupabaseConfigured) {
    try {
      const { data: session, error: sErr } = await supabase
        .from('guideline_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()
      if (sErr || !session) return null

      const { data: results, error: rErr } = await supabase
        .from('pipeline_results')
        .select('*')
        .eq('session_id', sessionId)
      return { session, results: rErr ? [] : results || [] }
    } catch {
      // Fall through
    }
  }

  const session = demoSessions.find(s => s.id === sessionId)
  if (!session) return null
  const results = demoPipelineResults.filter(r => r.session_id === sessionId)
  return { session, results }
}

/**
 * List all guideline sessions (for session picker UI).
 */
export async function listGuidelineSessions(): Promise<GuidelineSessionRow[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('guideline_sessions')
        .select('*')
        .order('updated_at', { ascending: false })
      if (!error && data) return data
    } catch { /* fall through */ }
  }
  return [...demoSessions].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

/**
 * Delete a guideline session and its pipeline results.
 */
export async function deleteGuidelineSession(sessionId: string): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      await supabase.from('pipeline_results').delete().eq('session_id', sessionId)
      await supabase.from('guideline_sessions').delete().eq('id', sessionId)
      return
    } catch { /* fall through */ }
  }
  demoPipelineResults = demoPipelineResults.filter(r => r.session_id !== sessionId)
  demoSessions = demoSessions.filter(s => s.id !== sessionId)
}

/* ═══════════════════════════════════════════════════════════════
   Pipeline Result CRUD
   ═══════════════════════════════════════════════════════════════ */

/**
 * Save a single module result for a PICO question.
 * Uses upsert to handle re-runs of the same module.
 */
export async function savePipelineResult(
  sessionId: string,
  pico: EnrichedPICO,
  module: ModuleId | string,
  status: string,
  result: PageSuggestions | null,
  literatureResults?: LiteratureResult[]
): Promise<void> {
  const row = {
    session_id: sessionId,
    pico_id: pico.id,
    domain_id: pico.domainId,
    module,
    status,
    result: result || null,
    literature_results: module === 'evidence' && literatureResults ? literatureResults : null,
  }

  if (isSupabaseConfigured) {
    try {
      // Try upsert on the unique constraint (session_id, pico_id, module)
      const { error } = await supabase
        .from('pipeline_results')
        .upsert(
          { ...row, id: `pr-${sessionId}-${pico.id}-${module}` },
          { onConflict: 'session_id,pico_id,module' }
        )
      if (!error) return
    } catch (e) {
      console.warn('Supabase pipeline save failed:', e)
    }
  }

  // Demo fallback
  const id = `pr-${sessionId}-${pico.id}-${module}`
  const now = new Date().toISOString()
  const existing = demoPipelineResults.findIndex(r => r.id === id)
  const fullRow: PipelineResultRow = {
    id,
    ...row,
    created_at: existing >= 0 ? demoPipelineResults[existing].created_at : now,
    updated_at: now,
  }
  if (existing >= 0) {
    demoPipelineResults[existing] = fullRow
  } else {
    demoPipelineResults.push(fullRow)
  }
}

/**
 * Load all pipeline results for a specific PICO question.
 */
export async function loadPicoResults(
  sessionId: string,
  picoId: string
): Promise<PipelineResultRow[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('pipeline_results')
        .select('*')
        .eq('session_id', sessionId)
        .eq('pico_id', picoId)
      if (!error && data) return data
    } catch { /* fall through */ }
  }
  return demoPipelineResults.filter(r => r.session_id === sessionId && r.pico_id === picoId)
}

/**
 * Load all pipeline results for a session, grouped by PICO.
 */
export async function loadSessionResults(sessionId: string): Promise<Record<string, PipelineResultRow[]>> {
  let results: PipelineResultRow[] = []

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('pipeline_results')
        .select('*')
        .eq('session_id', sessionId)
      if (!error && data) results = data
    } catch { /* fall through */ }
  }

  if (results.length === 0) {
    results = demoPipelineResults.filter(r => r.session_id === sessionId)
  }

  // Group by pico_id
  const grouped: Record<string, PipelineResultRow[]> = {}
  for (const r of results) {
    if (!grouped[r.pico_id]) grouped[r.pico_id] = []
    grouped[r.pico_id].push(r)
  }
  return grouped
}

/**
 * Get pipeline completion stats for a session.
 */
export async function getSessionProgress(sessionId: string): Promise<{
  totalModules: number
  completedModules: number
  skippedModules: number
  pendingModules: number
}> {
  let results: PipelineResultRow[] = []

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('pipeline_results')
        .select('status')
        .eq('session_id', sessionId)
      if (!error && data) results = data as PipelineResultRow[]
    } catch { /* fall through */ }
  }

  if (results.length === 0) {
    results = demoPipelineResults.filter(r => r.session_id === sessionId)
  }

  return {
    totalModules: results.length,
    completedModules: results.filter(r => r.status === 'complete').length,
    skippedModules: results.filter(r => r.status === 'skipped').length,
    pendingModules: results.filter(r => r.status === 'pending').length,
  }
}
