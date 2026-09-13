"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { EmailVerificationModal } from "@/components/auth/EmailVerificationModal";

function SignupForm() {
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get("role") === "vet" ? "vet" : "owner";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"owner" | "vet">(defaultRole);
  const [specialization, setSpecialization] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [signedUpEmail, setSignedUpEmail] = useState("");
  const [signedUpRole, setSignedUpRole] = useState<"owner" | "vet">("owner");
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      if (role === "vet") {
        await supabase.from("vets").insert({
          user_id: data.user.id,
          specialization: specialization || "General practice",
          consultation_price: 499,
          verified: false,
          online: false,
          accepting_bookings: false,
        });
      }

      // Check if email is already confirmed (e.g. if confirm is disabled in Supabase)
      if (data.user.email_confirmed_at) {
        router.push(role === "vet" ? "/dashboard/vet" : "/dashboard/owner");
      } else {
        // Show verification modal
        setSignedUpEmail(email);
        setSignedUpRole(role);
        setShowVerification(true);
      }
    }
    setLoading(false);
  };

  const handleVerificationClose = () => {
    setShowVerification(false);
  };

  const handleVerified = (verifiedRole: "owner" | "vet") => {
    router.push(verifiedRole === "vet" ? "/dashboard/vet" : "/dashboard/owner");
  };

  return (
    <>
      <div className="card" style={{ maxWidth: 420, width: "100%", padding: 32 }}>
        <h2 style={{ fontSize: "1.6rem", marginBottom: 4 }}>Create your account</h2>
        <p style={{ color: "var(--ink-soft)", fontSize: "0.94rem", marginBottom: 24 }}>
          Join PetTails as a pet owner or a vet.
        </p>

        <form onSubmit={handleSignup}>
          <div className="field" style={{ marginBottom: 16 }}>
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="field" style={{ marginBottom: 16 }}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field" style={{ marginBottom: 16 }}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <div className="field" style={{ marginBottom: 16 }}>
            <label htmlFor="role">I am a...</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as "owner" | "vet")}
            >
              <option value="owner">Pet owner</option>
              <option value="vet">Veterinarian</option>
            </select>
          </div>

          {role === "vet" && (
            <div className="field" style={{ marginBottom: 16 }}>
              <label htmlFor="specialization">Specialization</label>
              <input
                id="specialization"
                type="text"
                placeholder="e.g. Small animal practice"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
              />
            </div>
          )}

          {error && (
            <div style={{ color: "var(--rose)", fontSize: "0.9rem", marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button
            className="btn-primary"
            type="submit"
            style={{ width: "100%" }}
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: "0.92rem", color: "var(--ink-soft)", textAlign: "center" }}>
          Already have an account?{" "}
          <Link href="/auth/login" style={{ color: "var(--deep)", fontWeight: 600 }}>
            Log in
          </Link>
        </p>
      </div>

      {showVerification && (
        <EmailVerificationModal
          email={signedUpEmail}
          role={signedUpRole}
          onClose={handleVerificationClose}
          onVerified={handleVerified}
        />
      )}
    </>
  );
}

export default function SignupPage() {
  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <Suspense fallback={<div style={{ color: "var(--ink-soft)" }}>Loading...</div>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
