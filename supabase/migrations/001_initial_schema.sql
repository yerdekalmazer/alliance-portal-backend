-- Alliance Portal Database Schema
-- Community-driven project development platform

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. USERS TABLE (extends Supabase Auth)
-- =====================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'alliance', 'user')) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view their own data" 
  ON users FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Admin can view all users" 
  ON users FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- =====================================================
-- 2. CASES TABLE (Project/Case Management)
-- =====================================================

CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  job_types TEXT[] NOT NULL DEFAULT '{}',
  specializations TEXT[] NOT NULL DEFAULT '{}',
  requirements TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  initial_threshold INTEGER DEFAULT 70 CHECK (initial_threshold >= 0 AND initial_threshold <= 100),
  target_team_count INTEGER DEFAULT 3 CHECK (target_team_count >= 1),
  ideal_team_size INTEGER DEFAULT 8 CHECK (ideal_team_size >= 1),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cases
CREATE POLICY "Anyone can view active cases" 
  ON cases FOR SELECT 
  USING (status = 'active');

CREATE POLICY "Admin and alliance can create cases" 
  ON cases FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'alliance')
    )
  );

CREATE POLICY "Admin and alliance can update cases"
  ON cases FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'alliance')
    )
  );

CREATE POLICY "Admin can delete cases"
  ON cases FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 3. TEAM MEMBERS TABLE
-- =====================================================

CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  job_type TEXT NOT NULL,
  role TEXT NOT NULL,
  assessment_status TEXT DEFAULT 'not_started' 
    CHECK (assessment_status IN ('not_started', 'in_progress', 'completed', 'invited')),
  fit_score INTEGER CHECK (fit_score >= 0 AND fit_score <= 100),
  reasons TEXT[],
  survey_url TEXT,
  invited_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_members
CREATE POLICY "Admin and alliance can manage team members"
  ON team_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'alliance')
    )
  );

-- =====================================================
-- 4. SURVEY TEMPLATES TABLE
-- =====================================================

CREATE TABLE survey_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_audience TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_dynamic BOOLEAN DEFAULT false,
  questions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE survey_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for survey_templates
CREATE POLICY "Anyone can view active survey templates"
  ON survey_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage survey templates"
  ON survey_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 5. SURVEY LINKS TABLE
-- =====================================================

CREATE TABLE survey_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES survey_templates(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  target_audience TEXT NOT NULL,
  customizations JSONB,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE survey_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for survey_links
CREATE POLICY "Anyone can view active survey links"
  ON survey_links FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > NOW()));

CREATE POLICY "Admin and alliance can insert survey links"
  ON survey_links FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'alliance')
    )
  );

CREATE POLICY "Admin and alliance can update survey links"
  ON survey_links FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'alliance')
    )
  );

CREATE POLICY "Admin and alliance can delete survey links"
  ON survey_links FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'alliance')
    )
  );

-- =====================================================
-- 6. SURVEY RESPONSES TABLE
-- =====================================================

CREATE TABLE survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_template_id UUID REFERENCES survey_templates(id),
  case_id UUID REFERENCES cases(id),
  participant_id UUID REFERENCES users(id),
  participant_name TEXT NOT NULL,
  participant_email TEXT,
  team_member_id UUID REFERENCES team_members(id),
  responses JSONB NOT NULL DEFAULT '{}',
  questions JSONB,
  score INTEGER,
  status TEXT DEFAULT 'in_progress' 
    CHECK (status IN ('in_progress', 'completed', 'submitted')),
  technical_details JSONB,
  category_scores JSONB,
  completed_at TIMESTAMP,
  submitted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for survey_responses
CREATE POLICY "Users can view their own responses"
  ON survey_responses FOR SELECT
  USING (participant_id = auth.uid() OR participant_email = auth.email());

CREATE POLICY "Anyone can submit survey responses"
  ON survey_responses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own responses"
  ON survey_responses FOR UPDATE
  USING (participant_id = auth.uid() OR participant_email = auth.email());

CREATE POLICY "Admin can view all responses"
  ON survey_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 7. IDEA SUBMISSIONS TABLE (Alliance Partner Ideas)
-- =====================================================

