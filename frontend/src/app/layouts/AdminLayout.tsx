import {
  ArrowLeft,
  BookOpen,
  Bot,
  FileWarning,
  Flag,
  LayoutDashboard,
  Menu,
  ScrollText,
  Settings,
  Users,
  X,
} from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet } from 'react-router-dom';
import brainMemoIcon from '@/assets/brand/brain-memo-icon.png';
import { useAuth } from '@/shared/hooks';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import { NotificationBellLink } from './NotificationBellLink';
import { ThemeToggleButton } from './ThemeToggleButton';

interface AdminNavItem {
  to: string;
  labelKey: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { to: '/admin', labelKey: 'admin.nav.overview', icon: LayoutDashboard, end: true },
  { to: '/admin/moderation', labelKey: 'admin.nav.moderation', icon: FileWarning },
  { to: '/admin/reports', labelKey: 'admin.nav.reports', icon: Flag },
  { to: '/admin/users', labelKey: 'admin.nav.users', icon: Users },
  { to: '/admin/courses', labelKey: 'admin.nav.courses', icon: BookOpen },
  { to: '/admin/ai-settings', labelKey: 'admin.nav.aiSettings', icon: Bot },
  { to: '/admin/audit-logs', labelKey: 'admin.nav.auditLogs', icon: ScrollText },
  { to: '/admin/settings', labelKey: 'admin.nav.systemSettings', icon: Settings },
];

function AdminSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col bg-card dark:bg-[#1b1b21]">
      <div className="flex h-16 items-center justify-between border-b border-border px-5">
        <Link
          to="/admin"
          onClick={onNavigate}
          className="inline-flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg">
            <img
              src={brainMemoIcon}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
          </span>
          <span className="font-serif text-base font-bold text-foreground">{t('brand.name')}</span>
        </Link>
        <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-accent-foreground">
          {t('admin.badge')}
        </span>
      </div>

      <nav aria-label="Điều hướng quản trị" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {ADMIN_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'border-l-brand-orange bg-accent text-accent-foreground dark:bg-[#2a2930] dark:text-[#ffdbca]'
                    : 'border-l-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{t(item.labelKey)}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <Button asChild variant="outline" className="w-full justify-start">
          <Link to="/" onClick={onNavigate}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>{t('admin.backToApp')}</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const { t } = useTranslation();
  const { user, profile, unreadCount } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const adminName = profile?.displayName?.trim() || user?.email || t('admin.roleSubtitle');

  React.useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden lg:block lg:w-[288px] lg:shrink-0 lg:border-r lg:border-border">
        <AdminSidebarContent />
      </aside>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            aria-hidden="true"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside
            id="admin-mobile-nav"
            aria-label="Menu quản trị"
            className="relative z-10 flex w-[288px] max-w-[85vw] flex-col border-r border-border shadow-xl"
          >
            <button
              type="button"
              aria-label="Đóng menu quản trị"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute right-3 top-4 z-20 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            <AdminSidebarContent onNavigate={() => setMobileMenuOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-white/95 px-4 backdrop-blur-md dark:bg-[#0e0e12]/95 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Mở menu quản trị"
              aria-expanded={mobileMenuOpen}
              aria-controls="admin-mobile-nav"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
            <span className="text-sm font-semibold text-foreground">
              {t('auth.profileMenu.adminPanel')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBellLink unreadCount={unreadCount} />
            <ThemeToggleButton />
            <div className="hidden items-center gap-2 rounded-full border border-border bg-secondary/70 px-3 py-1.5 text-xs font-medium sm:flex">
              <span className="h-2 w-2 rounded-full bg-brand-orange" aria-hidden="true" />
              <span className="max-w-[160px] truncate">{adminName}</span>
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
