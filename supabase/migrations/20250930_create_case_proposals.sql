-- Create table for Alliance Network - Yeni Proje Önerisi (case proposals)
-- Updated to include fields from existing idea_submissions table
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.case_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ownership/identity (from idea_submissions)
  submitted_by UUID, -- user_id from idea_submissions
  email TEXT,   -- fallback contact
  organization TEXT,
  contact_name TEXT,

  -- Core project fields (from idea_submissions)
  title TEXT NOT NULL, -- Proje Başlığı
  description TEXT, -- Proje açıklaması (from idea_submissions)
  category TEXT, -- Kategori (from idea_submissions)
  target_audience TEXT NOT NULL, -- Hedef kitle/faydalanıcılar
  problem_definition TEXT, -- Problem tanımı (from idea_submissions)
  problem_statement TEXT NOT NULL, -- Çözmek istediği temel problem/ihtiyaç
  unique_value TEXT NOT NULL, -- En temel ve benzersiz değer
  partner_gains TEXT NOT NULL, -- Kuruma sağlayacağı somut kazanımlar
  sustainability_plan TEXT NOT NULL, -- Sprint sonrası yaşatma planı
  expected_outcome TEXT, -- Beklenen sonuç (from idea_submissions)

  -- Bölüm 2: Arketip (işbirliği rolü) - updated to match idea_submissions pm_archetype
  archetype TEXT NOT NULL CHECK (archetype IN ('Yönlendirici','Düzenleyici','Yürütücü','Dönüştürücü')),
      -- Çıktı Türü (formun 2. adımı)
      output_type TEXT, -- Örn: Görsel Tasarım, Web Platformu, Henüz Belirlenmedi / Fikir Aşamasında
  pm_archetype TEXT, -- Legacy field from idea_submissions (active-contributor, advisor, learner, etc.)

  -- Bölüm 3: Role Özel Detaylar
  observations TEXT,           -- Yönlendirici
  current_process TEXT,        -- Düzenleyici
  vision_success TEXT,         -- Yürütücü
  core_functions TEXT,         -- Yürütücü - temel fonksiyonlar (serbest metin)
  innovation_proposal TEXT,    -- Dönüştürücü

  -- Status and workflow (from idea_submissions)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  stage TEXT DEFAULT 'submitted', -- Legacy from idea_submissions
  rejection_reason TEXT, -- Legacy from idea_submissions
  admin_notes TEXT,

  -- Additional fields from idea_submissions
  market_size TEXT, -- Pazar büyüklüğü
  expected_roi TEXT, -- Beklenen ROI
  timeline TEXT, -- Zaman çizelgesi
  budget TEXT, -- Bütçe
  tags TEXT[], -- Etiketler (array)
  submitted_at TIMESTAMPTZ DEFAULT NOW() -- Legacy submission timestamp
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_case_proposals_created_at ON public.case_proposals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_proposals_status ON public.case_proposals(status);
CREATE INDEX IF NOT EXISTS idx_case_proposals_archetype ON public.case_proposals(archetype);
CREATE INDEX IF NOT EXISTS idx_case_proposals_email ON public.case_proposals(email);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_case_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_case_proposals_updated_at ON public.case_proposals;
CREATE TRIGGER trg_update_case_proposals_updated_at
BEFORE UPDATE ON public.case_proposals
FOR EACH ROW EXECUTE FUNCTION update_case_proposals_updated_at();

-- RLS
ALTER TABLE public.case_proposals ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public proposal submission)
DROP POLICY IF EXISTS "insert_case_proposals_public" ON public.case_proposals;
CREATE POLICY "insert_case_proposals_public"
  ON public.case_proposals FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated users can view their own proposals by email match (best-effort) or submitted_by
DROP POLICY IF EXISTS "select_own_case_proposals" ON public.case_proposals;
CREATE POLICY "select_own_case_proposals"
  ON public.case_proposals FOR SELECT
  TO authenticated
  USING (
    (submitted_by IS NOT NULL AND submitted_by = auth.uid())
    OR (email IS NOT NULL AND email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- Service role can do anything
DROP POLICY IF EXISTS "all_case_proposals_service_role" ON public.case_proposals;
CREATE POLICY "all_case_proposals_service_role"
  ON public.case_proposals FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);


