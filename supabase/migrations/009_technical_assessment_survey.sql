-- 009_technical_assessment_survey.sql
-- Teknik Değerlendirme ve Takımlaştırma Anketi için migration

-- Önce constraint'leri güncelle
ALTER TABLE question_bank_questions DROP CONSTRAINT IF EXISTS question_bank_questions_category_check;
ALTER TABLE question_bank_questions ADD CONSTRAINT question_bank_questions_category_check 
CHECK (category IN (
  'initial-assessment',
  'first-stage-technical', 
  'advanced-technical',
  'leadership-scenarios',
  'leadership-scenario',
  'character-analysis',
  'personal-info'
));

-- Type constraint'ini de güncelle
ALTER TABLE question_bank_questions DROP CONSTRAINT IF EXISTS question_bank_questions_type_check;
ALTER TABLE question_bank_questions ADD CONSTRAINT question_bank_questions_type_check 
CHECK (type IN (
  'mcq',
  'textarea', 
  'scenario',
  'priority',
  'approach',
  'single-choice',
  'multiple-choice',
  'text',
  'number',
  'email',
  'scale',
  'boolean',
  'radio'
));

-- Survey template oluştur
INSERT INTO survey_templates (
  id, type, category, title, description, target_audience, is_active, is_dynamic, questions, created_at, updated_at
)
SELECT 
  gen_random_uuid(), 
  'technical-team-assessment', 
  'evaluation', 
  'Teknik Değerlendirme ve Takımlaştırma Anketi', 
  'Job type bazlı teknik değerlendirme, ileri seviye sorular ve liderlik senaryoları ile kapsamlı takım uyumu analizi.', 
  'participant', 
  true, 
  true, 
  '[]'::jsonb, 
  NOW(), 
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM survey_templates WHERE type = 'technical-team-assessment'
);

