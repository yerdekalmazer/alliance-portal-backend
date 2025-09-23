-- 012_adaptive_questions_correct_categories.sql
-- Mevcut kategori isimleriyle adaptive sorularını ekle

-- Önce adaptive sorularını sil (eğer varsa)
DELETE FROM question_bank_questions 
WHERE category IN ('adaptive-basic-technical', 'adaptive-advanced-technical', 'adaptive-leadership', 'adaptive-character');

-- Job type bazlı teknik sorular ekle - MEVCUT KATEGORİLERLE
INSERT INTO question_bank_questions (id, type, domain, job_type, category, question, options, correct, points, difficulty, created_at, updated_at)
VALUES 
    -- FRONTEND DEVELOPER - İlk Aşama Teknik (first-stage-technical)
    (gen_random_uuid(), 'mcq', 'web-platformu', 'Frontend Developer', 'first-stage-technical', 
     'React''te state ve props arasındaki fark nedir?', 
     '["State component içinde yönetilir, props parent''tan gelir", "Props component içinde yönetilir, state parent''tan gelir", "İkisi de aynı şeydir", "State sadece class componentlerde kullanılır"]', 
     '[0]', 10, 'easy', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'web-platformu', 'Frontend Developer', 'first-stage-technical', 
     'CSS Grid ve Flexbox arasındaki temel fark nedir?', 
     '["Grid 2D layout, Flexbox 1D layout", "Flexbox 2D layout, Grid 1D layout", "İkisi de aynı şeydir", "Grid sadece tablolar için kullanılır"]', 
     '[0]', 10, 'easy', NOW(), NOW()),
    
    -- FRONTEND DEVELOPER - İleri Teknik (advanced-technical)
    (gen_random_uuid(), 'mcq', 'web-platformu', 'Frontend Developer', 'advanced-technical', 
     'React''te useMemo ve useCallback arasındaki fark nedir?', 
     '["useMemo değer memoize eder, useCallback fonksiyon memoize eder", "useCallback değer memoize eder, useMemo fonksiyon memoize eder", "İkisi de aynı şeydir", "useMemo sadece class componentlerde kullanılır"]', 
     '[0]', 20, 'hard', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'web-platformu', 'Frontend Developer', 'advanced-technical', 
     'Webpack''te tree shaking nasıl çalışır?', 
     '["Kullanılmayan kodu bundle''dan çıkarır", "Kodun ağaç yapısını oluşturur", "Kodun performansını ölçer", "Kodun güvenliğini sağlar"]', 
     '[0]', 25, 'expert', NOW(), NOW()),
    
    -- BACKEND DEVELOPER - İlk Aşama Teknik
    (gen_random_uuid(), 'mcq', 'web-platformu', 'Backend Developer', 'first-stage-technical', 
     'RESTful API''de HTTP status code 201 ne anlama gelir?', 
     '["Created - Yeni kaynak oluşturuldu", "OK - İstek başarılı", "Not Found - Kaynak bulunamadı", "Bad Request - Geçersiz istek"]', 
     '[0]', 10, 'easy', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'web-platformu', 'Backend Developer', 'first-stage-technical', 
     'Node.js''te event loop nasıl çalışır?', 
     '["Asenkron işlemleri yönetir ve callback''leri sıraya koyar", "Sadece senkron işlemleri yönetir", "Sadece database işlemlerini yönetir", "Sadece HTTP isteklerini yönetir"]', 
     '[0]', 15, 'medium', NOW(), NOW()),
    
    -- BACKEND DEVELOPER - İleri Teknik
    (gen_random_uuid(), 'mcq', 'web-platformu', 'Backend Developer', 'advanced-technical', 
     'Microservices mimarisinde circuit breaker pattern''in amacı nedir?', 
     '["Hatalı servisleri izole ederek sistemin çökmesini önler", "Servisler arası iletişimi hızlandırır", "Veritabanı bağlantılarını yönetir", "API endpoint''lerini güvenli hale getirir"]', 
     '[0]', 25, 'expert', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'web-platformu', 'Backend Developer', 'advanced-technical', 
     'Redis''te pub/sub pattern nasıl çalışır?', 
     '["Publisher mesaj gönderir, subscriber''lar dinler", "Subscriber mesaj gönderir, publisher''lar dinler", "Her ikisi de mesaj gönderir ve dinler", "Sadece tek yönlü iletişim vardır"]', 
     '[0]', 20, 'hard', NOW(), NOW()),
    
    -- UI/UX DESIGNER - İlk Aşama Teknik
    (gen_random_uuid(), 'mcq', 'ui-ux-tasarimi', 'UI/UX Designer', 'first-stage-technical', 
     'User Experience (UX) tasarımının temel amacı nedir?', 
     '["Kullanıcının ihtiyaçlarını karşılamak ve deneyimi optimize etmek", "Sadece görsel güzellik sağlamak", "Sadece teknoloji kullanmak", "Sadece trend takip etmek"]', 
     '[0]', 10, 'easy', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'ui-ux-tasarimi', 'UI/UX Designer', 'first-stage-technical', 
     'Wireframe nedir ve ne amaçla kullanılır?', 
     '["Sayfa yapısını ve içerik organizasyonunu gösteren iskelet tasarım", "Sadece renkli final tasarım", "Sadece yazılım kodu", "Sadece pazarlama materyali"]', 
     '[0]', 10, 'easy', NOW(), NOW()),
    
    -- UI/UX DESIGNER - İleri Teknik
    (gen_random_uuid(), 'mcq', 'ui-ux-tasarimi', 'UI/UX Designer', 'advanced-technical', 
     'Information Architecture (IA) tasarımında card sorting methodology''si nasıl uygulanır?', 
     '["Kullanıcıların mental modeline göre içerik kategorilendirmesi", "Sadece estetik renk paleti oluşturma", "Sadece teknik dokümantasyon yazma", "Sadece pazarlama stratejisi belirleme"]', 
     '[0]', 25, 'hard', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'ui-ux-tasarimi', 'UI/UX Designer', 'advanced-technical', 
     'Accessibility (WCAG 2.1) standartlarında AA seviye compliance için temel gereklilikler nelerdir?', 
     '["Contrast ratio 4.5:1, keyboard navigation, screen reader support", "Sadece güzel renkler kullanmak", "Sadece mobil uyumluluk", "Sadece hızlı yükleme"]', 
     '[0]', 30, 'expert', NOW(), NOW());

