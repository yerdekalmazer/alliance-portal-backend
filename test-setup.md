# Alliance Portal Backend Test Setup

## 🧪 Test Kurulumu

Backend'i test etmek için aşağıdaki adımları takip edin:

### 1. Environment Variables

`env.example` dosyasını `.env` olarak kopyalayın ve Supabase bilgilerinizi girin:

```bash
cp env.example .env
```

`.env` dosyası içeriği:
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Supabase Configuration (Gerçek değerlerinizi girin)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# CORS Configuration
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Security
JWT_SECRET=your-secret-key-here
BCRYPT_SALT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 2. Supabase Database Schema

Supabase dashboard'da SQL Editor'ı açın ve aşağıdaki tabloları oluşturun:

```sql
-- Enable RLS
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Users table (Supabase Auth ile entegre)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'alliance', 'user')) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert a test admin user (gerçek email'inizi kullanın)
INSERT INTO users (id, email, name, role) VALUES 
('00000000-0000-0000-0000-000000000000', 'admin@test.com', 'Test Admin', 'admin');

-- Cases table
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  job_types TEXT[] NOT NULL DEFAULT '{}',
  specializations TEXT[] NOT NULL DEFAULT '{}',
  requirements TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES users(id),
  initial_threshold INTEGER DEFAULT 70,
  target_team_count INTEGER DEFAULT 3,
  ideal_team_size INTEGER DEFAULT 8,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Test case
INSERT INTO cases (title, description, job_types, specializations, requirements, created_by) VALUES 
('Test Project', 'Bu bir test projesidir', 
 ARRAY['Frontend Developer', 'Backend Developer'], 
 ARRAY['React', 'Node.js']
 ARRAY['Modern web development experience'], 
 '00000000-0000-0000-0000-000000000000');
```

### 3. Server'ı Başlatma

```bash
# Dependencies'leri yükle (eğer henüz yüklemediyseniz)
npm install

# Development mode'da başlat
npm run dev
```

Server çalıştığında şu mesajları göreceksiniz:
```
🔗 Checking database connection...
✅ Database connection successful
🚀 Alliance Portal Backend Server Started
📡 Server running on port 3001
🌍 Environment: development
📋 Health check: http://localhost:3001/health
🎯 API base URL: http://localhost:3001/api
```

### 4. API Test'leri

#### Health Check
```bash
curl http://localhost:3001/health
```

Beklenen yanıt:
```json
{
  "status": "OK",
  "timestamp": "2024-12-19T10:30:00.000Z",
  "service": "Alliance Portal Backend",
  "version": "1.0.0",
  "environment": "development"
}
```

#### Root Endpoint
```bash
curl http://localhost:3001/
```

#### Cases Endpoint (Authentication gerekli)
```bash
# Önce Supabase'de bir user oluşturun ve token alın
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3001/api/cases
```

### 5. Frontend ile Entegrasyon

Frontend'i çalıştırıp backend ile bağlantı test edebilirsiniz:

1. Frontend klasöründe `.env` dosyasını güncelleyin:
```env
VITE_API_URL=http://localhost:3001/api
```

2. Frontend'i başlatın:
```bash
cd ../alliance-portal-frontend
npm run dev
```

### 6. Troubleshooting

#### Database Connection Error
- Supabase URL'nin doğru olduğunu kontrol edin
- SUPABASE_ANON_KEY'in aktif olduğunu kontrol edin
- Supabase project'inin paused durumda olmadığını kontrol edin

#### CORS Errors
- `ALLOWED_ORIGINS` environment variable'ında frontend URL'in bulunduğunu kontrol edin
- Browser console'da detaylı hata mesajını inceleyin

#### Authentication Errors
- JWT token'ın geçerli olduğunu kontrol edin
- Users tablosunda ilgili user'ın bulunduğunu kontrol edin

### 7. Postman Collection

API'yi test etmek için Postman kullanabilirsiniz. Temel requests:

1. **Health Check**
   - Method: GET
   - URL: `http://localhost:3001/health`

2. **Login** (Supabase Auth gerekli)
   - Method: POST  
   - URL: `http://localhost:3001/api/auth/login`
   - Body: `{"email": "test@example.com", "password": "password"}`

3. **Get Cases**
   - Method: GET
   - URL: `http://localhost:3001/api/cases`
   - Headers: `Authorization: Bearer YOUR_JWT_TOKEN`

### 8. Database Monitoring

Supabase dashboard'da:
- **Table Editor**: Veri tabanlı değişiklikleri görmek için
- **API Logs**: Request logları için  
- **SQL Editor**: Manual queries için

### 9. Next Steps

Backend başarıyla çalışıyorsa:
1. Frontend'i backend'e bağlayın
2. Authentication flow'u test edin
3. Cases CRUD operations'ları test edin
4. Survey system'i implement edin

### 10. Production Setup

Production'a deploy etmeden önce:
- Environment variables'ları production değerleriyle güncelleyin
- HTTPS kullanın
- Rate limiting ayarlarını production'a göre yapın
- Monitoring ve logging setup'ı yapın
