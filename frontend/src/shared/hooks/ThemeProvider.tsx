import * as React from 'react';
import { apiClient, getAccessToken } from '@/shared/api';
import {
  ThemeContext,
  type ResolvedTheme,
  type ThemeContextValue,
  type ThemePreference,
} from './themeContext';

const THEME_STORAGE_KEY = 'bm_theme';

function getStoredPreference(): ThemePreference | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // Non-blocking localStorage access
  }
  return null;
}

function persistPreference(next: ThemePreference): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Non-blocking localStorage access
  }
}

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
  const [preference, setPreferenceState] = React.useState<ThemePreference>(
    () => getStoredPreference() ?? initialPreference
  );
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
    persistPreference(next);
  }, []);

  const syncProfileTheme = React.useCallback((uiTheme?: 'LIGHT' | 'DARK' | null) => {
    if (uiTheme === 'DARK') {
      setPreferenceState('dark');
      persistPreference('dark');
    } else if (uiTheme === 'LIGHT') {
      setPreferenceState('light');
      persistPreference('light');
    }
  }, []);

  const toggleTheme = React.useCallback(() => {
    const next: ResolvedTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setPreferenceState(next);
    persistPreference(next);

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
