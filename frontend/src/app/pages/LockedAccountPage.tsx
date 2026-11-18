import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/hooks';
import logoDark from '@/assets/brand/logo-dark.png';
import logoLight from '@/assets/brand/logo-light.png';
import { TemporaryLockedView } from './locked/TemporaryLockedView';
import { PermanentLockedView } from './locked/PermanentLockedView';
import { SiteFooter } from '@/app/layouts/SiteFooter';

export function LockedAccountPage() {
  const { lockedAccount, clearLockedAccount, logout, user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryType = searchParams.get('type');

  // Is permanent if explicitly set or if lockedAccount exists without lockedUntil
  const isPermanent =
    queryType === 'perm'
      ? true
      : queryType === 'temp'
        ? false
        : !lockedAccount?.lockedUntil;

  const handleLogout = async () => {
    clearLockedAccount();
    try {
      await logout();
    } catch {
      // Ignore network errors on logout to ensure clean redirect
    }
    navigate('/login');
  };

  const accountCode =
    (user as any)?.accountCode ||
    (user?.id ? `BM-${user.id.slice(-6).toUpperCase()}` : undefined);
  const userName = profile?.displayName || (user as any)?.name || user?.email;

  return (
    <div className="flex min-h-screen flex-col justify-between bg-background text-foreground selection:bg-primary/20">
      {/* Top Header & Logo Area (No site navigation header) */}
      <header className="flex w-full flex-col items-center px-4 pt-10 text-center sm:pt-14">
        {/* BrainMemo Brand Logo (Non-clickable, matching Figma) */}
        <div
          className="mb-6 flex cursor-default select-none items-center justify-center"
          aria-label="BrainMemo"
        >
          <img
            src={logoLight}
            alt="BrainMemo"
            className="block h-10 w-auto select-none object-contain dark:hidden sm:h-11"
          />
          <img
            src={logoDark}
            alt="BrainMemo"
            className="hidden h-10 w-auto select-none object-contain dark:block sm:h-11"
          />
        </div>

        {/* Page Title */}
        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Trung tâm thông báo hạn chế truy cập
        </h1>
      </header>

      {/* Main Content Area: Centered Card */}
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-[480px]">
          {isPermanent ? (
            <PermanentLockedView
              data={lockedAccount}
              accountCode={accountCode}
              userName={userName}
              onLogout={handleLogout}
            />
          ) : (
            <TemporaryLockedView
              data={lockedAccount}
              accountCode={accountCode}
              userName={userName}
              onLogout={handleLogout}
            />
          )}
        </div>
      </main>

      {/* Shared Site Footer */}
      <SiteFooter />
    </div>
  );
}
