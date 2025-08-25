-- Setup Admin User and Admin Features
-- Run this script in your Supabase SQL editor

-- 1. Create settings table for platform configuration
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  commission_rate DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insert default commission rate
INSERT INTO settings (key, commission_rate) 
VALUES ('platform_commission', 15.00)
ON CONFLICT (key) DO UPDATE SET 
  commission_rate = EXCLUDED.commission_rate,
  updated_at = NOW();

-- 3. Add active column to chargers table if it doesn't exist
ALTER TABLE chargers ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- 4. Add payment_status column to bookings table if it doesn't exist
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded'));

-- 5. Create index on host_approved for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_host_approved ON profiles(host_approved);

-- 6. Create index on charger active status
CREATE INDEX IF NOT EXISTS idx_chargers_active ON chargers(active);

-- 7. Create index on booking status and payment_status
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status, payment_status);

-- 8. Create index on booking dates for filtering
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(start_time, end_time);

-- 9. Grant necessary permissions
GRANT ALL ON settings TO authenticated;
GRANT ALL ON chargers TO authenticated;
GRANT ALL ON bookings TO authenticated;
GRANT ALL ON profiles TO authenticated;

-- 10. Set your user as admin (replace 'your-email@example.com' with your actual email)
-- First, find your user ID:
-- SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- Then update your profile (replace 'your-user-id' with the actual ID):
-- UPDATE profiles SET role = 'admin', host_approved = true WHERE id = 'your-user-id';

-- 11. Enable RLS on settings table
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies for settings
CREATE POLICY "Admins can manage settings" ON settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 13. Create function to check if user is admin (if not already exists)
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = uid AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Grant execute permission on is_admin function
GRANT EXECUTE ON FUNCTION is_admin(uuid) TO authenticated;

-- 15. Update existing RLS policies to use is_admin function
-- (These should already exist from the previous migration, but here they are for reference)

-- Profiles policies
DROP POLICY IF EXISTS "Admins have full access to profiles" ON profiles;
CREATE POLICY "Admins have full access to profiles" ON profiles
  FOR ALL USING (is_admin(auth.uid()));

-- Chargers policies  
DROP POLICY IF EXISTS "Admins have full access to chargers" ON chargers;
CREATE POLICY "Admins have full access to chargers" ON chargers
  FOR ALL USING (is_admin(auth.uid()));

-- Bookings policies
DROP POLICY IF EXISTS "Admins have full access to bookings" ON bookings;
CREATE POLICY "Admins have full access to bookings" ON bookings
  FOR ALL USING (is_admin(auth.uid()));

-- Reviews policies
DROP POLICY IF EXISTS "Admins have full access to reviews" ON reviews;
CREATE POLICY "Admins have full access to reviews" ON reviews
  FOR ALL USING (is_admin(auth.uid()));

-- 16. Insert some sample data for testing (optional)
INSERT INTO chargers (host_id, title, address, type, power_kw, price_per_kwh, description, lat, lng, location, active)
SELECT 
  p.id,
  'Sample Charger ' || p.email,
  '123 Sample St, Sample City',
  'ac',
  22,
  0.25,
  'Sample charger for testing',
  37.7749,
  -122.4194,
  'SRID=4326;POINT(-122.4194 37.7749)',
  true
FROM profiles p 
WHERE p.role = 'host' AND p.host_approved = true
LIMIT 3;

-- 17. Show current admin users
SELECT 
  p.id,
  p.email,
  p.role,
  p.host_approved,
  p.created_at
FROM profiles p 
WHERE p.role = 'admin';

-- 18. Show current settings
SELECT * FROM settings;

-- 19. Show current platform stats
SELECT 
  (SELECT COUNT(*) FROM profiles WHERE role = 'host' AND host_approved = false) as pending_hosts,
  (SELECT COUNT(*) FROM chargers WHERE active = true) as active_chargers,
  (SELECT COUNT(*) FROM bookings) as total_bookings,
  (SELECT COUNT(*) FROM bookings WHERE status = 'completed') as completed_bookings;
