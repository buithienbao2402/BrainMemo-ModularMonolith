import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChangePasswordCard, SessionListCard } from '../components';

export function SecuritySettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-orange/15 text-brand-orange">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t('auth.securityTitle')}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('auth.securitySubtitle')}</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="space-y-8">
        <ChangePasswordCard />
        <SessionListCard />
      </div>
    </div>
  );
}
