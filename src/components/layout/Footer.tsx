import Link from "next/link";

export function Footer() {
  return (
    <footer style={{ padding: "56px 0 34px" }}>
      <div className="wrap">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr repeat(3, 1fr)",
            gap: 32,
            paddingBottom: 40,
            borderBottom: "1px solid var(--line)",
          }}
          className="foot-grid"
        >
          <div>
            <Link
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                fontFamily: "var(--font-fraunces), Fraunces, serif",
                fontWeight: 700,
                fontSize: "1.35rem",
                textDecoration: "none",
                color: "var(--ink)",
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "var(--deep)",
                  position: "relative",
                  flex: "none",
                  display: "inline-block",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    inset: 6,
                    borderRadius: "50%",
                    background: "var(--amber)",
                  }}
                />
              </span>
              PetTails
            </Link>
            <p
              style={{
                color: "var(--ink-soft)",
                fontSize: "0.92rem",
                marginTop: 12,
                maxWidth: "32ch",
              }}
            >
              On-demand veterinary care for pet owners, and flexible work for
              licensed vets.
            </p>
          </div>

          <div>
            <h4 style={{ fontSize: "0.85rem", marginBottom: 14 }}>
              Pet owners
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 9 }}>
              <li>
                <Link href="/#hail" style={{ textDecoration: "none", color: "var(--ink-soft)", fontSize: "0.92rem" }}>
                  Hail a vet
                </Link>
              </li>
              <li>
                <Link href="/#vets" style={{ textDecoration: "none", color: "var(--ink-soft)", fontSize: "0.92rem" }}>
                  Browse vets
                </Link>
              </li>
              <li>
                <Link href="/#services" style={{ textDecoration: "none", color: "var(--ink-soft)", fontSize: "0.92rem" }}>
                  Services
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: "0.85rem", marginBottom: 14 }}>Vets</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 9 }}>
              <li>
                <Link href="/#partner" style={{ textDecoration: "none", color: "var(--ink-soft)", fontSize: "0.92rem" }}>
                  Join the network
                </Link>
              </li>
              <li>
                <span style={{ color: "var(--ink-soft)", fontSize: "0.92rem" }}>
                  Earnings
                </span>
              </li>
              <li>
                <span style={{ color: "var(--ink-soft)", fontSize: "0.92rem" }}>
                  Requirements
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: "0.85rem", marginBottom: 14 }}>Company</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 9 }}>
              <li>
                <span style={{ color: "var(--ink-soft)", fontSize: "0.92rem" }}>
                  About
                </span>
              </li>
              <li>
                <span style={{ color: "var(--ink-soft)", fontSize: "0.92rem" }}>
                  Support
                </span>
              </li>
              <li>
                <span style={{ color: "var(--ink-soft)", fontSize: "0.92rem" }}>
                  Trust &amp; safety
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 24,
            fontSize: "0.84rem",
            color: "var(--ink-soft)",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <span>© 2026 PetTails. All rights reserved.</span>
          <span>Made for pet owners who can&apos;t always wait.</span>
        </div>

        <div
          style={{
            textAlign: "center",
            paddingTop: 22,
            marginTop: 22,
            borderTop: "1px solid var(--line)",
          }}
        >
          <div
            style={{
              fontSize: "0.78rem",
              color: "var(--ink-soft)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Built by
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "10px 22px",
            }}
          >
            {["Uday", "Vanshika", "Vikas", "Shreya", "Izaan"].map(
              (name, i) => (
                <span
                  key={name}
                  className="shine-name"
                  style={{ animationDelay: `${i * 0.3}s` }}
                >
                  {name}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 760px) {
          .foot-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </footer>
  );
}
