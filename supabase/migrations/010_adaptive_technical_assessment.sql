-- 010_adaptive_technical_assessment.sql
-- Aşamalı Teknik Değerlendirme Anketi - Yeni Sistem

-- Yeni anket türü için constraint güncelleme
DO $$
BEGIN
    -- Survey templates type constraint'ini güncelle
    ALTER TABLE survey_templates DROP CONSTRAINT IF EXISTS survey_templates_type_check;
    ALTER TABLE survey_templates ADD CONSTRAINT survey_templates_type_check 
    CHECK (type IN (
        'initial-assessment',
        'technical-assessment', 
        'team-formation',
        'evaluation',
        'feedback',
        'adaptive-technical-assessment'  -- YENİ TÜR
    ));
    
    RAISE NOTICE 'Survey templates constraint updated successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating survey templates constraint: %', SQLERRM;
END $$;

-- Adaptive Technical Assessment için yeni template oluştur
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
    'adaptive-technical-assessment', 
    'evaluation', 
    'Aşamalı Teknik Değerlendirme Anketi', 
    'Job type bazlı aşamalı teknik değerlendirme: Başlangıç sorularında başarılı olanlar advanced seviyeye geçer, her aşama ayrı puanlanır.', 
    'participant', 
    true, 
    true, 
    jsonb_build_object(
        'config', jsonb_build_object(
            'basicSuccessThreshold', 50,
            'minCorrectAnswers', 1,
            'enableAdvancedAccess', true,
            'showProgressIndicator', true,
            'phases', jsonb_build_array('basic', 'advanced', 'leadership', 'character')
        )
    ), 
    NOW(), 
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM survey_templates WHERE type = 'adaptive-technical-assessment'
);

-- Adaptive Technical Assessment için özel soru kategorileri ekle
DO $$
BEGIN
    -- Question categories constraint'ini güncelle
    ALTER TABLE question_bank_questions DROP CONSTRAINT IF EXISTS question_bank_questions_category_check;
    ALTER TABLE question_bank_questions ADD CONSTRAINT question_bank_questions_category_check 
    CHECK (category IN (
        'initial-assessment',
        'first-stage-technical', 
        'advanced-technical',
        'leadership-scenarios',
        'leadership-scenario',
        'character-analysis',
        'personal-info',
        -- YENİ KATEGORİLER
        'adaptive-basic-technical',
        'adaptive-advanced-technical', 
        'adaptive-leadership',
        'adaptive-character'
    ));
    
    RAISE NOTICE 'Question categories constraint updated successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating question categories constraint: %', SQLERRM;
END $$;

