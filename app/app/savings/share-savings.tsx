"use client";

import { useState } from "react";
import { track } from "@/components/analytics";
import { moneyRound } from "@/lib/format";

/** Shares the savings card image where the device supports it, otherwise copies a link to it. */
export function ShareSavings({ savedCents, weeks }: { savedCents: number; weeks: number }) {
  const [note, setNote] = useState<string | null>(null);
  const path = `/api/savings-card?saved=${Math.round(savedCents / 100)}&weeks=${weeks}`;
  const text = `I've saved ${moneyRound(savedCents)} on groceries in ${weeks} ${weeks === 1 ? "week" : "weeks"} planning with Cartfull.`;

  const share = async () => {
    track("savings_shared");
    const url = new URL(path, window.location.origin).toString();
    try {
      const blob = await (await fetch(path)).blob();
      const file = new File([blob], "cartfull-savings.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
        return;
      }
      if (navigator.share) {
        await navigator.share({ text, url: window.location.origin });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setNote("Copied. Paste it anywhere.");
    } catch (error) {
      if ((error as Error).name !== "AbortError") setNote("Couldn't share from this browser. Use Download instead.");
    }
  };

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <button type="button" className="btn btn-cta" onClick={share} data-testid="share-savings">
        Share my savings
      </button>
      <a href={path} download="cartfull-savings.png" className="min-h-11 content-center px-2 text-sm font-semibold text-paper underline underline-offset-4">
        Download card
      </a>
      {note && (
        <span role="status" className="basis-full text-sm text-mint">
          {note}
        </span>
      )}
    </div>
  );
}
