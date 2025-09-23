-- 005_create_applications_table.sql
-- Create applications table for survey-based applications

CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  participant_email TEXT NOT NULL,
  survey_response_id UUID REFERENCES survey_responses(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected')),
  score INTEGER,
  threshold_met BOOLEAN DEFAULT false,
  personal_info JSONB,
  assessment_responses JSONB,
  notes TEXT,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for applications
CREATE POLICY "Anyone can view applications"
  ON applications FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create applications"
  ON applications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin and alliance can update applications"
  ON applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'alliance')
    )
  );

CREATE POLICY "Admin and alliance can delete applications"
  ON applications FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'alliance')
    )
  );

-- Indexes for performance
CREATE INDEX idx_applications_case_id ON applications(case_id);
CREATE INDEX idx_applications_participant_email ON applications(participant_email);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_created_at ON applications(created_at);

-- Trigger for updated_at
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

