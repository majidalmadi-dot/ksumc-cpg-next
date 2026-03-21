import { isSupabaseConfigured, supabase } from './supabase'

export type AuditAction =
  | 'project.created'
  | 'project.updated'
  | 'project.status_changed'
  | 'project.deleted'
  | 'recommendation.created'
  | 'recommendation.updated'
  | 'grade.assessed'
  | 'etr.completed'
  | 'delphi.round_opened'
  | 'delphi.round_closed'
  | 'delphi.vote_cast'
  | 'committee.member_added'
  | 'committee.member_removed'
  | 'export.generated'
  | 'auth.login'
  | 'auth.logout'
  | 'search.pubmed'
  | 'ai.query'

export type EntityType =
  | 'project'
  | 'recommendation'
  | 'delphi_round'
  | 'vote'
  | 'committee_member'
  | 'export'
  | 'session'
  | 'search'
  | 'ai_command'

export interface AuditEntry {
  id: string
  user_id: string | null
  action: AuditAction
  entity_type: EntityType
  entity_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

// In-memory audit log for demo mode (when Supabase is not configured)
const memoryLog: AuditEntry[] = []

export async function logAudit(
  action: AuditAction,
  entityType: EntityType,
  entityId?: string | null,
  details?: Record<string, unknown> | null,
  userId?: string | null
): Promise<void> {
  const entry: AuditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    user_id: userId || null,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    details: details || null,
    created_at: new Date().toISOString(),
  }

  if (isSupabaseConfigured) {
    try {
      await supabase.from('audit_logs').insert({
        user_id: entry.user_id,
        action: entry.action,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        details: entry.details,
      })
    } catch {
      // Fallback to memory if insert fails
      memoryLog.unshift(entry)
    }
  } else {
    memoryLog.unshift(entry)
    // Keep memory log bounded
    if (memoryLog.length > 500) memoryLog.length = 500
  }
}

export async function getAuditLogs(
  limit = 100,
  offset = 0,
  filters?: {
    action?: string
    entityType?: string
    entityId?: string
    userId?: string
    from?: string
    to?: string
  }
): Promise<{ logs: AuditEntry[]; total: number }> {
  if (isSupabaseConfigured) {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (filters?.action) query = query.eq('action', filters.action)
      if (filters?.entityType) query = query.eq('entity_type', filters.entityType)
      if (filters?.entityId) query = query.eq('entity_id', filters.entityId)
      if (filters?.userId) query = query.eq('user_id', filters.userId)
      if (filters?.from) query = query.gte('created_at', filters.from)
      if (filters?.to) query = query.lte('created_at', filters.to)

      const { data, count, error } = await query
      if (!error && data) {
        return { logs: data as AuditEntry[], total: count || data.length }
      }
    } catch {
      // Fall through to memory log
    }
  }

  // Return from memory log with filtering
  let filtered = [...memoryLog]
  if (filters?.action) filtered = filtered.filter((e) => e.action === filters.action)
  if (filters?.entityType) filtered = filtered.filter((e) => e.entity_type === filters.entityType)
  if (filters?.entityId) filtered = filtered.filter((e) => e.entity_id === filters.entityId)

  return {
    logs: filtered.slice(offset, offset + limit),
    total: filtered.length,
  }
}

