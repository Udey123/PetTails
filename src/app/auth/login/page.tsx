"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      router.push(profile?.role === "vet" ? "/dashboard/vet" : "/dashboard/owner");
    }
  };

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div className="card" style={{ maxWidth: 420, width: "100%", padding: 32 }}>
        <h2 style={{ fontSize: "1.6rem", marginBottom: 4 }}>Welcome back</h2>
        <p style={{ color: "var(--ink-soft)", fontSize: "0.94rem", marginBottom: 24 }}>
          Log in to your PetTails account.
        </p>

        <form onSubmit={handleLogin}>
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
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

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
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: "0.92rem", color: "var(--ink-soft)", textAlign: "center" }}>
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" style={{ color: "var(--deep)", fontWeight: 600 }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
