-- Migration to cleanup idea_submissions table
-- Remove unused/legacy columns and keep only form fields
-- Date: 2025-01-27

-- Drop unused indexes first
DROP INDEX IF EXISTS public.idx_idea_submissions_problem_statement;
DROP INDEX IF EXISTS public.idx_idea_submissions_unique_value;

-- Remove all legacy/unused columns
ALTER TABLE public.idea_submissions
  -- Legacy fields from old forms (no longer used)
  DROP COLUMN IF EXISTS title,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS problem_definition,
  DROP COLUMN IF EXISTS expected_outcome,
  DROP COLUMN IF EXISTS market_size,
  DROP COLUMN IF EXISTS expected_roi,
  DROP COLUMN IF EXISTS timeline,
  DROP COLUMN IF EXISTS budget,
  DROP COLUMN IF EXISTS tags,
  DROP COLUMN IF EXISTS problem_statement,
  DROP COLUMN IF EXISTS unique_value,
  DROP COLUMN IF EXISTS partner_gains,
  DROP COLUMN IF EXISTS sustainability_plan,
  DROP COLUMN IF EXISTS contribution,
  DROP COLUMN IF EXISTS observations,
  DROP COLUMN IF EXISTS current_process,
  DROP COLUMN IF EXISTS vision_success,
  DROP COLUMN IF EXISTS core_functions,
  DROP COLUMN IF EXISTS innovation_proposal,
  DROP COLUMN IF EXISTS output_type;

-- Rename pm_archetype to archetype for consistency
ALTER TABLE public.idea_submissions
  RENAME COLUMN pm_archetype TO archetype;

-- Update column comments to reflect current form structure
COMMENT ON TABLE public.idea_submissions IS 'Idea submissions with 4-step form structure (cleaned up 2025-01-27)';

-- Step 1: Contact Information
COMMENT ON COLUMN public.idea_submissions.contact_name IS 'Step 1: Contact person full name';
COMMENT ON COLUMN public.idea_submissions.email IS 'Step 1: Contact email address';
COMMENT ON COLUMN public.idea_submissions.organization IS 'Step 1: Organization/Institution name';
COMMENT ON COLUMN public.idea_submissions.department IS 'Step 1: Department/Unit';
COMMENT ON COLUMN public.idea_submissions.position IS 'Step 1: Job position/title';
COMMENT ON COLUMN public.idea_submissions.phone IS 'Step 1: Phone number';
COMMENT ON COLUMN public.idea_submissions.contribution_types IS 'Step 1: Selected contribution types (max 2)';

-- Step 2: Work Scope and Output Focus
COMMENT ON COLUMN public.idea_submissions.creative_output IS 'Step 2: Creative work output description';
COMMENT ON COLUMN public.idea_submissions.creative_reference IS 'Step 2: Creative work reference link/file';
COMMENT ON COLUMN public.idea_submissions.digital_product IS 'Step 2: Digital product description';
COMMENT ON COLUMN public.idea_submissions.digital_product_reference IS 'Step 2: Digital product reference link/file';
COMMENT ON COLUMN public.idea_submissions.digital_experience IS 'Step 2: Digital experience description';
COMMENT ON COLUMN public.idea_submissions.digital_experience_reference IS 'Step 2: Digital experience reference link/file';

-- Step 3: Collaboration Role
COMMENT ON COLUMN public.idea_submissions.archetype IS 'Step 3: Selected collaboration archetype (Yönlendirici, Düzenleyici, Yürütücü, Dönüştürücü)';

-- Step 4: Project Summary and Scope
COMMENT ON COLUMN public.idea_submissions.project_title IS 'Step 4: Project/Idea/Concept title';
COMMENT ON COLUMN public.idea_submissions.target_audience IS 'Step 4: Target audience';
COMMENT ON COLUMN public.idea_submissions.problem_need IS 'Step 4: Need or problem definition';
COMMENT ON COLUMN public.idea_submissions.must_have_features IS 'Step 4: KANO Canvas - Must-have features';
COMMENT ON COLUMN public.idea_submissions.better_features IS 'Step 4: KANO Canvas - Better/enhancing features';
COMMENT ON COLUMN public.idea_submissions.surprise_features IS 'Step 4: KANO Canvas - Surprise features';
COMMENT ON COLUMN public.idea_submissions.archetype_specific_answer IS 'Step 4: Archetype-specific question answer';
COMMENT ON COLUMN public.idea_submissions.additional_notes IS 'Step 4: Additional notes';

-- System fields
COMMENT ON COLUMN public.idea_submissions.submitted_by IS 'User ID who submitted this idea (FK to users table)';
COMMENT ON COLUMN public.idea_submissions.status IS 'Submission status: pending, approved, rejected';
COMMENT ON COLUMN public.idea_submissions.rejection_reason IS 'Reason for rejection if status is rejected';
COMMENT ON COLUMN public.idea_submissions.stage IS 'Current stage in the workflow';
COMMENT ON COLUMN public.idea_submissions.submitted_at IS 'Timestamp when idea was submitted';
COMMENT ON COLUMN public.idea_submissions.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN public.idea_submissions.updated_at IS 'Record last update timestamp';

-- Create index on archetype for filtering
CREATE INDEX IF NOT EXISTS idx_idea_submissions_archetype ON public.idea_submissions(archetype);

