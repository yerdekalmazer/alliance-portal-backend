-- Migration to update idea_submissions table with new case proposal form fields
-- Reflects the updated 4-step form structure from AllianceDashboard.tsx

-- Step 1: Contact Information Fields
ALTER TABLE public.idea_submissions 
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS contribution_types TEXT[]; -- Array of contribution types (max 2)

-- Step 2: Work Scope and Output Focus Fields
ALTER TABLE public.idea_submissions 
ADD COLUMN IF NOT EXISTS creative_output TEXT, -- Selected creative output type
ADD COLUMN IF NOT EXISTS creative_reference TEXT, -- Reference link/file for creative work
ADD COLUMN IF NOT EXISTS digital_product TEXT, -- Selected digital product type
ADD COLUMN IF NOT EXISTS digital_product_reference TEXT, -- Reference link/file for digital product
ADD COLUMN IF NOT EXISTS digital_experience TEXT, -- Selected digital experience type
ADD COLUMN IF NOT EXISTS digital_experience_reference TEXT; -- Reference link/file for digital experience

-- Step 4: Project Details and Value Layers
ALTER TABLE public.idea_submissions 
ADD COLUMN IF NOT EXISTS project_title TEXT, -- Project/Idea/Concept/Proposal Title
ADD COLUMN IF NOT EXISTS problem_need TEXT, -- Need or Problem Definition
ADD COLUMN IF NOT EXISTS must_have_features TEXT, -- KANO Canvas: Must-Have Features
ADD COLUMN IF NOT EXISTS better_features TEXT, -- KANO Canvas: Better/Enhancing Features
ADD COLUMN IF NOT EXISTS surprise_features TEXT, -- KANO Canvas: Surprise Features
ADD COLUMN IF NOT EXISTS archetype_specific_answer TEXT, -- Dynamic question answer based on archetype
ADD COLUMN IF NOT EXISTS additional_notes TEXT; -- Additional notes/comments

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_idea_submissions_contribution_types ON public.idea_submissions USING GIN(contribution_types);
CREATE INDEX IF NOT EXISTS idx_idea_submissions_project_title ON public.idea_submissions(project_title);
CREATE INDEX IF NOT EXISTS idx_idea_submissions_phone ON public.idea_submissions(phone);
CREATE INDEX IF NOT EXISTS idx_idea_submissions_department ON public.idea_submissions(department);

-- Update table comment
COMMENT ON TABLE public.idea_submissions IS 'Ideas and case proposals with comprehensive 4-step form structure (updated 2025-01-26)';

-- Add column comments for new fields
COMMENT ON COLUMN public.idea_submissions.department IS 'Department from Step 1: Contact Information';
COMMENT ON COLUMN public.idea_submissions.position IS 'Position/Title from Step 1: Contact Information';
COMMENT ON COLUMN public.idea_submissions.phone IS 'Phone number from Step 1: Contact Information';
COMMENT ON COLUMN public.idea_submissions.contribution_types IS 'Array of contribution types (max 2) from Step 1';
COMMENT ON COLUMN public.idea_submissions.creative_output IS 'Selected creative output type from Step 2';
COMMENT ON COLUMN public.idea_submissions.creative_reference IS 'Reference link/file for creative work from Step 2';
COMMENT ON COLUMN public.idea_submissions.digital_product IS 'Selected digital product type from Step 2';
COMMENT ON COLUMN public.idea_submissions.digital_product_reference IS 'Reference link/file for digital product from Step 2';
COMMENT ON COLUMN public.idea_submissions.digital_experience IS 'Selected digital experience type from Step 2';
COMMENT ON COLUMN public.idea_submissions.digital_experience_reference IS 'Reference link/file for digital experience from Step 2';
COMMENT ON COLUMN public.idea_submissions.project_title IS 'Project/Idea/Concept/Proposal Title from Step 4';
COMMENT ON COLUMN public.idea_submissions.problem_need IS 'Need or Problem Definition from Step 4';
COMMENT ON COLUMN public.idea_submissions.must_have_features IS 'KANO Canvas: Must-Have Features from Step 4';
COMMENT ON COLUMN public.idea_submissions.better_features IS 'KANO Canvas: Better/Enhancing Features from Step 4';
COMMENT ON COLUMN public.idea_submissions.surprise_features IS 'KANO Canvas: Surprise Features from Step 4';
COMMENT ON COLUMN public.idea_submissions.archetype_specific_answer IS 'Dynamic question answer based on archetype from Step 4';
COMMENT ON COLUMN public.idea_submissions.additional_notes IS 'Additional notes/comments from Step 4';

