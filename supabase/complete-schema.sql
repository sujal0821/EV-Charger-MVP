-- =====================================================
-- EV CHARGING PLATFORM - COMPLETE DATABASE SCHEMA
-- =====================================================
-- This file contains the complete database setup for the EV charging platform
-- Run this in your Supabase SQL Editor to set up the entire project

-- =====================================================
-- 1. ENABLE EXTENSIONS
-- =====================================================

-- Enable PostGIS for geographical data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 2. CREATE TABLES
-- =====================================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('customer', 'host', 'admin')) DEFAULT 'customer',
  host_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chargers table
CREATE TABLE IF NOT EXISTS chargers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  address TEXT NOT NULL,
  type TEXT CHECK (type IN ('ac', 'dc', 'tesla', 'chademo', 'ccs')) NOT NULL,
  power_kw INTEGER,
  price_per_kwh DECIMAL(5,2),
  description TEXT,
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  location GEOMETRY(POINT, 4326) NOT NULL,
  active BOOLEAN DEFAULT true,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  charger_id UUID REFERENCES chargers(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')) DEFAULT 'pending',
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'refunded')) DEFAULT 'pending',
  total_amount DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings table for platform configuration
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  commission_rate DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_host_approved ON profiles(host_approved);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);

-- Chargers indexes
CREATE INDEX IF NOT EXISTS idx_chargers_host_id ON chargers(host_id);
CREATE INDEX IF NOT EXISTS idx_chargers_type ON chargers(type);
CREATE INDEX IF NOT EXISTS idx_chargers_active ON chargers(active);
CREATE INDEX IF NOT EXISTS idx_chargers_location ON chargers USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_chargers_created_at ON chargers(created_at);

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_charger_id ON bookings(charger_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);

