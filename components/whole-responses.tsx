"use client";

declare global {
  interface Window {
    __wholeResponses?: boolean;
  }
}

/**
 * Hands the router each server-rendered update only once all of it has arrived.
 *
 * Next 15.5 starts applying an update while it is still streaming. When the last
 * rows land a few milliseconds after React begins rendering, React waits on them
 * and is never woken, so the screen keeps the old data until the next navigation
 * (a swapped meal stayed on the plan in most local runs). With the whole update
 * in hand there is nothing left to wait for.
 */
if (typeof window !== "undefined" && !window.__wholeResponses) {
  window.__wholeResponses = true;
  const send = window.fetch;
  window.fetch = async (input, init) => {
    const response = await send(input, init);
    if (!response.body || !response.headers.get("content-type")?.startsWith("text/x-component")) return response;
    const whole = new Response(await response.arrayBuffer(), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    Object.defineProperties(whole, {
      url: { value: response.url },
      redirected: { value: response.redirected },
      type: { value: response.type },
    });
    return whole;
  };
}

export function WholeResponses() {
  return null;
}
