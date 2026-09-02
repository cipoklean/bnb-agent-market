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
            "radial-gradient(1100px 560px at 82% -12%, rgba(240,185,11,0.14), transparent 60%), radial-gradient(820px 420px at -12% 22%, rgba(169,114,12,0.12), transparent 60%), #100D0A",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 4,
              background: "#F0B90B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#100D0A",
              fontSize: 26,
              fontWeight: 800,
            }}
          >
            ◆
          </div>
          <div
            style={{
              color: "#B5A98E",
              fontSize: 24,
            }}
          >
            BNB Agent Market · ERC-8004
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              color: "#EDE3CC",
              fontSize: 72,
              fontWeight: 600,
              lineHeight: 1.05,
              maxWidth: 940,
            }}
          >
            Hire agents you can{" "}
            <span style={{ color: "#F0B90B" }}>trust</span>. Stop them{" "}
            <span style={{ color: "#F0B90B" }}>anytime</span>.
          </div>
          <div style={{ color: "#B5A98E", fontSize: 28, maxWidth: 900 }}>
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
                  border: "1px solid rgba(169,114,12,0.6)",
                  background: "#241C15",
                  color: "#EDE3CC",
                  fontSize: 22,
                  padding: "10px 18px",
                  borderRadius: 3,
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
