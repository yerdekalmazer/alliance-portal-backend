# Test Kullanım Kılavuzu

Alliance Portal Backend projesi için test yazma ve çalıştırma rehberi.

---

## 📚 İçindekiler

1. [Test Komutları](#test-komutları)
2. [Test Yazma Rehberi](#test-yazma-rehberi)
3. [Test Türleri](#test-türleri)
4. [Test Fixture'ları Kullanma](#test-fixtureları-kullanma)
5. [Debugging Testler](#debugging-testler)
6. [Best Practices](#best-practices)

---

## 🎮 Test Komutları

### Temel Komutlar

```bash
# Tüm testleri çalıştır
npm test

# Sadece unit testler
npm run test:unit

# Sadece integration testler
npm run test:integration

# Watch mode - dosya değişikliklerinde otomatik çalıştır
npm run test:watch

# Coverage raporu ile test çalıştır
npm run test:coverage
```

### Özel Test Çalıştırma

```bash
# Belirli bir dosyadaki testleri çalıştır
npm test -- auth.test.ts

# Belirli bir test suite çalıştır
npm test -- --testNamePattern="Auth Middleware"

# Verbose modda çalıştır (detaylı çıktı)
npm test -- --verbose

# Fail olan testleri tekrar çalıştır
npm test -- --onlyFailures
```

---

## ✍️ Test Yazma Rehberi

### Unit Test Yazma

#### 1. Test Dosyası Oluştur

Unit testler `tests/unit/` dizininde olmalı:

```
tests/unit/
├── middleware/
│   └── myMiddleware.test.ts
└── controllers/
    └── myController.test.ts
```

#### 2. Test Yapısı

```typescript
// tests/unit/middleware/exampleMiddleware.test.ts
import { Request, Response, NextFunction } from 'express';
import { exampleMiddleware } from '../../../src/middleware/exampleMiddleware';
import { createMockRequest, createMockResponse, createMockNext } from '../../fixtures/testData';

describe('Example Middleware', () => {
  describe('başarılı durumlar', () => {
    it('geçerli girdide next çağırmalı', () => {
      // Arrange (Hazırlık)
      const req = createMockRequest({ body: { valid: true } });
      const res = createMockResponse();
      const next = createMockNext();

      // Act (Eylem)
      exampleMiddleware(req as Request, res as Response, next as NextFunction);

      // Assert (Doğrulama)
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('hata durumları', () => {
    it('geçersiz girdide 400 hatası döndürmeli', () => {
      const req = createMockRequest({ body: {} });
      const res = createMockResponse();
      const next = createMockNext();

      exampleMiddleware(req as Request, res as Response, next as NextFunction);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.any(String),
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
```

### Integration Test Yazma

#### 1. Test Dosyası Oluştur

Integration testler `tests/integration/` dizininde:

```
tests/integration/
├── auth.api.test.ts
├── cases.api.test.ts
└── myFeature.api.test.ts
```

#### 2. API Test Yapısı

```typescript
// tests/integration/myFeature.api.test.ts
import request from 'supertest';
import app from '../../src/app';

describe('My Feature API', () => {
  describe('GET /api/my-feature', () => {
    it('200 döndürmeli - başarılı istek', async () => {
      const response = await request(app)
        .get('/api/my-feature')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('401 döndürmeli - authentication olmadan', async () => {
      const response = await request(app).get('/api/my-feature');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('NO_AUTH_HEADER');
    });
  });

  describe('POST /api/my-feature', () => {
    it('201 döndürmeli - geçerli veri ile', async () => {
      const newData = {
        title: 'Test Title',
        description: 'Test Description',
      };

      const response = await request(app)
        .post('/api/my-feature')
        .set('Authorization', 'Bearer valid-token')
        .send(newData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject(newData);
    });

    it('400 döndürmeli - eksik alan', async () => {
      const response = await request(app)
        .post('/api/my-feature')
        .set('Authorization', 'Bearer valid-token')
        .send({ title: 'Only Title' });

      expect(response.status).toBe(400);
    });
  });
});
```

---

## 📝 Test Türleri

### 1. Unit Testler

**Amaç:** Tek bir fonksiyonu/modülü izole test et

**Ne zaman kullanılır:**
- Middleware fonksiyonları
- Utility fonksiyonları
- Business logic

**Örnek:**
```typescript
describe('calculateDiscount', () => {
  it('%10 indirim hesaplamalı', () => {
    expect(calculateDiscount(100, 10)).toBe(90);
  });

  it('negatif değerde hata fırlatmalı', () => {
    expect(() => calculateDiscount(-100, 10)).toThrow();
  });
});
```

### 2. Integration Testler

**Amaç:** Birden fazla bileşenin birlikte çalışmasını test et

**Ne zaman kullanılır:**
- API endpoint'leri
- Database operasyonları
- Authentication akışları

**Örnek:**
```typescript
describe('POST /api/users', () => {
  it('yeni kullanıcı oluşturmalı ve database'e kaydetmeli', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'Test User', email: 'test@example.com' });

    expect(response.status).toBe(201);
    
    // Database'de oluşturulduğunu doğrula
    const user = await getUserFromDb(response.body.data.id);
    expect(user).toBeDefined();
  });
});
```

### 3. End-to-End (E2E) Testler

**Amaç:** Kullanıcı akışlarını baştan sona test et

**Ne zaman kullanılır:**
- Kompleks kullanıcı senaryoları
- Multi-step işlemler

**Örnek:**
```typescript
describe('User Registration and Login Flow', () => {
  it('kullanıcı kaydolup giriş yapabilmeli', async () => {
    // 1. Kayıt ol
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'New User',
        email: 'newuser@example.com',
        password: 'SecurePass123!',
      });
    
    expect(registerResponse.status).toBe(201);

    // 2. Giriş yap
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'newuser@example.com',
        password: 'SecurePass123!',
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.data.token).toBeDefined();

    // 3. Token ile profil bilgisini al
    const profileResponse = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${loginResponse.body.data.token}`);

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.data.email).toBe('newuser@example.com');
  });
});
```

---

## 🎯 Test Fixture'ları Kullanma

### Mock Data Kullanımı

`tests/fixtures/testData.ts` dosyasında tanımlı fixture'ları kullan:

```typescript
import { testUsers, testCase, testIdea } from '../fixtures/testData';