-- Settings indexes
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- =====================================================
-- 4. CREATE TRIGGERS AND FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = uid AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is approved host
CREATE OR REPLACE FUNCTION is_approved_host(uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = uid AND role = 'host' AND host_approved = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate booking duration in hours
CREATE OR REPLACE FUNCTION calculate_booking_duration(start_time TIMESTAMP WITH TIME ZONE, end_time TIMESTAMP WITH TIME ZONE)
RETURNS DECIMAL AS $$
BEGIN
  RETURN EXTRACT(EPOCH FROM (end_time - start_time)) / 3600;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate booking cost
CREATE OR REPLACE FUNCTION calculate_booking_cost(charger_id UUID, start_time TIMESTAMP WITH TIME ZONE, end_time TIMESTAMP WITH TIME ZONE)
RETURNS DECIMAL AS $$
DECLARE
  price_per_kwh DECIMAL;
  duration_hours DECIMAL;
  total_cost DECIMAL;
BEGIN
  -- Get charger price
  SELECT price_per_kwh INTO price_per_kwh FROM chargers WHERE id = charger_id;
  
  -- Calculate duration
  duration_hours := calculate_booking_duration(start_time, end_time);
  
  -- Calculate total cost (assuming 50kW average charging rate)
  total_cost := COALESCE(price_per_kwh, 0) * duration_hours * 50;
  
  RETURN total_cost;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. APPLY TRIGGERS
-- =====================================================

-- Profiles trigger
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Chargers trigger
CREATE TRIGGER update_chargers_updated_at
  BEFORE UPDATE ON chargers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Bookings trigger
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Reviews trigger
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Settings trigger
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chargers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. CREATE RLS POLICIES
-- =====================================================

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins have full access to profiles" ON profiles
  FOR ALL USING (is_admin(auth.uid()));

-- Chargers policies
CREATE POLICY "Anyone can view active chargers" ON chargers
  FOR SELECT USING (active = true);

CREATE POLICY "Hosts can view own chargers" ON chargers
  FOR SELECT USING (host_id = auth.uid());

CREATE POLICY "Hosts can insert chargers" ON chargers
  FOR INSERT WITH CHECK (
    is_approved_host(auth.uid()) AND host_id = auth.uid()
  );

CREATE POLICY "Hosts can update own chargers" ON chargers
  FOR UPDATE USING (
    is_approved_host(auth.uid()) AND host_id = auth.uid()
  );

CREATE POLICY "Hosts can delete own chargers" ON chargers
  FOR DELETE USING (
    is_approved_host(auth.uid()) AND host_id = auth.uid()
  );

CREATE POLICY "Admins have full access to chargers" ON chargers
  FOR ALL USING (is_admin(auth.uid()));

-- Bookings policies
CREATE POLICY "Users can view own bookings" ON bookings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Hosts can view bookings for their chargers" ON bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chargers 
      WHERE id = charger_id AND host_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings" ON bookings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookings" ON bookings
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins have full access to bookings" ON bookings
  FOR ALL USING (is_admin(auth.uid()));

-- Reviews policies
CREATE POLICY "Anyone can view reviews" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews" ON reviews
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins have full access to reviews" ON reviews
  FOR ALL USING (is_admin(auth.uid()));

-- Settings policies
CREATE POLICY "Admins can manage settings" ON settings
  FOR ALL USING (is_admin(auth.uid()));

-- =====================================================
-- 8. INSERT DEFAULT DATA
-- =====================================================

-- Insert default commission rate
INSERT INTO settings (key, commission_rate) 
VALUES ('platform_commission', 15.00)
ON CONFLICT (key) DO UPDATE SET 
  commission_rate = EXCLUDED.commission_rate,
  updated_at = NOW();

-- Insert default admin user (you'll need to update this with your actual user ID)
-- First, create a profile for yourself, then run:
-- UPDATE profiles SET role = 'admin', host_approved = true WHERE id = 'your-user-id';

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_approved_host(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_booking_duration(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_booking_cost(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;

-- Grant table permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON chargers TO authenticated;
GRANT ALL ON bookings TO authenticated;
GRANT ALL ON reviews TO authenticated;
GRANT ALL ON settings TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- 10. CREATE VIEWS FOR ANALYTICS
-- =====================================================

-- View for charger statistics
CREATE OR REPLACE VIEW charger_stats AS
SELECT 
  c.id,
  c.title,
  c.type,
  c.power_kw,
  c.price_per_kwh,
  c.active,
  c.created_at,
  p.email as host_email,
  COUNT(b.id) as total_bookings,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
  AVG(r.rating) as average_rating,
  COUNT(r.id) as total_reviews
FROM chargers c
LEFT JOIN profiles p ON c.host_id = p.id
LEFT JOIN bookings b ON c.id = b.charger_id
LEFT JOIN reviews r ON b.id = r.booking_id
GROUP BY c.id, c.title, c.type, c.power_kw, c.price_per_kwh, c.active, c.created_at, p.email;

-- View for booking analytics
CREATE OR REPLACE VIEW booking_analytics AS
SELECT 
  DATE_TRUNC('day', b.created_at) as date,
  COUNT(*) as total_bookings,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
  COUNT(CASE WHEN b.payment_status = 'paid' THEN 1 END) as paid_bookings,
  SUM(CASE WHEN b.total_amount IS NOT NULL THEN b.total_amount ELSE 0 END) as total_revenue
FROM bookings b
GROUP BY DATE_TRUNC('day', b.created_at)
ORDER BY date DESC;

-- View for host performance
CREATE OR REPLACE VIEW host_performance AS
SELECT 
  p.id,
  p.email,
  p.role,
  p.host_approved,
  COUNT(c.id) as total_chargers,
  COUNT(CASE WHEN c.active = true THEN 1 END) as active_chargers,
  COUNT(b.id) as total_bookings,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
  AVG(r.rating) as average_rating,
  SUM(CASE WHEN b.total_amount IS NOT NULL THEN b.total_amount ELSE 0 END) as total_earnings
FROM profiles p
LEFT JOIN chargers c ON p.id = c.host_id
LEFT JOIN bookings b ON c.id = b.charger_id
LEFT JOIN reviews r ON b.id = r.booking_id
WHERE p.role = 'host'
GROUP BY p.id, p.email, p.role, p.host_approved;

-- =====================================================
-- 11. SAMPLE DATA INSERTION (OPTIONAL)
-- =====================================================

-- Insert sample hosts (optional - for testing)
-- INSERT INTO profiles (id, full_name, role, host_approved) VALUES 
--   (uuid_generate_v4(), 'John Host', 'host', true),
--   (uuid_generate_v4(), 'Jane Host', 'host', true);

-- Insert sample chargers (optional - for testing)
-- INSERT INTO chargers (host_id, title, address, type, power_kw, price_per_kwh, description, lat, lng, location) VALUES
--   ((SELECT id FROM profiles WHERE role = 'host' LIMIT 1), 'Downtown Fast Charger', '123 Main St, Downtown', 'dc', 150, 0.35, 'High-speed DC charger', 37.7749, -122.4194, ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)),
--   ((SELECT id FROM profiles WHERE role = 'host' LIMIT 1), 'Mall Parking Charger', '456 Shopping Ave, Mall District', 'ac', 22, 0.25, 'Convenient AC charger', 37.7849, -122.4094, ST_SetSRID(ST_MakePoint(-122.4094, 37.7849), 4326));

-- =====================================================
-- 12. VERIFICATION QUERIES
-- =====================================================

-- Check if all tables were created
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check if all policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check if all functions were created
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
ORDER BY routine_name;

-- Check if all indexes were created
SELECT indexname, tablename, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- =====================================================
-- 13. USAGE EXAMPLES
-- =====================================================

-- Example: Find nearby chargers (within 5km)
-- SELECT 
--   c.title,
--   c.address,
--   c.type,
--   c.price_per_kwh,
--   ST_Distance(
--     c.location::geography,
--     ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)::geography
--   ) as distance_meters
-- FROM chargers c
-- WHERE c.active = true
--   AND ST_DWithin(
--     c.location::geography,
--     ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)::geography,
--     5000
--   )
-- ORDER BY distance_meters;

-- Example: Get user's booking history
-- SELECT 
--   b.start_time,
--   b.end_time,
--   b.status,
--   c.title as charger_title,
--   c.address as charger_address,
--   r.rating,
--   r.comment
-- FROM bookings b
-- JOIN chargers c ON b.charger_id = c.id
-- LEFT JOIN reviews r ON b.id = r.booking_id
-- WHERE b.user_id = 'user-uuid-here'
-- ORDER BY b.created_at DESC;

-- Example: Get host's earnings
-- SELECT 
--   DATE_TRUNC('month', b.created_at) as month,
--   COUNT(*) as total_bookings,
--   SUM(CASE WHEN b.total_amount IS NOT NULL THEN b.total_amount ELSE 0 END) as total_earnings
-- FROM bookings b
-- JOIN chargers c ON b.charger_id = c.id
-- WHERE c.host_id = 'host-uuid-here'
--   AND b.status = 'completed'
-- GROUP BY DATE_TRUNC('month', b.created_at)
-- ORDER BY month DESC;

-- =====================================================
-- END OF SCHEMA
-- =====================================================

-- After running this schema, remember to:
-- 1. Set your user as admin: UPDATE profiles SET role = 'admin', host_approved = true WHERE id = 'your-user-id';
-- 2. Test the admin panel by signing out and back in
-- 3. Navigate to Explore tab to see the Admin Section
-- 4. Click "Admin Dashboard" to access the full admin panel
