import { QueryClient } from '@tanstack/react-query';
import { ApiProblemError } from '@/shared/api';

export function createAppQueryClient(options?: { disableRetry?: boolean }): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (options?.disableRetry) {
            return false;
          }
          if (error instanceof ApiProblemError && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < 1;
        },
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

