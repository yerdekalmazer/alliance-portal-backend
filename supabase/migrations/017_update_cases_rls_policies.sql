-- Update Cases RLS Policies to Include Case Owners
-- Case sahipleri kendi case'lerini görebilir ve yönetebilir

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view active cases" ON cases;
DROP POLICY IF EXISTS "Admin and alliance can update cases" ON cases;

-- Create new policies that include case owners

-- 1. Anyone can view active cases + Case owners can view their own cases
CREATE POLICY "Anyone can view active cases and case owners can view their own" 
  ON cases FOR SELECT 
  USING (
    status = 'active' 
    OR 
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'alliance')
    )
  );

-- 2. Admin, alliance, and case owners can update their cases
CREATE POLICY "Admin, alliance and case owners can update cases"
  ON cases FOR UPDATE
  USING (
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'alliance')
    )
  );

-- 3. Add policy for case owners to view applications related to their cases
-- This helps case owners see who applied to their cases
DROP POLICY IF EXISTS "Anyone can view applications" ON applications;

CREATE POLICY "Case owners, admin and alliance can view applications" 
  ON applications FOR SELECT 
  USING (
    case_id IN (
      SELECT id FROM cases 
      WHERE created_by = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role IN ('admin', 'alliance')
    )
  );

-- 4. Update alliance_partners RLS to work with the new auth system
-- (This was missing from the original alliance_partners migration)
DROP POLICY IF EXISTS "Alliance partners can view own data" ON alliance_partners;

CREATE POLICY "Alliance partners can view own data" 
  ON alliance_partners FOR SELECT 
  USING (
    auth_user_id = auth.uid()
  );

-- Add missing policies for alliance partners
CREATE POLICY "Alliance partners can update own data" 
  ON alliance_partners FOR UPDATE 
  USING (auth_user_id = auth.uid()) 
  WITH CHECK (auth_user_id = auth.uid());

-- Comment the changes
COMMENT ON POLICY "Anyone can view active cases and case owners can view their own" ON cases IS 
'Case owners can view their own cases regardless of status, others can only see active cases, admins see all';

COMMENT ON POLICY "Admin, alliance and case owners can update cases" ON cases IS 
'Case creators can update their own cases, admins and alliance can update any case';

COMMENT ON POLICY "Case owners, admin and alliance can view applications" ON applications IS 
'Case owners can see applications for their cases, admins and alliance see all applications';

