import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

export interface PageSkeletonProps {
  lines?: number;
  label?: string;
}

export function PageSkeleton({ lines = 3, label }: PageSkeletonProps) {
  const { t } = useTranslation();
  const statusLabel = label ?? t('states.loading');

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={statusLabel}
      className="space-y-4 rounded-xl border border-border bg-card p-6"
    >
      <Skeleton className="h-6 w-48" />
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, idx) => (
          <Skeleton key={idx} className={idx === lines - 1 ? 'h-4 w-2/3' : 'h-4 w-full'} />
        ))}
      </div>
      <span className="sr-only">{statusLabel}</span>
    </div>
  );
}
