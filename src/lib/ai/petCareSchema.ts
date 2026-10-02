export type Urgency = "low" | "moderate" | "uncertain" | "urgent" | "emergency";
export type NextAction = "CONTINUE_CHAT" | "GENERAL_GUIDANCE" | "REFER_TO_VET";

export const SPECIALTIES = {
  GENERAL_VETERINARY: "General Veterinary",
  DERMATOLOGY: "Dermatology",
  ORTHOPEDICS: "Orthopedics",
  DENTAL: "Dental",
  OPHTHALMOLOGY: "Ophthalmology",
  INTERNAL_MEDICINE: "Internal Medicine",
  SURGERY: "Surgery",
  EMERGENCY: "Emergency",
} as const;

export type SpecialtyKey = keyof typeof SPECIALTIES;

export interface TriageGuidance {
  what_you_can_do: string[];
  monitor_for: string[];
  contact_vet_if: string[];
}

export interface TriageResult {
  urgency: Urgency;
  needs_vet: boolean;
  specialty: SpecialtyKey | null;
  next_action: NextAction;
  confidence: number;
  observations: string[];
  red_flags: string[];
  missing_information: string[];
  guidance: TriageGuidance;
}

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  message_type?: "TEXT" | "VOICE" | "IMAGE" | "SYSTEM";
  images?: string[];
  created_at?: string;
}

export interface AIResponse {
  message: string;
  triage: TriageResult;
  session_id: string;
}

export interface LanguageOption {
  code: string;
  label: string;
  speechCode: string;
  nativeLabel?: string;
}

// JSONB columns may come back as arrays or as JSON-encoded strings
// (older rows were inserted with JSON.stringify). Normalize to string[].
export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {
      // plain string, not JSON
    }
    return [trimmed];
  }
  return [];
}

export const LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", speechCode: "en-IN" },
  { code: "hi", label: "Hindi", speechCode: "hi-IN", nativeLabel: "हिन्दी" },
  { code: "hinglish", label: "Hinglish", speechCode: "hi-IN", nativeLabel: "Hinglish" },
  { code: "bn", label: "Bengali", speechCode: "bn-IN", nativeLabel: "বাংলা" },
  { code: "ta", label: "Tamil", speechCode: "ta-IN", nativeLabel: "தமிழ்" },
  { code: "te", label: "Telugu", speechCode: "te-IN", nativeLabel: "తెలుగు" },
  { code: "mr", label: "Marathi", speechCode: "mr-IN", nativeLabel: "मराठी" },
  { code: "gu", label: "Gujarati", speechCode: "gu-IN", nativeLabel: "ગુજરાતી" },
  { code: "pa", label: "Punjabi", speechCode: "pa-IN", nativeLabel: "ਪੰਜਾਬੀ" },
  { code: "auto", label: "Auto-detect language", speechCode: "en-IN" },
];

export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  hinglish: "Hinglish",
  bn: "Bengali",
  ta: "Tamil",
  te: "Telugu",
  mr: "Marathi",
  gu: "Gujarati",
  pa: "Punjabi",
};
