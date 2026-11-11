import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ApiProblemError } from '@/shared/api/errors';
import { cn } from '@/shared/lib/utils';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  error?: unknown;
  onRetry?: () => void;
  retryDisabled?: boolean;
  className?: string;
}

export function ErrorState({
  title,
  error,
  onRetry,
  retryDisabled = false,
  className,
}: ErrorStateProps) {
  const { t } = useTranslation();

  const message =
    error instanceof ApiProblemError
      ? error.title
      : error instanceof Error && error.message
        ? error.message
        : t('states.errorFallback');

  const detail = error instanceof ApiProblemError ? error.detail : undefined;

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-destructive/40 bg-destructive/5 px-6 py-10 text-center',
        className
      )}
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/15 text-destructive">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title ?? t('states.errorTitle')}</h3>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{message}</p>
      {detail ? <p className="mt-1 max-w-md text-xs text-muted-foreground/80">{detail}</p> : null}
      {onRetry ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-5"
          disabled={retryDisabled}
          onClick={onRetry}
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {t('states.retry')}
        </Button>
      ) : null}
    </div>
  );
}
