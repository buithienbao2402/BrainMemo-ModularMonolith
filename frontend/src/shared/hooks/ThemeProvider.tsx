import * as React from 'react';
import { apiClient, getAccessToken } from '@/shared/api';
import {
  ThemeContext,
  type ResolvedTheme,
  type ThemeContextValue,
  type ThemePreference,
} from './themeContext';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyDocumentTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

export function ThemeProvider({
  children,
  initialPreference = 'system',
}: {
  children: React.ReactNode;
  initialPreference?: ThemePreference;
}) {
  const [preference, setPreferenceState] = React.useState<ThemePreference>(initialPreference);
  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>(() => getSystemTheme());

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }
    return undefined;
  }, []);

  const resolvedTheme: ResolvedTheme = preference === 'system' ? systemTheme : preference;

  React.useEffect(() => {
    applyDocumentTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setPreference = React.useCallback((next: ThemePreference) => {
    setPreferenceState(next);
  }, []);

  const syncProfileTheme = React.useCallback((uiTheme?: 'LIGHT' | 'DARK' | null) => {
    if (uiTheme === 'DARK') {
      setPreferenceState('dark');
    } else if (uiTheme === 'LIGHT') {
      setPreferenceState('light');
    }
  }, []);

  const toggleTheme = React.useCallback(() => {
    const next: ResolvedTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setPreferenceState(next);

    if (getAccessToken()) {
      void apiClient
        .PUT('/profiles/me', {
          body: { uiTheme: next === 'dark' ? 'DARK' : 'LIGHT' },
        })
        .catch(() => {
          // Non-blocking UI preference persistence
        });
    }
  }, [resolvedTheme]);

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolvedTheme,
      setPreference,
      toggleTheme,
      syncProfileTheme,
    }),
    [preference, resolvedTheme, setPreference, toggleTheme, syncProfileTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
