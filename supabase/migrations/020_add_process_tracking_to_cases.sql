-- Track process state for cases; DB-driven steps
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS current_step TEXT, -- e.g., 'idea-submitted','approved','applications','team-forming','in-development','archived'
ADD COLUMN IF NOT EXISTS process_state JSONB, -- structured steps with status/date/notes
ADD COLUMN IF NOT EXISTS last_progress_update TIMESTAMP;

COMMENT ON COLUMN cases.current_step IS 'Current process step for Alliance UI';
COMMENT ON COLUMN cases.process_state IS 'Structured process steps data for UI timelines';
COMMENT ON COLUMN cases.last_progress_update IS 'Last time process state updated';

