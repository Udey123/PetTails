import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatPrice(price: number): string {
  return `₹${price.toLocaleString('en-IN')}`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const SERVICE_LABELS: Record<string, string> = {
  video_consult: 'Video Consultation',
  home_visit: 'Home Visit',
  clinic_consult: 'Clinic Consultation',
  emergency: 'Emergency',
  followup: 'Follow-up',
};

export const SERVICE_ICONS: Record<string, string> = {
  video_consult: '📹',
  home_visit: '🏠',
  clinic_consult: '🏥',
  emergency: '🚨',
  followup: '🔄',
};

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  vet_assigned: 'Vet assigned',
  vet_en_route: 'Vet en route',
  arriving: 'Arriving',
  arrived: 'Arrived',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  declined: 'Declined',
  no_show: 'No show',
  rejected: 'Rejected',
};

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#E4A13B22', text: '#C6842A' },
  confirmed: { bg: '#4C8B5B22', text: '#4C8B5B' },
  vet_assigned: { bg: '#4C8B5B22', text: '#4C8B5B' },
  in_progress: { bg: '#12383222', text: '#123832' },
  completed: { bg: '#4C8B5B22', text: '#4C8B5B' },
  cancelled: { bg: '#C9727A22', text: '#C9727A' },
  declined: { bg: '#C9727A22', text: '#C9727A' },
  rejected: { bg: '#C9727A22', text: '#C9727A' },
  no_show: { bg: '#C9727A22', text: '#C9727A' },
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
};

export const URGENCY_LABELS: Record<string, string> = {
  routine: 'Routine',
  soon: 'Soon',
  urgent: 'Urgent',
  emergency: 'Emergency',
};

export const URGENCY_DESCRIPTIONS: Record<string, string> = {
  routine: "I'm planning a consultation",
  soon: 'I need help today',
  urgent: 'My pet needs prompt attention',
  emergency: 'This may be a veterinary emergency',
};

export const URGENCY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  routine: { bg: '#F0EEE1', text: '#4A5A4E', border: '#D3CEB9' },
  soon: { bg: '#E4A13B22', text: '#C6842A', border: '#E4A13B' },
  urgent: { bg: '#C9727A22', text: '#C9727A', border: '#C9727A' },
  emergency: { bg: '#C9727A', text: '#FFFDF8', border: '#C9727A' },
};

export const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const VERIFICATION_LABELS: Record<string, string> = {
  pending: 'Pending',
  under_review: 'Under Review',
  verified: 'Verified',
  rejected: 'Rejected',
};

export const VERIFICATION_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#E4A13B22', text: '#C6842A' },
  under_review: { bg: '#12383222', text: '#123832' },
  verified: { bg: '#4C8B5B22', text: '#4C8B5B' },
  rejected: { bg: '#C9727A22', text: '#C9727A' },
};

export const COMMON_SPECIES = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Hamster', 'Guinea Pig', 'Reptile', 'Fish', 'Other'];
export const COMMON_LANGUAGES = ['English', 'Hindi', 'Marathi', 'Tamil', 'Telugu', 'Bengali', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu'];
