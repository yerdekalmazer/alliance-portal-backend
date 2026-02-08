# Swagger UI Kullanım Rehberi

Alliance Portal Backend API'sini Swagger UI ile test etme ve keşfetme rehberi.

---

## 🎯 Swagger UI Nedir?

Swagger UI, REST API'lerinizi interaktif şekilde keşfetmenize, test etmenize ve dokümantasyonunu görüntülemenize olanak sağlayan web tabanlı bir araçtır.

---

## 🚀 Swagger UI'a Erişim

### 1. Backend Sunucusunu Başlat

```bash
cd alliance-portal-backend
npm run dev
```

### 2. Tarayıcıda Aç

```
http://localhost:3001/api-docs
```

---

## 🔐 Authentication Kurulumu

Çoğu endpoint authentication gerektirir. İşte adım adım kurulum:

### Adım 1: Giriş Yap

1. **POST /api/auth/login** endpoint'ini bul
2. "Try it out" butonuna tıkla
3. Request body'yi doldur:

```json
{
  "email": "admin@testportal.com",
  "password": "Admin123!"
}
```

4. "Execute" butonuna tıkla
5. Response'dan `token` değerini kopyala

### Adım 2: Token'ı Ayarla

1. Sayfanın üst kısmındaki **"Authorize"** butonuna tıkla
2. Value alanına token'ı yapıştır (sadece token, "Bearer" yazmadan)
3. "Authorize" butonuna tıkla
4. "Close" ile kapat

Artık tüm korumalı endpoint'lere erişebilirsin!

---

## 📖 Endpoint'leri Keşfet

### Endpoint Grupları

API endpoint'leri şu kategorilere ayrılmış:

| Tag | Açıklama | Yetki Gereksinimi |
|-----|----------|------------------|  
| 🔐 Authentication | Giriş, kayıt, profil | Public/User |
| 📋 Cases | Vaka yönetimi | User/Admin |
| 🗳️ Surveys | Anket sistemi | User |
| 📊 Analytics | İstatistikler | Admin |
| 💡 Ideas | Fikir önerileri | Alliance/Admin |
| ❤️ Health | Sistem durumu | Public |

### Endpoint Detayları

Her endpoint için şunları görebilirsiniz:

- **Method ve URL:** GET /api/cases
- **Açıklama:** Ne yaptığını açıklar
- **Parameters:** Query/path parameters
- **Request Body:** Gönderilecek veri şeması
- **Responses:** Olası yanıtlar (200, 400, 401, 404 vb.)
- **Örnek Response:** Beklenen yanıt formatı

---

## 🧪 Endpoint Test Etme

### GET Request Örneği

**Endpoint:** GET /api/cases

1. Endpoint'i bul ve genişlet
2. "Try it out" tıkla
3. Query parameters varsa doldur
4. "Execute" tıkla
5. Response'u incele:
   - Status code (200, 404 vb.)
   - Response body
   - Headers

### POST Request Örneği

**Endpoint:** POST /api/cases

1. "Try it out" tıkla
2. Request body'yi doldur:

```json
{
  "title": "Test Vaka",
  "description": "Bu bir test vakasıdır",
  "job_types": ["Frontend Developer", "Backend Developer"],
  "specializations": ["React", "Node.js"],
  "requirements": ["3+ yıl deneyim"],
  "initial_threshold": 70,
  "target_team_count": 3,
  "ideal_team_size": 8
}
```

3. "Execute" tıkla
4. Response'u kontrol et (201 Created olmalı)

### PUT Request Örneği

**Endpoint:** PUT /api/cases/{id}

1. Path parameter'a UUID gir: `123e4567-e89b-12d3-a456-426614174000`
2. Request body'yi güncelle:

```json
{
  "title": "Güncellenmiş Başlık",
  "status": "completed"
}
```

3. "Execute" tıkla

### DELETE Request Örneği

**Endpoint:** DELETE /api/cases/{id}

1. Silinecek kaydın ID'sini gir
2. "Execute" tıkla
3. 200 veya 204 response bekle

---

## 📋 Yaygın Kullanım Senaryoları

### Senaryo 1: Yeni Kullanıcı Kaydı

```
1. POST /api/auth/register
   Body: { name, email, password }
   ⬇️
2. Başarılı yanıt: 201 Created + token
   ⬇️
3. Token'ı kopyala ve Authorize et
```

### Senaryo 2: Vaka Oluştur ve Listele

