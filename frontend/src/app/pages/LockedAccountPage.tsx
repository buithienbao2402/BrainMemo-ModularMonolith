import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '@/shared/hooks';
import { Button } from '@/shared/ui';

export function LockedAccountPage() {
  const { t } = useTranslation();
  const { lockedAccount, clearLockedAccount } = useAuth();

  const lockReason = lockedAccount?.lockReason || t('errors.lockedPage.description');
  const untilLabel = lockedAccount?.lockedUntil
    ? new Date(lockedAccount.lockedUntil).toLocaleString('vi-VN')
    : t('errors.lockedPage.permanent');

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 py-16">
      <section className="w-full rounded-2xl border border-destructive/40 bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/15 text-destructive dark:text-[#ffb4ab]">
          <Lock className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-foreground">
          {lockedAccount?.title || t('errors.lockedPage.title')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('errors.lockedPage.description')}</p>

        <dl className="mt-6 space-y-3 rounded-xl border border-border bg-secondary/50 p-4 text-left text-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
            <dt className="font-medium text-muted-foreground">
              {t('errors.lockedPage.reasonLabel')}
            </dt>
            <dd className="font-semibold text-foreground">{lockReason}</dd>
          </div>
          <div className="flex flex-col gap-1 border-t border-border pt-3 sm:flex-row sm:justify-between">
            <dt className="font-medium text-muted-foreground">
              {t('errors.lockedPage.untilLabel')}
            </dt>
            <dd className="font-semibold text-destructive dark:text-[#ffb4ab]">{untilLabel}</dd>
          </div>
        </dl>

        <div className="mt-6 flex justify-center">
          <Button asChild variant="outline" size="pill" onClick={clearLockedAccount}>
            <Link to="/">{t('states.backHome')}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
