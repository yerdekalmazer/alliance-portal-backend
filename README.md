# Alliance Portal — API

Alliance Network'ün sade akışı:

1. Kurum landing sayfasındaki formdan **başvurur**.
2. Admin başvuruyu **onaylar** ("Şifre Belirle") → alliance üyesi (partner) hesabı açılır.
3. Üye panelinden **fikir** gönderir (uzun form).
4. Admin fikri onaylar ve **case'e dönüştürür**; case bilgilerini admin girer, ekibi case'in içinden kişi kişi ekler, süreci ve durum mesajını yönetir.
5. Üye kendi fikirlerinin durumunu ve case'lerini görür.

Anket, değerlendirme, takım oluşturma ve raporlama bu sürümde yok.

## Teknoloji

Express 5 + TypeScript, Postgres (`pg`), JWT oturum, bcrypt şifre. Supabase ya da herhangi bir Postgres ile çalışır.
Şema `db/schema.sql` içinde; sunucu her açılışta uygular (tüm ifadeler `IF NOT EXISTS`).

| Tablo | İçerik |
|---|---|
| `users` | Admin ve alliance hesapları |
| `alliance_applications` | Herkese açık başvurular |
| `alliance_members` | Onaylanan kurumlar (bir kullanıcıya bağlı) |
| `ideas` | Üyelerin fikirleri |
| `cases` | Fikirden doğan case'ler (süreç adımı, durum mesajı dahil) |
| `case_team_members` | Case ekibi (admin ekler) |

## Yerelde çalıştırma

```bash
cp env.example .env   # DATABASE_URL, JWT_SECRET, ADMIN_EMAIL/ADMIN_PASSWORD doldurun
npm install
npm run dev           # http://localhost:3001
```

## Test

Uçtan uca akış testi gerçek bir Postgres ister ve **o veritabanındaki tabloları siler**; yalnızca boş bir test veritabanıyla çalıştırın:

```bash
TEST_DATABASE_URL=postgres://.../alliance_test npm test
```

## Uçlar

| Yöntem | Yol | Kim |
|---|---|---|
| POST | `/api/auth/login` | herkes |
| GET `/me` · PUT `/profile` | `/api/auth` | giriş yapan ("Profil Bilgilerim", şifre değişikliği dahil) |
| POST | `/api/alliance-applications` | herkes (saatte 10) |
| GET · POST `:id/approve` · POST `:id/reject` · DELETE `:id` | `/api/alliance-applications` | admin |
| GET · GET `:userId` · POST · PUT `:userId` · DELETE `:userId` | `/api/members` | admin ("Partner Ekle/Düzenle") |
| POST | `/api/ideas` | alliance |
| GET · GET `:id` | `/api/ideas` | admin hepsini, üye kendi fikirlerini |
| PATCH `:id` · POST `:id/convert` · DELETE `:id` | `/api/ideas` | admin |
| GET · GET `:id` · GET `:id/team` | `/api/cases` | admin hepsini, üye kendi case'lerini |
| POST · PUT `:id` · PUT `:id/message` · PUT `:id/process` · DELETE `:id` | `/api/cases` | admin |
| POST `:id/team` · PUT `:id/team/:memberId` · DELETE `:id/team/:memberId` | `/api/cases` | admin |
| GET | `/api/stats` | admin |

Şifreler en az 6 karakter (eski formlardaki kural). Üye; fikirlerdeki `admin_note` alanını ve ekip üyelerinin iletişim bilgilerini görmez.

## Render

`render.yaml` Blueprint'tir. Render panelinde *New → Blueprint* ile bu repoyu seçin, `DATABASE_URL`, `ALLOWED_ORIGINS`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` değerlerini girin. Supabase kullanılıyorsa **Session pooler** adresini verin (direct host yalnızca IPv6, Render'dan erişilemez).
