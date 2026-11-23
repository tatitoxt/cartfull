"use client";

import { useEffect, useState, useTransition } from "react";
import { useMessages } from "@/lib/i18n/locale-provider";
import { fill } from "@/lib/i18n/messages";
import { setFavorite, setRating } from "@/lib/app/actions";

/** Every heart for the same slug on a page shares one broadcast, so they flip together. */
const FAV_EVENT = "cartfull:favorite";

function useFavorite(slug: string, initial: boolean): [boolean, (next: boolean) => void] {
  const [favorite, setFav] = useState(initial);
  useEffect(() => setFav(initial), [initial, slug]);
  useEffect(() => {
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<{ slug: string; favorite: boolean }>).detail;
      if (detail?.slug === slug) setFav(detail.favorite);
    };
    window.addEventListener(FAV_EVENT, sync);
    return () => window.removeEventListener(FAV_EVENT, sync);
  }, [slug]);
  return [
    favorite,
    (next: boolean) => {
      setFav(next);
      window.dispatchEvent(new CustomEvent(FAV_EVENT, { detail: { slug, favorite: next } }));
    },
  ];
}

export function RecipeFeedback({ slug, initialFavorite, initialRating }: {
  slug: string;
  initialFavorite: boolean;
  initialRating: number | null;
}) {
  const m = useMessages();
  const [favorite, setFav] = useFavorite(slug, initialFavorite);
  const [rating, setRate] = useState(initialRating);
  const [pending, start] = useTransition();

  useEffect(() => setRate(initialRating), [initialRating, slug]);

  const toggleFav = () => {
    const next = !favorite;
    setFav(next);
    start(async () => {
      const result = await setFavorite(slug, next);
      if (!result.ok) setFav(!next);
    });
  };

  const rate = (value: number | null) => {
    const previous = rating;
    setRate(value);
    start(async () => {
      const result = await setRating(slug, value);
      if (!result.ok) setRate(previous);
    });
  };

  const keys = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = Math.min(5, Math.max(1, (rating ?? (delta > 0 ? 0 : 6)) + delta));
    rate(next);
    event.currentTarget.querySelector<HTMLElement>(`[data-testid="rate-${next}"]`)?.focus();
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
      <button
        type="button"
        onClick={toggleFav}
        disabled={pending}
        aria-pressed={favorite}
        data-testid="favorite-toggle"
        className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${
          favorite ? "bg-accent-soft text-accent-deep" : "bg-line text-fg"
        }`}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill={favorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M19.5 12.6 12 20l-7.5-7.4a5 5 0 1 1 7.5-6.6 5 5 0 1 1 7.5 6.6z" strokeLinejoin="round" />
        </svg>
        {favorite ? m.recipe.favorited : m.recipe.favorite}
      </button>
      <div className="flex items-center gap-1" role="radiogroup" aria-label={m.recipe.rating} onKeyDown={keys}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={fill(m.recipe.stars, { count: value })}
            tabIndex={rating === value || (rating === null && value === 1) ? 0 : -1}
            onClick={() => rate(value === rating ? null : value)}
            data-testid={`rate-${value}`}
            className={`grid size-11 place-items-center text-2xl transition-colors ${rating !== null && value <= rating ? "text-spend" : "text-fg-faint"}`}
          >
            ★
          </button>
        ))}
      </div>
      <p className="w-full text-xs text-fg-faint">{m.recipe.rateHint}</p>
    </div>
  );
}

/** Compact heart used on plan cards. */
export function FavoriteToggle({ slug, initial }: { slug: string; initial: boolean }) {
  const m = useMessages();
  const [favorite, setFav] = useFavorite(slug, initial);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={favorite}
      title={favorite ? m.recipe.favorited : m.recipe.favorite}
      aria-label={favorite ? m.recipe.favorited : m.recipe.favorite}
      data-testid={`fav-${slug}`}
      onClick={() => {
        const next = !favorite;
        setFav(next);
        start(async () => {
          const result = await setFavorite(slug, next);
          if (!result.ok) setFav(!next);
        });
      }}
      className={`grid size-11 shrink-0 place-items-center rounded-full transition-colors ${favorite ? "text-accent-deep" : "text-fg-faint hover:text-fg"}`}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill={favorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M19.5 12.6 12 20l-7.5-7.4a5 5 0 1 1 7.5-6.6 5 5 0 1 1 7.5 6.6z" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
