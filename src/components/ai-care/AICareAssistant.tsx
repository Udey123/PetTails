"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import VoiceOrb from "./VoiceOrb";
import ReferralCard, { type VetLite } from "./ReferralCard";
import GuidanceCard from "./GuidanceCard";
import { BookingModal } from "@/components/booking/BookingModal";
import { LANGUAGES, type TriageResult, type Urgency } from "@/lib/ai/petCareSchema";
import type { Vet } from "@/lib/types";

interface Pet {
  id: string;
  name: string;
  species: string | null;
  breed: string | null;
  age: string | null;
}

interface AICareAssistantProps {
  pets: Pet[];
  userAvatar?: string | null;
  userName?: string | null;
}

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: string[];
  typing?: boolean;
}

const URGENCY_META: Record<Urgency, { label: string; color: string; bg: string }> = {
  low: { label: "Low risk", color: "#4C8B5B", bg: "#e8f5e9" },
  moderate: { label: "Monitor", color: "#C6842A", bg: "#fdf3e3" },
  uncertain: { label: "Needs more info", color: "#C6842A", bg: "#fdf3e3" },
  urgent: { label: "See a vet soon", color: "#C9727A", bg: "#f9e8ea" },
  emergency: { label: "Emergency", color: "#B3363F", bg: "#fbe9ea" },
};

const WELCOME: DisplayMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm your PetTails AI Care Assistant. Tell me what's going on with your pet — you can type, speak, or even share a photo. I'll help you understand what to do next and connect you with a vet when needed.",
};

function IconRobot() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4.5" y="8.5" width="15" height="10.5" rx="3.4" />
      <path d="M12 5.4v3.1" />
      <circle cx="12" cy="4.4" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="9.1" cy="13.4" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="14.9" cy="13.4" r="1.15" fill="currentColor" stroke="none" />
      <path d="M9.6 16.4h4.8" />
      <path d="M2.7 12.4v3.1M21.3 12.4v3.1" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="8.4" r="3.6" />
      <path d="M4.8 20c.9-3.6 3.8-5.4 7.2-5.4s6.3 1.8 7.2 5.4" />
    </svg>
  );
}

function IconPaw() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <ellipse cx="7" cy="8.6" rx="2.1" ry="2.7" />
      <ellipse cx="12" cy="6.7" rx="2.1" ry="2.8" />
      <ellipse cx="17" cy="8.6" rx="2.1" ry="2.7" />
      <ellipse cx="20.1" cy="13.4" rx="1.8" ry="2.2" />
      <path d="M12 11.6c-3 0-5.7 2.1-6.7 4.9-.7 2 .6 3.9 2.6 3.9 1.4 0 2.6-.7 4.1-.7s2.7.7 4.1.7c2 0 3.3-1.9 2.6-3.9-1-2.8-3.7-4.9-6.7-4.9z" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.6" />
      <ellipse cx="12" cy="12" rx="3.7" ry="8.6" />
      <path d="M3.6 9.2h16.8M3.6 14.8h16.8" />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9.5l6 6 6-6" />
    </svg>
  );
}

function IconMicOff() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2.5" width="6" height="11.5" rx="3" />
      <path d="M5 11.5a7 7 0 0 0 14 0" />
      <path d="M12 18.5V21.5" />
      <path d="M4 3.5 20 20.5" strokeWidth="2.1" />
    </svg>
  );
}

function IconMic() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2.5" width="6" height="11.5" rx="3" />
      <path d="M5 11.5a7 7 0 0 0 14 0" />
      <path d="M12 18.5V21.5" />
    </svg>
  );
}

