-- 013_add_adaptive_survey_template.sql
-- Adaptive Technical Assessment template'ini survey_templates tablosuna ekle

INSERT INTO survey_templates (
    id,
    type,
    title,
    description,
    category,
    target_audience,
    is_dynamic,
    is_active,
    questions,
    created_at,
    updated_at
) VALUES (
    'adaptive-technical-assessment',
    'adaptive-technical-assessment',
    'Aşamalı Teknik Değerlendirme Anketi',
    'Job type bazlı aşamalı teknik değerlendirme: Başlangıç sorularında başarılı olanlar advanced seviyeye geçer, her aşama ayrı puanlanır.',
    'evaluation',
    'participant',
    true,
    true,
    '[]'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    target_audience = EXCLUDED.target_audience,
    is_dynamic = EXCLUDED.is_dynamic,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();