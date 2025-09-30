-- Update idea_submissions table to support case proposal fields
-- This migration adds new columns to support the case proposal form structure

-- Add new columns for case proposal specific fields
ALTER TABLE public.idea_submissions 
ADD COLUMN IF NOT EXISTS problem_statement TEXT,
ADD COLUMN IF NOT EXISTS unique_value TEXT,
ADD COLUMN IF NOT EXISTS partner_gains TEXT,
ADD COLUMN IF NOT EXISTS sustainability_plan TEXT,
ADD COLUMN IF NOT EXISTS contribution TEXT,
ADD COLUMN IF NOT EXISTS observations TEXT,
ADD COLUMN IF NOT EXISTS current_process TEXT,
ADD COLUMN IF NOT EXISTS vision_success TEXT,
ADD COLUMN IF NOT EXISTS core_functions TEXT,
ADD COLUMN IF NOT EXISTS innovation_proposal TEXT,
ADD COLUMN IF NOT EXISTS organization TEXT,
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS output_type TEXT;

-- Update existing columns to be more flexible
ALTER TABLE public.idea_submissions 
ALTER COLUMN category TYPE TEXT,
ALTER COLUMN pm_archetype TYPE TEXT;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_idea_submissions_problem_statement ON public.idea_submissions(problem_statement);
CREATE INDEX IF NOT EXISTS idx_idea_submissions_unique_value ON public.idea_submissions(unique_value);
CREATE INDEX IF NOT EXISTS idx_idea_submissions_organization ON public.idea_submissions(organization);
CREATE INDEX IF NOT EXISTS idx_idea_submissions_email ON public.idea_submissions(email);

-- Update RLS policies to allow new fields
-- The existing policies should work, but let's ensure they cover the new fields
DROP POLICY IF EXISTS "Allow authenticated users to view own ideas" ON public.idea_submissions;
CREATE POLICY "Allow authenticated users to view own ideas"
ON public.idea_submissions FOR SELECT
TO authenticated
USING (submitted_by = auth.uid());

DROP POLICY IF EXISTS "Allow authenticated users to insert own ideas" ON public.idea_submissions;
CREATE POLICY "Allow authenticated users to insert own ideas"
ON public.idea_submissions FOR INSERT
TO authenticated
WITH CHECK (submitted_by = auth.uid());

-- Ensure service role has full access
DROP POLICY IF EXISTS "Allow service role full access to ideas" ON public.idea_submissions;
CREATE POLICY "Allow service role full access to ideas"
ON public.idea_submissions FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- Add comment to document the new structure
COMMENT ON TABLE public.idea_submissions IS 'Ideas and case proposals - supports both legacy idea submissions and new case proposal form structure';
COMMENT ON COLUMN public.idea_submissions.problem_statement IS 'Problem statement from case proposal form';
COMMENT ON COLUMN public.idea_submissions.unique_value IS 'Unique value proposition from case proposal form';
COMMENT ON COLUMN public.idea_submissions.partner_gains IS 'Partner gains from case proposal form';
COMMENT ON COLUMN public.idea_submissions.sustainability_plan IS 'Sustainability plan from case proposal form';
COMMENT ON COLUMN public.idea_submissions.contribution IS 'Contribution from case proposal form';
COMMENT ON COLUMN public.idea_submissions.observations IS 'Observations for Yönlendirici role';
COMMENT ON COLUMN public.idea_submissions.current_process IS 'Current process for Düzenleyici role';
COMMENT ON COLUMN public.idea_submissions.vision_success IS 'Vision and success criteria for Yürütücü role';
COMMENT ON COLUMN public.idea_submissions.core_functions IS 'Core functions for Yürütücü role';
COMMENT ON COLUMN public.idea_submissions.innovation_proposal IS 'Innovation proposal for Dönüştürücü role';
COMMENT ON COLUMN public.idea_submissions.output_type IS 'Output type/category selection from case proposal form';
