import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Cheap.ky — Shop Smart, Shop Cheap";
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
          background: "linear-gradient(135deg, #0d4f52 0%, #1a7a7e 50%, #1a6a6d 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo: white rounded square with C and gold dot */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 88,
            height: 88,
            borderRadius: 20,
            background: "white",
            marginBottom: 28,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span style={{ fontSize: 58, fontWeight: 800, color: "#1a7a7e", lineHeight: 1 }}>C</span>
            <span style={{ fontSize: 48, fontWeight: 800, color: "#c89b2f", lineHeight: 1, marginLeft: -2 }}>.</span>
          </div>
        </div>

        {/* Brand name */}
        <div style={{ display: "flex", alignItems: "baseline", fontSize: 68, fontWeight: 800, lineHeight: 1 }}>
          <span style={{ color: "white" }}>Cheap</span>
          <span style={{ color: "#c89b2f", fontSize: 76 }}>.</span>
          <span style={{ color: "white" }}>ky</span>
        </div>

        {/* Tagline */}
        <div style={{ fontSize: 28, fontWeight: 600, color: "rgba(255,255,255,0.9)", marginTop: 16 }}>
          Shop Smart, Shop Cheap
        </div>

        {/* Description */}
        <div style={{ fontSize: 20, color: "rgba(255,255,255,0.6)", marginTop: 10 }}>
          Save up to 75% across 35k Cayman grocery products
        </div>

        {/* Store badges */}
        <div style={{ display: "flex", gap: 10, marginTop: 36 }}>
          {["Foster's", "Hurley's", "Cost-U-Less"].map((store) => (
            <div
              key={store}
              style={{
                padding: "8px 18px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.85)",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {store}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
