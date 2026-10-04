import { ImageResponse } from "next/og";

export const alt = "NEURAL // 00 — Artificial Intelligence Visualized";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Generated share card: the core as concentric orbits, the wordmark set large. */
export default function OpengraphImage() {
  const rings = [140, 200, 270, 350];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#030406",
          color: "#e8ecf1",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 780,
            top: 315,
            width: 2,
            height: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 520,
              height: 520,
              borderRadius: 9999,
              background: "radial-gradient(circle, rgba(77,124,255,0.28), rgba(3,4,6,0) 65%)",
            }}
          />
          {rings.map((r, i) => (
            <div
              key={r}
              style={{
                position: "absolute",
                width: r * 2,
                height: r * 2,
                borderRadius: 9999,
                border: `1px solid ${i % 2 ? "rgba(155,140,255,0.35)" : "rgba(127,227,255,0.35)"}`,
              }}
            />
          ))}
          <div style={{ position: "absolute", width: 22, height: 22, borderRadius: 9999, background: "#e8ecf1", boxShadow: "0 0 60px #7fe3ff" }} />
        </div>
        <div style={{ position: "absolute", left: 72, top: 64, display: "flex", flexDirection: "column", fontSize: 18, letterSpacing: 6, opacity: 0.6 }}>
          <span>ARTIFICIAL INTELLIGENCE</span>
          <span>VISUALIZED</span>
        </div>
        <div style={{ position: "absolute", left: 66, bottom: 56, fontSize: 120, fontWeight: 200, letterSpacing: 4, display: "flex" }}>
          NEURAL <span style={{ opacity: 0.3, margin: "0 28px" }}>{"//"}</span> 00
        </div>
      </div>
    ),
    size,
  );
}
