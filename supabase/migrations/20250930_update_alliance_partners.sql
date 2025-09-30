-- Create or update alliance_partners table to align with new system

-- Extension for UUID if not present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.alliance_partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    organization TEXT,
    position TEXT,
    expertise TEXT[] DEFAULT '{}'::text[] NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- enum-like: active | inactive | suspended
    notes TEXT,
    contact_preference TEXT NOT NULL DEFAULT 'email', -- enum-like: email | phone | both
    profile_completed BOOLEAN NOT NULL DEFAULT true,
    auth_user_id UUID,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns exist (idempotent adds for existing table)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'alliance_partners' AND column_name = 'full_name'
    ) THEN
        ALTER TABLE public.alliance_partners ADD COLUMN full_name TEXT NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'alliance_partners' AND column_name = 'phone'
    ) THEN
        ALTER TABLE public.alliance_partners ADD COLUMN phone TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'alliance_partners' AND column_name = 'organization'
    ) THEN
        ALTER TABLE public.alliance_partners ADD COLUMN organization TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'alliance_partners' AND column_name = 'position'
    ) THEN
        ALTER TABLE public.alliance_partners ADD COLUMN position TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'alliance_partners' AND column_name = 'expertise'
    ) THEN
        ALTER TABLE public.alliance_partners ADD COLUMN expertise TEXT[] NOT NULL DEFAULT '{}'::text[];
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'alliance_partners' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.alliance_partners ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'alliance_partners' AND column_name = 'notes'
    ) THEN
        ALTER TABLE public.alliance_partners ADD COLUMN notes TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'alliance_partners' AND column_name = 'contact_preference'
    ) THEN
        ALTER TABLE public.alliance_partners ADD COLUMN contact_preference TEXT NOT NULL DEFAULT 'email';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'alliance_partners' AND column_name = 'profile_completed'
    ) THEN
        ALTER TABLE public.alliance_partners ADD COLUMN profile_completed BOOLEAN NOT NULL DEFAULT true;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'alliance_partners' AND column_name = 'auth_user_id'
    ) THEN
        ALTER TABLE public.alliance_partners ADD COLUMN auth_user_id UUID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'alliance_partners' AND column_name = 'last_login_at'
    ) THEN
        ALTER TABLE public.alliance_partners ADD COLUMN last_login_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'alliance_partners' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.alliance_partners ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'alliance_partners' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.alliance_partners ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- Indices
CREATE INDEX IF NOT EXISTS idx_alliance_partners_email ON public.alliance_partners (email);
CREATE INDEX IF NOT EXISTS idx_alliance_partners_status ON public.alliance_partners (status);
CREATE INDEX IF NOT EXISTS idx_alliance_partners_org ON public.alliance_partners (organization);

-- RLS
ALTER TABLE public.alliance_partners ENABLE ROW LEVEL SECURITY;

-- Allow admins (service_role) and authenticated users to select their own records
DROP POLICY IF EXISTS "select_alliance_partners_admin" ON public.alliance_partners;
CREATE POLICY "select_alliance_partners_admin" ON public.alliance_partners
    FOR SELECT TO service_role
    USING (true);

DROP POLICY IF EXISTS "select_alliance_partners_authenticated" ON public.alliance_partners;
CREATE POLICY "select_alliance_partners_authenticated" ON public.alliance_partners
    FOR SELECT TO authenticated
    USING (auth.uid() = auth_user_id);

-- Inserts/updates only for service_role (via backend)
DROP POLICY IF EXISTS "write_alliance_partners_admin" ON public.alliance_partners;
CREATE POLICY "write_alliance_partners_admin" ON public.alliance_partners
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);