function IconImage() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.4" y="4.6" width="17.2" height="14.8" rx="3" />
      <circle cx="8.8" cy="9.8" r="1.6" />
      <path d="M4.2 17.4l4.6-4.6a1.8 1.8 0 0 1 2.5 0l6.9 6.9" />
      <path d="M14.2 15.4l1.7-1.7a1.8 1.8 0 0 1 2.5 0l1.7 1.7" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 11v5.2" />
      <circle cx="12" cy="7.9" r="1.05" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function AICareAssistant({ pets, userAvatar, userName }: AICareAssistantProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<DisplayMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [petId, setPetId] = useState<string>(pets[0]?.id || "");
  const [language, setLanguage] = useState<string>("auto");
  const [sending, setSending] = useState(false);
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [imagePreviews, setImagePreviews] = useState<{ data: string; mimeType: string }[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [voiceOut, setVoiceOut] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [handoffState, setHandoffState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [handoffData, setHandoffData] = useState<Record<string, unknown> | null>(null);
  const [showReferral, setShowReferral] = useState(false);
  const [vets, setVets] = useState<VetLite[]>([]);
  const [vetsLoading, setVetsLoading] = useState(false);
  const [bookingVet, setBookingVet] = useState<Vet | null>(null);
  const [bookingVetId, setBookingVetId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<unknown>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const el = messagesEndRef.current;
    if (!el) return;
    const box = el.closest(".ac-msgs");
    if (box) box.scrollTop = box.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const SR =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    if (!SR) setVoiceSupported(false);
    // Warm up voice list (loads async in Chrome)
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  const stopAllAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  // Fallback: browser speech synthesis, picking the most natural available voice
  const speakWithBrowser = useCallback(
    (text: string) => {
      if (!("speechSynthesis" in window)) return;
      const cleaned = text.replace(/[✅⚠️🔴❌💙👀🏥📋]/g, "").slice(0, 600);
      const utterance = new SpeechSynthesisUtterance(cleaned);
      const lang = LANGUAGES.find((l) => l.code === language);
      const speechCode = lang?.speechCode || "en-IN";
      utterance.lang = speechCode;

      const voices = window.speechSynthesis.getVoices();
      const langVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(speechCode.split("-")[0]));
      // Prefer neural/online voices (Google, natural) over old robotic SAPI ones
      const best =
        langVoices.find((v) => /google|natural|neural|online/i.test(v.name)) ||
        langVoices.find((v) => !v.localService) ||
        langVoices[0] ||
        voices[0];
      if (best) utterance.voice = best;
      utterance.rate = 1.03;
      utterance.pitch = 1;

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    [language]
  );

  // Primary: neural TTS from the AI service; falls back to browser voices
  const speak = useCallback(
    (text: string) => {
      if (!text) return;
      stopAllAudio();
      let settled = false;

      fetch("/api/ai-care/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
        .then((res) => (res.ok ? res.blob() : Promise.reject(new Error("tts failed"))))
        .then((blob) => {
          if (settled) return;
          settled = true;
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => {
            URL.revokeObjectURL(url);
            audioRef.current = null;
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            speakWithBrowser(text);
          };
          audio.play().catch(() => speakWithBrowser(text));
        })
        .catch(() => {
          if (settled) return;
          settled = true;
          speakWithBrowser(text);
        });
    },
    [speakWithBrowser, stopAllAudio]
  );

  const startListening = () => {
    const SR =
      (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;
    if (!SR) {
      setVoiceSupported(false);
      return;
    }
    try {
      stopAllAudio();
      const recognition = new (SR as new () => unknown)();
      const rec = recognition as unknown as {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        start: () => void;
        stop: () => void;
        onresult: ((e: { results: Array<Array<{ transcript: string }>> }) => void) | null;
        onend: (() => void) | null;
        onerror: (() => void) | null;
      };
      const lang = LANGUAGES.find((l) => l.code === language);
      rec.lang = lang?.speechCode || "en-IN";
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        // Hands-free: send immediately after speaking
        if (transcript.trim()) {
          sendMessage(transcript.trim());
        } else {
          setInput("");
        }
      };
      rec.onend = () => setIsListening(false);
      rec.onerror = () => setIsListening(false);
      recognitionRef.current = recognition;
      rec.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  };

  const stopListening = () => {
    (recognitionRef.current as { stop?: () => void } | null)?.stop?.();
    setIsListening(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files)
      .slice(0, 3)
      .forEach((file) => {
        if (file.size > 5 * 1024 * 1024) return;
        const reader = new FileReader();
        reader.onload = () => {
          setImagePreviews((prev) =>
            [...prev, { data: reader.result as string, mimeType: file.type }].slice(0, 3)
          );
        };
        reader.readAsDataURL(file);
      });
    e.target.value = "";
  };

  const fetchVets = async (specialty: string) => {
    setVetsLoading(true);
    try {
      const res = await fetch(`/api/ai-care/find-vets?specialty=${encodeURIComponent(specialty || "GENERAL_VETERINARY")}&limit=4`);
      if (res.ok) {
        const data = await res.json();
        setVets((data.vets || []) as VetLite[]);
      }
    } catch {
      setVets([]);
    } finally {
      setVetsLoading(false);
    }
  };

  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if ((!text && imagePreviews.length === 0) || sending) return;

    const userMsg: DisplayMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text || "Shared a photo",
      images: imagePreviews.map((p) => p.data),
    };
    const typingMsg: DisplayMessage = { id: `t-${Date.now()}`, role: "assistant", content: "", typing: true };

    setMessages((prev) => [...prev, userMsg, typingMsg]);
    setInput("");
    const sentImages = imagePreviews;
    setImagePreviews([]);
    setSending(true);
    setShowReferral(false);
    setAnalyzingPhoto(sentImages.length > 0);

    try {
      const res = await fetch("/api/ai-care/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          message: text,
          language,
          pet_id: petId || null,
          images: sentImages.length > 0 ? sentImages : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Request failed");
      }

      const data = await res.json();
      setSessionId(data.session_id);
      setTriage(data.triage);
      if (voiceOut && data.message) speak(data.message);

      setMessages((prev) =>
        prev.filter((m) => !m.typing).concat({
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.message,
        })
      );

      if (data.triage?.next_action === "REFER_TO_VET" || data.triage?.needs_vet) {
        setShowReferral(true);
        fetchVets(data.triage.specialty || "GENERAL_VETERINARY");
      }
    } catch (err) {
      setMessages((prev) =>
        prev.filter((m) => !m.typing).concat({
          id: `e-${Date.now()}`,
          role: "assistant",
          content: `Sorry, something went wrong. ${err instanceof Error ? err.message : "Please try again."}`,
        })
      );
    } finally {
      setSending(false);
      setAnalyzingPhoto(false);
    }
  };

  const handleHandoff = async (vetId?: string) => {
    if (!sessionId || handoffState === "loading") return;
    setHandoffState("loading");
    try {
      const res = await fetch("/api/ai-care/handoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, vet_id: vetId || null }),
      });
      if (!res.ok) throw new Error("Handoff failed");
      const data = await res.json();
      setHandoffData(data);
      setHandoffState("done");
    } catch {
      setHandoffState("error");
    }
  };

  const handleBook = async (vetId: string) => {
    if (bookingVetId) return;
    setBookingVetId(vetId);

    // Send the full case package to this vet (unless already sent)
    if (sessionId && handoffState !== "done" && handoffState !== "loading") {
      handleHandoff(vetId);
    }

    try {
      const res = await fetch(`/api/vets/${vetId}`);
      if (!res.ok) throw new Error("Failed to load vet");
      const vetData = (await res.json()) as Vet;
      setBookingVet(vetData);
    } catch {
      // Fall back to the full profile page if the quick load fails
      router.push(`/vets/${vetId}`);
      return;
    } finally {
      setBookingVetId(null);
    }
  };

  const selectedPet = pets.find((p) => p.id === petId);
  const urgency = triage?.urgency;
  const meta = urgency ? URGENCY_META[urgency] : null;

  return (
    <main className="ac-page">
      <div className="ac-bg" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ac-bg-img ac-bg-l" src="/images/hero-pets.jpg" alt="" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ac-bg-img ac-bg-r" src="/images/cat-closeup.jpg" alt="" />
        <span className="ac-bg-glow" />
      </div>

      <div className="ac-wrap">
        <div className="ac-head">
          <span className="ac-eyebrow">
            AI-assisted pet care guidance with intelligent veterinarian handoff
          </span>
          <h1 className="ac-title">PetTails AI Care Assistant</h1>
          <p className="ac-sub">
            Listen, understand, observe, and guide — then hand you off to a real vet when it matters.
          </p>
        </div>

        {/* Controls */}
        <div className="ac-controls">
          <div className="ac-pill ac-pet-pill">
            <span className="ac-pet-av" aria-hidden="true">
              {selectedPet ? selectedPet.name.charAt(0).toUpperCase() : <IconPaw />}
            </span>
            <select
              className="ac-sel"
              value={petId}
              onChange={(e) => setPetId(e.target.value)}
              aria-label="Select pet"
            >
              <option value="">No pet selected</option>
              {pets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.species ? `(${p.species})` : ""}
                </option>
              ))}
            </select>
            <span className="ac-chev">
              <IconChevron />
            </span>
          </div>

          <div className="ac-pill">
            <span className="ac-pill-ic">
              <IconGlobe />
            </span>
            <select
              className="ac-sel"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label="Language"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeLabel ? `${l.nativeLabel} — ${l.label}` : l.label}
                </option>
              ))}
            </select>
            <span className="ac-chev">
              <IconChevron />
            </span>
          </div>

          <button
            className={`ac-pill ac-voice${voiceOut ? " on" : ""}`}
            onClick={() => setVoiceOut((v) => !v)}
            aria-pressed={voiceOut}
            title={voiceOut ? "Turn off voice replies" : "Turn on voice replies"}
          >
            <span className={voiceOut ? "ac-ic-green" : "ac-ic-red"}>
              {voiceOut ? <IconMic /> : <IconMicOff />}
            </span>
            {voiceOut ? "Voice on" : "Voice off"}
          </button>

          {meta && (
            <span
              className="ac-pill ac-triage"
              style={{ background: meta.bg, color: meta.color }}
            >
              <span className="ac-dot" style={{ background: meta.color }} />
              {meta.label}
            </span>
          )}
        </div>

        {/* Chat area */}
        <section className="ac-card">
          <div className="ac-msgs">
            {messages.map((msg) => (
              <div key={msg.id} className={`ac-row${msg.role === "user" ? " ac-row-u" : ""}`}>
                {msg.role === "assistant" && (
                  <span className="ac-av ac-av-bot" aria-hidden="true">
                    <IconRobot />
                  </span>
                )}
                <div className={`ac-bubble${msg.role === "user" ? " ac-bubble-u" : ""}`}>
                  {msg.typing ? (
                    <span className="ac-typing">
                      <i />
                      <i />
                      <i />
                      {analyzingPhoto && <em>Analyzing photo…</em>}
                    </span>
                  ) : (
                    msg.content
                  )}
                  {msg.images && msg.images.length > 0 && (
                    <span className="ac-imgs">
                      {msg.images.map((src, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={src} alt="Uploaded pet" />
                      ))}
                    </span>
                  )}
                </div>
                {msg.role === "user" && (
                  <span className="ac-av ac-av-user">
                    {userAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={userAvatar} alt={userName || "You"} />
                    ) : (
                      <IconUser />
                    )}
                  </span>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Guidance card */}
          {triage && triage.next_action === "GENERAL_GUIDANCE" && !showReferral && (
            <div className="ac-inset">
              <GuidanceCard guidance={triage.guidance} />
            </div>
          )}

          {/* Referral card */}
          {showReferral && (
            <div className="ac-inset">
              <ReferralCard
                urgency={triage?.urgency || "uncertain"}
                specialty={triage?.specialty || null}
                vets={vets}
                loading={vetsLoading}
                handoffState={handoffState}
                handoffData={handoffData}
                onHandoff={handleHandoff}
                onFindMore={() => fetchVets(triage?.specialty || "GENERAL_VETERINARY")}
                onBook={handleBook}
                bookingVetId={bookingVetId}
              />
            </div>
          )}

          {/* Image previews */}
          {imagePreviews.length > 0 && (
            <div className="ac-previews">
              {imagePreviews.map((p, i) => (
                <div key={i} style={{ position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.data}
                    alt="Preview"
                    style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 12 }}
                  />
                  <button
                    onClick={() => setImagePreviews((prev) => prev.filter((_, j) => j !== i))}
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "var(--ink)",
                      color: "#fff",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "0.7rem",
                      lineHeight: "20px",
                    }}
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="ac-inputrow">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleImageSelect}
              style={{ display: "none" }}
            />
            <button
              className="ac-iconbtn"
              onClick={() => fileInputRef.current?.click()}
              title="Add a photo"
              aria-label="Add a photo"
            >
              <IconImage />
            </button>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={
                voiceSupported
                  ? "Describe what's happening, or tap the mic…"
                  : "Describe what's happening with your pet…"
              }
              rows={1}
              className="ac-input"
              aria-label="Message"
            />

            <VoiceOrb
              listening={isListening}
              supported={voiceSupported}
              onToggle={isListening ? stopListening : startListening}
            />

            <button
              className="ac-send"
              onClick={() => sendMessage()}
              disabled={sending || (!input.trim() && imagePreviews.length === 0)}
            >
              {sending ? "…" : "Send"}
            </button>
          </div>
        </section>

        {/* Disclaimer */}
        <p className="ac-disclaimer">
          <span className="ac-disclaimer-ic" aria-hidden="true">
            <IconInfo />
          </span>
          PetTails AI provides guidance, not diagnosis. In an emergency, contact your nearest
          veterinary clinic immediately.
        </p>
      </div>

      {bookingVet && (
        <BookingModal vet={bookingVet} onClose={() => setBookingVet(null)} />
      )}

      <style>{`
        .ac-page {
          position: relative;
          min-height: 100vh;
          background: var(--paper);
          padding-bottom: 56px;
          overflow: hidden;
          animation: acFade 0.5s ease both;
        }
        .ac-bg {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 0;
        }
        footer {
          position: relative;
          z-index: 1;
        }
        .ac-bg-img {
          position: absolute;
          top: 0;
          height: 100%;
          object-fit: cover;
          user-select: none;
          opacity: 0.62;
          filter: brightness(1.55) saturate(0.9) contrast(0.9) sepia(0.15);
        }
        .ac-bg-l {
          left: 0;
          width: clamp(360px, 36vw, 560px);
          object-position: 38% 42%;
          -webkit-mask-image: linear-gradient(to right, #000 55%, transparent 100%),
            linear-gradient(to top, transparent 0, #000 26%);
          mask-image: linear-gradient(to right, #000 55%, transparent 100%),
            linear-gradient(to top, transparent 0, #000 26%);
          -webkit-mask-composite: source-in;
          mask-composite: intersect;
        }
        .ac-bg-r {
          right: 0;
          width: clamp(330px, 32vw, 500px);
          object-position: 55% center;
          -webkit-mask-image: linear-gradient(to left, #000 55%, transparent 100%),
            linear-gradient(to top, transparent 0, #000 30%);
          mask-image: linear-gradient(to left, #000 55%, transparent 100%),
            linear-gradient(to top, transparent 0, #000 30%);
          -webkit-mask-composite: source-in;
          mask-composite: intersect;
        }
        .ac-bg-glow {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(780px 400px at 50% -4%, rgba(255, 253, 246, 0.92), rgba(255, 253, 246, 0) 72%),
            linear-gradient(to bottom, rgba(240, 238, 225, 0) 62%, rgba(240, 238, 225, 0.9) 100%);
        }
        .ac-bg-glow::before {
          content: "";
          position: absolute;
          inset: -60px -8%;
          background: repeating-linear-gradient(
            112deg,
            rgba(255, 255, 255, 0) 0 110px,
            rgba(255, 255, 255, 0.55) 110px 150px,
            rgba(255, 255, 255, 0) 150px 280px
          );
          opacity: 0.35;
          -webkit-mask-image: radial-gradient(740px 460px at 50% 0, #000 10%, transparent 78%);
          mask-image: radial-gradient(740px 460px at 50% 0, #000 10%, transparent 78%);
        }

        .ac-wrap {
          position: relative;
          z-index: 1;
          max-width: 1020px;
          margin: 0 auto;
          padding: 58px 20px 0;
        }

        .ac-head {
          text-align: center;
          margin-bottom: 40px;
          animation: acRise 0.55s 0.05s ease both;
        }
        .ac-eyebrow {
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          color: var(--amber-dark);
        }
        .ac-title {
          font-family: var(--font-fraunces), Fraunces, serif;
          font-size: clamp(2.15rem, 4.6vw, 3.45rem);
          font-weight: 600;
          line-height: 1.12;
          letter-spacing: -0.01em;
          color: var(--deep);
          margin: 14px 0 16px;
        }
        .ac-sub {
          font-size: clamp(1rem, 1.2vw, 1.1rem);
          line-height: 1.55;
          color: #5F6E65;
          max-width: 610px;
          margin: 0 auto;
        }

        .ac-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: center;
          margin-bottom: 22px;
          animation: acRise 0.55s 0.1s ease both;
        }
        .ac-pill {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          background: #FFFEFB;
          border: 1px solid #ECE7D8;
          border-radius: 12px;
          padding: 8px 15px;
          font-size: 0.93rem;
          font-weight: 600;
          font-family: inherit;
          color: #24352C;
          box-shadow: 0 2px 10px rgba(24, 40, 30, 0.05);
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }
        .ac-pill:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(24, 40, 30, 0.09);
        }
        .ac-pet-av {
          width: 27px;
          height: 27px;
          border-radius: 50%;
          background: #E7F1EA;
          color: var(--deep);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.82rem;
          font-weight: 700;
          flex: none;
          overflow: hidden;
        }
        .ac-sel {
          appearance: none;
          -webkit-appearance: none;
          background: transparent;
          border: none;
          font: inherit;
          color: inherit;
          font-weight: 600;
          cursor: pointer;
          outline: none;
          padding: 0;
          max-width: 240px;
          text-overflow: ellipsis;
        }
        .ac-sel:focus-visible {
          outline: 2px solid rgba(18, 56, 50, 0.45);
          outline-offset: 3px;
          border-radius: 4px;
        }
        .ac-chev {
          color: #7A857B;
          display: inline-flex;
          margin-left: -2px;
        }
        .ac-pill-ic {
          color: #24352C;
          display: inline-flex;
        }
        .ac-voice.on {
          background: #EFF7F1;
          border-color: #C4DFCD;
          color: var(--deep);
        }
        .ac-ic-red { color: #D64545; display: inline-flex; }
        .ac-ic-green { color: var(--deep); display: inline-flex; }
        .ac-triage {
          cursor: default;
          font-weight: 600;
        }
        .ac-triage:hover {
          transform: none;
          box-shadow: 0 2px 10px rgba(24, 40, 30, 0.05);
        }
        .ac-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex: none;
        }

        .ac-card {
          position: relative;
          background: var(--white);
          border: 1px solid rgba(28, 42, 33, 0.05);
          border-radius: 28px;
          box-shadow: 0 26px 60px rgba(24, 44, 32, 0.11), 0 2px 8px rgba(24, 44, 32, 0.04);
          display: flex;
          flex-direction: column;
          min-height: 470px;
          overflow: hidden;
          animation: acRise 0.6s 0.15s ease both;
        }
        .ac-msgs {
          flex: 1;
          padding: 26px 26px 10px;
          display: flex;
          flex-direction: column;
          gap: 26px;
          max-height: 54vh;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #D6D2C2 transparent;
        }
        .ac-msgs::-webkit-scrollbar { width: 8px; }
        .ac-msgs::-webkit-scrollbar-thumb { background: #D6D2C2; border-radius: 8px; }
        .ac-row {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          animation: acRise 0.4s ease both;
        }
        .ac-row-u {
          justify-content: flex-end;
        }
        .ac-av {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          flex: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .ac-av-bot {
          background: #E8F4EC;
          color: #1E7A4E;
        }
        .ac-av-user {
          width: 38px;
          height: 38px;
          background: var(--deep);
          color: #F5F2E9;
          margin-top: 4px;
        }
        .ac-av-user img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .ac-bubble {
          max-width: 74%;
          padding: 14px 18px;
          border-radius: 18px 18px 18px 6px;
          background: #F2F0E7;
          color: #24352C;
          font-size: 0.98rem;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        .ac-bubble-u {
          background: var(--deep);
          color: #F5F2E9;
          border-radius: 18px 18px 6px 18px;
          margin-top: 4px;
        }
        .ac-typing {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .ac-typing i {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #9AA79D;
          animation: acBounce 1.2s ease-in-out infinite;
        }
        .ac-typing i:nth-child(2) { animation-delay: 0.15s; }
        .ac-typing i:nth-child(3) { animation-delay: 0.3s; }
        .ac-typing em {
          font-style: normal;
          font-size: 0.85rem;
          color: #7C887E;
          margin-left: 7px;
        }
        .ac-imgs {
          display: flex;
          gap: 7px;
          margin-top: 9px;
          flex-wrap: wrap;
        }
        .ac-imgs img {
          width: 92px;
          height: 92px;
          object-fit: cover;
          border-radius: 12px;
          border: 2px solid rgba(255, 255, 255, 0.55);
        }
        .ac-inset {
          padding: 0 26px 12px;
        }
        .ac-previews {
          padding: 6px 26px 10px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .ac-inputrow {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 16px 22px 20px;
          border-top: 1px solid #EFEBDF;
          background: var(--white);
        }
        .ac-iconbtn {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: 1px solid #ECE7D8;
          background: #F7F5EC;
          color: #2A3B31;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex: none;
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
        }
        .ac-iconbtn:hover {
          background: #F0EEE4;
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(24, 40, 30, 0.09);
        }
        .ac-input {
          flex: 1;
          min-height: 48px;
          max-height: 120px;
          padding: 13px 22px;
          border-radius: 999px;
          border: 1px solid #ECE7D8;
          background: #FAF8F1;
          color: var(--ink);
          font-size: 0.96rem;
          font-family: inherit;
          line-height: 1.4;
          resize: none;
          outline: none;
          transition: border-color 0.18s ease, background 0.18s ease;
        }
        .ac-input::placeholder { color: #8E9589; }
        .ac-input:focus {
          border-color: #C4D2C7;
          background: #FFFEFB;
        }
        .ac-send {
          height: 48px;
          padding: 0 30px;
          border-radius: 999px;
          border: none;
          background: var(--deep);
          color: #F7F4EA;
          font-size: 0.96rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          flex: none;
          transition: transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
        }
        .ac-send:hover:not(:disabled) {
          background: var(--deep-2);
          transform: translateY(-1px);
          box-shadow: 0 8px 18px rgba(18, 56, 50, 0.22);
        }
        .ac-send:disabled {
          cursor: default;
          box-shadow: none;
        }

        .ac-disclaimer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-align: center;
          font-size: 0.9rem;
          color: #66736A;
          margin-top: 32px;
          line-height: 1.5;
          animation: acRise 0.6s 0.2s ease both;
        }
        .ac-disclaimer-ic {
          display: inline-flex;
          color: #8A9489;
          flex: none;
        }

        @keyframes acFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes acRise {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes acBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-5px); opacity: 1; }
        }

        @media (max-width: 1100px) {
          .ac-bg-r { display: none; }
          .ac-bg-l { width: 300px; opacity: 0.55; }
        }
        @media (max-width: 760px) {
          .ac-wrap { padding-top: 30px; }
          .ac-head { margin-bottom: 26px; }
          .ac-msgs { padding: 20px 16px 8px; gap: 20px; max-height: 58vh; }
          .ac-bubble { max-width: 86%; font-size: 0.94rem; padding: 12px 15px; }
          .ac-av { width: 38px; height: 38px; }
          .ac-av-user { width: 32px; height: 32px; }
          .ac-av-bot svg { width: 21px; height: 21px; }
          .ac-card { border-radius: 22px; min-height: 420px; }
          .ac-inset, .ac-previews { padding-left: 16px; padding-right: 16px; }
          .ac-inputrow { padding: 12px 14px 14px; gap: 8px; }
          .ac-input { padding: 12px 16px; min-height: 46px; }
          .ac-iconbtn { width: 44px; height: 44px; }
          .ac-send { padding: 0 22px; height: 46px; }
          .ac-disclaimer { flex-wrap: wrap; font-size: 0.84rem; padding: 0 6px; }
        }
        @media (max-width: 640px) {
          .ac-bg { display: none; }
        }
        @media (max-width: 560px) {
          .ac-controls { gap: 8px; }
          .ac-pill { padding: 9px 12px; font-size: 0.86rem; gap: 7px; }
          .ac-sel { max-width: 150px; font-size: 0.86rem; }
          .ac-title { margin: 10px 0 12px; }
          .ac-imgs img { width: 72px; height: 72px; }
        }
        @media (max-width: 440px) {
          .ac-wrap { padding-left: 12px; padding-right: 12px; }
          .ac-send { padding: 0 16px; }
          .ac-input { padding: 11px 14px; font-size: 0.92rem; }
          .ac-bubble { max-width: 92%; }
        }
      `}</style>
    </main>
  );
}
