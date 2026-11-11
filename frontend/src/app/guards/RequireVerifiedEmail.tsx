import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/shared/hooks';
import { VerifyEmailBanner } from './VerifyEmailBanner';
import { VerifyEmailBannerShownContext } from './verifyBannerContext';

export interface RequireVerifiedEmailProps {
  children?: React.ReactNode;
  blockUnverified?: boolean;
}

export function RequireVerifiedEmail({
  children,
  blockUnverified = false,
}: RequireVerifiedEmailProps) {
  const { status, user } = useAuth();
  const alreadyShownInLayout = React.useContext(VerifyEmailBannerShownContext);
  const isUnverified = status === 'authenticated' && user !== null && !user.emailVerified;

  if (isUnverified && blockUnverified) {
    return alreadyShownInLayout ? null : (
      <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
        <VerifyEmailBanner />
      </div>
    );
  }

  return (
    <>
      {isUnverified && !alreadyShownInLayout ? (
        <div className="mx-auto max-w-[1280px] px-4 pt-6 sm:px-6">
          <VerifyEmailBanner />
        </div>
      ) : null}
      {children ? <>{children}</> : <Outlet />}
    </>
  );
}
