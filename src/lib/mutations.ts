/**
 * Mutation helpers for Committee, Delphi, and GRADE operations.
 * All mutations work in both Supabase mode and demo (in-memory) mode.
 */
import { supabase, isSupabaseConfigured } from './supabase'
import { logAudit } from './audit'

// ---- Committee Members ----

export interface CommitteeMemberInput {
  projectId: string
  name: string
  email: string
  institution: string
  role: string
  specialty: string
}

interface CommitteeMemberRecord extends CommitteeMemberInput {
  id: string
  coi_status: string
  joined_at: string
}

const demoCommitteeMembers: CommitteeMemberRecord[] = []

export async function addCommitteeMember(input: CommitteeMemberInput): Promise<CommitteeMemberRecord> {
  const record: CommitteeMemberRecord = {
    ...input,
    id: `cm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    coi_status: 'pending',
    joined_at: new Date().toISOString(),
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('committee_members').insert({
        project_id: input.projectId,
        user_id: record.id,
        role: input.role,
      }).select().single()
      if (!error && data) {
        await logAudit('committee.member_added' as never, 'committee_member' as never, record.id, { member: input.name, role: input.role })
        return { ...record, id: data.id }
      }
    } catch { /* fallback */ }
  }

  demoCommitteeMembers.push(record)
  await logAudit('committee.member_added' as never, 'committee_member' as never, record.id, { member: input.name, role: input.role })
  return record
}

export function getDemoCommitteeMembers(): CommitteeMemberRecord[] {
  return demoCommitteeMembers
}

// ---- Delphi Votes ----

export interface DelphiVoteInput {
  roundId: string
  recommendationId: string
  value: number // 1-9 Likert
  comment?: string
}

interface DelphiVoteRecord extends DelphiVoteInput {
  id: string
  voter_id: string
  cast_at: string
}

const demoVotes: DelphiVoteRecord[] = []

export async function castDelphiVote(input: DelphiVoteInput): Promise<DelphiVoteRecord> {
  const record: DelphiVoteRecord = {
    ...input,
    id: `vote-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    voter_id: 'demo-user',
    cast_at: new Date().toISOString(),
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from('votes').insert({
        round_id: input.roundId,
        user_id: 'demo-user',
        value: input.value <= 3 ? 'strongly_disagree' : input.value <= 5 ? 'neutral' : 'strongly_agree',
        comment: input.comment || null,
      }).select().single()
      if (!error && data) {
        await logAudit('delphi.vote_cast' as never, 'vote' as never, input.roundId, { value: input.value, recommendation: input.recommendationId })
        return { ...record, id: data.id }
      }
    } catch { /* fallback */ }
  }

  demoVotes.push(record)
  await logAudit('delphi.vote_cast' as never, 'vote' as never, input.roundId, { value: input.value, recommendation: input.recommendationId })
  return record
}

export function getDemoVotes(roundId?: string): DelphiVoteRecord[] {
  if (roundId) return demoVotes.filter((v) => v.roundId === roundId)
  return demoVotes
}

// ---- GRADE Assessments ----

export interface GradeAssessmentInput {
  projectId: string
  outcome: string
  studyDesign: string
  numStudies: number
  riskOfBias: string
  inconsistency: string
  indirectness: string
  imprecision: string
  publicationBias: string
  largeEffect: boolean
  doseResponse: boolean
  plausibleConfounding: boolean
  certainty: string
}

interface GradeAssessmentRecord extends GradeAssessmentInput {
  id: string
  saved_at: string
}

const demoGradeAssessments: GradeAssessmentRecord[] = []

export async function saveGradeAssessment(input: GradeAssessmentInput): Promise<GradeAssessmentRecord> {
  const record: GradeAssessmentRecord = {
    ...input,
    id: `grade-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    saved_at: new Date().toISOString(),
  }

  // GRADE assessments map to recommendations table in Supabase
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('recommendations').insert({
        project_id: input.projectId,
        text: `Assessment for outcome: ${input.outcome}`,
        strength: 'conditional_for',
        certainty: input.certainty.toLowerCase().replace(' ', '_'),
        grade_rationale: JSON.stringify(input),
      })
      if (!error) {
        await logAudit('grade.assessed', 'recommendation', record.id, { outcome: input.outcome, certainty: input.certainty })
        return record
      }
    } catch { /* fallback */ }
  }

  demoGradeAssessments.push(record)
  await logAudit('grade.assessed', 'recommendation', record.id, { outcome: input.outcome, certainty: input.certainty })
  return record
}

export function getDemoGradeAssessments(projectId?: string): GradeAssessmentRecord[] {
  if (projectId) return demoGradeAssessments.filter((a) => a.projectId === projectId)
  return demoGradeAssessments
}

// ---- EtR Judgments ----

export interface EtrSaveInput {
  projectId: string
  recommendationId: string
  judgments: Record<string, string>
  notes: Record<string, string>
  recStrength: string
  recText: string
}

const demoEtrSaves: (EtrSaveInput & { id: string; saved_at: string })[] = []

export async function saveEtrJudgments(input: EtrSaveInput) {
  const record = {
    ...input,
    id: `etr-${Date.now()}`,
    saved_at: new Date().toISOString(),
  }

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('recommendations').update({
        strength: input.recStrength.toLowerCase().replace(/ /g, '_'),
        text: input.recText,
        etr_summary: JSON.stringify({ judgments: input.judgments, notes: input.notes }),
      }).eq('id', input.recommendationId)
      if (!error) {
        await logAudit('etr.completed', 'recommendation', input.recommendationId, {
          criteria_completed: Object.keys(input.judgments).length,
          strength: input.recStrength,
        })
        return record
      }
    } catch { /* fallback */ }
  }

  demoEtrSaves.push(record)
  await logAudit('etr.completed', 'recommendation', input.recommendationId, {
    criteria_completed: Object.keys(input.judgments).length,
    strength: input.recStrength,
  })
  return record
}
