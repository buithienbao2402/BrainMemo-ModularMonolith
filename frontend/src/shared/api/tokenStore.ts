type TokenListener = (token: string | null) => void;

/**
 * In-memory store for the short-lived JWT access token.
 * Per FRONTEND_SPEC §3 and AGENT.md §5.3, access tokens MUST NEVER be
 * persisted in localStorage, sessionStorage, or non-HttpOnly cookies.
 */
let currentAccessToken: string | null = null;
const listeners = new Set<TokenListener>();

export function getAccessToken(): string | null {
  return currentAccessToken;
}

export function setAccessToken(token: string | null): void {
  const normalized = token && token.trim().length > 0 ? token : null;
  if (currentAccessToken === normalized) {
    return;
  }
  currentAccessToken = normalized;
  for (const listener of listeners) {
    listener(currentAccessToken);
  }
}

export function clearAccessToken(): void {
  setAccessToken(null);
}

export function subscribeAccessToken(listener: TokenListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

