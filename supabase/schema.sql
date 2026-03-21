-- KSUMC CPG Platform — Supabase Schema
-- Run this in the Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== ENUMS =====
CREATE TYPE user_role AS ENUM ('admin', 'editor', 'reviewer', 'viewer');
CREATE TYPE project_status AS ENUM (
  'planning', 'scoping', 'evidence_search', 'grade_appraisal',
  'etr_consensus', 'external_review', 'published', 'archived'
);
CREATE TYPE project_pathway AS ENUM ('de_novo', 'adaptation', 'adoption');
CREATE TYPE recommendation_strength AS ENUM ('strong_for', 'conditional_for', 'conditional_against', 'strong_against');
CREATE TYPE certainty_level AS ENUM ('high', 'moderate', 'low', 'very_low');
CREATE TYPE coi_status AS ENUM ('pending', 'declared', 'cleared', 'flagged');
CREATE TYPE delphi_status AS ENUM ('open', 'closed', 'final');
CREATE TYPE vote_value AS ENUM ('strongly_agree', 'agree', 'neutral', 'disagree', 'strongly_disagree');

-- ===== TABLES =====

-- User profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  institution TEXT,
  specialty TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Projects (clinical practice guidelines)
CREATE TABLE projects (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  title TEXT NOT NULL,
  description TEXT,
  status project_status NOT NULL DEFAULT 'planning',
  pathway project_pathway NOT NULL DEFAULT 'de_novo',
  lead_author_id UUID REFERENCES user_profiles(id),
  icd_codes TEXT[],
  target_population TEXT,
  agree_ii_score REAL CHECK (agree_ii_score >= 0 AND agree_ii_score <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  target_date DATE,
  published_at TIMESTAMPTZ
);

-- Recommendations
CREATE TABLE recommendations (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  recommendation_text TEXT NOT NULL,
  strength recommendation_strength NOT NULL,
  certainty certainty_level NOT NULL,
  grade_rationale TEXT,
  etr_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Committee members
CREATE TABLE committee_members (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role_in_committee TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Delphi rounds
CREATE TABLE delphi_rounds (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  recommendation_id TEXT NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  status delphi_status NOT NULL DEFAULT 'open',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  UNIQUE(recommendation_id, round_number)
);

-- Votes
CREATE TABLE votes (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  delphi_round_id TEXT NOT NULL REFERENCES delphi_rounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  value vote_value NOT NULL,
  comment TEXT,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(delphi_round_id, user_id)
);

-- Audit log
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== INDEXES =====
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_updated ON projects(updated_at DESC);
CREATE INDEX idx_recommendations_project ON recommendations(project_id);
CREATE INDEX idx_committee_project ON committee_members(project_id);
CREATE INDEX idx_delphi_recommendation ON delphi_rounds(recommendation_id);
CREATE INDEX idx_votes_round ON votes(delphi_round_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- ===== ROW LEVEL SECURITY =====
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE committee_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE delphi_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can read all
CREATE POLICY "Users can view all profiles" ON user_profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Authenticated users can read projects" ON projects FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Editors can insert projects" ON projects FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);
CREATE POLICY "Editors can update projects" ON projects FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);

CREATE POLICY "Authenticated users can read recommendations" ON recommendations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Editors can manage recommendations" ON recommendations FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);

CREATE POLICY "Authenticated users can read committee" ON committee_members FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage committee" ON committee_members FOR ALL USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Authenticated users can read delphi" ON delphi_rounds FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read votes" ON votes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can cast their own votes" ON votes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can read audit" ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'editor'))
);
CREATE POLICY "System can insert audit" ON audit_logs FOR INSERT WITH CHECK (true);

-- ===== AUTO-UPDATE TRIGGER =====
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_recommendations_updated_at
  BEFORE UPDATE ON recommendations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
