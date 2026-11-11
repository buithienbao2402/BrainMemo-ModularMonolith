import createClient from 'openapi-fetch';
import {
  ApiProblemError,
  createNetworkError,
  isAccountLockedError,
  isRateLimitError,
  isServerOrNetworkError,
  parseProblemDetails,
  toApiProblemError,
} from './errors';
import type { components, paths } from './schema';
import { clearAccessToken, getAccessToken, setAccessToken } from './tokenStore';

export type AuthTokens = components['schemas']['AuthTokens'];
export type CurrentUser = components['schemas']['CurrentUser'];
export type ProfileDto = components['schemas']['ProfileDto'];

export const DEFAULT_API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '/api/v1';

export interface ApiClientCallbacks {
  onTokensRefreshed?: (tokens: AuthTokens) => void;
  onSessionExpired?: () => void;
  onAccountLocked?: (error: ApiProblemError) => void;
  onRateLimited?: (error: ApiProblemError) => void;
  onServerError?: (error: ApiProblemError) => void;
}

export interface CreateManagedApiClientOptions {
  baseUrl?: string;
  baseFetch?: (input: Request) => Promise<Response>;
  callbacks?: ApiClientCallbacks;
}

export interface ManagedApiClient {
  client: ReturnType<typeof createClient<paths>>;
  refreshSession: () => Promise<AuthTokens | null>;
  setCallbacks: (callbacks: ApiClientCallbacks) => void;
}

const NO_AUTO_REFRESH_SUFFIXES = [
  '/auth/refresh',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
];

function shouldAttemptAutoRefresh(url: string): boolean {
  let pathname = url;
  try {
    pathname = new URL(url, 'http://localhost').pathname;
  } catch {
    pathname = url;
  }
  return !NO_AUTO_REFRESH_SUFFIXES.some((suffix) => pathname.endsWith(suffix));
}

function resolveBaseUrl(configured: string): string {
  const trimmed = configured.trim() || '/api/v1';
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (
    typeof window !== 'undefined' &&
    typeof window.location?.origin === 'string' &&
    /^https?:\/\//i.test(window.location.origin)
  ) {
    const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${window.location.origin}${normalizedPath}`;
  }
  return trimmed;
}

function buildAbsoluteUrl(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

/**
 * Builds an openapi-fetch client wired with:
 * - credentials: 'include' for HttpOnly refresh token cookie
 * - in-memory Bearer injection
 * - single-flight POST /auth/refresh + single retry on 401
 * - centralized hooks for ACCOUNT_LOCKED (403), 429 cooldown, and 5xx/network errors
 */
export function createManagedApiClient(
  options: CreateManagedApiClientOptions = {}
): ManagedApiClient {
  const baseUrl = resolveBaseUrl(options.baseUrl ?? DEFAULT_API_BASE_URL);
  const rawFetch: (input: Request) => Promise<Response> =
    options.baseFetch ?? ((input) => globalThis.fetch(input));

  let callbacks: ApiClientCallbacks = options.callbacks ?? {};
  let refreshInFlight: Promise<AuthTokens | null> | null = null;

  async function executeRefresh(): Promise<AuthTokens | null> {
    if (refreshInFlight) {
      return refreshInFlight;
    }

    refreshInFlight = (async () => {
      const refreshUrl = buildAbsoluteUrl(baseUrl, '/auth/refresh');
      const refreshRequest = new Request(refreshUrl, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      });

      let response: Response;
      try {
        response = await rawFetch(refreshRequest);
      } catch (err) {
        const networkError = createNetworkError(err);
        callbacks.onServerError?.(networkError);
        throw networkError;
      }

      if (!response.ok) {
        clearAccessToken();
        if (response.status === 403) {
          const problem = await parseProblemDetails(response);
          if (isAccountLockedError(problem)) {
            callbacks.onAccountLocked?.(problem);
          }
        }
        return null;
      }

      const payload = (await response.json()) as AuthTokens;
      if (!payload.accessToken) {
        clearAccessToken();
        return null;
      }

      setAccessToken(payload.accessToken);
      callbacks.onTokensRefreshed?.(payload);
      return payload;
    })().finally(() => {
      refreshInFlight = null;
    });

    return refreshInFlight;
  }

  function applyAuthHeader(request: Request, token: string | null): Request {
    const headers = new Headers(request.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    } else {
      headers.delete('Authorization');
    }
    return new Request(request, {
      headers,
      credentials: 'include',
    });
  }

  async function dispatchFailureCallbacks(response: Response): Promise<void> {
    if (response.ok) {
      return;
    }
    const problem = await parseProblemDetails(response);
    if (isAccountLockedError(problem)) {
      callbacks.onAccountLocked?.(problem);
      return;
    }
    if (isRateLimitError(problem)) {
      callbacks.onRateLimited?.(problem);
      return;
    }
    if (isServerOrNetworkError(problem)) {
      callbacks.onServerError?.(problem);
    }
  }

  const managedFetch = async (input: Request): Promise<Response> => {
    const canRetry401 = shouldAttemptAutoRefresh(input.url);
    const retryBaseline = canRetry401 ? input.clone() : null;
    const firstRequest = applyAuthHeader(input, getAccessToken());

    let response: Response;
    try {
      response = await rawFetch(firstRequest);
    } catch (err) {
      const networkError = createNetworkError(err);
      callbacks.onServerError?.(networkError);
      throw networkError;
    }

    if (response.status === 401 && canRetry401 && retryBaseline) {
      try {
        const refreshed = await executeRefresh();
        if (refreshed?.accessToken) {
          const retriedRequest = applyAuthHeader(retryBaseline, refreshed.accessToken);
          const retryResponse = await rawFetch(retriedRequest);
          if (retryResponse.status === 401) {
            clearAccessToken();
            callbacks.onSessionExpired?.();
            return retryResponse;
          }
          await dispatchFailureCallbacks(retryResponse);
          return retryResponse;
        }
        clearAccessToken();
        callbacks.onSessionExpired?.();
        return response;
      } catch (err) {
        if (err instanceof ApiProblemError && err.isNetworkError) {
          throw err;
        }
        clearAccessToken();
        callbacks.onSessionExpired?.();
        return response;
      }
    }

    if (response.status !== 401) {
      await dispatchFailureCallbacks(response);
    }
    return response;
  };

  const client = createClient<paths>({
    baseUrl,
    credentials: 'include',
    fetch: managedFetch,
  });

  return {
    client,
    refreshSession: executeRefresh,
    setCallbacks: (nextCallbacks) => {
      callbacks = nextCallbacks;
    },
  };
}

const defaultManagedClient = createManagedApiClient();

export const apiClient = defaultManagedClient.client;
export const refreshSession = defaultManagedClient.refreshSession;
export const setApiClientCallbacks = defaultManagedClient.setCallbacks;

export interface OpenApiFetchResult<TData> {
  data?: TData;
  error?: unknown;
  response: Response;
}

/**
 * Unwraps an openapi-fetch result for TanStack Query hooks, throwing normalized ApiProblemError
 * when HTTP status is non-2xx or network transport rejects.
 */
export async function unwrapApi<TData>(
  requestPromise: Promise<OpenApiFetchResult<TData>>
): Promise<TData> {
  let result: OpenApiFetchResult<TData>;
  try {
    result = await requestPromise;
  } catch (err) {
    throw toApiProblemError(err);
  }

  if (result.error !== undefined || !result.response.ok) {
    throw await parseProblemDetails(result.response, result.error);
  }

  return result.data as TData;
}
