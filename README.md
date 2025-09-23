# Alliance Portal Backend

Alliance Portal Backend API - Community-driven project development platform

## 🚀 Özellikler

- **RESTful API**: Express.js ile modern API
- **TypeScript**: Tip güvenliği ve developer experience
- **Supabase**: PostgreSQL database ve authentication
- **Güvenlik**: Helmet, CORS, Rate limiting
- **Authentication**: JWT tabanlı kimlik doğrulama
- **Role-based Access**: Admin, Alliance, User rolleri
- **Comprehensive Logging**: Morgan ile detaylı loglar

## 📋 Gereksinimler

- Node.js >= 16.0.0
- npm >= 8.0.0
- Supabase account ve project

## 🛠️ Kurulum

1. **Bağımlılıkları yükle:**
```bash
npm install
```

2. **Environment variables ayarla:**
```bash
cp env.example .env
```

`.env` dosyasını Supabase bilgilerinle düzenle:
```
PORT=3001
NODE_ENV=development
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
FRONTEND_URL=http://localhost:5173
```

3. **Supabase Database Schema:**
`surec.md` dosyasındaki SQL scriptlerini Supabase SQL Editor'da çalıştır.

## 🏃‍♂️ Çalıştırma

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Type Check
```bash
npm run type-check
```

## 📁 Proje Yapısı

```
src/
├── config/           # Configuration files
│   └── database.ts   # Supabase configuration
├── controllers/      # API route handlers
│   ├── authController.ts
│   ├── casesController.ts
│   ├── surveyController.ts
│   ├── analyticsController.ts
│   └── ideasController.ts
├── middleware/       # Express middleware
│   ├── auth.ts       # Authentication middleware
│   ├── errorHandler.ts
│   └── notFound.ts
├── models/           # Type definitions
│   └── types.ts
├── routes/           # API routes
│   ├── auth.ts
│   ├── cases.ts
│   ├── surveys.ts
│   ├── analytics.ts
│   └── ideas.ts
├── services/         # Business logic (coming soon)
├── utils/            # Helper functions (coming soon)
├── app.ts            # Express app configuration
└── index.ts          # Server entry point
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/logout` - Logout

### Cases
- `GET /api/cases` - List all cases
- `POST /api/cases` - Create new case
- `GET /api/cases/:id` - Get case details
- `PUT /api/cases/:id` - Update case
- `DELETE /api/cases/:id` - Delete case

### Surveys
- `GET /api/surveys/templates` - List survey templates
- `POST /api/surveys/responses` - Submit survey response
- `GET /api/surveys/public/:linkId` - Access public survey

### Analytics
- `GET /api/analytics/dashboard` - Dashboard statistics
- `GET /api/analytics/cases/overview` - Cases overview

### Ideas
- `GET /api/ideas` - List ideas
- `POST /api/ideas` - Submit new idea
- `PUT /api/ideas/:id/status` - Update idea status

## 🔐 Authentication

Backend JWT token tabanlı authentication kullanır. Requests'lerde Authorization header gerekir:

```
Authorization: Bearer <your-jwt-token>
```

## 🛡️ Güvenlik

- **Helmet**: HTTP headers güvenliği
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: IP bazlı rate limiting
- **Input Validation**: Request validation (coming soon)
- **SQL Injection Protection**: Supabase parameterized queries

## 📊 Monitoring

- **Health Check**: `GET /health`
- **Logging**: Morgan middleware ile HTTP request logs
- **Error Handling**: Centralized error handling

## 🚀 Deployment

### Environment Variables
Production için gerekli environment variables:
- `NODE_ENV=production`
- `PORT=3001`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FRONTEND_URL`

### Build Process
```bash
npm run build
npm start
```

## 🧪 Testing

```bash
npm test  # Tests coming soon
```

## 📈 Performance

- **Compression**: Gzip compression
- **Caching**: Database query optimization
- **Connection Pooling**: Supabase connection management

## 🤝 Katkıda Bulunma

1. Fork this repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📝 License

ISC License

## 🆘 Yardım

- **Documentation**: `surec.md` dosyasını incele
- **Health Check**: `http://localhost:3001/health`
- **API Test**: Postman/Insomnia ile endpoints'leri test et
