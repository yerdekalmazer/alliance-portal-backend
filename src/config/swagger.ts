import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Alliance Portal Backend API',
      version: '1.0.0',
      description: `
# Alliance Portal API Dokümantasyonu

Alliance Portal, topluluk odaklı proje geliştirme platformu için backend API servisidir.

## Özellikler
- 🔐 JWT tabanlı kimlik doğrulama
- 👥 Rol bazlı yetkilendirme (Admin, Alliance, User)
- 📊 Kapsamlı analitik ve raporlama
- 🗳️ Dinamik anket sistemi
- 💡 Fikir önerme ve değerlendirme
- 📋 Proje vaka yönetimi

## Kullanım
1. \`/api/auth/login\` endpoint'i ile giriş yapın
2. Dönen JWT token'ı \`Authorization: Bearer {token}\` header'ında kullanın
3. API endpoint'lerine erişin

## Rate Limiting
- Varsayılan: 100 istek / 15 dakika
- IP bazlı sınırlama aktif

## Hata Kodları
- \`4xx\`: İstemci hataları (geçersiz istek, yetkisiz erişim vb.)
- \`5xx\`: Sunucu hataları

Detaylı bilgi için her endpoint'in açıklamasına bakın.
      `,
      contact: {
        name: 'Alliance Portal Takımı',
        email: 'info@allianceportal.com'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production'
          ? 'https://api.allianceportal.com'
          : `http://localhost:${process.env.PORT || 3001}`,
        description: process.env.NODE_ENV === 'production'
          ? 'Production (Canlı) Sunucu'
          : 'Development (Geliştirme) Sunucu'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authorization token. Giriş yaptıktan sonra aldığınız token\'ı buraya yapıştırın. Örnek: "Authorization: Bearer {token}"'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['id', 'email', 'name', 'role'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Kullanıcının benzersiz kimliği (UUID)',
              example: '123e4567-e89b-12d3-a456-426614174000'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Kullanıcının e-posta adresi',
              example: 'kullanici@example.com'
            },
            name: {
              type: 'string',
              description: 'Kullanıcının tam adı',
              example: 'Ahmet Yılmaz'
            },
            role: {
              type: 'string',
              enum: ['admin', 'alliance', 'user'],
              description: 'Kullanıcının sistemdeki rolü: admin (yönetici), alliance (işbirliği ortağı), user (normal kullanıcı)',
              example: 'user'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Kayıt oluşturma zamanı',
              example: '2024-01-15T10:30:00Z'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Son güncelleme zamanı',
              example: '2024-01-20T14:45:00Z'
            }
          }
        },
        CaseScenario: {
          type: 'object',
          required: ['id', 'title', 'description', 'status'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Vakanın benzersiz kimliği',
              example: '456e7890-e89b-12d3-a456-426614174111'
            },
            title: {
              type: 'string',
              description: 'Vaka başlığı',
              example: 'E-Ticaret Platformu Geliştirme'
            },
            description: {
              type: 'string',
              description: 'Vaka detaylı açıklaması',
              example: 'Modern, ölçeklenebilir bir e-ticaret platformu geliştirilmesi...'
            },
            job_types: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Gereken iş pozisyonları',
              example: ['Frontend Developer', 'Backend Developer', 'UI/UX Designer']
            },
            specializations: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Gereken uzmanlık alanları',
              example: ['React', 'Node.js', 'PostgreSQL']
            },
            requirements: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Proje gereksinimleri',
              example: ['3+ yıl deneyim', 'Takım çalışmasında tecrübe']
            },
            created_by: {
              type: 'string',
              format: 'uuid',
              description: 'Vakayı oluşturan kullanıcının ID\'si'
            },
            initial_threshold: {
              type: 'integer',
              minimum: 0,
              maximum: 100,
              description: 'İlk değerlendirme eşik puanı (0-100)',
              example: 70
            },
            target_team_count: {
              type: 'integer',
              minimum: 1,
              description: 'Hedeflenen takım sayısı',
              example: 3
            },
            ideal_team_size: {
              type: 'integer',
              minimum: 1,
              description: 'İdeal takım büyüklüğü',
              example: 8
            },
            status: {
              type: 'string',
              enum: ['active', 'completed', 'archived'],
              description: 'Vaka durumu: active (aktif), completed (tamamlandı), archived (arşivlendi)',
              example: 'active'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Oluşturulma zamanı'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Son güncelleme zamanı'
            }
          }
        },
        ApiResponse: {
          type: 'object',
          required: ['success'],
          properties: {
            success: {
              type: 'boolean',
              description: 'İsteğin başarılı olup olmadığını belirtir',
              example: true
            },
            data: {
              type: 'object',
              description: 'Yanıt verisi (endpoint\'e göre değişir)'
            },
            error: {
              type: 'string',
              description: 'Hata mesajı (sadece success: false olduğunda)',
              example: 'Kayıt bulunamadı'
            },
            code: {
              type: 'string',
              description: 'Programatik hata kodu',
              example: 'NOT_FOUND'
            },
            message: {
              type: 'string',
              description: 'İnsan dostu mesaj',
              example: 'İşlem başarıyla tamamlandı'
            },
            meta: {
              type: 'object',
              properties: {
                total: {
                  type: 'integer',
                  description: 'Toplam kayıt sayısı',
                  example: 150
                },
                page: {
                  type: 'integer',
                  description: 'Mevcut sayfa numarası',
                  example: 1
                },
                limit: {
                  type: 'integer',
                  description: 'Sayfa başına kayıt sayısı',
                  example: 20
                },
                hasNext: {
                  type: 'boolean',
                  description: 'Sonraki sayfa var mı?',
                  example: true
                },
                hasPrev: {
                  type: 'boolean',
                  description: 'Önceki sayfa var mı?',
                  example: false
                }
              },
              description: 'Sayfalama meta verileri (liste endpoint\'lerinde)'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Kayıtlı e-posta adresi',
              example: 'kullanici@example.com'
            },
            password: {
              type: 'string',
              minLength: 6,
              description: 'Şifre (minimum 6 karakter)',
              example: 'Guvenli123!'
            }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'E-posta adresi (benzersiz olmalı)',
              example: 'yeni@example.com'
            },
            password: {
              type: 'string',
              minLength: 6,
              description: 'Şifre (minimum 6 karakter, büyük harf, küçük harf ve rakam önerilir)',
              example: 'Guvenli123!'
            },
            name: {
              type: 'string',
              minLength: 2,
              description: 'Tam ad (minimum 2 karakter)',
              example: 'Mehmet Demir'
            },
            role: {
              type: 'string',
              enum: ['user', 'alliance'],
              default: 'user',
              description: 'Kullanıcı rolü (admin rolü özel izin gerektirir)',
              example: 'user'
            }
          }
        },
        DashboardStats: {
          type: 'object',
          properties: {
            totalParticipants: {
              type: 'integer',
              description: 'Toplam katılımcı sayısı',
              example: 245
            },
            activeCases: {
              type: 'integer',
              description: 'Aktif vaka sayısı',
              example: 12
            },
            categoryDistribution: {
              type: 'object',
              properties: {
                yonlendirilebilirTeknik: {
                  type: 'integer',
                  description: 'Yönlendirilebilir teknik katılımcı sayısı',
                  example: 78
                },
                takimLideri: {
                  type: 'integer',
                  description: 'Takım lideri katılımcı sayısı',
                  example: 32
                },
                yeniBaslayan: {
                  type: 'integer',
                  description: 'Yeni başlayan katılımcı sayısı',
                  example: 95
                },
                operasyonelYetenek: {
                  type: 'integer',
                  description: 'Operasyonel yetenek katılımcı sayısı',
                  example: 40
                }
              },
              description: 'Katılımcıların kategorilere göre dağılımı'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          required: ['success', 'error'],
          properties: {
            success: {
              type: 'boolean',
              example: false,
              description: 'Her zaman false'
            },
            error: {
              type: 'string',
              description: 'Hata mesajı',
              example: 'Kayıt bulunamadı'
            },
            code: {
              type: 'string',
              description: 'Hata kodu',
              example: 'NOT_FOUND'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Yetkisiz erişim - JWT token geçersiz veya eksik',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: 'Yetkilendirme başlığı eksik. Lütfen tekrar giriş yapın.',
                code: 'NO_AUTH_HEADER'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Yasak - Kullanıcının bu işlem için yetkisi yok',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: 'Bu işlem için yetkiniz bulunmuyor.',
                code: 'INSUFFICIENT_PERMISSIONS'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Bulunamadı - İstenen kayıt mevcut değil',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                error: 'Kayıt bulunamadı',
                code: 'NOT_FOUND'
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: '🔐 Kullanıcı kimlik doğrulama ve oturum yönetimi endpoint\'leri. Giriş, kayıt, profil yönetimi ve çıkış işlemleri.'
      },
      {
        name: 'Cases',
        description: '📋 Proje vaka yönetimi endpoint\'leri. Vaka oluşturma, listeleme, güncelleme ve silme işlemleri. Admin ve alliance kullanıcıları yönetebilir.'
      },
      {
        name: 'Surveys',
        description: '🗳️ Dinamik anket sistemi endpoint\'leri. Anket şablonları, yanıtlar ve analiz işlemleri.'
      },
      {
        name: 'Analytics',
        description: '📊 Platform analitik ve istatistik endpoint\'leri. Dashboard verileri, raporlar ve metrikler. Sadece admin erişebilir.'
      },
      {
        name: 'Ideas',
        description: '💡 Alliance ortağı fikir önerme sistemi endpoint\'leri. Fikir gönderimi, listeleme ve durum yönetimi.'
      },
      {
        name: 'Health',
        description: '❤️ Sistem sağlık kontrolü endpoint\'leri. Sunucu durumu ve servis bilgileri.'
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/app.ts'
  ]
};

export const specs = swaggerJsdoc(options);
export { swaggerUi };
