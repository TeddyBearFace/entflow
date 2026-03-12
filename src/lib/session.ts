import { cookies } from "next/headers";

const COOKIE_NAME = "entflow_portal";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Set the active portal session cookie.
 * Call this after OAuth callback.
 */
export function setSession(portalId: string) {
  cookies().set(COOKIE_NAME, portalId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

/**
 * Get the active portal ID from the session cookie.
 * Returns null if not logged in.
 */
export function getSession(): string | null {
  return cookies().get(COOKIE_NAME)?.value || null;
}

/**
 * Clear the session cookie (logout).
 */
export function clearSession() {
  cookies().set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

/**
 * Get portalId from query param or session cookie.
 * Query param takes priority (for portal switching).
 */
export function getPortalId(searchParams: { portal?: string }): string | null {
  return searchParams.portal || getSession();
}
