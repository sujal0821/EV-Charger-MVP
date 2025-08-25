-- Migration: Add admin role and host approval system
-- Date: 2024-01-XX

-- 1. Add 'admin' to profiles.role enum and add host_approved column
ALTER TYPE profiles_role ADD VALUE IF NOT EXISTS 'admin';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS host_approved BOOLEAN DEFAULT false;

-- 2. Create index on host_approved for admin queries
CREATE INDEX IF NOT EXISTS idx_profiles_host_approved ON profiles(host_approved);

-- 3. Create SQL helper function for admin checks
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = uid AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update RLS policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admin bypass for profiles
CREATE POLICY "Admins have full access to profiles" ON profiles
  FOR ALL USING (is_admin(auth.uid()));

-- 5. Update RLS policies for chargers
DROP POLICY IF EXISTS "Hosts can insert chargers" ON chargers;
CREATE POLICY "Hosts can insert chargers" ON chargers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'host' 
      AND host_approved = true
    )
  );

DROP POLICY IF EXISTS "Hosts can update own chargers" ON chargers;
CREATE POLICY "Hosts can update own chargers" ON chargers
  FOR UPDATE USING (
    host_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'host' 
      AND host_approved = true
    )
  );

DROP POLICY IF EXISTS "Hosts can delete own chargers" ON chargers;
CREATE POLICY "Hosts can delete own chargers" ON chargers
  FOR DELETE USING (
    host_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'host' 
      AND host_approved = true
    )
  );

-- Admin bypass for chargers
CREATE POLICY "Admins have full access to chargers" ON chargers
  FOR ALL USING (is_admin(auth.uid()));

-- 6. Update RLS policies for bookings
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
CREATE POLICY "Users can view own bookings" ON bookings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own bookings" ON bookings;
CREATE POLICY "Users can insert own bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;
CREATE POLICY "Users can update own bookings" ON bookings
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own bookings" ON bookings;
CREATE POLICY "Users can delete own bookings" ON bookings
  FOR DELETE USING (auth.uid() = user_id);

-- Admin bypass for bookings
CREATE POLICY "Admins have full access to bookings" ON bookings
  FOR ALL USING (is_admin(auth.uid()));

-- 7. Update RLS policies for reviews
DROP POLICY IF EXISTS "Users can view reviews" ON reviews;
CREATE POLICY "Users can view reviews" ON reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own reviews" ON reviews;
CREATE POLICY "Users can insert own reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;
CREATE POLICY "Users can update own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reviews" ON reviews;
CREATE POLICY "Users can delete own reviews" ON reviews
  FOR DELETE USING (auth.uid() = user_id);

-- Admin bypass for reviews
CREATE POLICY "Admins have full access to reviews" ON reviews
  FOR ALL USING (is_admin(auth.uid()));

-- 8. Grant necessary permissions
GRANT EXECUTE ON FUNCTION is_admin(uuid) TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
