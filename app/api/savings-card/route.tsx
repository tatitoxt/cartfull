import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { MESSAGES, fill } from "@/lib/i18n/messages";

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
  const lang = params.get("lang") === "es" ? "es" : "en";
  const numberLocale = lang === "es" ? "es-ES" : "en-US";
  const m = MESSAGES[lang];
  const cardWeeks = fill(m.savings.cardWeeks, { count: weeks.toLocaleString(numberLocale), unit: weeks === 1 ? m.savings.week : m.savings.weeks });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0b0d",
          color: "#f3f4f6",
          padding: 88,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 40, color: "#a8e24b", fontFamily: "sans-serif", letterSpacing: 4 }}>
          {m.savings.cardTitle}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 300, fontWeight: 700, lineHeight: 1, color: "#a8e24b" }}>
            ${saved.toLocaleString(numberLocale)}
          </div>
          <div style={{ display: "flex", fontSize: 56, marginTop: 24, fontFamily: "sans-serif" }}>
            {cardWeeks}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontFamily: "sans-serif" }}>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700 }}>Cartfull</div>
          <div style={{ display: "flex", fontSize: 32, color: "#7d8289" }}>{m.savings.cardTagline}</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1080, headers: { "cache-control": "public, max-age=86400" } },
  );
}
