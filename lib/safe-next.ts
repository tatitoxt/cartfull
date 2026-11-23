const SITE = "https://cartfull.invalid";

/** Only same-site paths may be used as a post-login destination. */
export function safeNext(value: string | null | undefined, fallback = "/app"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  // Browsers drop tabs and newlines and read "\" as "/", which can turn a path into "//host".
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  try {
    const url = new URL(value, SITE);
    if (url.origin !== SITE) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
