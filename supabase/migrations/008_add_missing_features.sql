-- 008_add_missing_features.sql
-- Add missing features that are not in previous migrations

-- =====================================================
-- 1. Add question_bank_questions table (if not exists from 002)
-- =====================================================

DO $$ 
BEGIN
    -- Check if question_bank_questions table exists, if not create it
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'question_bank_questions') THEN
        
        CREATE TABLE question_bank_questions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          question TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('single-choice', 'multiple-choice', 'text', 'number', 'email', 'scale', 'boolean')),
          category TEXT NOT NULL,
          difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
          points INTEGER DEFAULT 0,
          job_type TEXT,
          domain TEXT,
          options JSONB,
          correct JSONB,
          explanation TEXT,
          tags TEXT[] DEFAULT '{}',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Enable RLS
        ALTER TABLE question_bank_questions ENABLE ROW LEVEL SECURITY;

        -- RLS Policies
        CREATE POLICY "Anyone can view active questions"
          ON question_bank_questions FOR SELECT
          USING (is_active = true);

        CREATE POLICY "Admin and alliance can manage questions"
          ON question_bank_questions FOR ALL
          USING (
            EXISTS (
              SELECT 1 FROM users 
              WHERE id = auth.uid() AND role IN ('admin', 'alliance')
            )
          );

        -- Create indexes
        CREATE INDEX idx_question_bank_category ON question_bank_questions(category);
        CREATE INDEX idx_question_bank_domain ON question_bank_questions(domain);
        CREATE INDEX idx_question_bank_job_type ON question_bank_questions(job_type);
        CREATE INDEX idx_question_bank_difficulty ON question_bank_questions(difficulty);

        -- Create trigger for updated_at
        CREATE TRIGGER update_question_bank_questions_updated_at 
          BEFORE UPDATE ON question_bank_questions
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

        RAISE NOTICE 'question_bank_questions table created successfully!';
    ELSE
        RAISE NOTICE 'question_bank_questions table already exists, skipping creation.';
    END IF;
END $$;

-- =====================================================
-- 2. Add applications table (if not exists from 005)
-- =====================================================

DO $$ 
BEGIN
    -- Check if applications table exists, if not create it
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'applications') THEN
        
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

        -- RLS Policies
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

        -- Create indexes
        CREATE INDEX idx_applications_case_id ON applications(case_id);
        CREATE INDEX idx_applications_participant_email ON applications(participant_email);
        CREATE INDEX idx_applications_status ON applications(status);
        CREATE INDEX idx_applications_created_at ON applications(created_at);

        -- Create trigger for updated_at
        CREATE TRIGGER update_applications_updated_at 
          BEFORE UPDATE ON applications
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

        RAISE NOTICE 'applications table created successfully!';
    ELSE
        RAISE NOTICE 'applications table already exists, skipping creation.';
    END IF;
END $$;

-- =====================================================
-- 3. Add domain field to cases table (if not exists from 003)
-- =====================================================

DO $$ 
BEGIN
    -- Check if domain column exists in cases table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cases' AND column_name = 'domain'
    ) THEN
        
        -- Add domain field to cases table
        ALTER TABLE cases ADD COLUMN domain TEXT;

        -- Add constraints for domain values
        ALTER TABLE cases ADD CONSTRAINT check_domain 
          CHECK (domain IS NULL OR domain IN (
            'gorsel-tasarim', 'video-icerigi', 'animasyon', 'kisa-film', 'cizgi-film', 
            'belgesel-filmi', 'podcast', 'ses-ve-muzik', 'dijital-enstalasyon',
            'ui-ux-tasarimi', 'oyun', 'ar-vr-uygulamalari', 'interaktif-video',
            'web-platformu', 'mobil-uygulama', 'masaustu-uygulamalari', 
            'yapay-zeka-uygulamalari', 'blockchain-uygulamalari', 'entegrasyon-yazilimlari',
            'dijital-varliklar', 'dijital-materyaller'
          ));

        -- Add index for better performance
        CREATE INDEX idx_cases_domain ON cases(domain);

        -- Update existing cases with default values if needed
        UPDATE cases 
        SET domain = 'web-platformu'
        WHERE domain IS NULL;

        RAISE NOTICE 'domain column added to cases table successfully!';
    ELSE
        RAISE NOTICE 'domain column already exists in cases table, skipping addition.';
    END IF;