-- Liderlik senaryoları ekle - MEVCUT KATEGORİ (leadership-scenarios)
INSERT INTO question_bank_questions (id, type, domain, job_type, category, question, options, correct, points, difficulty, created_at, updated_at)
VALUES 
    (gen_random_uuid(), 'mcq', 'leadership', 'All', 'leadership-scenarios', 
     'Takımınızda iki geliştirici arasında teknik yaklaşım konusunda anlaşmazlık var. Biri microservices, diğeri monolith tercih ediyor. Nasıl çözersiniz?', 
     '["Her iki yaklaşımın artı/eksilerini analiz edip proje gereksinimlerine göre karar veririm", "Daha deneyimli olanın tercihini kabul ederim", "Rastgele birini seçerim", "Projeyi ikiye bölerim"]', 
     '[0]', 30, 'expert', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'leadership', 'All', 'leadership-scenarios', 
     'Sprint deadline''ına 2 gün kala kritik bir bug keşfedildi. Ne yaparsınız?', 
     '["Bug''ın etkisini değerlendirip stakeholder''larla iletişime geçerim", "Sprint''i uzatırım", "Bug''ı ignore ederim", "Takımı suçlarım"]', 
     '[0]', 30, 'expert', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'leadership', 'All', 'leadership-scenarios', 
     'Yeni katılan junior developer''ın performansı beklenenden düşük. Nasıl yaklaşırsınız?', 
     '["Mentor atayıp düzenli feedback vererek gelişimini desteklerim", "Hemen işten çıkarırım", "Sadece kolay işler veririm", "Hiçbir şey yapmam"]', 
     '[0]', 30, 'expert', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'leadership', 'All', 'leadership-scenarios', 
     'Client''tan gelen değişiklik talebi mevcut mimariyi bozuyor. Nasıl yanıtlarsınız?', 
     '["Alternatif çözümler önerip risk/yarar analizi yaparım", "Direkt kabul ederim", "Direkt reddederim", "Client''ı görmezden gelirim"]', 
     '[0]', 30, 'expert', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'leadership', 'All', 'leadership-scenarios', 
     'Remote takım üyesi iletişimde sorun yaşıyor. Nasıl çözersiniz?', 
     '["İletişim araçlarını optimize edip düzenli check-in''ler yaparım", "Sadece email kullanmasını söylerim", "Ofise gelmesini zorlarım", "Hiçbir şey yapmam"]', 
     '[0]', 30, 'expert', NOW(), NOW());

-- Karakter analizi sorularını ekle - MEVCUT KATEGORİ (character-analysis)
INSERT INTO question_bank_questions (id, type, domain, job_type, category, question, options, correct, points, difficulty, created_at, updated_at)
VALUES 
    (gen_random_uuid(), 'mcq', 'leadership', 'All', 'character-analysis', 
     'Hangi liderlik tarzını tercih edersiniz?', 
     '["Demokratik - Takım kararları alır", "Otoriter - Hızlı karar veririm", "Laissez-faire - Takımı serbest bırakırım", "Transformational - İlham verici liderlik"]', 
     '[]', 0, 'easy', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'leadership', 'All', 'character-analysis', 
     'Çatışma durumunda nasıl yaklaşırsınız?', 
     '["Problem-solving odaklı", "Kaçınma odaklı", "Uyum odaklı", "Rekabet odaklı"]', 
     '[]', 0, 'easy', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'leadership', 'All', 'character-analysis', 
     'Çalışma tarzınızı en iyi tanımlayan seçenek hangisidir?', 
     '["Sistematik planlama ve sürekli iterasyon", "Spontane ve yaratıcı yaklaşım", "Katı prosedür takibi", "Tamamen esnek ve rastgele"]', 
     '[]', 0, 'easy', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'leadership', 'All', 'character-analysis', 
     'Takım çalışmasında hangi rolü doğal olarak üstlenirsiniz?', 
     '["Koordinatör ve süreç optimize edici", "Yaratıcı fikir üretici", "Detay odaklı kalite kontrol", "Destekleyici ve motivatör"]', 
     '[]', 0, 'easy', NOW(), NOW()),
    
    (gen_random_uuid(), 'mcq', 'leadership', 'All', 'character-analysis', 
     'Stresli dönemlerde performansınız nasıl etkilenir?', 
     '["Öncelikleri netleştirip sistematik yaklaşırım", "Kreativitem artar, daha inovatif olurum", "Mükemmeliyetçiliğim artar, detaylara odaklanırım", "Takım desteği alarak motivasyonumu korumaya çalışırım"]', 
     '[]', 0, 'easy', NOW(), NOW());

-- Log
RAISE NOTICE 'Adaptive questions added with existing category names successfully!';
