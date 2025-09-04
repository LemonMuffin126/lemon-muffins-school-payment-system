-- Clean up existing tables (if any)
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS fee_settings CASCADE;
DROP TABLE IF EXISTS admin_settings CASCADE;

-- Drop the trigger function if it exists
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create students table
CREATE TABLE students (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    grade INTEGER NOT NULL,
    year INTEGER NOT NULL,
    subjects TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create fee_settings table
CREATE TABLE fee_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    grade INTEGER UNIQUE NOT NULL,
    monthly_fee DECIMAL(10,2) NOT NULL,
    registration_fee DECIMAL(10,2) DEFAULT 0,
    late_fee_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table
CREATE TABLE payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    amount DECIMAL(10,2) NOT NULL,
    late_fee DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'Cash/Transfer',
    reference VARCHAR(255),
    paid_at TIMESTAMP WITH TIME ZONE,
    is_paid BOOLEAN DEFAULT FALSE,
    is_registration BOOLEAN DEFAULT FALSE,
    is_half_month BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, month)
);

-- Create admin_settings table
CREATE TABLE admin_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_students_updated_at 
    BEFORE UPDATE ON students 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fee_settings_updated_at 
    BEFORE UPDATE ON fee_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_settings_updated_at 
    BEFORE UPDATE ON admin_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default fee settings for grades 1-12
INSERT INTO fee_settings (grade, monthly_fee, registration_fee, late_fee_rate) VALUES
(1, 1500.00, 500.00, 50.00),
(2, 1700.00, 500.00, 50.00),
(3, 1700.00, 500.00, 50.00),
(4, 1700.00, 500.00, 50.00),
(5, 1700.00, 500.00, 50.00),
(6, 1700.00, 500.00, 50.00),
(7, 1800.00, 500.00, 100.00),
(8, 1800.00, 500.00, 100.00),
(9, 1800.00, 500.00, 100.00),
(10, 1800.00, 500.00, 100.00),
(11, 1800.00, 500.00, 100.00),
(12, 1800.00, 500.00, 100.00);

-- Insert default admin settings
INSERT INTO admin_settings (setting_key, setting_value) VALUES
('collection_day', '18'),
('late_fee_after_day', '25'),
('school_name', 'School Payment Management System'),
('school_address', '123 School Street, City, Country'),
('currency', 'THB');

-- Create indexes for better performance
CREATE INDEX idx_students_grade ON students(grade);
CREATE INDEX idx_students_year ON students(year);
CREATE INDEX idx_payments_student_id ON payments(student_id);
CREATE INDEX idx_payments_month ON payments(month);
CREATE INDEX idx_payments_is_paid ON payments(is_paid);
CREATE INDEX idx_payments_paid_at ON payments(paid_at);

-- Row Level Security (RLS) policies
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to read students" ON students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert students" ON students FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update students" ON students FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete students" ON students FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read payments" ON payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert payments" ON payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update payments" ON payments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete payments" ON payments FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read fee_settings" ON fee_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert fee_settings" ON fee_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update fee_settings" ON fee_settings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete fee_settings" ON fee_settings FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read admin_settings" ON admin_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert admin_settings" ON admin_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update admin_settings" ON admin_settings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete admin_settings" ON admin_settings FOR DELETE TO authenticated USING (true);

-- Insert some sample students for testing
INSERT INTO students (name, grade, year, subjects) VALUES
('John Smith', 8, 2025, ARRAY['MATH', 'ENGLISH']),
('Jane Doe', 10, 2025, ARRAY['MATH', 'SCIENCE', 'ENGLISH']),
('Bob Johnson', 6, 2025, ARRAY['MATH']),
('Alice Brown', 12, 2025, ARRAY['ENGLISH', 'PHYSICS']);

-- Verify the setup
SELECT 'Setup completed successfully!' as status;
SELECT 'Students created:' as info, COUNT(*) as count FROM students;
SELECT 'Fee settings created:' as info, COUNT(*) as count FROM fee_settings;
SELECT 'Admin settings created:' as info, COUNT(*) as count FROM admin_settings;