-- Create Alliance Partners table
-- Separate table for Alliance Partners management (users table only for admins)

-- =====================================================
-- ALLIANCE PARTNERS TABLE
-- =====================================================
CREATE TABLE alliance_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  organization TEXT,
  position TEXT,
  expertise TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP,
  profile_completed BOOLEAN DEFAULT TRUE,
  -- Auth user ID for login (from Supabase Auth)
  auth_user_id UUID UNIQUE,
  -- Additional fields
  notes TEXT,
  contact_preference TEXT DEFAULT 'email' CHECK (contact_preference IN ('email', 'phone', 'both'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_alliance_partners_email ON alliance_partners(email);
CREATE INDEX IF NOT EXISTS idx_alliance_partners_status ON alliance_partners(status);
CREATE INDEX IF NOT EXISTS idx_alliance_partners_organization ON alliance_partners(organization);
CREATE INDEX IF NOT EXISTS idx_alliance_partners_auth_user_id ON alliance_partners(auth_user_id);

-- Enable RLS on alliance_partners table
ALTER TABLE alliance_partners ENABLE ROW LEVEL SECURITY;

-- RLS Policies for alliance_partners

-- Admin can view all alliance partners
CREATE POLICY "Admin can view all alliance partners" 
  ON alliance_partners FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Alliance partners can view their own data
CREATE POLICY "Alliance partners can view own data" 
  ON alliance_partners FOR SELECT 
  USING (auth_user_id = auth.uid());

-- Admin can insert new alliance partners
CREATE POLICY "Admin can insert alliance partners" 
  ON alliance_partners FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin can update any alliance partner, alliance partners can update themselves
CREATE POLICY "Admin and self can update alliance partners"
  ON alliance_partners FOR UPDATE
  USING (
    auth_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    auth_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin can delete alliance partners
CREATE POLICY "Admin can delete alliance partners" 
  ON alliance_partners FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at for alliance_partners
DROP TRIGGER IF EXISTS update_alliance_partners_updated_at ON alliance_partners;
CREATE TRIGGER update_alliance_partners_updated_at
    BEFORE UPDATE ON alliance_partners
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE alliance_partners IS 'Alliance Partners - external partners with login access';
COMMENT ON COLUMN alliance_partners.email IS 'Partner email address (unique)';
COMMENT ON COLUMN alliance_partners.full_name IS 'Complete name of the partner';
COMMENT ON COLUMN alliance_partners.phone IS 'Partner phone number for contact';
COMMENT ON COLUMN alliance_partners.organization IS 'Organization/Company the partner belongs to';
COMMENT ON COLUMN alliance_partners.position IS 'Position/title within organization';
COMMENT ON COLUMN alliance_partners.expertise IS 'Array of expertise areas/skills';
COMMENT ON COLUMN alliance_partners.status IS 'Partner account status (active, inactive, suspended)';
COMMENT ON COLUMN alliance_partners.auth_user_id IS 'Linked Supabase Auth user ID for login';
COMMENT ON COLUMN alliance_partners.notes IS 'Admin notes about the partner';
COMMENT ON COLUMN alliance_partners.contact_preference IS 'Preferred contact method';
COMMENT ON COLUMN alliance_partners.last_login_at IS 'Timestamp of last successful login';
COMMENT ON COLUMN alliance_partners.profile_completed IS 'Whether partner has completed their profile setup';
