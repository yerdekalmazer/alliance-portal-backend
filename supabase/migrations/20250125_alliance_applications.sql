-- Create alliance_applications table
CREATE TABLE IF NOT EXISTS alliance_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Organization Information
    organization_name VARCHAR(255) NOT NULL,
    website VARCHAR(500),
    profile VARCHAR(100) NOT NULL,
    
    -- Contact Information
    contact_name VARCHAR(255),
    contact_title VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    
    -- Application Content
    motivation TEXT NOT NULL,
    roles TEXT[] DEFAULT '{}', -- Array of selected roles
    other_role VARCHAR(500),
    archetype VARCHAR(50) NOT NULL,
    contribution TEXT,
    
    -- Status and Processing
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    ip_address INET,
    user_agent TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_alliance_applications_status ON alliance_applications(status);
CREATE INDEX IF NOT EXISTS idx_alliance_applications_email ON alliance_applications(email);
CREATE INDEX IF NOT EXISTS idx_alliance_applications_created_at ON alliance_applications(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_alliance_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_alliance_applications_updated_at
    BEFORE UPDATE ON alliance_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_alliance_applications_updated_at();

-- Enable RLS (Row Level Security)
ALTER TABLE alliance_applications ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow public to insert applications
CREATE POLICY "Allow public to insert alliance applications" ON alliance_applications
    FOR INSERT WITH CHECK (true);

-- Allow admins to view all applications
CREATE POLICY "Allow admins to view all alliance applications" ON alliance_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Allow admins to update applications
CREATE POLICY "Allow admins to update alliance applications" ON alliance_applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Allow users to view their own applications (if they have an account)
CREATE POLICY "Allow users to view own alliance applications" ON alliance_applications
    FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON alliance_applications TO authenticated;
GRANT SELECT, INSERT ON alliance_applications TO anon;
