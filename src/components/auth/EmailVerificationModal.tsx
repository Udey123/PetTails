"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface EmailVerificationModalProps {
  email: string;
  role: "owner" | "vet";
  onClose: () => void;
  onVerified: (role: "owner" | "vet") => void;
}

const RESEND_COOLDOWN = 45;

function detectEmailProvider(email: string): string | null {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;
  if (domain === "gmail.com" || domain === "googlemail.com") return "gmail";
  if (domain.includes("outlook") || domain.includes("hotmail") || domain.includes("live") || domain === "msn.com") return "outlook";
  if (domain.includes("yahoo")) return "yahoo";
  if (domain.includes("icloud") || domain === "me.com" || domain === "mac.com") return "icloud";
  if (domain.includes("aol")) return "aol";
  if (domain === "protonmail.com" || domain === "proton.me") return "proton";
  return null;
}

function getMailUrl(provider: string | null): string | null {
  if (!provider) return null;
  switch (provider) {
    case "gmail": return "https://mail.google.com";
    case "outlook": return "https://outlook.live.com";
    case "yahoo": return "https://mail.yahoo.com";
    case "icloud": return "https://www.icloud.com/mail";
    case "aol": return "https://mail.aol.com";
    case "proton": return "https://mail.proton.me";
    default: return null;
  }
}

function getProviderLabel(provider: string | null): string {
  switch (provider) {
    case "gmail": return "Gmail";
    case "outlook": return "Outlook";
    case "yahoo": return "Yahoo Mail";
    case "icloud": return "iCloud Mail";
    case "aol": return "AOL Mail";
    case "proton": return "Proton Mail";
    default: return "your email app";
  }
}

export function EmailVerificationModal({ email, role, onClose, onVerified }: EmailVerificationModalProps) {
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "success" | "error">("idle");
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const supabase = createClient();

  const provider = detectEmailProvider(email);
  const mailUrl = getMailUrl(provider);
  const providerLabel = getProviderLabel(provider);

  // Focus trap
  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement;
    const timer = setTimeout(() => {
      modalRef.current?.focus();
    }, 50);
    return () => {
      clearTimeout(timer);
      previousFocus.current?.focus();
    };
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Auto-check verification
  const checkVerification = useCallback(async () => {
    try {
      setChecking(true);
      const { data } = await supabase.auth.getUser();
      if (data.user?.email_confirmed_at) {
        setVerified(true);
        setTimeout(() => onVerified(role), 2000);
      }
    } finally {
      setChecking(false);
    }
  }, [supabase, onVerified, role]);

  useEffect(() => {
    // Check immediately
    checkVerification();

    // Poll every 3 seconds
    const interval = setInterval(checkVerification, 3000);
    return () => clearInterval(interval);
  }, [checkVerification]);

  // Escape key handler
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleResend = async () => {
    if (cooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setResendStatus("idle");

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (error) {
        setResendStatus("error");
      } else {
        setResendStatus("success");
        setCooldown(RESEND_COOLDOWN);
      }
    } catch {
      setResendStatus("error");
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="verify-title"
      style={{ animation: "fadeIn 0.2s ease" }}
    >
      <div
        ref={modalRef}
        className="modal"
        tabIndex={-1}
        style={{ outline: "none", padding: "36px 32px 32px", textAlign: "center" }}
      >
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close verification dialog"
        >
          ×
        </button>

        {!verified ? (
          <>
            {/* Email icon */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--paper)",
                border: "1px solid var(--line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
              aria-hidden="true"
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--deep)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 4L12 13L2 4" />
              </svg>
            </div>

            <h2
              id="verify-title"
              style={{
                fontFamily: "var(--font-fraunces), Fraunces, serif",
                fontSize: "1.4rem",
                fontWeight: 600,
                marginBottom: 8,
                color: "var(--ink)",
              }}
            >
              Check your email
            </h2>

            <p style={{ color: "var(--ink-soft)", fontSize: "0.94rem", marginBottom: 4 }}>
              We&apos;ve sent a verification link to
            </p>

            <p
              style={{
                fontFamily: "var(--font-fraunces), Fraunces, serif",
                fontWeight: 600,
                fontSize: "1rem",
                color: "var(--ink)",
                marginBottom: 12,
                wordBreak: "break-all",
              }}
            >
              {email}
            </p>

            <p style={{ color: "var(--ink-soft)", fontSize: "0.88rem", marginBottom: 24, lineHeight: 1.5 }}>
              Click the link in the email to verify your account and continue to PetTails.
            </p>

            {/* Open email button */}
            {mailUrl ? (
              <a
                href={mailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "center",
                  textDecoration: "none",
                  marginBottom: 16,
                  padding: "13px 22px",
                }}
              >
                Open {providerLabel}
              </a>
            ) : (
              <button
                className="btn-primary"
                style={{ width: "100%", marginBottom: 16 }}
                onClick={onClose}
              >
                Open email app
              </button>
            )}

            {/* Resend */}
            <div style={{ marginBottom: 20 }}>
              {resendStatus === "success" && (
                <p
                  style={{
                    color: "#4C8B5B",
                    fontSize: "0.88rem",
                    fontWeight: 500,
                    marginBottom: 8,
                  }}
                  role="status"
                >
                  Verification email sent again.
                </p>
              )}

              {resendStatus === "error" && (
                <p
                  style={{
                    color: "var(--rose)",
                    fontSize: "0.88rem",
                    fontWeight: 500,
                    marginBottom: 8,
                  }}
                  role="alert"
                >
                  Couldn&apos;t resend the email. Please try again.
                </p>
              )}

              <button
                onClick={handleResend}
                disabled={cooldown > 0 || resendLoading}
                style={{
                  background: "none",
                  border: "none",
                  color: cooldown > 0 ? "var(--ink-soft)" : "var(--deep)",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  cursor: cooldown > 0 || resendLoading ? "not-allowed" : "pointer",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                  padding: 0,
                  opacity: resendLoading ? 0.6 : 1,
                }}
                aria-label={cooldown > 0 ? `Resend email in ${cooldown} seconds` : "Resend verification email"}
              >
                {cooldown > 0
                  ? `Resend email in ${cooldown}s`
                  : resendLoading
                  ? "Sending..."
                  : "Resend verification email"}
              </button>
            </div>

            {/* Checking indicator */}
            {checking && (
              <p style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginBottom: 12 }} aria-live="polite">
                Checking verification status…
              </p>
            )}

            {/* Go back */}
            <div
              style={{
                borderTop: "1px solid var(--line)",
                paddingTop: 16,
              }}
            >
              <p style={{ fontSize: "0.85rem", color: "var(--ink-soft)", marginBottom: 4 }}>
                Wrong email address?
              </p>
              <button
                onClick={onClose}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--deep)",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                  padding: 0,
                }}
                aria-label="Go back to signup form"
              >
                Go back
              </button>
            </div>
          </>
        ) : (
          /* Verified success state */
          <>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "#4C8B5B",
                color: "var(--white)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                fontSize: "1.6rem",
                animation: "scaleIn 0.3s ease",
              }}
              aria-hidden="true"
            >
              ✓
            </div>

            <h2
              style={{
                fontFamily: "var(--font-fraunces), Fraunces, serif",
                fontSize: "1.4rem",
                fontWeight: 600,
                marginBottom: 8,
                color: "var(--ink)",
              }}
            >
              Email verified!
            </h2>

            <p style={{ color: "var(--ink-soft)", fontSize: "0.94rem" }}>
              Taking you to your dashboard…
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
