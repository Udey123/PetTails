import Link from "next/link";

export function Footer() {
  return (
    <footer style={{ background: "var(--deep-2)", color: "#D8E1DA", padding: "60px 0 34px" }}>
      <div className="wrap">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr repeat(3, 1fr)",
            gap: 32,
            paddingBottom: 40,
            borderBottom: "1px solid rgba(255, 255, 255, 0.13)",
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
                color: "#F5F2E7",
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "#F5F2E7",
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
                color: "#A9BCB0",
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
            <h4 style={{ fontSize: "0.85rem", marginBottom: 14, color: "var(--amber)" }}>
              Pet owners
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 9 }}>
              <li>
                <Link href="/#hail" style={{ textDecoration: "none", color: "#C3D0C7", fontSize: "0.92rem" }}>
                  Hail a vet
                </Link>
              </li>
              <li>
                <Link href="/#vets" style={{ textDecoration: "none", color: "#C3D0C7", fontSize: "0.92rem" }}>
                  Browse vets
                </Link>
              </li>
              <li>
                <Link href="/#services" style={{ textDecoration: "none", color: "#C3D0C7", fontSize: "0.92rem" }}>
                  Services
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: "0.85rem", marginBottom: 14, color: "var(--amber)" }}>Vets</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 9 }}>
              <li>
                <Link href="/#partner" style={{ textDecoration: "none", color: "#C3D0C7", fontSize: "0.92rem" }}>
                  Join the network
                </Link>
              </li>
              <li>
                <span style={{ color: "#C3D0C7", fontSize: "0.92rem" }}>
                  Earnings
                </span>
              </li>
              <li>
                <span style={{ color: "#C3D0C7", fontSize: "0.92rem" }}>
                  Requirements
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 style={{ fontSize: "0.85rem", marginBottom: 14, color: "var(--amber)" }}>Company</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 9 }}>
              <li>
                <span style={{ color: "#C3D0C7", fontSize: "0.92rem" }}>
                  About
                </span>
              </li>
              <li>
                <span style={{ color: "#C3D0C7", fontSize: "0.92rem" }}>
                  Support
                </span>
              </li>
              <li>
                <span style={{ color: "#C3D0C7", fontSize: "0.92rem" }}>
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
            color: "#8CA095",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <span>© 2026 PetTails. All rights reserved.</span>
          <span>Made for pet owners who can&apos;t always wait.</span>
        </div>
      </div>

      <style>{`
        .foot-grid a:hover { color: #FFFFFF !important; }
        @media (max-width: 760px) {
          .foot-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </footer>
  );
}