CREATE TABLE idea_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  problem_definition TEXT,
  target_audience TEXT,
  expected_outcome TEXT,
  pm_archetype TEXT,
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  stage TEXT,
  market_size TEXT,
  expected_roi TEXT,
  timeline TEXT,
  budget TEXT,
  tags TEXT[],
  submitted_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE idea_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for idea_submissions
CREATE POLICY "Users can view approved ideas"
  ON idea_submissions FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Users can view their own ideas"
  ON idea_submissions FOR SELECT
  USING (submitted_by = auth.uid());

CREATE POLICY "Users can submit ideas"
  ON idea_submissions FOR INSERT
  WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "Admin can manage all ideas"
  ON idea_submissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- 8. CANVAS TABLE (Idea Canvas Management)
-- =====================================================

CREATE TABLE canvas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES idea_submissions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  problem_definition TEXT NOT NULL,
  solution TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  requirements TEXT[] NOT NULL DEFAULT '{}',
  timeline TEXT NOT NULL,
  resources TEXT[] NOT NULL DEFAULT '{}',
  job_types TEXT[] NOT NULL DEFAULT '{}',
  specializations TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE canvas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for canvas
CREATE POLICY "Admin and alliance can manage canvas"
  ON canvas FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'alliance')
    )
  );

-- =====================================================
-- 9. ASSESSMENT RESULTS TABLE
-- =====================================================

CREATE TABLE assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_name TEXT NOT NULL,
  participant_email TEXT,
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  case_title TEXT NOT NULL,
  team_member_id UUID REFERENCES team_members(id),
  category_id TEXT NOT NULL,
  category_name TEXT NOT NULL,
  scores JSONB NOT NULL DEFAULT '{}',
  total_score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  technical_profile JSONB,
  personal_info JSONB,
  completed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assessment_results
CREATE POLICY "Admin can view all assessment results"
  ON assessment_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Anyone can submit assessment results"
  ON assessment_results FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 10. TEAM SURVEY ASSIGNMENTS TABLE
-- =====================================================

CREATE TABLE team_survey_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  survey_url TEXT NOT NULL,
  custom_message TEXT,
  status TEXT DEFAULT 'pending' 
    CHECK (status IN ('pending', 'sent', 'completed', 'expired')),
  reminders_sent INTEGER DEFAULT 0,
  due_date TIMESTAMP,
  last_reminder_at TIMESTAMP,
  assigned_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE team_survey_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_survey_assignments
CREATE POLICY "Admin and alliance can manage survey assignments"
  ON team_survey_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'alliance')
    )
  );

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Cases indexes
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_created_by ON cases(created_by);
CREATE INDEX idx_cases_created_at ON cases(created_at DESC);

-- Team members indexes
CREATE INDEX idx_team_members_case_id ON team_members(case_id);
CREATE INDEX idx_team_members_email ON team_members(email);
CREATE INDEX idx_team_members_status ON team_members(assessment_status);

-- Survey responses indexes
CREATE INDEX idx_survey_responses_case_id ON survey_responses(case_id);
CREATE INDEX idx_survey_responses_participant ON survey_responses(participant_email);
CREATE INDEX idx_survey_responses_status ON survey_responses(status);

-- Idea submissions indexes
CREATE INDEX idx_idea_submissions_status ON idea_submissions(status);
CREATE INDEX idx_idea_submissions_submitted_by ON idea_submissions(submitted_by);
CREATE INDEX idx_idea_submissions_category ON idea_submissions(category);

-- Assessment results indexes
CREATE INDEX idx_assessment_results_case_id ON assessment_results(case_id);
CREATE INDEX idx_assessment_results_email ON assessment_results(participant_email);

-- =====================================================
-- DATABASE FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update_updated_at to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_survey_templates_updated_at BEFORE UPDATE ON survey_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_idea_submissions_updated_at BEFORE UPDATE ON idea_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canvas_updated_at BEFORE UPDATE ON canvas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INITIAL DATA INSERTS
-- =====================================================

-- Insert default admin user (will be linked to auth.users)
INSERT INTO users (id, email, name, role) VALUES 
  ('00000000-0000-0000-0000-000000000000', 'admin@allianceportal.com', 'System Administrator', 'admin')
  ON CONFLICT (id) DO NOTHING;

