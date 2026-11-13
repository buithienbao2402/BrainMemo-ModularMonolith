import * as React from 'react';

export type ToastTone = 'default' | 'success' | 'warning' | 'error';

export interface ToastInput {
  id?: string;
  title: string;
  description?: string;
  tone?: ToastTone;
  durationMs?: number;
  actionLabel?: string;
  onAction?: () => void;
}

export interface ToastItem extends Required<Pick<ToastInput, 'id' | 'title' | 'tone'>> {
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export interface ToastContextValue {
  toasts: ToastItem[];
  pushToast: (input: ToastInput) => string;
  dismissToast: (id: string) => void;
}

export const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
