import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import {
  AuthProvider,
  RateLimitProvider,
  ThemeProvider,
  type ThemePreference,
} from '@/shared/hooks';
import { ToastProvider } from '@/shared/ui';
import { createAppQueryClient } from './queryClient';

export interface AppProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
  initialTheme?: ThemePreference;
}

export function AppProviders({
  children,
  queryClient,
  initialTheme = 'system',
}: AppProvidersProps) {
  const [defaultClient] = React.useState(() => createAppQueryClient());
  const resolvedClient = queryClient ?? defaultClient;

  return (
    <QueryClientProvider client={resolvedClient}>
      <ThemeProvider initialPreference={initialTheme}>
        <ToastProvider>
          <RateLimitProvider>
            <AuthProvider>{children}</AuthProvider>
          </RateLimitProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