describe('User Tests', () => {
  it('admin kullanıcısı ile test', () => {
    const admin = testUsers.admin;
    expect(admin.role).toBe('admin');
    expect(admin.email).toBe('admin@test.com');
  });
});
```

### Helper Fonksiyonlar

```typescript
import { 
  createMockRequest, 
  createMockResponse, 
  createMockNext 
} from '../fixtures/testData';

describe('Middleware Test', () => {
  it('request/response mock kullanımı', () => {
    const req = createMockRequest({
      body: { test: 'data' },
      headers: { authorization: 'Bearer token' },
      user: testUsers.admin,
    });

    const res = createMockResponse();
    const next = createMockNext();

    myMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
  });
});
```

### Yeni Fixture Ekleme

```typescript
// tests/fixtures/testData.ts

export const testProduct = {
  id: 'product-id-123',
  name: 'Test Ürün',
  price: 99.99,
  stock: 100,
};

export const createTestUser = (overrides = {}) => ({
  id: 'generated-id',
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  ...overrides,
});
```

---

## 🐞 Debugging Testler

### Console.log Kullanımı

```typescript
it('debug test', () => {
  const result = myFunction(input);
  console.log('Result:', result);
  expect(result).toBeDefined();
});
```

### Single Test Çalıştırma

```typescript
// Sadece bu test çalışır
it.only('bu testi çalıştır', () => {
  expect(true).toBe(true);
});

// Bu test atlanır
it.skip('bu testi atla', () => {
  expect(true).toBe(false);
});
```

### VSCode Debugger

1. `.vscode/launch.json` oluştur:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Debug",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand", "--no-cache"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

2. Breakpoint koy ve F5 ile debug başlat

---

## ✅ Best Practices

### 1. Test İsimlendirme

**İyi:**
```typescript
it('kullanıcı yoksa 404 hatası döndürmeli', () => {});
it('geçerli token ile profil bilgisini döndürmeli', () => {});
```

**Kötü:**
```typescript
it('test 1', () => {});
it('works', () => {});
```

### 2. AAA Pattern (Arrange-Act-Assert)

```typescript
it('örnek test', () => {
  // Arrange: Test verilerini hazırla
  const input = { value: 10 };
  const expected = 20;

  // Act: Test edilecek fonksiyonu çağır
  const result = doubleValue(input.value);

  // Assert: Sonucu doğrula
  expect(result).toBe(expected);
});
```

### 3. Test İzolasyonu

Her test bağımsız olmalı:

```typescript
// Kötü - testler birbirine bağımlı
let sharedData;

it('veriyi oluştur', () => {
  sharedData = createData();
});

it('veriyi kullan', () => {
  expect(sharedData).toBeDefined(); // Önceki teste bağımlı!
});

// İyi - her test bağımsız
describe('Data Tests', () => {
  let testData;

  beforeEach(() => {
    testData = createData();
  });

  it('veriyi oluştur', () => {
    expect(testData).toBeDefined();
  });

  it('veriyi kullan', () => {
    expect(testData.value).toBe(10);
  });
});
```

### 4. Anlamlı Assertion'lar

```typescript
// Kötü
expect(response.body).toBeDefined();

// İyi
expect(response.body).toMatchObject({
  success: true,
  data: expect.objectContaining({
    id: expect.any(String),
    email: 'test@example.com',
  }),
});
```

### 5. Edge Case'leri Test Et

```typescript
describe('divide', () => {
  it('normal bölme işlemi', () => {
    expect(divide(10, 2)).toBe(5);
  });

  it('sıfıra bölme durumunda hata fırlatmalı', () => {
    expect(() => divide(10, 0)).toThrow('Division by zero');
  });

  it('negatif sayılarla çalışmalı', () => {
    expect(divide(-10, 2)).toBe(-5);
  });

  it('ondalık sayı döndürmeli', () => {
    expect(divide(10, 3)).toBeCloseTo(3.33, 2);
  });
});
```

---

## 📊 Coverage Raporları

### Coverage Raporu Görüntüleme

```bash
# HTML rapor oluştur
npm run test:coverage

# Raporu tarayıcıda aç
open coverage/index.html
```

### Coverage Yorumlama

- **Yeşil (> %80):** İyi coverage
- **Sarı (%60-80):** Kabul edilebilir
- **Kırmızı (< %60):** İyileştirme gerekli

### Coverage Artırma

1. **Coverage raporuna bak**
2. **Kırmızı/sarı alanları belirle**
3. **Test yaz**
4. **Tekrar coverage çalıştır**

---

## 🤝 CI/CD Entegrasyonu

### GitHub Actions Örneği

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

---

## 📚 Ek Kaynaklar

- [Jest Dokümantasyonu](https://jestjs.io/docs/getting-started)
- [Supertest Dokümantasyonu](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

**Güncellenme Tarihi:** 7 Şubat 2026  
**Versiyon:** 1.0.0
