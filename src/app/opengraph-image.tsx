import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Cheap.ky — Compare Grocery Prices in Cayman Islands";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0d4f52 0%, #1a7a7e 40%, #237e82 60%, #1a6a6d 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle pattern overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.06,
            background: "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Logo icon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 96,
            height: 96,
            borderRadius: 22,
            background: "rgba(255,255,255,0.15)",
            marginBottom: 32,
            backdropFilter: "blur(10px)",
          }}
        >
          <svg
            width="64"
            height="64"
            viewBox="0 0 32 32"
          >
            <rect width="32" height="32" rx="7" fill="white" />
            <text
              x="3.5"
              y="25"
              fontFamily="system-ui,-apple-system,sans-serif"
              fontWeight="800"
              fontSize="26"
              fill="#1a7a7e"
              letterSpacing="-1"
            >
              C
            </text>
            <circle cx="25" cy="21.5" r="3.5" fill="#c89b2f" />
          </svg>
        </div>

        {/* Brand name */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            fontSize: 72,
            fontWeight: 800,
            letterSpacing: "-2px",
            lineHeight: 1,
          }}
        >
          <span style={{ color: "white" }}>Cheap</span>
          <span style={{ color: "#c89b2f", fontSize: 80, lineHeight: 1 }}>.</span>
          <span style={{ color: "white" }}>ky</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: "rgba(255,255,255,0.85)",
            marginTop: 16,
            letterSpacing: "-0.3px",
          }}
        >
          Don&apos;t just shop — be Cheap.ky
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 20,
            color: "rgba(255,255,255,0.55)",
            marginTop: 12,
          }}
        >
          Compare grocery prices across Cayman Islands stores
        </div>

        {/* Store badges */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 40,
          }}
        >
          {["Foster's", "Hurley's", "Cost-U-Less", "Priced Right", "Shopright"].map(
            (store) => (
              <div
                key={store}
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.8)",
                  fontSize: 16,
                  fontWeight: 600,
                }}
              >
                {store}
              </div>
            )
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
