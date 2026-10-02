"use client";

interface VoiceOrbProps {
  listening: boolean;
  supported: boolean;
  onToggle: () => void;
}

function MicIcon({ off }: { off?: boolean }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2.5" width="6" height="11.5" rx="3" />
      <path d="M5 11.5a7 7 0 0 0 14 0" />
      <path d="M12 18.5V21.5" />
      {off && <path d="M4 3.5 20 20.5" strokeWidth="2.1" />}
    </svg>
  );
}

export default function VoiceOrb({ listening, supported, onToggle }: VoiceOrbProps) {
  if (!supported) {
    return (
      <span
        title="Voice input not supported in this browser"
        aria-label="Voice input unavailable"
        className="orb orb-unsupported"
      >
        <MicIcon off />
        <style>{`
          .orb-unsupported {
            width: 48px; height: 48px; border-radius: 50%;
            border: 1px dashed var(--line); background: transparent;
            color: var(--ink-soft); display: inline-flex;
            align-items: center; justify-content: center;
            flex: none; opacity: 0.5;
          }
        `}</style>
      </span>
    );
  }

  return (
    <>
      <button
        onClick={onToggle}
        title={listening ? "Stop listening" : "Speak your message"}
        aria-label={listening ? "Stop listening" : "Speak your message"}
        aria-pressed={listening}
        className={`orb${listening ? " orb-live" : ""}`}
      >
        {listening ? (
          <span className="orb-wave" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        ) : (
          <MicIcon />
        )}
      </button>
      <style>{`
        .orb {
          width: 48px; height: 48px; border-radius: 50%;
          border: 1px solid #ECE7D8;
          background: #FFFEFB;
          color: #24352C;
          cursor: pointer;
          flex: none;
          display: inline-flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(24, 40, 30, 0.06);
          transition: all 0.2s ease;
          position: relative;
        }
        .orb:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(24, 40, 30, 0.1); }
        .orb-live {
          background: var(--deep);
          border-color: var(--deep);
          color: #F5F2E9;
          box-shadow: 0 0 0 6px rgba(18, 56, 50, 0.14);
          animation: orbRing 1.6s ease-in-out infinite;
        }
        .orb-wave { display: inline-flex; align-items: center; gap: 3px; height: 18px; }
        .orb-wave i {
          width: 3px; height: 6px; border-radius: 2px;
          background: currentColor;
          animation: orbBar 0.9s ease-in-out infinite;
        }
        .orb-wave i:nth-child(2) { animation-delay: 0.15s; }
        .orb-wave i:nth-child(3) { animation-delay: 0.3s; }
        @keyframes orbBar {
          0%, 100% { height: 6px; opacity: 0.7; }
          50% { height: 17px; opacity: 1; }
        }
        @keyframes orbRing {
          0%, 100% { box-shadow: 0 0 0 5px rgba(18, 56, 50, 0.12); }
          50% { box-shadow: 0 0 0 9px rgba(18, 56, 50, 0.07); }
        }
      `}</style>
    </>
  );
}