END $$;

-- =====================================================
-- 4. Ensure application-initial-assessment survey template exists (from 004)
-- =====================================================

DO $$ 
BEGIN
    -- Check if application-initial-assessment template exists
    IF NOT EXISTS (
        SELECT 1 FROM survey_templates 
        WHERE type = 'application-initial-assessment'
    ) THEN
        
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
        ) VALUES (
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
        );

        RAISE NOTICE 'application-initial-assessment survey template created successfully!';
    ELSE
        RAISE NOTICE 'application-initial-assessment survey template already exists, skipping creation.';
    END IF;
END $$;

-- =====================================================
-- 5. Insert sample question bank data (if table is empty)
-- =====================================================

DO $$ 
BEGIN
    -- Check if question_bank_questions table has data
    IF NOT EXISTS (SELECT 1 FROM question_bank_questions LIMIT 1) THEN
        
        -- Insert sample questions
        INSERT INTO question_bank_questions (
            question, type, category, difficulty, points, job_type, domain, options, correct
        ) VALUES
        
        -- PERSONAL INFO QUESTIONS
        ('Ad Soyad', 'text', 'personal-info', 'easy', 0, null, null, null, null),
        ('E-posta Adresi', 'email', 'personal-info', 'easy', 0, null, null, null, null),
        ('Telefon Numarası', 'text', 'personal-info', 'easy', 0, null, null, null, null),
        ('Yaş', 'number', 'personal-info', 'easy', 0, null, null, null, null),
        ('Şehir', 'text', 'personal-info', 'easy', 0, null, null, null, null),
        ('Deneyim Seviyesi', 'single-choice', 'personal-info', 'easy', 0, null, null, 
         '["Yeni başlayan (0-1 yıl)", "Orta düzey (2-4 yıl)", "İleri düzey (5+ yıl)"]'::jsonb, null),
        ('Çalışma Tercihi', 'single-choice', 'personal-info', 'easy', 0, null, null,
         '["Tam zamanlı", "Yarı zamanlı", "Proje bazlı", "Staj"]'::jsonb, null),
         
        -- GENERAL ASSESSMENT QUESTIONS
        ('Problem çözme yaklaşımınızı tanımlayın', 'single-choice', 'initial-assessment', 'medium', 15, null, null,
         '["Analitik ve sistematik", "Yaratıcı ve esnek", "Deneyime dayalı", "Takım odaklı"]'::jsonb, 
         '["Analitik ve sistematik"]'::jsonb),
        
        ('Yeni teknolojileri öğrenme hızınız nasıl?', 'single-choice', 'initial-assessment', 'easy', 5, null, null,
         '["Çok hızlı", "Orta", "Yavaş ama etkili", "Zorlanırım"]'::jsonb, 
         '["Çok hızlı", "Orta"]'::jsonb),
         
        -- VISUAL DESIGN DOMAIN QUESTIONS
        ('Hangi tasarım programlarını kullanabilirsiniz?', 'multiple-choice', 'initial-assessment', 'medium', 10, 'Tasarımcı', 'gorsel-tasarim',
         '["Adobe Photoshop", "Adobe Illustrator", "Figma", "Sketch", "Canva"]'::jsonb, 
         '["Adobe Photoshop", "Adobe Illustrator", "Figma"]'::jsonb),

        ('Renk teorisi hakkında bilginiz var mı?', 'single-choice', 'initial-assessment', 'medium', 15, 'Tasarımcı', 'gorsel-tasarim',
         '["Çok iyi", "Orta düzey", "Temel", "Hiç yok"]'::jsonb, 
         '["Çok iyi", "Orta düzey"]'::jsonb),
         
        -- WEB PLATFORM DOMAIN QUESTIONS
        ('Hangi programlama dillerini biliyorsunuz?', 'multiple-choice', 'initial-assessment', 'medium', 10, 'Developer', 'web-platformu',
         '["JavaScript", "Python", "PHP", "Java", "C#", "Go"]'::jsonb, 
         '["JavaScript", "Python"]'::jsonb),

        ('Frontend framework deneyiminiz nedir?', 'multiple-choice', 'initial-assessment', 'medium', 15, 'Frontend Developer', 'web-platformu',
         '["React", "Vue.js", "Angular", "Svelte", "Next.js"]'::jsonb, 
         '["React", "Vue.js"]'::jsonb),
         
        -- GAME DOMAIN QUESTIONS
        ('Oyun geliştirme engine deneyiminiz var mı?', 'multiple-choice', 'initial-assessment', 'medium', 15, 'Game Developer', 'oyun',
         '["Unity", "Unreal Engine", "Godot", "GameMaker", "Custom Engine"]'::jsonb, 
         '["Unity", "Unreal Engine"]'::jsonb),

        ('Oyun tasarımında hangi elementler önemlidir?', 'multiple-choice', 'initial-assessment', 'hard', 20, 'Game Designer', 'oyun',
         '["Gameplay mekaniği", "Seviye tasarımı", "Karakter gelişimi", "Hikaye anlatımı", "Oyuncu deneyimi"]'::jsonb, 
         '["Gameplay mekaniği", "Seviye tasarımı", "Oyuncu deneyimi"]'::jsonb),
         
        -- MOBILE APP DOMAIN QUESTIONS
        ('Mobil uygulama geliştirme deneyiminiz var mı?', 'single-choice', 'initial-assessment', 'medium', 15, 'Mobile Developer', 'mobil-uygulama',
         '["Native iOS", "Native Android", "React Native", "Flutter", "Hiç yok"]'::jsonb, 
         '["Native iOS", "Native Android", "React Native", "Flutter"]'::jsonb);

        RAISE NOTICE 'Sample question bank data inserted successfully!';
    ELSE
        RAISE NOTICE 'Question bank already contains data, skipping sample data insertion.';
    END IF;
