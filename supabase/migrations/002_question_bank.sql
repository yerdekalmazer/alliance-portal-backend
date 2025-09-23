-- Question Bank dedicated tables
-- Run this migration on Supabase: psql or SQL editor

-- 1) QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS question_bank_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- basic
  question TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mcq','textarea','scenario','priority','approach')),
  category TEXT NOT NULL CHECK (category IN (
    'initial-assessment','first-stage-technical','leadership-scenarios','advanced-technical'
  )),
  difficulty TEXT NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy','medium','hard','expert')),
  points INTEGER NOT NULL DEFAULT 20 CHECK (points >= 0 AND points <= 100),
  -- classification
  job_type TEXT DEFAULT 'Genel',
  domain TEXT NULL,
  is_first_stage BOOLEAN DEFAULT false,
  required_for_next BOOLEAN DEFAULT false,
  -- answers & scoring
  options JSONB NULL,
  correct JSONB NULL,
  leadership_scoring JSONB NULL,
  -- metadata
  created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- triggers for updated_at
DO $$ BEGIN
  CREATE TRIGGER update_question_bank_questions_updated_at
  BEFORE UPDATE ON question_bank_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_qbq_category ON question_bank_questions(category);
CREATE INDEX IF NOT EXISTS idx_qbq_type ON question_bank_questions(type);
CREATE INDEX IF NOT EXISTS idx_qbq_job_type ON question_bank_questions(job_type);
CREATE INDEX IF NOT EXISTS idx_qbq_domain ON question_bank_questions(domain);
CREATE INDEX IF NOT EXISTS idx_qbq_created_at ON question_bank_questions(created_at DESC);

-- Enable RLS
ALTER TABLE question_bank_questions ENABLE ROW LEVEL SECURITY;

-- Policies
-- Anyone can read question bank
DO $$ BEGIN
  CREATE POLICY "Anyone can read question bank"
  ON question_bank_questions FOR SELECT
  USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Admin and alliance can manage
DO $$ BEGIN
  CREATE POLICY "Admin and alliance can manage question bank"
  ON question_bank_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','alliance')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','alliance')
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) OPTIONAL: GROUP/TEMPLATE TABLE (logical grouping of questions)
CREATE TABLE IF NOT EXISTS question_bank_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  -- arbitrary grouping criteria
  filters JSONB NULL,
  question_ids UUID[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

DO $$ BEGIN
  CREATE TRIGGER update_question_bank_sets_updated_at
  BEFORE UPDATE ON question_bank_sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE question_bank_sets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read question bank sets"
  ON question_bank_sets FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admin and alliance can manage question bank sets"
  ON question_bank_sets FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','alliance'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin','alliance'))
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Helper view (optional): quick counts per category
CREATE OR REPLACE VIEW question_bank_stats AS
SELECT 
  category,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE difficulty = 'easy')   AS easy,
  COUNT(*) FILTER (WHERE difficulty = 'medium') AS medium,
  COUNT(*) FILTER (WHERE difficulty = 'hard')   AS hard,
  COUNT(*) FILTER (WHERE difficulty = 'expert') AS expert
FROM question_bank_questions
GROUP BY category
ORDER BY category;


