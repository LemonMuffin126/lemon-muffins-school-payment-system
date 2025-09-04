-- Add monthly_fee column to students table to store individual student fees
-- This is needed for students with multiple subjects where fee = subjects * base_rate

ALTER TABLE students 
ADD COLUMN monthly_fee DECIMAL(10,2);

-- Update existing students with default fees based on grade
-- For now, set to the fee_settings value, but imported students will have correct calculated fees

UPDATE students 
SET monthly_fee = (
  SELECT fs.monthly_fee 
  FROM fee_settings fs 
  WHERE fs.grade = students.grade
);