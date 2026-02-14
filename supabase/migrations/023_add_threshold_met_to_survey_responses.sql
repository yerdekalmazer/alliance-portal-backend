-- Add threshold_met column to survey_responses table
ALTER TABLE survey_responses 
ADD COLUMN IF NOT EXISTS threshold_met BOOLEAN DEFAULT false;

-- Update existing records based on score (assuming default threshold of 50 for now, manual update might be needed for specific cases)
-- This is a best-effort update for existing data
UPDATE survey_responses
SET threshold_met = (COALESCE(score, 0) >= 50)
WHERE threshold_met IS NULL;
