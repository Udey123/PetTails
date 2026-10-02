import { createClient } from "@/lib/supabase/server";

const BUCKET = "pet-care-media";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export function validateImageFile(file: { size: number; type: string }): string | null {
  if (file.size > MAX_SIZE) return "Image must be under 5MB";
  if (!ALLOWED_TYPES.includes(file.type)) return "Only JPG, PNG, and WEBP images are supported";
  return null;
}

export async function uploadPetCareMedia(
  userId: string,
  petId: string | null,
  sessionId: string,
  file: { data: string; mimeType: string; name?: string }
): Promise<{ path: string; publicUrl: string } | null> {
  try {
    const supabase = await createClient();
    if (!supabase) return null;

    const ext = file.mimeType === "image/png" ? "png" : file.mimeType === "image/webp" ? "webp" : "jpg";
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const path = `${userId}/${petId || "unknown"}/${sessionId}/${timestamp}-${random}.${ext}`;

    // Convert base64 to bytes
    const base64 = file.data.split(",")[1] || file.data;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: file.mimeType, upsert: false });

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { path, publicUrl: urlData?.publicUrl || "" };
  } catch (err) {
    console.error("uploadPetCareMedia error:", err);
    return null;
  }
}
