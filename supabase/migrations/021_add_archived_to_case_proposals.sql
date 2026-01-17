-- Add archived column to idea_submissions table
-- This allows soft deletion of case proposals by moving them to archive

-- Add archived column
ALTER TABLE public.idea_submissions 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Add archived_at timestamp
ALTER TABLE public.idea_submissions 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Create index for better query performance on archived status
CREATE INDEX IF NOT EXISTS idx_idea_submissions_archived ON public.idea_submissions(archived);

-- Update existing submissions to not be archived by default
UPDATE public.idea_submissions 
SET archived = FALSE 
WHERE archived IS NULL;

-- Automatically archive all rejected submissions
UPDATE public.idea_submissions 
SET archived = TRUE, 
    archived_at = NOW()
WHERE status = 'rejected' AND archived = FALSE;

-- Add comment
COMMENT ON COLUMN public.idea_submissions.archived IS 'Indicates if the idea submission is archived (soft delete)';
COMMENT ON COLUMN public.idea_submissions.archived_at IS 'Timestamp when the idea submission was archived';
