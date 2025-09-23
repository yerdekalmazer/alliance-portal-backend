-- Add idea_id to cases and link to idea_submissions for permanent idea→case mapping
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS idea_id UUID;

-- FK to idea_submissions(id); on delete set null to keep historical cases if idea is removed
DO $$
BEGIN
  ALTER TABLE cases
  ADD CONSTRAINT fk_cases_idea_id
  FOREIGN KEY (idea_id) REFERENCES idea_submissions(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Helpful index for lookups from idea → case
CREATE INDEX IF NOT EXISTS idx_cases_idea_id ON cases(idea_id);

COMMENT ON COLUMN cases.idea_id IS 'Origin idea submission id for this case';

