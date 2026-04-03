import { createGuestSessionResponseSchema, type CreateGuestSessionResponse } from "@site-de-jogos/shared";

const GUEST_SESSION_KEY = "site-de-jogos.guest-session";

export function loadGuestSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(GUEST_SESSION_KEY);
  if (!raw) {
    return null;
  }

  const parsed = createGuestSessionResponseSchema.safeParse(JSON.parse(raw));
  return parsed.success ? parsed.data : null;
}

export function saveGuestSession(session: CreateGuestSessionResponse) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(session));
}

export function clearGuestSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(GUEST_SESSION_KEY);
}
