-- 014_create_adaptive_assessment_responses.sql
-- Aşamalı Teknik Değerlendirme Anketi için özel tablo

-- Adaptive Assessment Responses tablosunu oluştur
CREATE TABLE adaptive_assessment_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- İlişkiler
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    survey_link_id UUID, -- Survey link referansı (opsiyonel)
    
    -- Katılımcı bilgileri
    participant_name TEXT NOT NULL,
    participant_email TEXT NOT NULL,
    
    -- Assessment metadata
    job_types TEXT[] NOT NULL, -- Test edilen job type'lar
    assessment_type TEXT DEFAULT 'adaptive-technical-assessment',
    
    -- Ham cevaplar (her sorunun cevabı)
    raw_responses JSONB NOT NULL DEFAULT '{}',
    
    -- Aşama bazlı skorlar
    phase_scores JSONB NOT NULL DEFAULT '{}', -- {jobType_phase: {score, maxScore, percentage, hasAccess}}
    
    -- Analiz sonuçları
    analysis_results JSONB DEFAULT '{}', -- Backend'den gelen analiz sonuçları
    
    -- Özet veriler
    overall_score INTEGER DEFAULT 0,
    max_possible_score INTEGER DEFAULT 0,
    overall_percentage INTEGER DEFAULT 0,
    
    -- Aşama tamamlama durumu
    phase_completion_status JSONB DEFAULT '{"basic": false, "advanced": false, "leadership": false, "character": false}',
    
    -- Güçlü ve gelişim alanları
    strongest_areas TEXT[],
    improvement_areas TEXT[],
    
    -- Gelişim önerileri
    development_recommendations JSONB DEFAULT '{}', -- Job type bazlı öneriler
    progressive_development JSONB DEFAULT '{"short_term": [], "medium_term": [], "long_term": []}',
    
    -- Assessment durumu
    status TEXT DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed', 'submitted')),
    
    -- Zaman damgaları
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- İndeksler oluştur
CREATE INDEX idx_adaptive_assessment_responses_case_id ON adaptive_assessment_responses(case_id);
CREATE INDEX idx_adaptive_assessment_responses_participant_email ON adaptive_assessment_responses(participant_email);
CREATE INDEX idx_adaptive_assessment_responses_created_at ON adaptive_assessment_responses(created_at);
CREATE INDEX idx_adaptive_assessment_responses_status ON adaptive_assessment_responses(status);

-- Updated_at trigger'ı oluştur
CREATE OR REPLACE FUNCTION update_adaptive_assessment_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_adaptive_assessment_responses_updated_at
    BEFORE UPDATE ON adaptive_assessment_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_adaptive_assessment_responses_updated_at();

-- RLS (Row Level Security) politikaları oluştur
ALTER TABLE adaptive_assessment_responses ENABLE ROW LEVEL SECURITY;

-- Admin'ler tüm kayıtları görebilir
CREATE POLICY "Admins can view all adaptive assessment responses" ON adaptive_assessment_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Kullanıcılar sadece kendi case'lerine bağlı kayıtları görebilir
CREATE POLICY "Users can view their case adaptive assessment responses" ON adaptive_assessment_responses
    FOR SELECT USING (
        case_id IN (
            SELECT c.id FROM cases c
            WHERE c.created_by = auth.uid()
        )
    );

-- Admin ve alliance rolleri kayıt ekleyebilir
CREATE POLICY "Admins and alliance can insert adaptive assessment responses" ON adaptive_assessment_responses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role IN ('admin', 'alliance')
        )
    );

-- Herkese survey response ekleme izni (public survey için)
CREATE POLICY "Anyone can submit adaptive assessment responses" ON adaptive_assessment_responses
    FOR INSERT WITH CHECK (true);

-- Admin'ler ve case sahipleri güncelleyebilir
CREATE POLICY "Admins and case owners can update adaptive assessment responses" ON adaptive_assessment_responses
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR
        case_id IN (
            SELECT c.id FROM cases c
            WHERE c.created_by = auth.uid()
        )
    );

-- Adaptive assessment için örnek view oluştur (analiz için)
CREATE OR REPLACE VIEW adaptive_assessment_summary AS
SELECT 
    aar.id,
    aar.case_id,
    c.title as case_title,
    aar.participant_name,
    aar.participant_email,
    aar.job_types,
    aar.overall_percentage,
    aar.strongest_areas,
    aar.improvement_areas,
    aar.status,
    aar.completed_at,
    aar.created_at,
    -- Phase completion summary
    (aar.phase_completion_status->>'basic')::boolean as basic_completed,
    (aar.phase_completion_status->>'advanced')::boolean as advanced_completed,  
    (aar.phase_completion_status->>'leadership')::boolean as leadership_completed,
    (aar.phase_completion_status->>'character')::boolean as character_completed,
    -- Job type count
    array_length(aar.job_types, 1) as job_types_count
FROM adaptive_assessment_responses aar
LEFT JOIN cases c ON aar.case_id = c.id;

-- Başarılı mesaj
RAISE NOTICE 'Adaptive Assessment Responses table created successfully!';
