// Generated Open Graph image (1200x630) — bold gold-on-dark card so links
// shared with judges/reviewers render an intentional preview instead of a bare
// URL. Rendered by Next at the edge via next/og.
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "BNB Agent Market — Hire agents you can trust. Stop them anytime.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(1200px 600px at 85% -10%, rgba(240,185,11,0.18), transparent 60%), radial-gradient(900px 500px at -10% 20%, rgba(108,140,255,0.16), transparent 60%), #0B0E14",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#F0B90B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0B0E14",
              fontSize: 26,
              fontWeight: 800,
            }}
          >
            ◆
          </div>
          <div
            style={{
              color: "#98A2B3",
              fontSize: 26,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            BNB Agent Market · ERC-8004
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              color: "#F5F7FA",
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              maxWidth: 940,
            }}
          >
            Hire agents you can{" "}
            <span style={{ color: "#F0B90B" }}>trust</span>. Stop them{" "}
            <span style={{ color: "#F0B90B" }}>anytime</span>.
          </div>
          <div style={{ color: "#98A2B3", fontSize: 30, maxWidth: 900 }}>
            Discover · hire · pay · monitor · revoke AI agents on BNB Smart Chain
            — spend-capped sessions with memory-verified confirmation.
          </div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {["ERC-8004 identity", "x402 payments", "Revocable sessions", "Memory hash"].map(
            (t) => (
              <div
                key={t}
                style={{
                  border: "1px solid #263043",
                  background: "#121826",
                  color: "#F5F7FA",
                  fontSize: 24,
                  padding: "10px 20px",
                  borderRadius: 999,
                }}
              >
                {t}
              </div>
            )
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
