import * as React from 'react';
import { RateLimitContext, type RateLimitContextValue } from './rateLimitContext';

const DEFAULT_COOLDOWN_MS = 10_000;

export function RateLimitProvider({ children }: { children: React.ReactNode }) {
  const [isRateLimited, setIsRateLimited] = React.useState(false);
  const timerRef = React.useRef<number | null>(null);

  const triggerCooldown = React.useCallback((durationMs = DEFAULT_COOLDOWN_MS) => {
    setIsRateLimited(true);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setIsRateLimited(false);
    }, durationMs);
  }, []);

  React.useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const value = React.useMemo<RateLimitContextValue>(
    () => ({ isRateLimited, triggerCooldown }),
    [isRateLimited, triggerCooldown]
  );

  return <RateLimitContext.Provider value={value}>{children}</RateLimitContext.Provider>;
}
