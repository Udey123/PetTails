import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AICareAssistant from "@/components/ai-care/AICareAssistant";

export default async function AICarePage() {
  const supabase = await createClient();
  if (!supabase) redirect("/auth/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: pets } = await supabase
    .from("pets")
    .select("id, name, species, breed, age")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true });

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <AICareAssistant
      pets={pets || []}
      userAvatar={profile?.avatar_url ?? null}
      userName={profile?.name ?? null}
    />
  );
}
