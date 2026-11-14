import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/hooks';
import logoDark from '@/assets/brand/logo-dark.png';
import logoLight from '@/assets/brand/logo-light.png';
import { TemporaryLockedView } from './locked/TemporaryLockedView';
import { PermanentLockedView } from './locked/PermanentLockedView';

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

      {/* Bottom Footer Area matching Figma */}
      <footer className="w-full border-t border-border/40 px-6 py-5 text-xs text-muted-foreground sm:px-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
          <p>
            <span className="font-bold text-foreground">BrainMemo</span> • Khám phá tri thức, mở
            mang tầm mắt
          </p>
          <p>© 2026 BrainMemo LMS. Tất cả các quyền được bảo lưu.</p>
        </div>
      </footer>
    </div>
  );
}
