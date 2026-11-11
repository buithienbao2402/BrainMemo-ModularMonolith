import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/shared/hooks';
import { Button, ErrorState, PageSkeleton } from '@/shared/ui';

export function RequireAdmin({ children }: { children?: React.ReactNode }) {
  const { t } = useTranslation();
  const { status, user, lockedAccount } = useAuth();
  const location = useLocation();

  if (status === 'booting') {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
        <PageSkeleton label={t('auth.checkingSession')} />
      </div>
    );
  }

  if (lockedAccount) {
    return <Navigate to="/locked" replace />;
  }

  if (status !== 'authenticated' || !user) {
    const nextTarget = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(nextTarget)}`} replace />;
  }

  if (!user.isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <ErrorState title={t('errors.forbidden')} error={new Error(t('errors.forbidden'))} />
        <div className="mt-4 flex justify-center">
          <Button asChild variant="outline">
            <Link to="/">{t('states.backHome')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
}
