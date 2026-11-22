import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

const clamp = (value: string | null, max: number) => {
  const number = Math.round(Number(value));
  return Number.isFinite(number) ? Math.min(max, Math.max(0, number)) : 0;
};

/** A square image of a savings total, built only from the numbers in the URL. */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const saved = clamp(params.get("saved"), 99999);
  const weeks = clamp(params.get("weeks"), 520) || 1;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#1F4D39",
          color: "#FAF7F2",
          padding: 88,
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 40, color: "#95D5B2", fontFamily: "sans-serif", letterSpacing: 4 }}>
          SAVED ON GROCERIES
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 300, fontWeight: 700, lineHeight: 1, color: "#E9C46A" }}>
            ${saved.toLocaleString("en-US")}
          </div>
          <div style={{ display: "flex", fontSize: 56, marginTop: 24, fontFamily: "sans-serif" }}>
            in {weeks} {weeks === 1 ? "week" : "weeks"} of planned dinners
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontFamily: "sans-serif" }}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700 }}>Cartfull</div>
          <div style={{ display: "flex", fontSize: 32, color: "#95D5B2" }}>Tell us your budget. We plan the week.</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1080, headers: { "cache-control": "public, max-age=86400" } },
  );
}
