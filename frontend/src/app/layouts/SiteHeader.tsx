import {
  Bookmark,
  BookOpen,
  ChevronDown,
  LogOut,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/hooks';
import { cn } from '@/shared/lib/utils';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui';
import { BrandLogo } from './BrandLogo';
import { NotificationBellLink } from './NotificationBellLink';
import { ThemeToggleButton } from './ThemeToggleButton';

function getInitials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'BM';
  }
  const first = parts[0] ?? 'B';
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? '') : '';
  return `${first[0] ?? 'B'}${last[0] ?? ''}`.toUpperCase();
}

function SearchCourseForm({
  initialQuery,
  className,
}: {
  initialQuery: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = React.useState(initialQuery);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/courses?q=${encodeURIComponent(trimmed)}` : '/courses');
  };

  return (
    <form
      role="search"
      aria-label={t('nav.searchSubmit')}
      onSubmit={handleSubmit}
      className={cn('relative w-full', className)}
    >
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('nav.searchPlaceholder')}
        aria-label={t('nav.searchPlaceholder')}
        className="h-10 w-full rounded-full border border-input bg-secondary/70 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-[#17171f]"
      />
    </form>
  );
}

export function SiteHeader() {
  const { t } = useTranslation();
  const { status, user, profile, unreadCount, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') ?? '';

  const displayName = profile?.displayName?.trim() || user?.email || t('brand.name');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#e5e7eb] bg-white/95 backdrop-blur-md dark:border-[#262630] dark:bg-[#0e0e12]/95">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-3 sm:gap-6 sm:px-6">
        <BrandLogo to="/" />

        <div className="hidden max-w-[576px] flex-1 md:flex">
          <SearchCourseForm key={`desktop-${searchQuery}`} initialQuery={searchQuery} />
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          {status === 'authenticated' && user ? (
            <>
              <Button
                asChild
                size="pill"
                className="h-9 px-3 text-xs font-bold uppercase tracking-wide sm:px-4"
              >
                <Link to="/courses/new" aria-label={t('nav.createCourse')}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{t('nav.createCourse')}</span>
                </Link>
              </Button>

              <ThemeToggleButton />

              <NotificationBellLink unreadCount={unreadCount} />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 gap-2 rounded-full border border-border/80 px-2 sm:pr-3"
                    aria-label={displayName}
                  >
                    {profile?.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt=""
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-orange/15 text-xs font-bold text-brand-orange">
                        {getInitials(displayName)}
                      </span>
                    )}
                    <span className="hidden max-w-[132px] truncate text-sm font-medium lg:inline">
                      {displayName}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="truncate font-semibold text-foreground">
                    {displayName}
                  </DropdownMenuLabel>
                  {user.email ? (
                    <p className="truncate px-3 pb-1.5 text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate('/settings/profile')}>
                    <UserIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span>Hồ sơ cá nhân</span>
                  </DropdownMenuItem>
                  {user.id ? (
                    <DropdownMenuItem onSelect={() => navigate(`/users/${user.id}`)}>
                      <UserIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <span>{t('auth.profileMenu.publicProfile')}</span>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem onSelect={() => navigate('/me/courses')}>
                    <BookOpen className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span>{t('auth.profileMenu.myCourses')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate('/me/bookmarks')}>
                    <Bookmark className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span>{t('auth.profileMenu.bookmarks')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate('/settings/security')}>
                    <Settings className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span>{t('auth.profileMenu.settings')}</span>
                  </DropdownMenuItem>
                  {user.isAdmin ? (
                    <DropdownMenuItem onSelect={() => navigate('/admin')}>
                      <ShieldCheck className="h-4 w-4 text-brand-orange" aria-hidden="true" />
                      <span>{t('auth.profileMenu.adminPanel')}</span>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      void handleLogout();
                    }}
                    className="text-destructive focus:text-destructive dark:text-[#ffb4ab] dark:focus:text-[#ffb4ab]"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    <span>{t('auth.logout')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <ThemeToggleButton />
              <Button
                asChild
                variant="outline"
                size="pill"
                className="px-3.5 text-xs sm:px-4 sm:text-sm"
              >
                <Link to="/login">{t('auth.login')}</Link>
              </Button>
              <Button
                asChild
                variant="primary"
                size="pill"
                className="px-3.5 text-xs sm:px-4 sm:text-sm"
              >
                <Link to="/register">{t('auth.register')}</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="border-t border-border/60 px-4 py-2 md:hidden">
        <SearchCourseForm key={`mobile-${searchQuery}`} initialQuery={searchQuery} />
      </div>
    </header>
  );
}
