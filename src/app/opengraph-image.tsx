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
          background: "#0e5255",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", fontSize: 160, fontWeight: 900, lineHeight: 1 }}>
          <span style={{ color: "white" }}>Cheap</span>
          <span style={{ color: "#d4a832", fontSize: 170 }}>.</span>
          <span style={{ color: "white" }}>ky</span>
        </div>
        <div style={{ fontSize: 56, fontWeight: 700, color: "white", marginTop: 28 }}>
          Shop Smart, Shop Cheap
        </div>
      </div>
    ),
    { ...size }
  );
}
