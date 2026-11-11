import { MailWarning } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/utils';

export function VerifyEmailBanner({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200',
        className
      )}
    >
      <MailWarning
        className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
        aria-hidden="true"
      />
      <p className="leading-relaxed">{t('auth.verifyEmailBanner')}</p>
    </div>
  );
}
