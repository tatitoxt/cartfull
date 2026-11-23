import "server-only";

/** Sends one event to PostHog from the server. Never throws; analytics must not break a request. */
export async function captureServer(
  event: string,
  distinctId: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com").replace(/\/$/, "");
  try {
    await fetch(`${host}/i/v0/e/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ api_key: key, event, distinct_id: distinctId, properties }),
      signal: AbortSignal.timeout(2500),
    });
  } catch {
    // ignore
  }
}
