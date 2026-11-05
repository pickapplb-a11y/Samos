import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "VANTA — Don't just wear it. Create it.";

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0B0B0B", color: "#fff", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: 8, display: "flex" }}>VANTA<span style={{ color: "#FF6B00" }}>.</span></div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, fontWeight: 900, lineHeight: 0.95, textTransform: "uppercase", display: "flex", flexDirection: "column" }}>
            <span>Don&apos;t just wear it.</span>
            <span style={{ color: "#FF6B00" }}>Create it.</span>
          </div>
          <div style={{ fontSize: 30, color: "#A3A3A3", marginTop: 28 }}>Premium hoodies you design in real-time 3D.</div>
        </div>
      </div>
    ),
    size,
  );
}
