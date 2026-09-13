-- PetTails V3: Enable Realtime + Verify Tables
-- Run this AFTER 001 and 002 in Supabase SQL Editor

-- ============================================
-- 1. VERIFY ALL TABLES EXIST (safe re-runs)
-- ============================================

-- Ensure uuid extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- profiles (from 001)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text unique not null,
  role text not null default 'owner' check (role in ('owner', 'vet', 'admin')),
  avatar_url text,
  phone text,
  created_at timestamptz not null default now()
);

-- pets (from 001)
CREATE TABLE IF NOT EXISTS pets (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  species text not null,
  breed text,
  age_months integer,
  weight_kg numeric(5,2),
  photo_url text,
  created_at timestamptz not null default now()
);

-- vets (from 001 + 002)
CREATE TABLE IF NOT EXISTS vets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  specialization text not null default 'General practice',
  bio text,
  consultation_price integer not null default 0,
  rating numeric(2,1) not null default 0,
  verified boolean not null default false,
  online boolean not null default false,
  accepting_bookings boolean not null default false,
  display_name text,
  professional_title text,
  degree text,
  university text,
  graduation_year integer,
  registration_number text,
  registration_council text,
  years_experience integer,
  city text,
  area text,
  clinic_name text,
  languages text[] DEFAULT '{}',
  species_treated text[] DEFAULT '{}',
  specializations text[] DEFAULT '{}',
  expertise text[] DEFAULT '{}',
  achievements text[] DEFAULT '{}',
  verification_status text NOT NULL DEFAULT 'pending',
  verification_documents text[] DEFAULT '{}',
  verified_at timestamptz,
  rejection_reason text,
  review_count integer NOT NULL DEFAULT 0,
  total_consultations integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  onboarding_completed boolean NOT NULL DEFAULT false
);

-- bookings
CREATE TABLE IF NOT EXISTS bookings (
  id uuid primary key default uuid_generate_v4(),
  reference text unique not null,
  owner_id uuid not null references profiles(id),
  vet_id uuid not null references vets(id),
  pet_id uuid not null references pets(id),
  service_type text not null check (service_type in ('video_consult', 'home_visit', 'clinic_consult', 'emergency', 'followup')),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 30,
  amount integer not null,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'refunded', 'failed')),
  payment_id text,
  urgency text default 'normal' check (urgency in ('normal', 'urgent', 'emergency')),
  symptoms text,
  notes text,
  created_at timestamptz not null default now()
);

