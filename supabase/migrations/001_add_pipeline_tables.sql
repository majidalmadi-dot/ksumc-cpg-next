-- Migration: Add pipeline persistence tables
-- Run this in Supabase SQL Editor if you already have the base schema

-- Guideline sessions (multi-PICO workflow state)
CREATE TABLE IF NOT EXISTS guideline_sessions (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'SA',
  country_label TEXT NOT NULL DEFAULT 'Saudi Arabia',
  domains JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected_modules TEXT[] NOT NULL DEFAULT ARRAY['evidence','grade','synthesis','economics','hta','frameworks','report'],
  active_pico_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pipeline results (per-PICO, per-module AI outputs)
CREATE TABLE IF NOT EXISTS pipeline_results (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  session_id TEXT NOT NULL REFERENCES guideline_sessions(id) ON DELETE CASCADE,
  pico_id TEXT NOT NULL,
  domain_id TEXT NOT NULL,
  module TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result JSONB,
  literature_results JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, pico_id, module)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guideline_sessions_project ON guideline_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_guideline_sessions_updated ON guideline_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_results_session ON pipeline_results(session_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_results_pico ON pipeline_results(pico_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_results_module ON pipeline_results(session_id, pico_id, module);

-- RLS
ALTER TABLE guideline_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read guideline sessions" ON guideline_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert guideline sessions" ON guideline_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update guideline sessions" ON guideline_sessions FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete guideline sessions" ON guideline_sessions FOR DELETE USING (true);

CREATE POLICY "Anyone can read pipeline results" ON pipeline_results FOR SELECT USING (true);
CREATE POLICY "Anyone can insert pipeline results" ON pipeline_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update pipeline results" ON pipeline_results FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete pipeline results" ON pipeline_results FOR DELETE USING (true);

-- Auto-update triggers
CREATE TRIGGER set_guideline_sessions_updated_at
  BEFORE UPDATE ON guideline_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_pipeline_results_updated_at
  BEFORE UPDATE ON pipeline_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
