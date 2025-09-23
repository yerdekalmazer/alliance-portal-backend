-- 007_sample_cases_and_links.sql
-- Sample case ve survey link verilerini ekle

DO $$ 
DECLARE
    case_id_1 UUID;
    case_id_2 UUID;
    case_id_3 UUID;
    template_id UUID;
BEGIN
    -- Eğer cases tablosu boşsa sample veriler ekle
    IF NOT EXISTS (SELECT 1 FROM cases LIMIT 1) THEN
        
        -- SAMPLE CASES EKLEME
        INSERT INTO cases (
            title, description, domain, job_types, specializations, requirements, 
            initial_threshold, target_team_count, ideal_team_size, status
        ) VALUES
        (
            'E-ticaret Web Platformu',
            'Modern bir e-ticaret platformu geliştirme projesi. React, Node.js ve PostgreSQL kullanılacak.',
            'web-platformu',
            '["Frontend Developer", "Backend Developer", "UI/UX Designer"]',
            '["React", "Node.js", "PostgreSQL", "REST API"]',
            '["JavaScript bilgisi", "Modern web teknolojileri deneyimi", "Responsive design"]',
            75,
            8,
            5,
            'active'
        ),
        (
            'Mobil Oyun Uygulaması',
            'Cross-platform mobil oyun uygulaması. Unity ve C# ile geliştirilecek.',
            'oyun',
            '["Game Developer", "Mobile Developer", "Game Designer", "2D Artist"]',
            '["Unity", "C#", "Mobile Gaming", "2D Graphics"]',
            '["Unity deneyimi", "C# programlama", "Mobil platform bilgisi"]',
            70,
            6,
            4,
            'active'
        ),
        (
            'Kurumsal Web Tasarım Projesi',
            'Kurumsal kimlik ve web tasarımı projesi. Modern görsel tasarım yaklaşımları kullanılacak.',
            'gorsel-tasarim',
            '["Grafik Tasarımcı", "UI/UX Designer", "Web Designer"]',
            '["Adobe Creative Suite", "Figma", "Web Design", "Branding"]',
            '["Tasarım programları bilgisi", "Görsel kimlik çalışması deneyimi"]',
            65,
            4,
            3,
            'active'
        )
        RETURNING id INTO case_id_1;

        -- Case ID'leri al (multiple returning olmadığı için tek tek alacağız)
        SELECT id INTO case_id_1 FROM cases WHERE title = 'E-ticaret Web Platformu';
        SELECT id INTO case_id_2 FROM cases WHERE title = 'Mobil Oyun Uygulaması';
        SELECT id INTO case_id_3 FROM cases WHERE title = 'Kurumsal Web Tasarım Projesi';

        RAISE NOTICE 'Sample cases created: %, %, %', case_id_1, case_id_2, case_id_3;

        -- APPLICATION-INITIAL-ASSESSMENT SURVEY TEMPLATE ID'sini al
        SELECT id INTO template_id FROM survey_templates WHERE type = 'application-initial-assessment' LIMIT 1;
        
        IF template_id IS NOT NULL THEN
            -- SAMPLE SURVEY LINKS EKLEME
            INSERT INTO survey_links (
                template_id, case_id, title, description, url, is_active, 
                max_participants, current_participants, target_audience, expires_at
            ) VALUES
            (
                template_id,
                case_id_1,
                'E-ticaret Projesi - Başvuru ve İlk Değerlendirme',
                'E-ticaret web platformu projesi için başvuru anketi. Kişisel bilgilerinizi ve teknik yeterliliklerinizi değerlendiriyoruz.',
                'eticaret-web-platform-2024',
                true,
                50,
                0,
                'Web Developers, UI/UX Designers',
                (NOW() + INTERVAL '30 days')
            ),
            (
                template_id,
                case_id_2,
                'Mobil Oyun Projesi - Başvuru ve İlk Değerlendirme',
                'Cross-platform mobil oyun projesi için başvuru anketi. Oyun geliştirme deneyiminizi ve yaratıcılığınızı değerlendiriyoruz.',
                'mobil-oyun-unity-2024',
                true,
                30,
                0,
                'Game Developers, Mobile Developers, Game Designers',
                (NOW() + INTERVAL '45 days')
            ),
            (
                template_id,
                case_id_3,
                'Kurumsal Tasarım Projesi - Başvuru ve İlk Değerlendirme',
                'Kurumsal web tasarım projesi için başvuru anketi. Tasarım yeteneklerinizi ve portföyünüzü değerlendiriyoruz.',
                'kurumsal-web-tasarim-2024',
                true,
                20,
                0,
                'Graphic Designers, UI/UX Designers, Web Designers',
                (NOW() + INTERVAL '60 days')
            );

            RAISE NOTICE 'Sample survey links created for application-initial-assessment template!';
        ELSE
            RAISE NOTICE 'No application-initial-assessment template found, skipping survey links creation.';
        END IF;

        RAISE NOTICE 'Sample cases and survey links inserted successfully!';
    ELSE
        RAISE NOTICE 'Cases table already contains data, skipping insert.';
    END IF;
END $$;


