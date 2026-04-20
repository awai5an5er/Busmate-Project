/** Tab-scoped JWT so each browser tab/window can hold a different role session. */
export const CLIENT_AUTH_TOKEN_KEY = "busmate_token";

export function getClientAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(CLIENT_AUTH_TOKEN_KEY);
}

export function setClientAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CLIENT_AUTH_TOKEN_KEY, token);
}

export function clearClientAuthToken(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(CLIENT_AUTH_TOKEN_KEY);
}
