export type UserRole = 'owner' | 'vet' | 'admin';

export interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
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

export interface Vet {
  id: string;
  user_id: string;
  specialization: string;
  bio: string | null;
  consultation_price: number;
  rating: number;
  verified: boolean;
  online: boolean;
  accepting_bookings: boolean;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  profiles?: Profile;
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
  | 'declined';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type ServiceType = 'video_consult' | 'home_visit' | 'emergency';

export interface Booking {
  id: string;
  owner_id: string;
  vet_id: string;
  pet_id: string;
  service_type: ServiceType;
  scheduled_at: string;
  status: BookingStatus;
  price: number;
  payment_status: PaymentStatus;
  booking_reference: string;
  concern: string | null;
  created_at: string;
  pets?: Pet;
  vets?: Vet;
  profiles?: Profile;
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

export interface Availability {
  id: string;
  vet_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
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
