/* eslint-disable @next/next/no-img-element */

const WIDTHS = [240, 400, 640, 960, 1280];

function src(photoUrl: string, width: number, ratio: number) {
  const params = new URLSearchParams({
    auto: "format",
    fit: "crop",
    q: "68",
    w: String(width),
    h: String(Math.round(width / ratio)),
  });
  return `${photoUrl}?${params}`;
}

/**
 * Recipe photo served straight from the Unsplash CDN at the size the slot needs.
 * `ratio` is width / height.
 */
export function Photo({
  url,
  alt,
  ratio = 4 / 3,
  sizes,
  priority = false,
  className = "",
}: {
  url: string;
  alt: string;
  ratio?: number;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <img
      src={src(url, 640, ratio)}
      srcSet={WIDTHS.map((w) => `${src(url, w, ratio)} ${w}w`).join(", ")}
      sizes={sizes}
      alt={alt}
      width={640}
      height={Math.round(640 / ratio)}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={`bg-bg-deep object-cover ${className}`}
      style={{ aspectRatio: String(ratio) }}
    />
  );
}
