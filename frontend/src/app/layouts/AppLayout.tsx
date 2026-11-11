import { Outlet } from 'react-router-dom';
import { VerifyEmailBanner, VerifyEmailBannerShownContext } from '@/app/guards';
import { useAuth } from '@/shared/hooks';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';
import { SubNav } from './SubNav';

export function AppLayout() {
  const { user } = useAuth();
  const showBanner = Boolean(user && !user.emailVerified);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <SubNav />
      <main id="main-content" className="flex-1">
        {showBanner ? (
          <div className="mx-auto max-w-[1280px] px-4 pt-6 sm:px-6">
            <VerifyEmailBanner />
          </div>
        ) : null}
        <VerifyEmailBannerShownContext.Provider value={showBanner}>
          <Outlet />
        </VerifyEmailBannerShownContext.Provider>
      </main>
      <SiteFooter />
    </div>
  );
}
