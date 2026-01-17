-- Add leadership_type column to survey_responses table
-- This column stores the dominant leadership type determined from survey analysis

-- Add leadership_type column
ALTER TABLE public.survey_responses
ADD COLUMN IF NOT EXISTS leadership_type VARCHAR(100);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_survey_responses_leadership_type 
ON public.survey_responses(leadership_type);

-- Add comment for documentation
COMMENT ON COLUMN public.survey_responses.leadership_type IS 'Dominant leadership type identified from survey analysis (e.g., Technical Leader, Strategic Leader, People Leader)';
