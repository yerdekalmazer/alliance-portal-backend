-- 006_question_bank_data.sql
-- Question Bank verilerini ekle

-- İlk olarak question_bank_questions tablosunda veriler var mı kontrol et
DO $$ 
BEGIN
    -- Eğer tablo boşsa sample veriler ekle
    IF NOT EXISTS (SELECT 1 FROM question_bank_questions LIMIT 1) THEN
        
        -- KİŞİSEL BİLGİ SORULARI
        INSERT INTO question_bank_questions (
            question, type, category, difficulty, points, job_type, domain, options, correct
        ) VALUES
        ('Ad Soyad', 'text', 'personal-info', 'easy', 0, null, null, null, null),
        ('E-posta Adresi', 'email', 'personal-info', 'easy', 0, null, null, null, null),
        ('Telefon Numarası', 'text', 'personal-info', 'easy', 0, null, null, null, null),
        ('Yaş', 'number', 'personal-info', 'easy', 0, null, null, null, null),
        ('Şehir', 'text', 'personal-info', 'easy', 0, null, null, null, null),
        ('Deneyim Seviyesi', 'single-choice', 'personal-info', 'easy', 0, null, null, 
         '["Yeni başlayan (0-1 yıl)", "Orta düzey (2-4 yıl)", "İleri düzey (5+ yıl)"]'::jsonb, null),
        ('Çalışma Tercihi', 'single-choice', 'personal-info', 'easy', 0, null, null,
         '["Tam zamanlı", "Yarı zamanlı", "Proje bazlı", "Staj"]'::jsonb, null),
        ('Hangi konularda deneyiminiz var?', 'multiple-choice', 'personal-info', 'easy', 0, null, null,
         '["Frontend Development", "Backend Development", "UI/UX Design", "Mobile Development", "Data Analysis", "Project Management"]'::jsonb, null),

        -- GENEL İLK DEĞERLENDİRME SORULARI
        ('Bir projeyi organize ederken hangi adımları takip edersiniz?', 'multiple-choice', 'initial-assessment', 'medium', 10, null, null,
         '["Hedefleri belirleme", "Zaman planı yapma", "Ekip oluşturma", "Risk analizi", "Kaynak belirleme"]'::jsonb, 
         '["Hedefleri belirleme", "Zaman planı yapma", "Risk analizi"]'::jsonb),
        
        ('Problem çözme yaklaşımınızı tanımlayın', 'single-choice', 'initial-assessment', 'medium', 15, null, null,
         '["Analitik ve sistematik", "Yaratıcı ve esnek", "Deneyime dayalı", "Takım odaklı"]'::jsonb, 
         '["Analitik ve sistematik"]'::jsonb),

        ('Yeni teknolojileri öğrenme hızınız nasıl?', 'single-choice', 'initial-assessment', 'easy', 5, null, null,
         '["Çok hızlı", "Orta", "Yavaş ama etkili", "Zorlanırım"]'::jsonb, 
         '["Çok hızlı", "Orta"]'::jsonb),

        -- GÖRSEL TASARIM DOMAIN SORULARI
        ('Hangi tasarım programlarını kullanabilirsiniz?', 'multiple-choice', 'initial-assessment', 'medium', 10, 'Tasarımcı', 'gorsel-tasarim',
         '["Adobe Photoshop", "Adobe Illustrator", "Figma", "Sketch", "Canva"]'::jsonb, 
         '["Adobe Photoshop", "Adobe Illustrator", "Figma"]'::jsonb),

        ('Renk teorisi hakkında bilginiz var mı?', 'single-choice', 'initial-assessment', 'medium', 15, 'Tasarımcı', 'gorsel-tasarim',
         '["Çok iyi", "Orta düzey", "Temel", "Hiç yok"]'::jsonb, 
         '["Çok iyi", "Orta düzey"]'::jsonb),

        ('Tipografi seçiminde hangi faktörleri göz önünde bulundurursunuz?', 'multiple-choice', 'initial-assessment', 'hard', 20, 'Tasarımcı', 'gorsel-tasarim',
         '["Okunabilirlik", "Marka kimliği", "Hedef kitle", "Platform uygunluğu", "Estetik uyum"]'::jsonb, 
         '["Okunabilirlik", "Marka kimliği", "Hedef kitle"]'::jsonb),

        -- WEB PLATFORMU DOMAIN SORULARI
        ('Hangi programlama dillerini biliyorsunuz?', 'multiple-choice', 'initial-assessment', 'medium', 10, 'Developer', 'web-platformu',
         '["JavaScript", "Python", "PHP", "Java", "C#", "Go"]'::jsonb, 
         '["JavaScript", "Python"]'::jsonb),

        ('Frontend framework deneyiminiz nedir?', 'multiple-choice', 'initial-assessment', 'medium', 15, 'Frontend Developer', 'web-platformu',
         '["React", "Vue.js", "Angular", "Svelte", "Next.js"]'::jsonb, 
         '["React", "Vue.js"]'::jsonb),

        ('Database yönetimi konusunda deneyiminiz var mı?', 'single-choice', 'initial-assessment', 'medium', 10, 'Backend Developer', 'web-platformu',
         '["SQL uzmanı", "NoSQL uzmanı", "Her ikisi de", "Temel bilgi", "Hiç yok"]'::jsonb, 
         '["SQL uzmanı", "NoSQL uzmanı", "Her ikisi de"]'::jsonb),

        -- MOBİL UYGULAMA DOMAIN SORULARI
        ('Mobil uygulama geliştirme deneyiminiz var mı?', 'single-choice', 'initial-assessment', 'medium', 15, 'Mobile Developer', 'mobil-uygulama',
         '["Native iOS", "Native Android", "React Native", "Flutter", "Hiç yok"]'::jsonb, 
         '["Native iOS", "Native Android", "React Native", "Flutter"]'::jsonb),

        ('Mobil UI/UX tasarımında dikkat ettiğiniz önemli faktörler nelerdir?', 'multiple-choice', 'initial-assessment', 'hard', 20, 'Mobile Designer', 'mobil-uygulama',
         '["Dokunmatik uygunluk", "Ekran boyutu uyumluluğu", "Performans", "Erişilebilirlik", "Platform standartları"]'::jsonb, 
         '["Dokunmatik uygunluk", "Ekran boyutu uyumluluğu", "Platform standartları"]'::jsonb),

        -- OYUN DOMAIN SORULARI
        ('Oyun geliştirme engine deneyiminiz var mı?', 'multiple-choice', 'initial-assessment', 'medium', 15, 'Game Developer', 'oyun',
         '["Unity", "Unreal Engine", "Godot", "GameMaker", "Custom Engine"]'::jsonb, 
         '["Unity", "Unreal Engine"]'::jsonb),

        ('Oyun tasarımında hangi elementler önemlidir?', 'multiple-choice', 'initial-assessment', 'hard', 20, 'Game Designer', 'oyun',
         '["Gameplay mekaniği", "Seviye tasarımı", "Karakter gelişimi", "Hikaye anlatımı", "Oyuncu deneyimi"]'::jsonb, 
         '["Gameplay mekaniği", "Seviye tasarımı", "Oyuncu deneyimi"]'::jsonb),

        -- YAPAY ZEKA DOMAIN SORULARI
        ('Hangi AI/ML kütüphanelerini kullanabilirsiniz?', 'multiple-choice', 'initial-assessment', 'hard', 20, 'AI Developer', 'yapay-zeka-uygulamalari',
         '["TensorFlow", "PyTorch", "Scikit-learn", "OpenCV", "Hugging Face"]'::jsonb, 
         '["TensorFlow", "PyTorch", "Scikit-learn"]'::jsonb),

        ('Machine Learning model türleri hakkında bilginiz var mı?', 'multiple-choice', 'initial-assessment', 'hard', 25, 'Data Scientist', 'yapay-zeka-uygulamalari',
         '["Supervised Learning", "Unsupervised Learning", "Reinforcement Learning", "Deep Learning", "Neural Networks"]'::jsonb, 
         '["Supervised Learning", "Unsupervised Learning", "Deep Learning"]'::jsonb);

        RAISE NOTICE 'Question bank sample data inserted successfully!';
    ELSE
        RAISE NOTICE 'Question bank already contains data, skipping insert.';
    END IF;
END $$;