-- Insert sample survey templates
INSERT INTO survey_templates (id, type, category, title, description, target_audience, is_active, is_dynamic, questions) VALUES 
  (
    gen_random_uuid(),
    'initial-assessment',
    'evaluation',
    'İlk Değerlendirme Anketi',
    'Katılımcıların temel beceri ve deneyim seviyelerini değerlendiren anket - Case domain\'ine göre dinamik sorular oluşturur',
    'all',
    true,
    true,
    '[
      {
        "id": "q1",
        "type": "mcq",
        "question": "Hangi alanda kendinizi en güçlü hissediyorsunuz?",
        "options": ["Tasarım ve Yaratıcılık", "Yazılım Geliştirme", "Analiz ve Problem Çözme", "İletişim ve Koordinasyon"],
        "required": true,
        "order": 1
      },
      {
        "id": "q2",
        "type": "rating",
        "question": "Genel programlama deneyiminizi 1-5 arasında değerlendirin",
        "required": true,
        "order": 2
      }
    ]'::jsonb
  ),
  (
    gen_random_uuid(),
    'technical-assessment',
    'evaluation',
    'Teknik Değerlendirme Anketi',
    'Detaylı teknik bilgi ve problem çözme yeteneği değerlendirmesi - Qualified adaylar için',
    'participant',
    true,
    true,
    '[
      {
        "id": "t1",
        "type": "mcq",
        "question": "React\'ta Virtual DOM\'un ana avantajı nedir?",
        "options": ["Görsel efektler", "Performans artışı", "Styling", "Veritabanı bağlantısı"],
        "required": true,
        "order": 1
      }
    ]'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

-- Insert sample job types and specializations data
INSERT INTO cases (id, title, description, job_types, specializations, requirements, created_by) VALUES 
  (
    gen_random_uuid(),
    'E-Ticaret Mobil Uygulaması',
    'Modern React Native ile geliştirilmiş kapsamlı e-ticaret platformu. Kullanıcı dostu arayüz ve güvenli ödeme sistemi.',
    ARRAY['Frontend Developer', 'Backend Developer', 'UI/UX Designer'],
    ARRAY['React Native', 'Node.js', 'Mobile Design'],
    ARRAY['Mobil uygulama geliştirme deneyimi', 'E-ticaret domain bilgisi', 'Güvenlik best practices'],
    '00000000-0000-0000-0000-000000000000'
  ),
  (
    gen_random_uuid(),
    'AI Destekli CRM Sistemi',
    'Yapay zeka algoritmaları ile müşteri ilişkilerini yöneten gelişmiş CRM platformu. Otomatik analiz ve raporlama özellikleri.',
    ARRAY['Data Scientist', 'Full Stack Developer', 'Product Manager'],
    ARRAY['Machine Learning', 'Python', 'React', 'Data Analysis'],
    ARRAY['AI/ML deneyimi gerekli', 'CRM sistemleri bilgisi', 'Büyük veri işleme deneyimi'],
    '00000000-0000-0000-0000-000000000000'
  )
  ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- HELPER VIEWS
-- =====================================================

-- View for dashboard statistics
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT 
  (SELECT COUNT(*) FROM users WHERE role = 'user') as total_participants,
  (SELECT COUNT(*) FROM cases WHERE status = 'active') as active_cases,
  (SELECT COUNT(*) FROM survey_responses WHERE status = 'completed') as completed_surveys,
  (SELECT COUNT(*) FROM idea_submissions WHERE status = 'pending') as pending_ideas;

-- View for case statistics
CREATE OR REPLACE VIEW case_stats AS
SELECT 
  c.id,
  c.title,
  c.status,
  COUNT(tm.id) as team_member_count,
  COUNT(CASE WHEN tm.assessment_status = 'completed' THEN 1 END) as completed_assessments,
  COUNT(ar.id) as assessment_results_count
FROM cases c
LEFT JOIN team_members tm ON c.id = tm.case_id
LEFT JOIN assessment_results ar ON c.id = ar.case_id
GROUP BY c.id, c.title, c.status;

-- =====================================================
-- FINAL SETUP
-- =====================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Enable realtime for specific tables (optional)
-- ALTER PUBLICATION supabase_realtime ADD TABLE cases;
-- ALTER PUBLICATION supabase_realtime ADD TABLE survey_responses;

COMMENT ON SCHEMA public IS 'Alliance Portal Database Schema - Community-driven project development platform';

-- End of migration
