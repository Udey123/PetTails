-- PetTails Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES
-- ============================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  role text not null default 'owner' check (role in ('owner', 'vet', 'admin')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- ============================================
-- PETS
-- ============================================
create table if not exists pets (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  species text not null default 'Dog',
  breed text,
  age text,
  weight text,
  created_at timestamptz not null default now()
);

alter table pets enable row level security;

create policy "Owners can view own pets"
  on pets for select
  using (auth.uid() = owner_id);

create policy "Owners can insert own pets"
  on pets for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update own pets"
  on pets for update
  using (auth.uid() = owner_id);

create policy "Owners can delete own pets"
  on pets for delete
  using (auth.uid() = owner_id);

create index idx_pets_owner on pets(owner_id);

-- ============================================
-- VETS
-- ============================================
create table if not exists vets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  specialization text not null default 'General practice',
  bio text,
  consultation_price integer not null default 499,
  rating numeric(2,1) not null default 4.0,
  verified boolean not null default false,
  online boolean not null default false,
  accepting_bookings boolean not null default false,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

alter table vets enable row level security;

create policy "Anyone can view verified vets"
  on vets for select
  using (verified = true);

create policy "Vets can view own record"
  on vets for select
  using (auth.uid() = user_id);

create policy "Vets can update own record"
  on vets for update
  using (auth.uid() = user_id);

create policy "Vets can insert own record"
  on vets for insert
  with check (auth.uid() = user_id);

create index idx_vets_user on vets(user_id);
create index idx_vets_verified on vets(verified) where verified = true;
create index idx_vets_accepting on vets(accepting_bookings) where accepting_bookings = true;

-- ============================================
-- AVAILABILITY
-- ============================================
create table if not exists availability (
  id uuid primary key default uuid_generate_v4(),
  vet_id uuid not null references vets(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_available boolean not null default true,
  unique(vet_id, day_of_week, start_time)
);

alter table availability enable row level security;

create policy "Anyone can view availability"
  on availability for select
  using (true);

create policy "Vets can manage own availability"
  on availability for all
  using (
    vet_id in (select id from vets where user_id = auth.uid())
  );

create index idx_availability_vet on availability(vet_id);

-- ============================================
-- BOOKINGS
-- ============================================
create table if not exists bookings (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references profiles(id),
  vet_id uuid not null references vets(id),
  pet_id uuid not null references pets(id),
  service_type text not null check (service_type in ('video_consult', 'home_visit', 'emergency')),
  scheduled_at timestamptz not null,
  status text not null default 'pending' check (status in (
    'pending', 'confirmed', 'vet_assigned', 'vet_en_route',
    'arriving', 'arrived', 'in_progress', 'completed', 'cancelled', 'declined'
  )),
  price integer not null,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  booking_reference text not null unique,
  concern text,
  created_at timestamptz not null default now()
);

alter table bookings enable row level security;

create policy "Owners can view own bookings"
  on bookings for select
  using (auth.uid() = owner_id);

create policy "Vets can view bookings assigned to them"
  on bookings for select
  using (
    vet_id in (select id from vets where user_id = auth.uid())
  );

create policy "Owners can create bookings"
  on bookings for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update own bookings"
  on bookings for update
  using (auth.uid() = owner_id);

create policy "Vets can update bookings assigned to them"
  on bookings for update
  using (
    vet_id in (select id from vets where user_id = auth.uid())
  );

create index idx_bookings_owner on bookings(owner_id);
create index idx_bookings_vet on bookings(vet_id);
create index idx_bookings_pet on bookings(pet_id);
create index idx_bookings_reference on bookings(booking_reference);
create index idx_bookings_status on bookings(status);

-- ============================================
-- REVIEWS
-- ============================================
create table if not exists reviews (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null unique references bookings(id),
  owner_id uuid not null references profiles(id),
  vet_id uuid not null references vets(id),
  rating integer not null check (rating between 1 and 5),
  review_text text not null,
  created_at timestamptz not null default now()
);

alter table reviews enable row level security;

create policy "Anyone can view reviews"
  on reviews for select
  using (true);

create policy "Owners can insert reviews for own completed bookings"
  on reviews for insert
  with check (
    auth.uid() = owner_id
    and booking_id in (
      select id from bookings
      where owner_id = auth.uid()
      and status = 'completed'
    )
  );

create policy "Owners can view own reviews"
  on reviews for select
  using (auth.uid() = owner_id);

create index idx_reviews_vet on reviews(vet_id);
create index idx_reviews_booking on reviews(booking_id);
create index idx_reviews_owner on reviews(owner_id);

-- ============================================
-- PAYMENTS
-- ============================================
create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references bookings(id),
  user_id uuid not null references profiles(id),
  amount integer not null,
  provider text not null default 'razorpay',
  provider_payment_id text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  created_at timestamptz not null default now()
);

alter table payments enable row level security;

create policy "Users can view own payments"
  on payments for select
  using (auth.uid() = user_id);

create policy "System can insert payments"
  on payments for insert
  with check (true);

create policy "System can update payments"
  on payments for update
  using (true);

create index idx_payments_booking on payments(booking_id);
create index idx_payments_user on payments(user_id);

-- ============================================
-- REALTIME
-- ============================================
alter publication supabase_realtime add table bookings;
alter publication supabase_realtime add table vets;

-- ============================================
-- FUNCTION: Auto-create profile on signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'User'),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'owner')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- FUNCTION: Update vet rating on new review
-- ============================================
create or replace function public.update_vet_rating()
returns trigger as $$
begin
  update vets
  set rating = (
    select coalesce(round(avg(rating)::numeric, 1), 4.0)
    from reviews
    where vet_id = new.vet_id
  )
  where id = new.vet_id;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_review_created
  after insert on reviews
  for each row execute function public.update_vet_rating();

-- ============================================
-- SEED DATA (Demo only - marked as demo)
-- ============================================
-- These are demo profiles for testing. In production, replace with real data.
-- Run this AFTER creating test users through the signup flow.

-- Example seed (run manually):
-- insert into vets (user_id, specialization, bio, consultation_price, rating, verified, online, accepting_bookings)
-- values
--   ('uuid-from-auth', 'Small animal general practice', 'Experienced in dogs and cats.', 499, 4.9, true, true, true),
--   ('uuid-from-auth', 'Canine orthopedics', 'Specialist in canine joint and bone issues.', 699, 4.8, true, true, true),
--   ('uuid-from-auth', 'Feline medicine', 'Dedicated cat specialist.', 549, 5.0, true, true, true),
--   ('uuid-from-auth', 'Exotic & avian care', 'Birds, reptiles, and exotic pets.', 799, 4.7, true, true, true),
--   ('uuid-from-auth', 'Emergency & critical care', 'Available 24/7 for emergencies.', 899, 4.9, true, true, true);
