-- ============================================================
-- Production Row Level Security (RLS) Policies
-- Role hierarchy: admin > editor > reviewer > viewer
-- ============================================================

-- Helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text AS $$
  SELECT COALESCE(
    (SELECT role FROM public.user_profiles WHERE id = p_user_id),
    'viewer'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- ============================================================
-- user_profiles
-- ============================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id OR get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id OR get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.user_profiles;
CREATE POLICY "Admins can manage all profiles" ON public.user_profiles
  FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- ============================================================
-- projects
-- ============================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can read projects" ON public.projects;
CREATE POLICY "Authenticated users can read projects" ON public.projects
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Editors and admins can create projects" ON public.projects;
CREATE POLICY "Editors and admins can create projects" ON public.projects
  FOR INSERT WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'editor'));

DROP POLICY IF EXISTS "Editors and admins can update projects" ON public.projects;
CREATE POLICY "Editors and admins can update projects" ON public.projects
  FOR UPDATE USING (get_user_role(auth.uid()) IN ('admin', 'editor'));

DROP POLICY IF EXISTS "Only admins can delete projects" ON public.projects;
CREATE POLICY "Only admins can delete projects" ON public.projects
  FOR DELETE USING (get_user_role(auth.uid()) = 'admin');

-- ============================================================
-- recommendations
-- ============================================================
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read recommendations" ON public.recommendations;
DROP POLICY IF EXISTS "Authenticated users can read recommendations" ON public.recommendations;
CREATE POLICY "Authenticated users can read recommendations" ON public.recommendations
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Editors and admins can manage recommendations" ON public.recommendations;
CREATE POLICY "Editors and admins can manage recommendations" ON public.recommendations
  FOR ALL USING (get_user_role(auth.uid()) IN ('admin', 'editor'));

-- ============================================================
-- guideline_sessions
-- ============================================================
ALTER TABLE public.guideline_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read guideline_sessions" ON public.guideline_sessions;
DROP POLICY IF EXISTS "Authenticated users can read sessions" ON public.guideline_sessions;
CREATE POLICY "Authenticated users can read sessions" ON public.guideline_sessions
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can create sessions" ON public.guideline_sessions;
CREATE POLICY "Authenticated users can create sessions" ON public.guideline_sessions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own sessions" ON public.guideline_sessions;
CREATE POLICY "Users can update own sessions" ON public.guideline_sessions
  FOR UPDATE USING (auth.uid() = user_id OR get_user_role(auth.uid()) IN ('admin', 'editor'));

-- ============================================================
-- pipeline_results
-- ============================================================
ALTER TABLE public.pipeline_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read pipeline_results" ON public.pipeline_results;
DROP POLICY IF EXISTS "Authenticated users can read results" ON public.pipeline_results;
CREATE POLICY "Authenticated users can read results" ON public.pipeline_results
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can create results" ON public.pipeline_results;
CREATE POLICY "Authenticated users can create results" ON public.pipeline_results
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update own results" ON public.pipeline_results;
CREATE POLICY "Users can update own results" ON public.pipeline_results
  FOR UPDATE USING (get_user_role(auth.uid()) IN ('admin', 'editor'));

-- ============================================================
-- audit_logs
-- ============================================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert audit_logs" ON public.audit_logs;
CREATE POLICY "Anyone can insert audit_logs" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins can read audit_logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit_logs" ON public.audit_logs
  FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

-- ============================================================
-- committee_members (if exists)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'committee_members' AND table_schema = 'public') THEN
    ALTER TABLE public.committee_members ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Authenticated users can read committee_members" ON public.committee_members;
    CREATE POLICY "Authenticated users can read committee_members" ON public.committee_members
      FOR SELECT USING (auth.uid() IS NOT NULL);

    DROP POLICY IF EXISTS "Admins can manage committee_members" ON public.committee_members;
    CREATE POLICY "Admins can manage committee_members" ON public.committee_members
      FOR ALL USING (get_user_role(auth.uid()) = 'admin');
  END IF;
END $$;

-- ============================================================
-- delphi_rounds (if exists)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'delphi_rounds' AND table_schema = 'public') THEN
    ALTER TABLE public.delphi_rounds ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Authenticated users can read delphi_rounds" ON public.delphi_rounds;
    CREATE POLICY "Authenticated users can read delphi_rounds" ON public.delphi_rounds
      FOR SELECT USING (auth.uid() IS NOT NULL);

    DROP POLICY IF EXISTS "Editors and admins can manage delphi_rounds" ON public.delphi_rounds;
    CREATE POLICY "Editors and admins can manage delphi_rounds" ON public.delphi_rounds
      FOR ALL USING (get_user_role(auth.uid()) IN ('admin', 'editor'));
  END IF;
END $$;

-- ============================================================
-- votes (if exists)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'votes' AND table_schema = 'public') THEN
    ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Authenticated users can read votes" ON public.votes;
    CREATE POLICY "Authenticated users can read votes" ON public.votes
      FOR SELECT USING (auth.uid() IS NOT NULL);

    DROP POLICY IF EXISTS "Users can create own votes" ON public.votes;
    CREATE POLICY "Users can create own votes" ON public.votes
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can update own votes" ON public.votes;
    CREATE POLICY "Users can update own votes" ON public.votes
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;
