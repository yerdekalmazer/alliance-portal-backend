-- 004_add_application_initial_survey.sql
-- Add Başvuru ve İlk Değerlendirme Anketi template

-- Insert the new survey template (check if exists first)
INSERT INTO survey_templates (
  id,
  type,
  category,
  title,
  description,
  target_audience,
  is_active,
  is_dynamic,
  questions,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  'application-initial-assessment',
  'evaluation',
  'Başvuru ve İlk Değerlendirme Anketi',
  'Kişisel bilgi soruları ve case domain''ine göre 10 rastgele değerlendirme sorusu.',
  'all',
  true,
  true,
  '[]'::jsonb,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM survey_templates WHERE type = 'application-initial-assessment'
);
