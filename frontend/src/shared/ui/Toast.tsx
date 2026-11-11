import { X } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/shared/lib/utils';
import { Button } from './Button';
import {
  ToastContext,
  useToast,
  type ToastContextValue,
  type ToastInput,
  type ToastItem,
  type ToastTone,
} from './toastContext';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const timersRef = React.useRef<Map<string, number>>(new Map());
  const counterRef = React.useRef(0);

  const dismissToast = React.useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushToast = React.useCallback((input: ToastInput): string => {
    counterRef.current += 1;
    const id = input.id ?? `toast-${counterRef.current}`;
    const durationMs = input.durationMs ?? 5000;

    const existingTimer = timersRef.current.get(id);
    if (existingTimer !== undefined) {
      window.clearTimeout(existingTimer);
    }

    const item: ToastItem = {
      id,
      title: input.title,
      description: input.description,
      tone: input.tone ?? 'default',
      actionLabel: input.actionLabel,
      onAction: input.onAction,
    };

    setToasts((prev) => [...prev.filter((t) => t.id !== id), item].slice(-5));

    if (durationMs > 0) {
      const timer = window.setTimeout(() => {
        timersRef.current.delete(id);
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, durationMs);
      timersRef.current.set(id, timer);
    }

    return id;
  }, []);

  React.useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) {
        window.clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const value = React.useMemo<ToastContextValue>(
    () => ({ toasts, pushToast, dismissToast }),
    [toasts, pushToast, dismissToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster />
    </ToastContext.Provider>
  );
}

const TONE_STYLES: Record<ToastTone, string> = {
  default: 'border-border bg-card text-card-foreground',
  success: 'border-emerald-500/40 bg-card text-card-foreground',
  warning: 'border-amber-500/50 bg-card text-card-foreground',
  error: 'border-destructive/50 bg-card text-card-foreground',
};

export function Toaster() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      aria-label="Thông báo hệ thống"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.tone === 'error' ? 'alert' : 'status'}
          className={cn(
            'pointer-events-auto flex items-start justify-between gap-3 rounded-xl border p-4 shadow-lg',
            TONE_STYLES[toast.tone]
          )}
        >
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold leading-snug">{toast.title}</p>
            {toast.description ? (
              <p className="text-xs text-muted-foreground">{toast.description}</p>
            ) : null}
            {toast.actionLabel && toast.onAction ? (
              <div className="pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    toast.onAction?.();
                    dismissToast(toast.id);
                  }}
                >
                  {toast.actionLabel}
                </Button>
              </div>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={() => dismissToast(toast.id)}
            className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
