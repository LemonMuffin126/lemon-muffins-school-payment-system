-- Add user roles to support admin privileges
-- This allows us to control access to financial data and sensitive features

-- Create users table to manage user accounts and roles
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' NOT NULL CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default admin user (you can change the email)
INSERT INTO users (email, name, role) VALUES 
('mostanantachina@gmail.com', 'Admin User', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';

-- Create RLS policies for users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can see their own record
CREATE POLICY "Users can view own record" ON users
    FOR SELECT USING (true); -- For now, allow all to read for auth purposes

-- Only admins can update roles
CREATE POLICY "Only admins can update users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE email = auth.email() AND role = 'admin'
        )
    );

-- Add some sample non-admin users (optional)
INSERT INTO users (email, name, role) VALUES 
('teacher@school.edu', 'Teacher User', 'user'),
('staff@school.edu', 'Staff User', 'user')
ON CONFLICT (email) DO NOTHING;