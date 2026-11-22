import { ImageResponse } from "next/og";

export const alt = "Cartfull: a week of meals that fits your grocery budget";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#FAF7F2",
          color: "#1C1B1A",
          padding: 72,
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 44, fontWeight: 700 }}>
          <div style={{ display: "flex", width: 56, height: 56, borderRadius: 16, background: "#2D6A4F", marginRight: 18 }} />
          Cartfull
        </div>
        <div style={{ display: "flex", fontSize: 92, fontWeight: 700, lineHeight: 1.05, maxWidth: 980 }}>
          A week of dinners that fits your grocery budget.
        </div>
        <div style={{ display: "flex", fontSize: 34, color: "#B9442A", fontFamily: "sans-serif" }}>
          We plan the week, price the cart, and show what you saved.
        </div>
      </div>
    ),
    size,
  );
}