-- Job type bazlı teknik sorular ekle
INSERT INTO question_bank_questions (id, type, domain, job_type, category, question, options, correct, points, difficulty, created_at, updated_at)
VALUES 
  -- Frontend Developer - İlk Teknik
  (gen_random_uuid(), 'mcq', 'web-platformu', 'Frontend Developer', 'first-stage-technical', 'React''te state ve props arasındaki fark nedir?', 
   '["State component içinde yönetilir, props parent''tan gelir", "Props component içinde yönetilir, state parent''tan gelir", "İkisi de aynı şeydir", "State sadece class componentlerde kullanılır"]', 
   '[0]', 10, 'easy', NOW(), NOW()),
  
  (gen_random_uuid(), 'mcq', 'web-platformu', 'Frontend Developer', 'first-stage-technical', 'CSS Grid ve Flexbox arasındaki temel fark nedir?', 
   '["Grid 2D layout, Flexbox 1D layout", "Flexbox 2D layout, Grid 1D layout", "İkisi de aynı şeydir", "Grid sadece tablolar için kullanılır"]', 
   '[0]', 10, 'easy', NOW(), NOW()),
  
  (gen_random_uuid(), 'mcq', 'web-platformu', 'Frontend Developer', 'first-stage-technical', 'JavaScript''te closure nedir?', 
   '["Fonksiyonun kendi scope''u dışındaki değişkenlere erişebilmesi", "Fonksiyonun sadece kendi scope''undaki değişkenlere erişebilmesi", "Fonksiyonun hiçbir değişkene erişememesi", "Fonksiyonun global değişkenlere erişememesi"]', 
   '[0]', 15, 'medium', NOW(), NOW()),
  
  -- Frontend Developer - İleri Teknik
  (gen_random_uuid(), 'mcq', 'web-platformu', 'Frontend Developer', 'advanced-technical', 'React''te useMemo ve useCallback arasındaki fark nedir?', 
   '["useMemo değer memoize eder, useCallback fonksiyon memoize eder", "useCallback değer memoize eder, useMemo fonksiyon memoize eder", "İkisi de aynı şeydir", "useMemo sadece class componentlerde kullanılır"]', 
   '[0]', 20, 'hard', NOW(), NOW()),
  
  (gen_random_uuid(), 'mcq', 'web-platformu', 'Frontend Developer', 'advanced-technical', 'Webpack''te tree shaking nasıl çalışır?', 
   '["Kullanılmayan kodu bundle''dan çıkarır", "Kodun ağaç yapısını oluşturur", "Kodun performansını ölçer", "Kodun güvenliğini sağlar"]', 
   '[0]', 25, 'expert', NOW(), NOW()),
  
  -- Backend Developer - İlk Teknik
  (gen_random_uuid(), 'mcq', 'web-platformu', 'Backend Developer', 'first-stage-technical', 'RESTful API''de HTTP status code 201 ne anlama gelir?', 
   '["Created - Yeni kaynak oluşturuldu", "OK - İstek başarılı", "Not Found - Kaynak bulunamadı", "Bad Request - Geçersiz istek"]', 
   '[0]', 10, 'easy', NOW(), NOW()),
  
  (gen_random_uuid(), 'mcq', 'web-platformu', 'Backend Developer', 'first-stage-technical', 'SQL''de JOIN ve INNER JOIN arasındaki fark nedir?', 
   '["JOIN INNER JOIN''in kısaltmasıdır", "INNER JOIN sadece eşleşen kayıtları getirir, JOIN hepsini getirir", "INNER JOIN LEFT JOIN''in kısaltmasıdır", "JOIN sadece iki tablo için kullanılır"]', 
   '[0]', 15, 'medium', NOW(), NOW()),
  
  (gen_random_uuid(), 'mcq', 'web-platformu', 'Backend Developer', 'first-stage-technical', 'Node.js''te event loop nasıl çalışır?', 
   '["Asenkron işlemleri yönetir ve callback''leri sıraya koyar", "Sadece senkron işlemleri yönetir", "Sadece database işlemlerini yönetir", "Sadece HTTP isteklerini yönetir"]', 
   '[0]', 15, 'medium', NOW(), NOW()),
  
  -- Backend Developer - İleri Teknik
  (gen_random_uuid(), 'mcq', 'web-platformu', 'Backend Developer', 'advanced-technical', 'Microservices mimarisinde circuit breaker pattern''in amacı nedir?', 
   '["Hatalı servisleri izole ederek sistemin çökmesini önler", "Servisler arası iletişimi hızlandırır", "Veritabanı bağlantılarını yönetir", "API endpoint''lerini güvenli hale getirir"]', 
   '[0]', 25, 'expert', NOW(), NOW()),
  
  (gen_random_uuid(), 'mcq', 'web-platformu', 'Backend Developer', 'advanced-technical', 'Redis''te pub/sub pattern nasıl çalışır?', 
   '["Publisher mesaj gönderir, subscriber''lar dinler", "Subscriber mesaj gönderir, publisher''lar dinler", "Her ikisi de mesaj gönderir ve dinler", "Sadece tek yönlü iletişim vardır"]', 
   '[0]', 20, 'hard', NOW(), NOW()),
  
  -- UI/UX Designer - İlk Teknik
  (gen_random_uuid(), 'mcq', 'ui-ux-tasarimi', 'UI/UX Designer', 'first-stage-technical', 'Design system''in temel bileşenleri nelerdir?', 
   '["Color palette, typography, spacing, components", "Sadece renkler ve fontlar", "Sadece iconlar ve resimler", "Sadece layout ve grid"]', 
   '[0]', 10, 'easy', NOW(), NOW()),
  
  (gen_random_uuid(), 'mcq', 'ui-ux-tasarimi', 'UI/UX Designer', 'first-stage-technical', 'Accessibility (erişilebilirlik) için WCAG standartları nelerdir?', 
   '["Perceivable, Operable, Understandable, Robust", "Fast, Secure, Scalable, Maintainable", "Beautiful, Modern, Clean, Simple", "Colorful, Creative, Unique, Artistic"]', 
   '[0]', 15, 'medium', NOW(), NOW()),
  
  (gen_random_uuid(), 'mcq', 'ui-ux-tasarimi', 'UI/UX Designer', 'first-stage-technical', 'User journey map nedir?', 
   '["Kullanıcının ürünle etkileşim sürecinin görselleştirilmesi", "Kullanıcının kişisel bilgilerinin haritası", "Kullanıcının lokasyon bilgilerinin haritası", "Kullanıcının sosyal medya aktivitelerinin haritası"]', 
   '[0]', 15, 'medium', NOW(), NOW()),
  
  -- UI/UX Designer - İleri Teknik
  (gen_random_uuid(), 'mcq', 'ui-ux-tasarimi', 'UI/UX Designer', 'advanced-technical', 'Design thinking sürecinin aşamaları nelerdir?', 
   '["Empathize, Define, Ideate, Prototype, Test", "Research, Design, Develop, Deploy, Maintain", "Plan, Execute, Monitor, Control, Close", "Analyze, Design, Implement, Test, Deploy"]', 
   '[0]', 20, 'hard', NOW(), NOW()),
  
  (gen_random_uuid(), 'mcq', 'ui-ux-tasarimi', 'UI/UX Designer', 'advanced-technical', 'A/B testing''te istatistiksel anlamlılık nasıl hesaplanır?', 
   '["P-value ve confidence interval kullanılarak", "Sadece click rate''e bakılarak", "Sadece conversion rate''e bakılarak", "Sadece user count''a bakılarak"]', 
   '[0]', 25, 'expert', NOW(), NOW()),
  
  -- Mobile Developer - İlk Teknik
  (gen_random_uuid(), 'mcq', 'mobil-uygulama', 'Mobile Developer', 'first-stage-technical', 'React Native''de native module nedir?', 
   '["JavaScript''ten native platform API''lerine erişim sağlayan köprü", "Sadece JavaScript kodu", "Sadece native platform kodu", "Sadece CSS stilleri"]', 
   '[0]', 15, 'medium', NOW(), NOW()),
  
  (gen_random_uuid(), 'mcq', 'mobil-uygulama', 'Mobile Developer', 'first-stage-technical', 'Flutter''da widget tree nedir?', 
   '["UI bileşenlerinin hiyerarşik yapısı", "Veritabanı tablolarının yapısı", "API endpoint''lerinin yapısı", "Dosya sisteminin yapısı"]', 
   '[0]', 15, 'medium', NOW(), NOW()),
  
  -- Mobile Developer - İleri Teknik
  (gen_random_uuid(), 'mcq', 'mobil-uygulama', 'Mobile Developer', 'advanced-technical', 'iOS''ta memory management nasıl çalışır?', 
   '["ARC (Automatic Reference Counting) ile otomatik yönetim", "Manuel olarak malloc/free kullanımı", "Sadece garbage collection", "Sadece stack allocation"]', 
   '[0]', 25, 'expert', NOW(), NOW()),
  
  (gen_random_uuid(), 'mcq', 'mobil-uygulama', 'Mobile Developer', 'advanced-technical', 'Android''te ProGuard nedir?', 
   '["Kod obfuscation ve minification aracı", "Database yönetim aracı", "API testing aracı", "UI design aracı"]', 
   '[0]', 20, 'hard', NOW(), NOW()),
  
  -- DevOps Engineer - İlk Teknik
  (gen_random_uuid(), 'mcq', 'web-platformu', 'DevOps Engineer', 'first-stage-technical', 'Docker container nedir?', 
   '["Uygulama ve bağımlılıklarını paketleyen izole ortam", "Sadece uygulama kodu", "Sadece işletim sistemi", "Sadece veritabanı"]', 
   '[0]', 10, 'easy', NOW(), NOW()),
  
  (gen_random_uuid(), 'mcq', 'web-platformu', 'DevOps Engineer', 'first-stage-technical', 'CI/CD pipeline nedir?', 
   '["Kod değişikliklerini otomatik olarak test edip deploy eden süreç", "Sadece kod yazma süreci", "Sadece test yazma süreci", "Sadece deploy süreci"]', 
   '[0]', 15, 'medium', NOW(), NOW()),
  
  -- DevOps Engineer - İleri Teknik
  (gen_random_uuid(), 'mcq', 'web-platformu', 'DevOps Engineer', 'advanced-technical', 'Kubernetes''te service mesh nedir?', 
   '["Mikroservisler arası iletişimi yöneten altyapı katmanı", "Sadece load balancer", "Sadece API gateway", "Sadece database proxy"]', 
   '[0]', 25, 'expert', NOW(), NOW()),
  
  (gen_random_uuid(), 'mcq', 'web-platformu', 'DevOps Engineer', 'advanced-technical', 'Infrastructure as Code (IaC) nedir?', 
   '["Altyapıyı kod ile tanımlama ve yönetme", "Sadece kod yazma", "Sadece altyapı kurma", "Sadece monitoring"]', 
   '[0]', 20, 'hard', NOW(), NOW());

