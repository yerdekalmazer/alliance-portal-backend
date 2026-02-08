# Alliance Portal Backend - Modül Listesi

Bu dokümantasyon, Alliance Portal Backend projesindeki tüm modülleri, dosyaları ve bunların işlevlerini detaylı olarak listelemektedir.

## 📋 İçindekiler

- [Controllers](#controllers)
- [Routes](#routes)
- [Middleware](#middleware)
- [Models](#models)
- [Utils](#utils)
- [Config](#config)
- [Scripts](#scripts)

---

## Controllers

Backend'in iş mantığını yöneten controller modülleri:

### 1. **adaptiveTechnicalAssessmentController.ts**
- Uyarlanabilir teknik değerlendirme süreçlerini yönetir
- AI destekli soru seçimi ve zorluk ayarlaması
- Boyut: ~21 KB

### 2. **allianceApplicationsController.ts**
- Alliance başvuru süreçlerini yönetir
- Başvuru durumu takibi ve değerlendirme
- Boyut: ~10 KB

### 3. **alliancePartnersController.ts**
- Partner yönetim işlemlerini kontrol eder
- Partner bilgileri, divizyonlar ve ilişkiler
- Boyut: ~18 KB

### 4. **analyticsController.ts**
- Analitik verileri ve istatistikleri sağlar
- Dashboard metrikleri ve raporlama
- Boyut: ~14 KB

### 5. **applicationsController.ts**
- Genel başvuru işlemlerini yönetir
- Başvuru CRUD operasyonları
- Boyut: ~15 KB

### 6. **archivedCasesController.ts**
- Arşivlenmiş vaka yönetimi
- Eski vaka kayıtlarına erişim ve sorgulama
- Boyut: ~10 KB

### 7. **authController.ts**
- Kimlik doğrulama ve yetkilendirme
- Login, logout, token yönetimi
- Boyut: ~20 KB

### 8. **caseProposalsController.ts**
- Vaka önerilerini yönetir
- Öneri oluşturma ve değerlendirme
- Boyut: ~6 KB

### 9. **casesController.ts**
- Ana vaka yönetim sistemi
- Vaka CRUD, durum takibi, atamalar
- Boyut: ~40 KB (En büyük controller)

### 10. **ideasController.ts**
- Fikir/öneri yönetim sistemi
- Fikir paylaşımı, oylama, değerlendirme
- Boyut: ~28 KB

### 11. **questionBankController.ts**
- Soru bankası yönetimi
- Teknik sorular ve kategoriler
- Boyut: ~9 KB

### 12. **surveyController.ts**
- Anket sistemi yönetimi
- Anket oluşturma, AI destekli soru üretimi
- Boyut: ~76 KB (En büyük modül)
- Not: Bir backup dosyası da mevcut (surveyController.ts.backup)

### 13. **technicalAssessmentController.ts**
- Teknik değerlendirme sistemi
- Test yönetimi ve değerlendirme
- Boyut: ~22 KB

### 14. **uploadController.ts**
- Dosya yükleme işlemleri
- Supabase Storage entegrasyonu
- Boyut: ~8 KB

### 15. **websocketController.ts**
- WebSocket bağlantı yönetimi
- Gerçek zamanlı iletişim
- Boyut: ~6 KB

---

## Routes

API endpoint'lerini tanımlayan route modülleri:

### 1. **adaptiveTechnicalAssessment.ts**
- `/api/adaptive-technical-assessment/*` endpoint'leri
- Uyarlanabilir değerlendirme rotaları
- Boyut: ~4 KB

### 2. **allianceApplications.ts**
- `/api/alliance-applications/*` endpoint'leri
- Alliance başvuru rotaları
- Boyut: ~9 KB

### 3. **alliancePartners.ts**
- `/api/alliance-partners/*` endpoint'leri
- Partner yönetim rotaları
- Boyut: ~10 KB

### 4. **analytics.ts**
- `/api/analytics/*` endpoint'leri
- Analitik veri rotaları
- Boyut: ~3 KB

### 5. **applications.ts**
- `/api/applications/*` endpoint'leri
- Genel başvuru rotaları
- Boyut: ~1 KB

### 6. **archivedCases.ts**
- `/api/archived-cases/*` endpoint'leri
- Arşivlenmiş vaka rotaları
- Boyut: ~1 KB

### 7. **auth.ts**
- `/api/auth/*` endpoint'leri
- Kimlik doğrulama rotaları
- Boyut: ~6 KB

### 8. **caseProposals.ts**
- `/api/case-proposals/*` endpoint'leri
- Vaka öneri rotaları
- Boyut: ~528 bytes

### 9. **cases.ts**
- `/api/cases/*` endpoint'leri
- Vaka yönetim rotaları
- Boyut: ~6 KB

### 10. **ideas.ts**
- `/api/ideas/*` endpoint'leri
- Fikir yönetim rotaları
- Boyut: ~3 KB

### 11. **questionBank.ts**
- `/api/question-bank/*` endpoint'leri
- Soru bankası rotaları
- Boyut: ~788 bytes

### 12. **surveys.ts**
- `/api/surveys/*` endpoint'leri
- Anket yönetim rotaları
- Boyut: ~3 KB

### 13. **upload.ts**
- `/api/upload/*` endpoint'leri
- Dosya yükleme rotaları
- Boyut: ~5 KB

---

## Middleware

İstek işleme sürecinde kullanılan middleware modülleri:

### 1. **auth.ts**
- Token doğrulama
- Kullanıcı kimlik kontrolü
- Rol tabanlı yetkilendirme
- Boyut: ~6 KB

### 2. **errorHandler.ts**
- Global hata yakalama
- Hata formatı standardizasyonu
- HTTP durum kodu yönetimi
- Boyut: ~2 KB

### 3. **notFound.ts**
- 404 endpoint hatası
- Bilinmeyen route yönetimi
- Boyut: ~732 bytes

### 4. **security.ts**
- Güvenlik başlıkları (Helmet)
- CORS yapılandırması
- Rate limiting
- Request throttling
- Boyut: ~6 KB

---

## Models

TypeScript tip tanımlamaları ve veri modelleri:

### 1. **database.types.ts**
- Supabase otomatik üretilmiş tipler
- Veritabanı şema tipleri
- Tablo ve view tanımları
- Boyut: ~16 KB

### 2. **types.ts**
- Özel uygulama tipleri
- Request/Response interface'leri
- Enum tanımları
- Boyut: ~8 KB

---

## Utils

Yardımcı araçlar ve utility fonksiyonları:

### 1. **surveyGeneration.ts**
- AI destekli anket sorusu üretimi
- Soru formatlama ve validasyon
- OpenAI/Gemini entegrasyonu
- Boyut: ~25 KB

---

## Config

Yapılandırma dosyaları:

### 1. **database.ts**
- Supabase client yapılandırması
- Veritabanı bağlantı ayarları
- Boyut: ~2 KB

### 2. **swagger.ts**
- Swagger/OpenAPI dokümantasyonu
- API endpoint tanımları
- Schema definitions
- Boyut: ~15 KB

---

## Scripts

Yardımcı scriptler ve araçlar:

### 1. **addApplicationInitialSurvey.ts**
- Başvurulara başlangıç anketi ekleme
- Veri güncelleme scripti
- Boyut: ~1.5 KB

### 2. **seedData.ts**
- Veritabanı seed işlemi
- Test verisi oluşturma
- Boyut: ~14 KB

### 3. **testSystem.ts**
- Sistem test scripti
- Entegrasyon testleri
- Boyut: ~11 KB

### 4. **updateUserRole.ts**
- Kullanıcı rolü güncelleme
- Yetki yönetimi scripti
- Boyut: ~1.5 KB

---

## Ana Dosyalar

### Core Application Files

#### **app.ts**
- Express uygulama yapılandırması
- Middleware entegrasyonu
- Route bağlantıları
- WebSocket kurulumu
- Boyut: ~9 KB

#### **index.ts**
- Sunucu başlatma
- Port dinleme
- Hata yönetimi
- Boyut: ~3 KB

---

## İstatistikler

### Modül Sayıları
- **Controllers**: 15 modül
- **Routes**: 13 modül
- **Middleware**: 4 modül
- **Models**: 2 modül
- **Utils**: 1 modül
- **Config**: 2 modül
- **Scripts**: 4 modül

### Toplam
**41 ana modül** + 2 core dosya (app.ts, index.ts)

### En Büyük Modüller
1. surveyController.ts (~76 KB)
2. casesController.ts (~40 KB)
3. ideasController.ts (~28 KB)
4. surveyGeneration.ts (~25 KB)
5. technicalAssessmentController.ts (~22 KB)

---

## Teknoloji Stack

### Ana Bağımlılıklar
- **Framework**: Express.js v5.1.0
- **Database**: Supabase (@supabase/supabase-js v2.57.4)
- **Real-time**: Socket.io v4.8.1
- **Security**: Helmet v8.1.0, Express Rate Limit v8.1.0
- **Documentation**: Swagger UI Express v5.0.1
- **File Upload**: Multer v2.0.2
- **HTTP Client**: Axios v1.12.2

### Dev Bağımlılıklar
- **Language**: TypeScript v5.9.2
- **Testing**: Jest v30.2.0, Supertest v7.2.2
- **Linting**: ESLint v9.39.2 + TypeScript ESLint
- **Dev Server**: Nodemon v3.1.10
- **Runtime**: ts-node v10.9.2

---

## Notlar

- Tüm modüller TypeScript ile yazılmıştır
- RESTful API standardına uygun tasarlanmıştır
- Supabase ile full entegrasyon sağlanmıştır
- JWT tabanlı kimlik doğrulama kullanılmaktadır
- Swagger dokümantasyonu `/api-docs` endpoint'inde mevcuttur
- WebSocket desteği ile gerçek zamanlı özellikler bulunmaktadır

---

*Son güncelleme: 2026-02-07*
*Versiyon: 1.0.0*
