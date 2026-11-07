-- Alliance Portal — sade akış şeması
-- Akış: başvuru → admin onayı → alliance üyesi → fikir → admin case'e dönüştürür.
-- Alanlar eski sürümün formlarıyla birebir aynıdır. Tekrar çalıştırılabilir (IF NOT EXISTS).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Giriş yapabilen herkes: admin veya alliance üyesi
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'alliance')),
  password_hash TEXT NOT NULL,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Herkese açık "Alliance Partner Başvurusu" formu
CREATE TABLE IF NOT EXISTS alliance_applications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name TEXT NOT NULL,
  website           TEXT,
  profile           TEXT,
  contact_name      TEXT NOT NULL,
  contact_title     TEXT,
  email             TEXT NOT NULL,
  phone             TEXT,
  motivation        TEXT,
  roles             TEXT[] NOT NULL DEFAULT '{}',
  other_role        TEXT,
  archetype         TEXT,
  contribution      TEXT,
  confirm_accuracy  BOOLEAN NOT NULL DEFAULT FALSE,
  confirm_contact   BOOLEAN NOT NULL DEFAULT FALSE,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes       TEXT,
  reviewed_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alliance üyesi (partner) — bir kullanıcı hesabına bağlı
CREATE TABLE IF NOT EXISTS alliance_members (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  application_id     UUID REFERENCES alliance_applications(id) ON DELETE SET NULL,
  organization       TEXT,
  department         TEXT,
  position           TEXT,
  phone              TEXT,
  website            TEXT,
  expertise          TEXT[] NOT NULL DEFAULT '{}',
  contact_preference TEXT NOT NULL DEFAULT 'email',
  notes              TEXT,
  status             TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alliance üyesinin gönderdiği fikir (uzun form alanlarının tamamı)
CREATE TABLE IF NOT EXISTS ideas (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by                 UUID REFERENCES users(id) ON DELETE SET NULL,
  -- 1. İletişim
  contact_name                 TEXT,
  email                        TEXT,
  organization                 TEXT,
  department                   TEXT,
  position                     TEXT,
  phone                        TEXT,
  contribution_types           TEXT[] NOT NULL DEFAULT '{}',
  -- 2. Çalışma kapsamı
  creative_output              TEXT,
  creative_reference           TEXT,
  digital_product              TEXT,
  digital_product_reference    TEXT,
  digital_experience           TEXT,
  digital_experience_reference TEXT,
  -- 3. İşbirliği rolü
  archetype                    TEXT,
  -- 4. Proje detayları
  project_title                TEXT NOT NULL,
  target_audience              TEXT,
  problem_need                 TEXT,
  must_have_features           TEXT,
  better_features              TEXT,
  surprise_features            TEXT,
  archetype_specific_answer    TEXT,
  additional_notes             TEXT,
  stage                        TEXT,
  tags                         TEXT[] NOT NULL DEFAULT '{}',
  -- Admin tarafı
  status                       TEXT NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'approved', 'rejected', 'converted', 'archived')),
  admin_note                   TEXT,
  rejection_reason             TEXT,
  submitted_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case: fikirden doğar; alanlar eski "Yeni Case Oluştur" formuyla aynı
CREATE TABLE IF NOT EXISTS cases (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id                   UUID UNIQUE REFERENCES ideas(id) ON DELETE SET NULL,
  member_user_id            UUID REFERENCES users(id) ON DELETE SET NULL,  -- fikri veren alliance üyesi
  title                     TEXT NOT NULL,
  description               TEXT NOT NULL,
  domain                    TEXT,
  job_types                 TEXT[] NOT NULL DEFAULT '{}',
  specializations           TEXT[] NOT NULL DEFAULT '{}',
  requirements              TEXT[] NOT NULL DEFAULT '{}',
  initial_threshold         INTEGER NOT NULL DEFAULT 70 CHECK (initial_threshold BETWEEN 0 AND 100),
  team_requirements         JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(team_requirements) = 'array'),
  status                    TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  -- Süreç
  current_step              TEXT NOT NULL DEFAULT 'case-evaluated',
  process_state             JSONB,
  last_progress_update      TIMESTAMPTZ,
  -- Durum mesajı (alliance üyesine iletilen)
  admin_message_title       TEXT,
  admin_message_description TEXT,
  admin_message_created_at  TIMESTAMPTZ,
  admin_message_created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by                UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ideas_submitted_by_idx ON ideas(submitted_by);
CREATE INDEX IF NOT EXISTS ideas_status_idx ON ideas(status);
CREATE INDEX IF NOT EXISTS cases_member_idx ON cases(member_user_id);
CREATE INDEX IF NOT EXISTS applications_status_idx ON alliance_applications(status);

-- Case ekibi: admin kişileri case'in içinden tek tek ekler
CREATE TABLE IF NOT EXISTS case_team_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id    UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  full_name  TEXT NOT NULL,
  role       TEXT,
  email      TEXT,
  phone      TEXT,
  note       TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS case_team_members_case_idx ON case_team_members(case_id);
