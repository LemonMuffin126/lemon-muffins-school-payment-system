-- Fix RLS policies to work with NextAuth.js
-- This script will make the policies more permissive for development

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read students" ON students;
DROP POLICY IF EXISTS "Allow authenticated users to insert students" ON students;
DROP POLICY IF EXISTS "Allow authenticated users to update students" ON students;
DROP POLICY IF EXISTS "Allow authenticated users to delete students" ON students;

DROP POLICY IF EXISTS "Allow authenticated users to read payments" ON payments;
DROP POLICY IF EXISTS "Allow authenticated users to insert payments" ON payments;
DROP POLICY IF EXISTS "Allow authenticated users to update payments" ON payments;
DROP POLICY IF EXISTS "Allow authenticated users to delete payments" ON payments;

DROP POLICY IF EXISTS "Allow authenticated users to read fee_settings" ON fee_settings;
DROP POLICY IF EXISTS "Allow authenticated users to insert fee_settings" ON fee_settings;
DROP POLICY IF EXISTS "Allow authenticated users to update fee_settings" ON fee_settings;
DROP POLICY IF EXISTS "Allow authenticated users to delete fee_settings" ON fee_settings;

DROP POLICY IF EXISTS "Allow authenticated users to read admin_settings" ON admin_settings;
DROP POLICY IF EXISTS "Allow authenticated users to insert admin_settings" ON admin_settings;
DROP POLICY IF EXISTS "Allow authenticated users to update admin_settings" ON admin_settings;
DROP POLICY IF EXISTS "Allow authenticated users to delete admin_settings" ON admin_settings;

-- Create more permissive policies that allow all operations
-- In production, you might want more restrictive policies

-- Students table policies
CREATE POLICY "Allow all operations on students" ON students FOR ALL USING (true) WITH CHECK (true);

-- Payments table policies  
CREATE POLICY "Allow all operations on payments" ON payments FOR ALL USING (true) WITH CHECK (true);

-- Fee settings table policies
CREATE POLICY "Allow all operations on fee_settings" ON fee_settings FOR ALL USING (true) WITH CHECK (true);

-- Admin settings table policies
CREATE POLICY "Allow all operations on admin_settings" ON admin_settings FOR ALL USING (true) WITH CHECK (true);

-- Verify the policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('students', 'payments', 'fee_settings', 'admin_settings');

SELECT 'RLS policies updated successfully - all operations now allowed' as status;