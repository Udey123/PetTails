export type UserRole = 'owner' | 'vet' | 'admin';

export interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface Pet {
  id: string;
  owner_id: string;
  name: string;
  species: string;
  breed: string | null;
  age: string | null;
  weight: string | null;
  created_at: string;
}

export type VerificationStatus = 'pending' | 'under_review' | 'verified' | 'rejected';

export interface Vet {
  id: string;
  user_id: string;
  display_name: string | null;
  professional_title: string | null;
  specialization: string;
  bio: string | null;
  degree: string | null;
  university: string | null;
  graduation_year: number | null;
  registration_number: string | null;
  registration_council: string | null;
  years_experience: number | null;
  city: string | null;
  area: string | null;
  clinic_name: string | null;
  languages: string[];
  species_treated: string[];
  specializations: string[];
  expertise: string[];
  achievements: string[];
  consultation_price: number;
  rating: number;
  review_count: number;
  total_consultations: number;
  verified: boolean;
  verification_status: VerificationStatus;
  verification_documents: string[];
  verified_at: string | null;
  rejection_reason: string | null;
  online: boolean;
  accepting_bookings: boolean;
  is_active: boolean;
  onboarding_completed: boolean;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  vet_services?: VetService[];
}

export type ServiceType = 'video_consult' | 'home_visit' | 'clinic_consult' | 'emergency' | 'followup';

export interface VetService {
  id: string;
  vet_id: string;
  service_type: ServiceType;
  title: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'vet_assigned'
  | 'vet_en_route'
  | 'arriving'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'declined'
  | 'no_show'
  | 'rejected';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type UrgencyLevel = 'routine' | 'soon' | 'urgent' | 'emergency';

export interface Booking {
  id: string;
  owner_id: string;
  vet_id: string;
  pet_id: string;
  service_id: string | null;
  service_type: ServiceType;
  booking_type: string;
  urgency: UrgencyLevel;
  scheduled_at: string;
  duration_minutes: number;
  status: BookingStatus;
  price: number;
  payment_status: PaymentStatus;
  booking_reference: string;
  concern: string | null;
  symptoms: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  pets?: Pet;
  vets?: Vet;
  profiles?: Profile;
  vet_services?: VetService;
}

export interface Review {
  id: string;
  booking_id: string;
  owner_id: string;
  vet_id: string;
  rating: number;
  review_text: string;
  created_at: string;
  profiles?: Profile;
}

export interface VetAvailability {
  id: string;
  vet_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface VetBlockedSlot {
  id: string;
  vet_id: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  provider: string;
  provider_payment_id: string | null;
  status: PaymentStatus;
  created_at: string;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}
