-- =====================================================
-- ADD ADMIN MESSAGES TO CASES TABLE
-- =====================================================
-- This migration adds admin message functionality to existing cases
-- Admin can send status updates/briefs to Alliance Partners for their cases

-- Add admin message fields to cases table
ALTER TABLE cases 
ADD COLUMN admin_message_title TEXT,
ADD COLUMN admin_message_description TEXT,
ADD COLUMN admin_message_created_at TIMESTAMP,
ADD COLUMN admin_message_created_by UUID;

-- Add foreign key constraint for admin who created the message
ALTER TABLE cases 
ADD CONSTRAINT fk_cases_admin_message_created_by 
FOREIGN KEY (admin_message_created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_cases_admin_message_created_at ON cases(admin_message_created_at);
CREATE INDEX idx_cases_admin_message_created_by ON cases(admin_message_created_by);

-- Add comments for documentation
COMMENT ON COLUMN cases.admin_message_title IS 'Title of admin message/brief sent to alliance partner';
COMMENT ON COLUMN cases.admin_message_description IS 'Description/content of admin message/brief';
COMMENT ON COLUMN cases.admin_message_created_at IS 'When the admin message was created/updated';
COMMENT ON COLUMN cases.admin_message_created_by IS 'User ID of admin who created/updated the message';

-- Grant necessary permissions (RLS policies should already cover cases table access)