```
1. POST /api/auth/login (token al)
   ⬇️
2. POST /api/cases (yeni vaka oluştur)
   ⬇️
3. GET /api/cases (tüm vakaları listele)
   ⬇️
4. GET /api/cases/{id} (tek vaka detayı)
```

### Senaryo 3: Anket Doldur

```
1. GET /api/surveys/templates (mevcut anketleri gör)
   ⬇️
2. POST /api/surveys/responses (anket yanıtla)
   Body: { template_id, answers }
```

---

## 🔍 Response İnceleme

### Başarılı Response (200/201)

```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "title": "Test Vaka",
    ...
  },
  "message": "İşlem başarılı"
}
```

### Hata Response (400/401/403/404)

```json
{
  "success": false,
  "error": "Kayıt bulunamadı",
  "code": "NOT_FOUND"
}
```

### Validation Hatası (400)

```json
{
  "success": false,
  "error": "Geçersiz veri formatı",
  "code": "VALIDATION_ERROR",
  "details": {
    "email": "Geçerli bir e-posta adresi girin"
  }
}
```

---

## 💡 İpuçları ve Best Practices

### 1. Models/Schemas İncele

Sayfanın alt kısmındaki "Schemas" bölümünde tüm veri modellerini görebilirsiniz:
- User
- CaseScenario
- ApiResponse
- ErrorResponse

### 2. Example Values Kullan

Request body alanında "Example Value" butonuna tıklayarak otomatik örnek veriyi doldurabilirsiniz.

### 3. Curl Komutlarını Kopyala

Her request için Swagger UI otomatik curl komutu oluşturur. "Curl" sekmesinden kopyalayabilirsiniz:

```bash
curl -X 'GET' \
  'http://localhost:3001/api/cases' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer your-token-here'
```

### 4. Response Header'ları İncele

Bazı bilgiler response header'larında gelir:
- `X-RateLimit-Remaining`: Kalan istek hakkı
- `X-Response-Time`: İstek süresi

### 5. Multiple Servers

Swagger UI'da production ve development sunucuları arasında geçiş yapabilirsiniz (üst kısımda "Servers" dropdown).

---

## ❌ Sık Karşılaşılan Hatalar

### 401 Unauthorized

**Sebep:** Token geçersiz veya eksik

**Çözüm:**
1. Tekrar giriş yap
2. Yeni token al
3. "Authorize" butonuyla token'ı güncelle

### 403 Forbidden

**Sebep:** Yetkiniz yok

**Çözüm:**
- Admin endpoint'leri için admin hesabıyla giriş yapın
- Alliance endpoint'leri için alliance hesabı kullanın

### 400 Bad Request

**Sebep:** Eksik veya hatalı veri

**Çözüm:**
- Request body'yi kontrol edin
- Required alanları doldurun
- Veri tiplerini doğrulayın (string, number, array vb.)

### 404 Not Found

**Sebep:** Kayıt bulunamadı

**Çözüm:**
- ID'nin doğru olduğundan emin olun
- Kaydın silinmediğini kontrol edin

### 429 Too Many Requests

**Sebep:** Rate limit aşıldı

**Çözüm:**
- 15 dakika bekleyin
- Daha az sık istek gönderin

---

## 🧪 Test Senaryoları

### Tam Kullanıcı Akışı Testi

```
[ ] 1. POST /api/auth/register - Yeni hesap oluştur
[ ] 2. POST /api/auth/login - Giriş yap ve token al
[ ] 3. GET /api/auth/profile - Profili kontrol et
[ ] 4. POST /api/cases - Yeni vaka oluştur
[ ] 5. GET /api/cases - Vakaları listele
[ ] 6. GET /api/cases/{id} - Vaka detayını gör
[ ] 7. PUT /api/cases/{id} - Vakayı güncelle
[ ] 8. GET /api/analytics/dashboard - Dashboard verilerini gör (admin)
[ ] 9. POST /api/auth/logout - Çıkış yap
```

---

## 📚 Ek Kaynaklar

- **API Dokümantasyonu:** [API_DOKUMANTASYONU.md](./API_DOKUMANTASYONU.md)
- **Kurulum Rehberi:** [KURULUM_REHBERI.md](./KURULUM_REHBERI.md)
- **Swagger Official Docs:** https://swagger.io/docs/

---

**Not:** Swagger UI sadece development ortamında kullanılmalıdır. Production'da güvenlik nedeniyle devre dışı bırakılabilir veya authentication koruması altına alınmalıdır.

**Güncellenme Tarihi:** 7 Şubat 2026  
**Versiyon:** 1.0.0
