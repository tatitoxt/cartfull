"use client";

import { useState, useTransition } from "react";
import { useMessages } from "@/lib/i18n/locale-provider";
import { setFavorite, setRating } from "@/lib/app/actions";

export function RecipeFeedback({ slug, initialFavorite, initialRating }: {
  slug: string;
  initialFavorite: boolean;
  initialRating: number | null;
}) {
  const m = useMessages();
  const [favorite, setFav] = useState(initialFavorite);
  const [rating, setRate] = useState(initialRating);
  const [pending, start] = useTransition();

  const toggleFav = () => {
    const next = !favorite;
    setFav(next);
    start(async () => {
      const result = await setFavorite(slug, next);
      if (!result.ok) setFav(!next);
    });
  };

  const rate = (value: number) => {
    const next = value === rating ? null : value;
    setRate(next);
    start(async () => {
      const result = await setRating(slug, next);
      if (!result.ok) setRate(rating);
    });
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
      <div className="flex items-center gap-1" role="radiogroup" aria-label={m.recipe.rating}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            disabled={pending}
            onClick={() => rate(value)}
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
  const [favorite, setFav] = useState(initial);
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
