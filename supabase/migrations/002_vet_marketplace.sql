-- PetTails V2: Vet Marketplace Schema Upgrade
-- Run this AFTER 001_initial_schema.sql

-- ============================================
-- ALTER PROFILES: add avatar_url, phone
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;

-- ============================================
-- ALTER VETS: expand for marketplace
-- ============================================
ALTER TABLE vets ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE vets ADD COLUMN IF NOT EXISTS professional_title text;
ALTER TABLE vets ADD COLUMN IF NOT EXISTS degree text;
ALTER TABLE vets ADD COLUMN IF NOT EXISTS university text;
ALTER TABLE vets ADD COLUMN IF NOT EXISTS graduation_year integer;
ALTER TABLE vets ADD COLUMN IF NOT EXISTS registration_number text;
ALTER TABLE vets ADD COLUMN IF NOT EXISTS registration_council text;
ALTER TABLE vets ADD COLUMN IF NOT EXISTS years_experience integer;
ALTER TABLE vets ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE vets ADD COLUMN IF NOT EXISTS area text;
ALTER TABLE vets ADD COLUMN IF NOT EXISTS clinic_name text;
ALTER TABLE vets ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}';
ALTER TABLE vets ADD COLUMN IF NOT EXISTS species_treated text[] DEFAULT '{}';
ALTER TABLE vets ADD COLUMN IF NOT EXISTS specializations text[] DEFAULT '{}';
ALTER TABLE vets ADD COLUMN IF NOT EXISTS expertise text[] DEFAULT '{}';
ALTER TABLE vets ADD COLUMN IF NOT EXISTS achievements text[] DEFAULT '{}';
ALTER TABLE vets ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'under_review', 'verified', 'rejected'));
ALTER TABLE vets ADD COLUMN IF NOT EXISTS verification_documents text[] DEFAULT '{}';
ALTER TABLE vets ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE vets ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE vets ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0;
ALTER TABLE vets ADD COLUMN IF NOT EXISTS total_consultations integer NOT NULL DEFAULT 0;
ALTER TABLE vets ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE vets ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE vets ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Drop the old single-price column (keep data in vet_services instead)
-- We keep consultation_price as a fallback/default
ALTER TABLE vets DROP CONSTRAINT IF EXISTS vets_consultation_price_check;
ALTER TABLE vets ALTER COLUMN consultation_price SET DEFAULT 499;

-- ============================================
-- VET SERVICES
-- ============================================
CREATE TABLE IF NOT EXISTS vet_services (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vet_id uuid NOT NULL REFERENCES vets(id) ON DELETE CASCADE,
  service_type text NOT NULL CHECK (service_type IN ('video_consult', 'home_visit', 'clinic_consult', 'emergency', 'followup')),
  title text NOT NULL,
  description text,
  price integer NOT NULL CHECK (price > 0),
  duration_minutes integer NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vet_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active vet services"
  ON vet_services FOR SELECT
  USING (is_active = true);

CREATE POLICY "Vets can manage own services"
  ON vet_services FOR ALL
  USING (
    vet_id IN (SELECT id FROM vets WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_vet_services_vet ON vet_services(vet_id);

-- ============================================
-- VET AVAILABILITY (enhanced)
-- ============================================
-- Drop old availability table and recreate with more fields
DROP TABLE IF EXISTS availability CASCADE;

CREATE TABLE IF NOT EXISTS vet_availability (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vet_id uuid NOT NULL REFERENCES vets(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  UNIQUE(vet_id, day_of_week, start_time)
);

ALTER TABLE vet_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view vet availability"
  ON vet_availability FOR SELECT
  USING (true);

CREATE POLICY "Vets can manage own availability"
  ON vet_availability FOR ALL
  USING (
    vet_id IN (SELECT id FROM vets WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_vet_availability_vet ON vet_availability(vet_id);

-- ============================================
-- VET BLOCKED SLOTS
-- ============================================
CREATE TABLE IF NOT EXISTS vet_blocked_slots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vet_id uuid NOT NULL REFERENCES vets(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vet_blocked_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blocked slots"
  ON vet_blocked_slots FOR SELECT
  USING (true);

CREATE POLICY "Vets can manage own blocked slots"
  ON vet_blocked_slots FOR ALL
  USING (
    vet_id IN (SELECT id FROM vets WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_vet_blocked_vet ON vet_blocked_slots(vet_id);

-- ============================================
-- ALTER BOOKINGS: expand fields
-- ============================================
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES vet_services(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_type text DEFAULT 'video_consult';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS urgency text NOT NULL DEFAULT 'routine' CHECK (urgency IN ('routine', 'soon', 'urgent', 'emergency'));
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS symptoms text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 30;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Add 'no_show', 'rejected' to status check
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check CHECK (status IN (
  'pending', 'confirmed', 'vet_assigned', 'vet_en_route',
  'arriving', 'arrived', 'in_progress', 'completed', 'cancelled', 'declined', 'no_show', 'rejected'
));

-- ============================================
-- UPDATE REVIEWS: add booking unique constraint already exists
-- ============================================

-- ============================================
-- FUNCTION: Update vet rating + review_count on new review
-- ============================================
CREATE OR REPLACE FUNCTION public.update_vet_rating()
RETURNS trigger AS $$
BEGIN
  UPDATE vets
  SET
    rating = (
      SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 4.0)
      FROM reviews
      WHERE vet_id = NEW.vet_id
    ),
    review_count = (
      SELECT COUNT(*)
      FROM reviews
      WHERE vet_id = NEW.vet_id
    )
  WHERE id = NEW.vET_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Update vet total_consultations
-- ============================================
CREATE OR REPLACE FUNCTION public.update_vet_consultations()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE vets
    SET total_consultations = total_consultations + 1
    WHERE id = NEW.vet_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_booking_completed
  AFTER UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_vet_consultations();

-- ============================================
-- FUNCTION: Auto-update updated_at on bookings
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_booking_update
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER on_vet_update
  BEFORE UPDATE ON vets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- REALTIME for new tables
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE vet_services;
ALTER PUBLICATION supabase_realtime ADD TABLE vet_availability;

-- ============================================
-- DEMO VET SERVICES (for existing demo vets)
-- ============================================
INSERT INTO vet_services (vet_id, service_type, title, description, price, duration_minutes, is_active)
SELECT v.id, 'video_consult', 'Video Consultation', '15-minute video call with the vet', 499, 30, true
FROM vets v WHERE v.specialization = 'Small animal general practice'
AND NOT EXISTS (SELECT 1 FROM vet_services WHERE vet_id = v.id AND service_type = 'video_consult');

INSERT INTO vet_services (vet_id, service_type, title, description, price, duration_minutes, is_active)
SELECT v.id, 'home_visit', 'Home Visit', 'Vet visits your home for examination', 899, 45, true
FROM vets v WHERE v.specialization = 'Small animal general practice'
AND NOT EXISTS (SELECT 1 FROM vet_services WHERE vet_id = v.id AND service_type = 'home_visit');

INSERT INTO vet_services (vet_id, service_type, title, description, price, duration_minutes, is_active)
SELECT v.id, 'emergency', 'Emergency Consultation', 'Priority matching for urgent cases', 1299, 30, true
FROM vets v WHERE v.specialization = 'Small animal general practice'
AND NOT EXISTS (SELECT 1 FROM vet_services WHERE vet_id = v.id AND service_type = 'emergency');

-- Mark all demo vets as having completed onboarding
UPDATE vets SET onboarding_completed = true, verification_status = 'verified', verified_at = now()
WHERE user_id IN (SELECT id FROM profiles WHERE email LIKE '%@pettails.demo');
