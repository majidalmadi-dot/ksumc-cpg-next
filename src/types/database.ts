// User roles
export type UserRole = 'admin' | 'editor' | 'reviewer' | 'viewer'

// Project statuses matching the CPG lifecycle
export type ProjectStatus =
  | 'planning'
  | 'scoping'
  | 'evidence_search'
  | 'grade_appraisal'
  | 'etr_consensus'
  | 'external_review'
  | 'published'
  | 'archived'

export type ProjectPathway = 'de_novo' | 'adaptation' | 'adoption'
export type RecommendationStrength = 'strong_for' | 'conditional_for' | 'conditional_against' | 'strong_against'
export type CertaintyLevel = 'high' | 'moderate' | 'low' | 'very_low'
export type COIStatus = 'pending' | 'declared' | 'cleared' | 'flagged'
export type DelphiStatus = 'open' | 'closed' | 'final'
export type VoteValue = 'strongly_agree' | 'agree' | 'neutral' | 'disagree' | 'strongly_disagree'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  institution: string | null
  specialty: string | null
  created_at: string
  last_login: string | null
}

export interface Project {
  id: string
  title: string
  description: string | null
  status: ProjectStatus
  pathway: ProjectPathway
  lead_author_id: string | null
  icd_codes: string[] | null
  target_population: string | null
  agree_ii_score: number | null
  created_at: string
  updated_at: string
  target_date: string | null
  published_at: string | null
}

export interface Recommendation {
  id: string
  project_id: string
  recommendation_text: string
  strength: RecommendationStrength
  certainty: CertaintyLevel
  grade_rationale: string | null
  etr_summary: string | null
  created_at: string
  updated_at: string
}

export interface CommitteeMember {
  id: string
  project_id: string
  user_id: string
  role_in_committee: string
  joined_at: string
}

export interface DelphiRound {
  id: string
  recommendation_id: string
  round_number: number
  status: DelphiStatus
  opened_at: string
  closed_at: string | null
}

export interface Vote {
  id: string
  delphi_round_id: string
  user_id: string
  value: VoteValue
  comment: string | null
  voted_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      user_profiles: { Row: UserProfile; Insert: Partial<UserProfile> & Pick<UserProfile, 'id' | 'email' | 'full_name' | 'role'>; Update: Partial<UserProfile> }
      projects: { Row: Project; Insert: Partial<Project> & Pick<Project, 'title' | 'status' | 'pathway'>; Update: Partial<Project> }
      recommendations: { Row: Recommendation; Insert: Partial<Recommendation> & Pick<Recommendation, 'project_id' | 'recommendation_text' | 'strength' | 'certainty'>; Update: Partial<Recommendation> }
      committee_members: { Row: CommitteeMember; Insert: Partial<CommitteeMember> & Pick<CommitteeMember, 'project_id' | 'user_id' | 'role_in_committee'>; Update: Partial<CommitteeMember> }
      delphi_rounds: { Row: DelphiRound; Insert: Partial<DelphiRound> & Pick<DelphiRound, 'recommendation_id' | 'round_number' | 'status'>; Update: Partial<DelphiRound> }
      votes: { Row: Vote; Insert: Partial<Vote> & Pick<Vote, 'delphi_round_id' | 'user_id' | 'value'>; Update: Partial<Vote> }
      audit_logs: { Row: AuditLog; Insert: Partial<AuditLog> & Pick<AuditLog, 'action' | 'entity_type'>; Update: Partial<AuditLog> }
    }
  }
}
