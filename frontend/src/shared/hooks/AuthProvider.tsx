import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  apiClient,
  ApiProblemError,
  clearAccessToken,
  queryKeys,
  refreshSession,
  setAccessToken,
  setApiClientCallbacks,
  unwrapApi,
  type AuthTokens,
  type CurrentUser,
  type ProfileDto,
} from '@/shared/api';
import { useToast } from '@/shared/ui';
import {
  AuthContext,
  UNREAD_POLL_INTERVAL_MS,
  type AuthContextValue,
  type AuthStatus,
  type LockedAccountDetails,
} from './authContext';
import { useRateLimit } from './rateLimitContext';
import { useTheme } from './themeContext';

function isPageVisible(): boolean {
  if (typeof document === 'undefined') {
    return true;
  }
  return document.visibilityState === 'visible';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const { triggerCooldown } = useRateLimit();
  const { syncProfileTheme } = useTheme();

  const [status, setStatus] = React.useState<AuthStatus>('booting');
  const [user, setUser] = React.useState<CurrentUser | null>(null);
  const [profile, setProfile] = React.useState<ProfileDto | null>(null);
  const [lockedAccount, setLockedAccount] = React.useState<LockedAccountDetails | null>(null);
  const [sessionExpiredVersion, setSessionExpiredVersion] = React.useState(0);
  const [tabVisible, setTabVisible] = React.useState<boolean>(() => isPageVisible());

  React.useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const handleVisibility = () => {
      const visible = isPageVisible();
      setTabVisible(visible);
      if (visible && status === 'authenticated') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [queryClient, status]);

  const loadAuthenticatedIdentity = React.useCallback(
    async (tokens: AuthTokens) => {
      if (tokens.accessToken) {
        setAccessToken(tokens.accessToken);
      }

      let resolvedUser = tokens.user ?? null;
      if (!resolvedUser) {
        try {
          resolvedUser = await unwrapApi(apiClient.GET('/auth/me'));
        } catch (err) {
          if (
            err instanceof ApiProblemError &&
            err.status === 403 &&
            err.code === 'ACCOUNT_LOCKED'
          ) {
            clearAccessToken();
            setUser(null);
            setProfile(null);
            setStatus('guest');
            setLockedAccount({
              title: err.title,
              lockReason: err.lockReason ?? err.detail,
              lockedUntil: err.lockedUntil,
            });
            return;
          }
          clearAccessToken();
          setUser(null);
          setProfile(null);
          setStatus('guest');
          return;
        }
      }

      if (resolvedUser.accountStatus === 'LOCKED') {
        clearAccessToken();
        setUser(null);
        setProfile(null);
        setStatus('guest');
        setLockedAccount({
          title: t('errors.lockedPage.title'),
        });
        return;
      }

      setLockedAccount(null);
      setUser(resolvedUser);
      setStatus('authenticated');

      try {
        const myProfile = await unwrapApi(apiClient.GET('/profiles/me'));
        queryClient.setQueryData(queryKeys.profile.me(), myProfile);
        setProfile(myProfile);
        syncProfileTheme(myProfile.uiTheme);
      } catch {
        // Profile endpoint is optional during shell bootstrap
      }
    },
    [syncProfileTheme, t]
  );

  React.useEffect(() => {
    setApiClientCallbacks({
      onTokensRefreshed: (tokens) => {
        if (tokens.user) {
          setUser(tokens.user);
          setStatus('authenticated');
        }
      },
      onSessionExpired: () => {
        clearAccessToken();
        setUser(null);
        setProfile(null);
        setStatus('guest');
        setSessionExpiredVersion((v) => v + 1);
      },
      onAccountLocked: (error) => {
        clearAccessToken();
        setUser(null);
        setProfile(null);
        setStatus('guest');
        setLockedAccount({
          title: error.title,
          lockReason: error.lockReason ?? error.detail,
          lockedUntil: error.lockedUntil,
        });
      },
      onRateLimited: (error) => {
        triggerCooldown(10_000);
        pushToast({
          id: 'rate-limit',
          title: error.title || t('errors.rateLimited'),
          description: t('errors.rateLimited'),
          tone: 'warning',
          durationMs: 10_000,
        });
      },
      onServerError: (error) => {
        pushToast({
          id: 'server-error',
          title: t('errors.genericRetry'),
          description: error.title,
          tone: 'error',
          actionLabel: t('states.retry'),
          onAction: () => {
            void queryClient.invalidateQueries();
          },
        });
      },
    });
    return () => {
      setApiClientCallbacks({});
    };
  }, [pushToast, queryClient, t, triggerCooldown]);

  React.useEffect(() => {
    let cancelled = false;

    async function bootSession() {
      try {
        const tokens = await refreshSession();
        if (cancelled) {
          return;
        }
        if (tokens?.accessToken) {
          await loadAuthenticatedIdentity(tokens);
        } else {
          clearAccessToken();
          setUser(null);
          setProfile(null);
          setStatus('guest');
        }
      } catch {
        if (!cancelled) {
          clearAccessToken();
          setUser(null);
          setProfile(null);
          setStatus('guest');
        }
      }
    }

    void bootSession();
    return () => {
      cancelled = true;
    };
  }, [loadAuthenticatedIdentity]);

  const profileQuery = useQuery({
    queryKey: queryKeys.profile.me(),
    queryFn: () => unwrapApi(apiClient.GET('/profiles/me')),
    enabled: status === 'authenticated',
    staleTime: 60_000,
    initialData: profile ?? undefined,
  });

  const effectiveProfile = profileQuery.data ?? profile;

  React.useEffect(() => {
    if (profileQuery.data?.uiTheme) {
      syncProfileTheme(profileQuery.data.uiTheme);
    }
  }, [profileQuery.data?.uiTheme, syncProfileTheme]);

  const unreadQuery = useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => unwrapApi(apiClient.GET('/notifications/unread-count')),
    enabled: status === 'authenticated',
    refetchInterval: status === 'authenticated' && tabVisible ? UNREAD_POLL_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
    staleTime: UNREAD_POLL_INTERVAL_MS,
  });

  const setAuthenticatedSession = React.useCallback(
    async (tokens: AuthTokens) => {
      await loadAuthenticatedIdentity(tokens);
      await queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
    },
    [loadAuthenticatedIdentity, queryClient]
  );

  const refreshAuthSession = React.useCallback(async (): Promise<boolean> => {
    try {
      const tokens = await refreshSession();
      if (!tokens?.accessToken) {
        clearAccessToken();
        setUser(null);
        setProfile(null);
        setStatus('guest');
        return false;
      }
      await loadAuthenticatedIdentity(tokens);
      return true;
    } catch {
      return false;
    }
  }, [loadAuthenticatedIdentity]);

  const logout = React.useCallback(async () => {
    try {
      await apiClient.POST('/auth/logout');
    } catch {
      // Clear local memory session regardless of server/network response
    } finally {
      clearAccessToken();
      setUser(null);
      setProfile(null);
      setStatus('guest');
      queryClient.removeQueries({ queryKey: queryKeys.notifications.all });
      queryClient.removeQueries({ queryKey: queryKeys.auth.all });
      queryClient.removeQueries({ queryKey: queryKeys.profile.all });
    }
  }, [queryClient]);

  const clearLockedAccount = React.useCallback(() => {
    setLockedAccount(null);
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      profile: effectiveProfile,
      unreadCount: unreadQuery.data?.count ?? 0,
      lockedAccount,
      sessionExpiredVersion,
      setAuthenticatedSession,
      refreshAuthSession,
      logout,
      clearLockedAccount,
    }),
    [
      clearLockedAccount,
      effectiveProfile,
      lockedAccount,
      logout,
      refreshAuthSession,
      sessionExpiredVersion,
      setAuthenticatedSession,
      status,
      unreadQuery.data?.count,
      user,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