-- Liderlik senaryoları soruları ekle
INSERT INTO question_bank_questions (id, type, domain, job_type, category, question, options, correct, points, difficulty, created_at, updated_at)
VALUES 
  -- Liderlik Senaryoları - Genel
  (gen_random_uuid(), 'mcq', 'leadership', 'All', 'leadership-scenario', 'Takımınızda iki geliştirici arasında teknik yaklaşım konusunda anlaşmazlık var. Biri microservices, diğeri monolith tercih ediyor. Nasıl çözersiniz?', 
   '["Her iki yaklaşımın artı/eksilerini analiz edip proje gereksinimlerine göre karar veririm", "Daha deneyimli olanın tercihini kabul ederim", "Rastgele birini seçerim", "Projeyi ikiye bölerim"]', 
   '[0]', 30, 'expert', NOW(), NOW()),
  
  (gen_random_uuid(), 'mcq', 'leadership', 'All', 'leadership-scenario', 'Sprint deadline''ına 2 gün kala kritik bir bug keşfedildi. Ne yaparsınız?', 
   '["Bug''ın etkisini değerlendirip stakeholder''larla iletişime geçerim", "Sprint''i uzatırım", "Bug''ı ignore ederim", "Takımı suçlarım"]', 
   '[0]', 30, 'expert', NOW(), NOW()),
  
  (gen_random_uuid(), 'mcq', 'leadership', 'All', 'leadership-scenario', 'Yeni katılan junior developer''ın performansı beklenenden düşük. Nasıl yaklaşırsınız?', 
   '["Mentor atayıp düzenli feedback vererek gelişimini desteklerim", "Hemen işten çıkarırım", "Sadece kolay işler veririm", "Hiçbir şey yapmam"]', 
   '[0]', 30, 'expert', NOW(), NOW()),
  
  (gen_random_uuid(), 'mcq', 'leadership', 'All', 'leadership-scenario', 'Client''tan gelen değişiklik talebi mevcut mimariyi bozuyor. Nasıl yanıtlarsınız?', 
   '["Alternatif çözümler önerip risk/yarar analizi yaparım", "Direkt kabul ederim", "Direkt reddederim", "Client''ı görmezden gelirim"]', 
   '[0]', 30, 'expert', NOW(), NOW()),
  
  (gen_random_uuid(), 'mcq', 'leadership', 'All', 'leadership-scenario', 'Takım üyelerinden biri sürekli geç kalıyor ve diğerlerini etkiliyor. Nasıl çözersiniz?', 
   '["Özel görüşme yapıp nedenini öğrenip çözüm ararım", "Hemen uyarı veririm", "Diğerlerine şikayet ederim", "Hiçbir şey yapmam"]', 
   '[0]', 30, 'expert', NOW(), NOW()),
  
  (gen_random_uuid(), 'mcq', 'leadership', 'All', 'leadership-scenario', 'Proje bütçesi aşıldı ve ek kaynak gerekiyor. Nasıl yönetirsiniz?', 
   '["Kapsamı yeniden değerlendirip öncelikleri belirlerim", "Bütçeyi artırırım", "Kaliteyi düşürürüm", "Projeyi durdururum"]', 
   '[0]', 30, 'expert', NOW(), NOW()),
  
  (gen_random_uuid(), 'mcq', 'leadership', 'All', 'leadership-scenario', 'Takımda sürekli çatışma yaşanıyor. Nasıl müdahale edersiniz?', 
   '["Bireysel görüşmeler yapıp kök nedenini bulup çözerim", "Herkesi toplantıya çağırıp tartıştırırım", "Çatışanları ayırırım", "Hiçbir şey yapmam"]', 
   '[0]', 30, 'expert', NOW(), NOW()),
  
  (gen_random_uuid(), 'mcq', 'leadership', 'All', 'leadership-scenario', 'Yeni teknoloji öğrenmek isteyen takım üyesi var ama proje acil. Nasıl desteklersiniz?', 
   '["Küçük projelerde deneme fırsatı verip zaman ayırırım", "Sadece iş saatleri dışında öğrenmesini söylerim", "Öğrenmesine izin vermem", "Hemen işten çıkarırım"]', 
   '[0]', 30, 'expert', NOW(), NOW()),
  
  (gen_random_uuid(), 'mcq', 'leadership', 'All', 'leadership-scenario', 'Müşteri memnuniyetsizliği var ve takım motivasyonu düşük. Nasıl toparlarsınız?', 
   '["Sorunları analiz edip aksiyon planı oluşturup takımı motive ederim", "Sadece pozitif konuşurum", "Sorunları görmezden gelirim", "Takımı değiştiririm"]', 
   '[0]', 30, 'expert', NOW(), NOW()),
  
  (gen_random_uuid(), 'mcq', 'leadership', 'All', 'leadership-scenario', 'Remote çalışan takım üyesi iletişimde sorun yaşıyor. Nasıl çözersiniz?', 
   '["İletişim araçlarını optimize edip düzenli check-in''ler yaparım", "Sadece email kullanmasını söylerim", "Ofise gelmesini zorlarım", "Hiçbir şey yapmam"]', 
   '[0]', 30, 'expert', NOW(), NOW());

