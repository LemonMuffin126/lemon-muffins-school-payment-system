-- Quick fix: Disable RLS temporarily for development
-- This is the simplest solution to get your app working immediately

ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE fee_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings DISABLE ROW LEVEL SECURITY;

SELECT 'RLS disabled for all tables - app should work now!' as status;