import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiClient,
  queryKeys,
  unwrapApi,
  type AuthTokens,
  type components,
  type CurrentUser,
} from '@/shared/api';

export type CredentialsRequest = components['schemas']['CredentialsRequest'];
export type SessionDto = components['schemas']['SessionDto'];

/**
 * Register a new user account (FR-IDN-01).
 * Returns 201 on success, 409 EMAIL_TAKEN on duplicate email.
 */
export function useRegisterMutation() {
  return useMutation({
    mutationFn: async (body: CredentialsRequest) => {
      return unwrapApi(apiClient.POST('/auth/register', { body }));
    },
  });
}

/**
 * Verify email address with SHA-256 token (FR-IDN-02).
 * Returns 204 on success, 400 TOKEN_INVALID_OR_EXPIRED on invalid token.
 */
export function useVerifyEmailMutation() {
  return useMutation({
    mutationFn: async (body: { token: string }) => {
      return unwrapApi(apiClient.POST('/auth/verify-email', { body }));
    },
  });
}

/**
 * Login with email and password (FR-IDN-03).
 * Returns 200 with AuthTokens and sets refresh cookie.
 */
export function useLoginMutation() {
  return useMutation({
    mutationFn: async (body: CredentialsRequest): Promise<AuthTokens> => {
      return unwrapApi(apiClient.POST('/auth/login', { body }));
    },
  });
}

/**
 * Login with Google ID token (FR-IDN-06).
 */
export function useGoogleLoginMutation() {
  return useMutation({
    mutationFn: async (body: { idToken: string }): Promise<AuthTokens> => {
      return unwrapApi(apiClient.POST('/auth/google', { body }));
    },
  });
}

/**
 * Request password reset link (FR-IDN-07).
 * Always returns 204 to protect user privacy.
 */
export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: async (body: { email: string }) => {
      return unwrapApi(apiClient.POST('/auth/forgot-password', { body }));
    },
  });
}

/**
 * Reset password using token sent via email.
 */
export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: async (body: { token: string; newPassword: string }) => {
      return unwrapApi(apiClient.POST('/auth/reset-password', { body }));
    },
  });
}

/**
 * Change account password (FR-IDN-08).
 * Revokes other user sessions upon success.
 */
export function useChangePasswordMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { currentPassword: string; newPassword: string }) => {
      return unwrapApi(apiClient.POST('/auth/change-password', { body }));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.sessions() });
    },
  });
}

/**
 * Fetch current authenticated user info (GET /auth/me).
 */
export function useCurrentUserQuery(enabled = true) {
  return useQuery<CurrentUser>({
    queryKey: queryKeys.auth.me(),
    queryFn: async () => {
      return unwrapApi(apiClient.GET('/auth/me'));
    },
    enabled,
    staleTime: 60_000,
  });
}

/**
 * List active login sessions for current user (FR-IDN-09).
 */
export function useSessionsQuery(enabled = true) {
  return useQuery<SessionDto[]>({
    queryKey: queryKeys.auth.sessions(),
    queryFn: async () => {
      const data = await unwrapApi(apiClient.GET('/auth/sessions'));
      return data ?? [];
    },
    enabled,
    staleTime: 30_000,
  });
}

/**
 * Revoke a specific active session (DELETE /auth/sessions/{id}).
 */
export function useRevokeSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      return unwrapApi(
        apiClient.DELETE('/auth/sessions/{id}', {
          params: { path: { id: sessionId } },
        })
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.sessions() });
    },
  });
}

/**
 * Logout from all devices and sessions (FR-IDN-10).
 */
export function useLogoutAllMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return unwrapApi(apiClient.POST('/auth/logout-all'));
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.auth.all });
    },
  });
}
