import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vetId = searchParams.get("vet_id");
    const date = searchParams.get("date"); // YYYY-MM-DD

    if (!vetId) {
      return NextResponse.json({ error: "vet_id required" }, { status: 400 });
    }

    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }

    // Get vet's availability for the day of week
    const targetDate = date ? new Date(date) : new Date();
    const dayOfWeek = targetDate.getDay();

    const { data: availability } = await supabase
      .from("vet_availability")
      .select("*")
      .eq("vet_id", vetId)
      .eq("day_of_week", dayOfWeek)
      .eq("is_available", true);

    if (!availability || availability.length === 0) {
      return NextResponse.json({ slots: [] });
    }

    // Get existing bookings for this vet on this date
    const dateStr = targetDate.toISOString().split("T")[0];
    const { data: bookings } = await supabase
      .from("bookings")
      .select("scheduled_at, duration_minutes")
      .eq("vet_id", vetId)
      .in("status", ["pending", "confirmed", "vet_assigned", "in_progress"])
      .gte("scheduled_at", `${dateStr}T00:00:00`)
      .lt("scheduled_at", `${dateStr}T23:59:59`);

    // Get blocked slots
    const { data: blocked } = await supabase
      .from("vet_blocked_slots")
      .select("start_time, end_time")
      .eq("vet_id", vetId)
      .lt("start_time", `${dateStr}T23:59:59`)
      .gt("end_time", `${dateStr}T00:00:00`);

    // Get vet's default service duration
    const { data: services } = await supabase
      .from("vet_services")
      .select("duration_minutes")
      .eq("vet_id", vetId)
      .eq("is_active", true)
      .limit(1);

    const duration = services?.[0]?.duration_minutes || 30;

    // Generate available slots
    const slots: { start: string; end: string; available: boolean }[] = [];

    for (const avail of availability) {
      const [startH, startM] = avail.start_time.split(":").map(Number);
      const [endH, endM] = avail.end_time.split(":").map(Number);

      let currentMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      while (currentMinutes + duration <= endMinutes) {
        const slotStart = new Date(targetDate);
        slotStart.setHours(Math.floor(currentMinutes / 60), currentMinutes % 60, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + duration);

        // Check if slot overlaps with existing bookings
        const isBooked = (bookings || []).some((b: { scheduled_at: string; duration_minutes?: number }) => {
          const bStart = new Date(b.scheduled_at);
          const bEnd = new Date(bStart);
          bEnd.setMinutes(bEnd.getMinutes() + (b.duration_minutes || 30));
          return slotStart < bEnd && slotEnd > bStart;
        });

        // Check if slot overlaps with blocked slots
        const isBlocked = (blocked || []).some((b: { start_time: string; end_time: string }) => {
          const bStart = new Date(b.start_time);
          const bEnd = new Date(b.end_time);
          return slotStart < bEnd && slotEnd > bStart;
        });

        // Check if slot is in the past
        const now = new Date();
        const isPast = slotStart <= now;

        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          available: !isBooked && !isBlocked && !isPast,
        });

        currentMinutes += duration;
      }
    }

    return NextResponse.json({ slots, duration });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