END $$;

-- =====================================================
-- 6. Insert sample cases (if table is empty or has few records)
-- =====================================================

DO $$ 
DECLARE
    case_count INTEGER;
BEGIN
    -- Check case count
    SELECT COUNT(*) INTO case_count FROM cases;
    
    IF case_count < 3 THEN
        
        -- Insert sample cases
        INSERT INTO cases (
            title, description, domain, job_types, specializations, requirements, 
            initial_threshold, target_team_count, ideal_team_size, status
        ) 
        SELECT * FROM (VALUES
            ('E-ticaret Web Platformu', 
             'Modern bir e-ticaret platformu geliştirme projesi. React, Node.js ve PostgreSQL kullanılacak.',
             'web-platformu',
             '["Frontend Developer", "Backend Developer", "UI/UX Designer"]',
             '["React", "Node.js", "PostgreSQL", "REST API"]',
             '["JavaScript bilgisi", "Modern web teknolojileri deneyimi", "Responsive design"]',
             75, 8, 5, 'active'),
             
            ('Mobil Oyun Uygulaması',
             'Cross-platform mobil oyun uygulaması. Unity ve C# ile geliştirilecek.',
             'oyun',
             '["Game Developer", "Mobile Developer", "Game Designer", "2D Artist"]',
             '["Unity", "C#", "Mobile Gaming", "2D Graphics"]',
             '["Unity deneyimi", "C# programlama", "Mobil platform bilgisi"]',
             70, 6, 4, 'active'),
             
            ('Kurumsal Web Tasarım Projesi',
             'Kurumsal kimlik ve web tasarımı projesi. Modern görsel tasarım yaklaşımları kullanılacak.',
             'gorsel-tasarim',
             '["Grafik Tasarımcı", "UI/UX Designer", "Web Designer"]',
             '["Adobe Creative Suite", "Figma", "Web Design", "Branding"]',
             '["Tasarım programları bilgisi", "Görsel kimlik çalışması deneyimi"]',
             65, 4, 3, 'active')
        ) AS v(title, description, domain, job_types, specializations, requirements, initial_threshold, target_team_count, ideal_team_size, status)
        WHERE NOT EXISTS (SELECT 1 FROM cases WHERE title = v.title);

        RAISE NOTICE 'Sample cases inserted successfully!';
    ELSE
        RAISE NOTICE 'Cases table already has sufficient data, skipping sample data insertion.';
    END IF;
END $$;

-- =====================================================
-- 7. Insert sample survey links (if template and cases exist)
-- =====================================================

DO $$
DECLARE
    template_id UUID;
    case_id_1 UUID;
    case_id_2 UUID;
    case_id_3 UUID;
    link_count INTEGER;