-- Aşamalı sistem için örnek sorular ekle
INSERT INTO question_bank_questions (id, type, domain, job_type, category, question, options, correct, points, difficulty, created_at, updated_at)
VALUES 
    -- FRONTEND DEVELOPER - BASIC LEVEL
    (gen_random_uuid(), 'mcq', 'web-platformu', 'Frontend Developer', 'adaptive-basic-technical', 
     'HTML''de semantic etiketlerin kullanım amacı nedir?', 
     '["Sayfanın anlamsal yapısını belirtmek için", "Sadece görsel düzenleme için", "SEO''yu engellemek için", "Sadece CSS ile ilişkilendirmek için"]', 
     '[0]', 10, 'easy', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'web-platformu', 'Frontend Developer', 'adaptive-basic-technical', 
     'CSS''te flexbox''ın temel amacı nedir?', 
     '["Esnek layout düzenlemeleri oluşturmak", "Sadece renk ayarlamak", "Sadece font düzenlemek", "Sadece animasyon yapmak"]', 
     '[0]', 10, 'easy', NOW(), NOW()),

    -- FRONTEND DEVELOPER - ADVANCED LEVEL  
    (gen_random_uuid(), 'mcq', 'web-platformu', 'Frontend Developer', 'adaptive-advanced-technical', 
     'React''te Virtual DOM''un avantajları nelerdir?', 
     '["Performans optimizasyonu ve batch update''ler", "Sadece görsel iyileştirme", "Sadece SEO optimizasyonu", "Sadece güvenlik artışı"]', 
     '[0]', 25, 'hard', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'web-platformu', 'Frontend Developer', 'adaptive-advanced-technical', 
     'Webpack''te code splitting nasıl implementer edilir?', 
     '["Dynamic import() ve lazy loading ile", "Sadece CSS dosyalarını bölerek", "Sadece HTML dosyalarını bölerek", "Sadece image dosyalarını bölerek"]', 
     '[0]', 30, 'expert', NOW(), NOW()),

    -- BACKEND DEVELOPER - BASIC LEVEL
    (gen_random_uuid(), 'mcq', 'web-platformu', 'Backend Developer', 'adaptive-basic-technical', 
     'HTTP GET ve POST methodları arasındaki temel fark nedir?', 
     '["GET veri çeker, POST veri gönderir", "POST veri çeker, GET veri gönderir", "İkisi de aynı işlevi yapar", "GET sadece HTML döndürür"]', 
     '[0]', 10, 'easy', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'web-platformu', 'Backend Developer', 'adaptive-basic-technical', 
     'Database''te PRIMARY KEY''in rolü nedir?', 
     '["Her kaydı benzersiz şekilde tanımlar", "Sadece performans artırır", "Sadece veri tipi belirler", "Sadece sıralama yapar"]', 
     '[0]', 10, 'easy', NOW(), NOW()),

    -- BACKEND DEVELOPER - ADVANCED LEVEL
    (gen_random_uuid(), 'mcq', 'web-platformu', 'Backend Developer', 'adaptive-advanced-technical', 
     'Database connection pooling''in amacı nedir?', 
     '["Bağlantı kaynaklarını optimize etmek", "Sadece güvenliği artırmak", "Sadece hızı artırmak", "Sadece veri tutarlılığı sağlamak"]', 
     '[0]', 25, 'hard', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'web-platformu', 'Backend Developer', 'adaptive-advanced-technical', 
     'Microservices mimarisinde service discovery pattern''inin önemi nedir?', 
     '["Servisler arası dinamik bağlantı sağlar", "Sadece güvenlik sağlar", "Sadece performans artırır", "Sadece monitoring sağlar"]', 
     '[0]', 30, 'expert', NOW(), NOW()),

    -- UI/UX DESIGNER - BASIC LEVEL
    (gen_random_uuid(), 'mcq', 'ui-ux-tasarimi', 'UI/UX Designer', 'adaptive-basic-technical', 
     'User Experience (UX) tasarımının temel amacı nedir?', 
     '["Kullanıcının ihtiyaçlarını karşılamak ve deneyimi optimize etmek", "Sadece görsel güzellik sağlamak", "Sadece teknoloji kullanmak", "Sadece trend takip etmek"]', 
     '[0]', 10, 'easy', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'ui-ux-tasarimi', 'UI/UX Designer', 'adaptive-basic-technical', 
     'Wireframe nedir ve ne amaçla kullanılır?', 
     '["Sayfa yapısını ve içerik organizasyonunu gösteren iskelet tasarım", "Sadece renkli final tasarım", "Sadece yazılım kodu", "Sadece pazarlama materyali"]', 
     '[0]', 10, 'easy', NOW(), NOW()),

    -- UI/UX DESIGNER - ADVANCED LEVEL
    (gen_random_uuid(), 'mcq', 'ui-ux-tasarimi', 'UI/UX Designer', 'adaptive-advanced-technical', 
     'Information Architecture (IA) tasarımında card sorting methodology''si nasıl uygulanır?', 
     '["Kullanıcıların mental modeline göre içerik kategorilendirmesi", "Sadece estetik renk paleti oluşturma", "Sadece teknik dokümantasyon yazma", "Sadece pazarlama stratejisi belirleme"]', 
     '[0]', 25, 'hard', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'ui-ux-tasarimi', 'UI/UX Designer', 'adaptive-advanced-technical', 
     'Accessibility (WCAG 2.1) standartlarında AA seviye compliance için temel gereklilikler nelerdir?', 
     '["Contrast ratio 4.5:1, keyboard navigation, screen reader support", "Sadece güzel renkler kullanmak", "Sadece mobil uyumluluk", "Sadece hızlı yükleme"]', 
     '[0]', 30, 'expert', NOW(), NOW()),

    -- MOBILE DEVELOPER - BASIC LEVEL  
    (gen_random_uuid(), 'mcq', 'mobil-uygulama', 'Mobile Developer', 'adaptive-basic-technical', 
     'Native ve Cross-platform mobile development arasındaki temel fark nedir?', 
     '["Native platforma özel, cross-platform çoklu platform", "Cross-platform platforma özel, native çoklu platform", "İkisi de aynıdır", "Native sadece Android''dir"]', 
     '[0]', 10, 'easy', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'mobil-uygulama', 'Mobile Developer', 'adaptive-basic-technical', 
     'Mobile app lifecycle''ında temel state''ler nelerdir?', 
     '["Created, Started, Resumed, Paused, Stopped, Destroyed", "Sadece On ve Off", "Sadece Loading ve Loaded", "Sadece Active ve Inactive"]', 
     '[0]', 10, 'easy', NOW(), NOW()),

    -- MOBILE DEVELOPER - ADVANCED LEVEL
    (gen_random_uuid(), 'mcq', 'mobil-uygulama', 'Mobile Developer', 'adaptive-advanced-technical', 
     'React Native''de bridge architecture''ının rolü nedir?', 
     '["JavaScript ve native kod arasında iletişim sağlar", "Sadece UI komponenti oluşturur", "Sadece veri depolar", "Sadece network işlemlerini yönetir"]', 
     '[0]', 25, 'hard', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'mobil-uygulama', 'Mobile Developer', 'adaptive-advanced-technical', 
     'Mobile app performance optimization için en etkili stratejiler nelerdir?', 
     '["Image optimization, lazy loading, memory management, network caching", "Sadece güzel tasarım", "Sadece hızlı sunucu", "Sadece güncel teknoloji"]', 
     '[0]', 30, 'expert', NOW(), NOW()),

    -- DEVOPS ENGINEER - BASIC LEVEL
    (gen_random_uuid(), 'mcq', 'web-platformu', 'DevOps Engineer', 'adaptive-basic-technical', 
     'CI/CD pipeline''ının temel amacı nedir?', 
     '["Otomatik test, build ve deployment süreci", "Sadece kod yazmak", "Sadece server yönetmek", "Sadece monitoring yapmak"]', 
     '[0]', 10, 'easy', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'web-platformu', 'DevOps Engineer', 'adaptive-basic-technical', 
     'Container ve Virtual Machine arasındaki temel fark nedir?', 
     '["Container OS kernel paylaşır, VM tam işletim sistemi", "VM kernel paylaşır, container tam sistem", "İkisi de aynıdır", "Container sadece Windows''ta çalışır"]', 
     '[0]', 10, 'easy', NOW(), NOW()),

    -- DEVOPS ENGINEER - ADVANCED LEVEL  
    (gen_random_uuid(), 'mcq', 'web-platformu', 'DevOps Engineer', 'adaptive-advanced-technical', 
     'Kubernetes''te pod scheduling stratejileri nelerdir?', 
     '["Resource constraints, node affinity, taints and tolerations", "Sadece random dağıtım", "Sadece alphabetic sıralama", "Sadece creation time''a göre"]', 
     '[0]', 25, 'hard', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'web-platformu', 'DevOps Engineer', 'adaptive-advanced-technical', 
     'Infrastructure as Code (IaC) araçlarında state management nasıl çalışır?', 
     '["Terraform state dosyası ile infrastructure durumunu takip eder", "Sadece config dosyalarını saklar", "Sadece logları depolar", "Sadece backup alır"]', 
     '[0]', 30, 'expert', NOW(), NOW());

