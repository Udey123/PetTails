import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import JoinConsultation from "@/components/consultation/JoinConsultation";

interface Props {
  params: Promise<{ bookingId: string }>;
}

export default async function ConsultationPage({ params }: Props) {
  const { bookingId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, owner_id, vet_id, pet_id, service_type, status, scheduled_at, urgency, booking_reference, price")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    redirect("/dashboard/owner");
  }

  if (booking.service_type !== "video_consult") {
    redirect("/dashboard/owner");
  }

  const isOwner = booking.owner_id === user.id;
  let isVet = false;

  if (!isOwner) {
    const { data: vet } = await supabase
      .from("vets")
      .select("id")
      .eq("user_id", user.id)
      .eq("id", booking.vet_id)
      .single();
    isVet = !!vet;
  }

  if (!isOwner && !isVet) {
    redirect("/dashboard/owner");
  }

  const { data: pet } = await supabase
    .from("pets")
    .select("name, species, breed")
    .eq("id", booking.pet_id)
    .single();

  const { data: vetData } = await supabase
    .from("vets")
    .select("id, display_name, specialization, google_meet_url")
    .eq("id", booking.vet_id)
    .single();

  const { data: vetProfile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", booking.vet_id)
    .single();

  const vetName =
    vetData?.display_name || vetProfile?.name || "Veterinarian";
  const googleMeetUrl = vetData?.google_meet_url || null;

  return (
    <JoinConsultation
      bookingId={booking.id}
      bookingReference={booking.booking_reference}
      scheduledAt={booking.scheduled_at}
      urgency={booking.urgency}
      status={booking.status}
      price={booking.price}
      userRole={isOwner ? "owner" : "vet"}
      petName={pet?.name || "Pet"}
      petSpecies={pet?.species || ""}
      petBreed={pet?.breed || ""}
      vetName={vetName}
      vetSpecialization={vetData?.specialization || ""}
      googleMeetUrl={googleMeetUrl}
    />
  );
}