BEGIN
    -- Check existing survey links count
    SELECT COUNT(*) INTO link_count FROM survey_links;
    
    IF link_count < 3 THEN
        -- Get template and case IDs
        SELECT id INTO template_id FROM survey_templates WHERE type = 'application-initial-assessment' LIMIT 1;
        SELECT id INTO case_id_1 FROM cases WHERE title = 'E-ticaret Web Platformu' LIMIT 1;
        SELECT id INTO case_id_2 FROM cases WHERE title = 'Mobil Oyun Uygulaması' LIMIT 1;
        SELECT id INTO case_id_3 FROM cases WHERE title = 'Kurumsal Web Tasarım Projesi' LIMIT 1;
        
        IF template_id IS NOT NULL AND case_id_1 IS NOT NULL THEN
            -- Insert survey links
            INSERT INTO survey_links (
                template_id, case_id, title, description, url, is_active, 
                max_participants, current_participants, target_audience, expires_at
            ) 
            SELECT * FROM (VALUES
                (template_id, case_id_1,
                 'E-ticaret Projesi - Başvuru ve İlk Değerlendirme',
                 'E-ticaret web platformu projesi için başvuru anketi. Kişisel bilgilerinizi ve teknik yeterliliklerinizi değerlendiriyoruz.',
                 'eticaret-web-2024',
                 true, 50, 0,
                 'Web Developers, UI/UX Designers',
                 (NOW() + INTERVAL '30 days')),
                 
                (template_id, case_id_2,
                 'Mobil Oyun Projesi - Başvuru ve İlk Değerlendirme',
                 'Cross-platform mobil oyun projesi için başvuru anketi. Oyun geliştirme deneyiminizi ve yaratıcılığınızı değerlendiriyoruz.',
                 'mobil-oyun-2024',
                 true, 30, 0,
                 'Game Developers, Mobile Developers, Game Designers',
                 (NOW() + INTERVAL '45 days')),
                 
                (template_id, case_id_3,
                 'Kurumsal Tasarım Projesi - Başvuru ve İlk Değerlendirme',
                 'Kurumsal web tasarım projesi için başvuru anketi. Tasarım yeteneklerinizi ve portföyünüzü değerlendiriyoruz.',
                 'tasarim-2024',
                 true, 20, 0,
                 'Graphic Designers, UI/UX Designers, Web Designers',
                 (NOW() + INTERVAL '60 days'))
            ) AS v(template_id, case_id, title, description, url, is_active, max_participants, current_participants, target_audience, expires_at)
            WHERE NOT EXISTS (SELECT 1 FROM survey_links WHERE url = v.url);

            RAISE NOTICE 'Sample survey links created successfully!';
        ELSE
            RAISE NOTICE 'Required template or cases not found, skipping survey links creation.';
        END IF;
    ELSE
        RAISE NOTICE 'Survey links already exist, skipping sample data insertion.';
    END IF;
END $$;

-- =====================================================
-- MIGRATION COMPLETED
-- =====================================================

-- Final verification and summary
DO $$
DECLARE
    tables_count INTEGER;
    questions_count INTEGER;
    cases_count INTEGER;
    links_count INTEGER;
    templates_count INTEGER;
BEGIN
    -- Count key objects
    SELECT COUNT(*) INTO tables_count FROM information_schema.tables 
    WHERE table_name IN ('users', 'cases', 'survey_templates', 'survey_responses', 'survey_links', 'question_bank_questions', 'applications');
    
    SELECT COUNT(*) INTO questions_count FROM question_bank_questions;
    SELECT COUNT(*) INTO cases_count FROM cases;
    SELECT COUNT(*) INTO links_count FROM survey_links;
    SELECT COUNT(*) INTO templates_count FROM survey_templates WHERE type = 'application-initial-assessment';
    
    RAISE NOTICE '====================================';
    RAISE NOTICE 'MIGRATION 008 COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Tables created/verified: %', tables_count;
    RAISE NOTICE 'Question bank questions: %', questions_count;
    RAISE NOTICE 'Sample cases: %', cases_count;
    RAISE NOTICE 'Survey links: %', links_count;
    RAISE NOTICE 'Application templates: %', templates_count;
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Available survey links for testing:';
    RAISE NOTICE '1. http://localhost:5173/survey/eticaret-web-2024';
    RAISE NOTICE '2. http://localhost:5173/survey/mobil-oyun-2024';
    RAISE NOTICE '3. http://localhost:5173/survey/tasarim-2024';
    RAISE NOTICE '====================================';
END $$;
