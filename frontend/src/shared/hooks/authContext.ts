import * as React from 'react';
import type { AuthTokens, CurrentUser, ProfileDto } from '@/shared/api';

export type AuthStatus = 'booting' | 'authenticated' | 'guest';

export interface LockedAccountDetails {
  title: string;
  lockReason?: string | null;
  lockedUntil?: string | null;
}

export interface AuthContextValue {
  status: AuthStatus;
  user: CurrentUser | null;
  profile: ProfileDto | null;
  unreadCount: number;
  lockedAccount: LockedAccountDetails | null;
  sessionExpiredVersion: number;
  setAuthenticatedSession: (tokens: AuthTokens) => Promise<void>;
  refreshAuthSession: () => Promise<boolean>;
  logout: () => Promise<void>;
  clearLockedAccount: () => void;
}

export const AuthContext = React.createContext<AuthContextValue | null>(null);

export const UNREAD_POLL_INTERVAL_MS = 30_000;

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