-- Karakter analizi için liderlik tipleri
INSERT INTO question_bank_questions (id, type, domain, job_type, category, question, options, correct, points, difficulty, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'mcq', 'leadership', 'All', 'character-analysis', 'Hangi liderlik tarzını tercih edersiniz?', 
   '["Demokratik - Takım kararları alır", "Otoriter - Hızlı karar veririm", "Laissez-faire - Takımı serbest bırakırım", "Transformational - İlham verici liderlik"]', 
   '[]', 0, 'easy', NOW(), NOW()),
  
  (gen_random_uuid(), 'mcq', 'leadership', 'All', 'character-analysis', 'Çatışma durumunda nasıl yaklaşırsınız?', 
   '["Problem-solving odaklı", "Kaçınma odaklı", "Uyum odaklı", "Rekabet odaklı"]', 
   '[]', 0, 'easy', NOW(), NOW()),
  
  (gen_random_uuid(), 'mcq', 'leadership', 'All', 'character-analysis', 'Takım üyelerine nasıl feedback verirsiniz?', 
   '["Düzenli ve yapıcı", "Sadece hata yaptığında", "Sadece övgü", "Hiç vermem"]', 
   '[]', 0, 'easy', NOW(), NOW()),
  
  (gen_random_uuid(), 'mcq', 'leadership', 'All', 'character-analysis', 'Risk alırken nasıl davranırsınız?', 
   '["Hesaplanmış risk", "Yüksek risk", "Düşük risk", "Risk almam"]', 
   '[]', 0, 'easy', NOW(), NOW()),
  
  (gen_random_uuid(), 'mcq', 'leadership', 'All', 'character-analysis', 'Değişim sürecinde nasıl liderlik edersiniz?', 
   '["Aşamalı ve destekleyici", "Hızlı ve zorlayıcı", "Yavaş ve temkinli", "Değişimi engellerim"]', 
   '[]', 0, 'easy', NOW(), NOW());