// Generate seed audit data for demo mode
export function getSeedAuditLogs(): AuditEntry[] {
  const now = Date.now()
  const hour = 3600000
  const day = 86400000

  const seeds: AuditEntry[] = [
    { id: 'aud-001', user_id: null, action: 'project.created', entity_type: 'project', entity_id: 'proj-dm2-denovo', details: { title: 'Type 2 Diabetes Management', pathway: 'de_novo' }, created_at: new Date(now - 14 * day).toISOString() },
    { id: 'aud-002', user_id: null, action: 'project.status_changed', entity_type: 'project', entity_id: 'proj-dm2-denovo', details: { from: 'planning', to: 'scoping' }, created_at: new Date(now - 13 * day).toISOString() },
    { id: 'aud-003', user_id: null, action: 'committee.member_added', entity_type: 'committee_member', entity_id: 'proj-dm2-denovo', details: { member: 'Dr. Sarah Ahmed', role: 'Chair' }, created_at: new Date(now - 13 * day + hour).toISOString() },
    { id: 'aud-004', user_id: null, action: 'search.pubmed', entity_type: 'search', entity_id: null, details: { query: 'diabetes type 2 management guidelines', results: 847 }, created_at: new Date(now - 12 * day).toISOString() },
    { id: 'aud-005', user_id: null, action: 'project.status_changed', entity_type: 'project', entity_id: 'proj-dm2-denovo', details: { from: 'scoping', to: 'evidence_search' }, created_at: new Date(now - 11 * day).toISOString() },
    { id: 'aud-006', user_id: null, action: 'grade.assessed', entity_type: 'recommendation', entity_id: 'rec-dm2-001', details: { certainty: 'high', strength: 'strong_for', topic: 'Metformin as first-line therapy' }, created_at: new Date(now - 10 * day).toISOString() },
    { id: 'aud-007', user_id: null, action: 'ai.query', entity_type: 'ai_command', entity_id: null, details: { prompt: 'Summarize evidence for GLP-1 receptor agonists in T2DM', tokens: 1240 }, created_at: new Date(now - 9 * day).toISOString() },
    { id: 'aud-008', user_id: null, action: 'recommendation.created', entity_type: 'recommendation', entity_id: 'rec-dm2-002', details: { text: 'SGLT2 inhibitors for patients with cardiovascular risk', strength: 'strong_for' }, created_at: new Date(now - 8 * day).toISOString() },
    { id: 'aud-009', user_id: null, action: 'delphi.round_opened', entity_type: 'delphi_round', entity_id: 'dr-001', details: { round: 1, recommendation: 'rec-dm2-001', panelists: 12 }, created_at: new Date(now - 7 * day).toISOString() },
    { id: 'aud-010', user_id: null, action: 'delphi.vote_cast', entity_type: 'vote', entity_id: 'dr-001', details: { round: 1, value: 'strongly_agree' }, created_at: new Date(now - 6 * day).toISOString() },
    { id: 'aud-011', user_id: null, action: 'delphi.round_closed', entity_type: 'delphi_round', entity_id: 'dr-001', details: { round: 1, consensus: 91.7, votes: 12 }, created_at: new Date(now - 5 * day).toISOString() },
    { id: 'aud-012', user_id: null, action: 'etr.completed', entity_type: 'recommendation', entity_id: 'rec-dm2-001', details: { criteria_met: 9, total_criteria: 11 }, created_at: new Date(now - 4 * day).toISOString() },
    { id: 'aud-013', user_id: null, action: 'project.status_changed', entity_type: 'project', entity_id: 'proj-htn-adapt', details: { from: 'evidence_search', to: 'grade_appraisal' }, created_at: new Date(now - 3 * day).toISOString() },
    { id: 'aud-014', user_id: null, action: 'export.generated', entity_type: 'export', entity_id: null, details: { format: 'csv', type: 'projects', records: 16 }, created_at: new Date(now - 2 * day).toISOString() },
    { id: 'aud-015', user_id: null, action: 'project.created', entity_type: 'project', entity_id: 'proj-ped-asthma', details: { title: 'Pediatric Asthma Management', pathway: 'adaptation' }, created_at: new Date(now - 1 * day).toISOString() },
    { id: 'aud-016', user_id: null, action: 'auth.login', entity_type: 'session', entity_id: null, details: { mode: 'demo', ip: '10.x.x.x' }, created_at: new Date(now - 2 * hour).toISOString() },
    { id: 'aud-017', user_id: null, action: 'search.pubmed', entity_type: 'search', entity_id: null, details: { query: 'pediatric asthma inhaled corticosteroids', results: 423 }, created_at: new Date(now - 1 * hour).toISOString() },
    { id: 'aud-018', user_id: null, action: 'ai.query', entity_type: 'ai_command', entity_id: null, details: { prompt: 'Compare GINA vs BTS guidelines for pediatric asthma', tokens: 980 }, created_at: new Date(now - 30 * 60000).toISOString() },
  ]

  return seeds
}