-- Liderlik ve karakter soruları (genel - tüm job type'lar için)
INSERT INTO question_bank_questions (id, type, domain, job_type, category, question, options, correct, points, difficulty, created_at, updated_at)
VALUES 
    -- ADAPTIVE LEADERSHIP QUESTIONS
    (gen_random_uuid(), 'mcq', 'leadership', 'All', 'adaptive-leadership', 
     'Proje deadline''ına yaklaşırken takım üyesi beklenmedik bir sorunu raporladı. İlk aksiyonunuz ne olur?', 
     '["Sorunu analiz ederim, impact''ini değerlendirip stakeholder''ları bilgilendiririm", "Panik yapar hemen eskiye dönerim", "Sorunu görmezden gelirim", "Takım üyesini suçlarım"]', 
     '[0]', 30, 'hard', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'leadership', 'All', 'adaptive-leadership', 
     'İki farklı teknik yaklaşım arasında takımda görüş ayrılığı var. Nasıl çözersiniz?', 
     '["Her iki yaklaşımın pros/cons''unu analiz ettirip data-driven karar alırım", "Kıdemli olanın dediğini yaparım", "Oylama yaparım", "Kendi tercihimi dayatırım"]', 
     '[0]', 30, 'hard', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'leadership', 'All', 'adaptive-leadership', 
     'Remote takım üyesi diğerlerinden geri kalıyor. Nasıl yaklaşırsınız?', 
     '["1-on-1 meeting yapıp engelleri anlayıp destek planı oluştururum", "Hemen uyarırım", "Diğerlerine şikayet ederim", "Görmezden gelirim"]', 
     '[0]', 30, 'hard', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'leadership', 'All', 'adaptive-leadership', 
     'Takımda motivasyon düşüklüğü gözlemliyorsunuz. Ne yaparsınız?', 
     '["Kök nedeni araştırırım, bireysel ve team düzeyinde çözümler uygularım", "Sadece motivasyon konuşması yaparım", "Daha çok iş veririm", "Hiçbir şey yapmam"]', 
     '[0]', 30, 'hard', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'leadership', 'All', 'adaptive-leadership', 
     'Yeni teknoloji adapte edilmesi gerekiyor ama takım direniyor. Yaklaşımınız?', 
     '["Eğitim planı oluşturur, küçük pilot projelerle deneyim kazandırırım", "Zorla kullanmalarını söylerim", "Teknoloji değişikliğinden vazgeçerim", "Takımı değiştiririm"]', 
     '[0]', 30, 'hard', NOW(), NOW()),

    -- ADAPTIVE CHARACTER ANALYSIS QUESTIONS  
    (gen_random_uuid(), 'mcq', 'leadership', 'All', 'adaptive-character', 
     'Çalışma tarzınızı en iyi tanımlayan seçenek hangisidir?', 
     '["Sistematik planlama ve sürekli iterasyon", "Spontane ve yaratıcı yaklaşım", "Katı prosedür takibi", "Tamamen esnek ve rastgele"]', 
     '[]', 0, 'easy', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'leadership', 'All', 'adaptive-character', 
     'Karmaşık problemlerle karşılaştığınızda ilk tepkiniz ne olur?', 
     '["Problemi küçük parçalara böler, analitik yaklaşırım", "Hemen çözüm bulmaya odaklanırım", "Başkalarından yardım isterim", "Problemi ertelemeye çalışırım"]', 
     '[]', 0, 'easy', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'leadership', 'All', 'adaptive-character', 
     'Takım çalışmasında hangi rolü doğal olarak üstlenirsiniz?', 
     '["Koordinatör ve süreç optimize edici", "Yaratıcı fikir üretici", "Detay odaklı kalite kontrol", "Destekleyici ve motivatör"]', 
     '[]', 0, 'easy', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'leadership', 'All', 'adaptive-character', 
     'Feedback alırken tercih ettiğiniz yaklaşım nedir?', 
     '["Yapıcı eleştiri ve spesifik öneriler", "Sadece pozitif feedback", "Direkt ve açık eleştiri", "Yazılı ve dokümante feedback"]', 
     '[]', 0, 'easy', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'leadership', 'All', 'adaptive-character', 
     'Stresli dönemlerde performansınız nasıl etkilenir?', 
     '["Öncelikleri netleştirip sistematik yaklaşırım", "Kreativitem artar, daha inovatif olurum", "Mükemmeliyetçiliğim artar, detaylara odaklanırım", "Takım desteği alarak motivasyonumu korumaya çalışırım"]', 
     '[]', 0, 'easy', NOW(), NOW());

-- Son olarak başarıyla oluşturulduğunu log'la
RAISE NOTICE 'Adaptive Technical Assessment system created successfully!';
