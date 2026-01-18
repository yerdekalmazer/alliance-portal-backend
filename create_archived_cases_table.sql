-- Archived Cases Tablosu
CREATE TABLE IF NOT EXISTS archived_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  
  -- Otomatik hesaplanan metrikler
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  team_size INTEGER DEFAULT 0,
  performance_score INTEGER DEFAULT 0,
  application_count INTEGER DEFAULT 0,
  
  -- Manuel düzenlenebilir alanlar
  client_satisfaction INTEGER DEFAULT 0,
  duration INTEGER DEFAULT 0,
  notes TEXT,
  
  -- JSON alanlar
  project_files JSONB DEFAULT '[]'::jsonb,
  project_outputs JSONB DEFAULT '[]'::jsonb,
  lessons_learned JSONB DEFAULT '[]'::jsonb,
  deliverables JSONB DEFAULT '[]'::jsonb,
  technologies_used JSONB DEFAULT '[]'::jsonb,
  tags JSONB DEFAULT '[]'::jsonb,
  team_members JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: bir case sadece bir kez arşivlenebilir
  UNIQUE(case_id)
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_archived_cases_case_id ON archived_cases(case_id);
CREATE INDEX IF NOT EXISTS idx_archived_cases_archived_at ON archived_cases(archived_at DESC);
CREATE INDEX IF NOT EXISTS idx_archived_cases_performance ON archived_cases(performance_score DESC);

-- RLS (Row Level Security) - Herkes okuyabilir, sadece admin düzenleyebilir
ALTER TABLE archived_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view archived cases" ON archived_cases
  FOR SELECT USING (true);

CREATE POLICY "Only admins can insert archived cases" ON archived_cases
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'role' = 'alliance'
  );

CREATE POLICY "Only admins can update archived cases" ON archived_cases
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'admin' OR 
    auth.jwt() ->> 'role' = 'alliance'
  );

CREATE POLICY "Only admins can delete archived cases" ON archived_cases
  FOR DELETE USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_archived_cases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_archived_cases_updated_at
  BEFORE UPDATE ON archived_cases
  FOR EACH ROW
  EXECUTE FUNCTION update_archived_cases_updated_at();