-- vet_services (from 002)
CREATE TABLE IF NOT EXISTS vet_services (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vet_id uuid NOT NULL REFERENCES vets(id) ON DELETE CASCADE,
  service_type text NOT NULL CHECK (service_type IN ('video_consult', 'home_visit', 'clinic_consult', 'emergency', 'followup')),
  title text NOT NULL,
  description text,
  price integer NOT NULL CHECK (price >= 0),
  duration_minutes integer NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Fix price constraint to allow 0 (was price > 0)
ALTER TABLE vet_services DROP CONSTRAINT IF EXISTS vet_services_price_check;
ALTER TABLE vet_services ADD CONSTRAINT vet_services_price_check CHECK (price >= 0);

-- vet_availability (from 002)
CREATE TABLE IF NOT EXISTS vet_availability (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vet_id uuid NOT NULL REFERENCES vets(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  UNIQUE (vet_id, day_of_week, start_time)
);

-- reviews
CREATE TABLE IF NOT EXISTS reviews (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null unique references bookings(id),
  owner_id uuid not null references profiles(id),
  vet_id uuid not null references vets(id),
  rating integer not null check (rating between 1 and 5),
  review_text text,
  created_at timestamptz not null default now()
);

-- payments
CREATE TABLE IF NOT EXISTS payments (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null unique references bookings(id),
  owner_id uuid not null references profiles(id),
  vet_id uuid not null references vets(id),
  amount integer not null,
  currency text not null default 'INR',
  status text not null default 'pending' check (status in ('pending', 'captured', 'refunded', 'failed')),
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  created_at timestamptz not null default now()
);

-- ============================================
-- 2. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE vets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vet_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE vet_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. RLS POLICIES (idempotent — drop + recreate)
-- ============================================

-- PROFILES
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- PETS
DROP POLICY IF EXISTS "Owners can view own pets" ON pets;
CREATE POLICY "Owners can view own pets" ON pets FOR SELECT USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can insert own pets" ON pets;
CREATE POLICY "Owners can insert own pets" ON pets FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can update own pets" ON pets;
CREATE POLICY "Owners can update own pets" ON pets FOR UPDATE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Owners can delete own pets" ON pets;
CREATE POLICY "Owners can delete own pets" ON pets FOR DELETE USING (owner_id = auth.uid());

-- VETS
DROP POLICY IF EXISTS "Vets are viewable by everyone" ON vets;
CREATE POLICY "Vets are viewable by everyone" ON vets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Vets can update own profile" ON vets;
CREATE POLICY "Vets can update own profile" ON vets FOR UPDATE USING (user_id = auth.uid());

-- BOOKINGS
DROP POLICY IF EXISTS "Owners can view own bookings" ON bookings;
CREATE POLICY "Owners can view own bookings" ON bookings FOR SELECT USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Vets can view own bookings" ON bookings;
CREATE POLICY "Vets can view own bookings" ON bookings FOR SELECT USING (vet_id IN (SELECT id FROM vets WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Owners can create bookings" ON bookings;
CREATE POLICY "Owners can create bookings" ON bookings FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Vets can update own bookings" ON bookings;
CREATE POLICY "Vets can update own bookings" ON bookings FOR UPDATE USING (vet_id IN (SELECT id FROM vets WHERE user_id = auth.uid()));

-- VET_SERVICES
DROP POLICY IF EXISTS "Anyone can view active vet services" ON vet_services;
CREATE POLICY "Anyone can view active vet services" ON vet_services FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Vets can view own services" ON vet_services;
CREATE POLICY "Vets can view own services" ON vet_services FOR SELECT USING (vet_id IN (SELECT id FROM vets WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Vets can insert own services" ON vet_services;
CREATE POLICY "Vets can insert own services" ON vet_services FOR INSERT WITH CHECK (vet_id IN (SELECT id FROM vets WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Vets can update own services" ON vet_services;
CREATE POLICY "Vets can update own services" ON vet_services FOR UPDATE USING (vet_id IN (SELECT id FROM vets WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Vets can delete own services" ON vet_services;
CREATE POLICY "Vets can delete own services" ON vet_services FOR DELETE USING (vet_id IN (SELECT id FROM vets WHERE user_id = auth.uid()));

-- VET_AVAILABILITY
DROP POLICY IF EXISTS "Anyone can view vet availability" ON vet_availability;
CREATE POLICY "Anyone can view vet availability" ON vet_availability FOR SELECT USING (is_available = true);

DROP POLICY IF EXISTS "Vets can view own availability" ON vet_availability;
CREATE POLICY "Vets can view own availability" ON vet_availability FOR SELECT USING (vet_id IN (SELECT id FROM vets WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Vets can insert own availability" ON vet_availability;
CREATE POLICY "Vets can insert own availability" ON vet_availability FOR INSERT WITH CHECK (vet_id IN (SELECT id FROM vets WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Vets can update own availability" ON vet_availability;
CREATE POLICY "Vets can update own availability" ON vet_availability FOR UPDATE USING (vet_id IN (SELECT id FROM vets WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Vets can delete own availability" ON vet_availability;
CREATE POLICY "Vets can delete own availability" ON vet_availability FOR DELETE USING (vet_id IN (SELECT id FROM vets WHERE user_id = auth.uid()));

-- REVIEWS
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;
CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can insert reviews for own bookings" ON reviews;
CREATE POLICY "Owners can insert reviews for own bookings" ON reviews FOR INSERT WITH CHECK (owner_id = auth.uid());

-- PAYMENTS
DROP POLICY IF EXISTS "Owners can view own payments" ON payments;
CREATE POLICY "Owners can view own payments" ON payments FOR SELECT USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Vets can view payments for own bookings" ON payments;
CREATE POLICY "Vets can view payments for own bookings" ON payments FOR SELECT USING (vet_id IN (SELECT id FROM vets WHERE user_id = auth.uid()));

-- ============================================
-- 4. ENABLE REALTIME
-- ============================================
-- Add tables to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE vet_services;
ALTER PUBLICATION supabase_realtime ADD TABLE vet_availability;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE vets;

-- ============================================
-- 5. TRIGGER: auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'owner')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 6. TRIGGER: auto-update vet rating from reviews
-- ============================================
CREATE OR REPLACE FUNCTION public.update_vet_rating()
RETURNS trigger AS $$
DECLARE
  avg_rating numeric(2,1);
  review_cnt integer;
BEGIN
  SELECT COALESCE(AVG(rating), 0), COUNT(*)
  INTO avg_rating, review_cnt
  FROM reviews WHERE vet_id = NEW.vet_id;

  UPDATE vets
  SET rating = avg_rating, review_count = review_cnt
  WHERE id = NEW.vet_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_review_created ON reviews;
CREATE TRIGGER on_review_created
  AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_vet_rating();
