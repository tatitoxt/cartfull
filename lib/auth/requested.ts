/** Remembers, in the browser that asked for a sign-in link, which address it asked for. */
export const REQUESTED_COOKIE = "cartfull_signin";

/** Holds an emailed link while the person confirms the account, so the token never sits in a page address. */
export const PENDING_COOKIE = "cartfull_pending_link";

export function normalizeEmail(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}
