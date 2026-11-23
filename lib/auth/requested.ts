/** Remembers, in the browser that asked for a sign-in link, which address it asked for. */
export const REQUESTED_COOKIE = "cartfull_signin";

export function normalizeEmail(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}
