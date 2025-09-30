-- Update alliance_applications to include fields referenced in controller

-- Add ip_address and user_agent if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'alliance_applications' AND column_name = 'ip_address'
    ) THEN
        ALTER TABLE public.alliance_applications ADD COLUMN ip_address TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'alliance_applications' AND column_name = 'user_agent'
    ) THEN
        ALTER TABLE public.alliance_applications ADD COLUMN user_agent TEXT;
    END IF;

    -- Ensure status defaults to pending and limited to approved/rejected/pending conceptually
    ALTER TABLE public.alliance_applications ALTER COLUMN status SET DEFAULT 'pending';

    -- Add admin_notes, reviewed_by, reviewed_at if referenced
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'alliance_applications' AND column_name = 'admin_notes'
    ) THEN
        ALTER TABLE public.alliance_applications ADD COLUMN admin_notes TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'alliance_applications' AND column_name = 'reviewed_by'
    ) THEN
        ALTER TABLE public.alliance_applications ADD COLUMN reviewed_by UUID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'alliance_applications' AND column_name = 'reviewed_at'
    ) THEN
        ALTER TABLE public.alliance_applications ADD COLUMN reviewed_at TIMESTAMPTZ;
    END IF;
END $$;


