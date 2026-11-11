import * as React from 'react';

export interface RateLimitContextValue {
  isRateLimited: boolean;
  triggerCooldown: (durationMs?: number) => void;
}

export const RateLimitContext = React.createContext<RateLimitContextValue | null>(null);

export function useRateLimit(): RateLimitContextValue {
  const ctx = React.useContext(RateLimitContext);
  if (!ctx) {
    throw new Error('useRateLimit must be used within RateLimitProvider');
  }
  return ctx;
}

