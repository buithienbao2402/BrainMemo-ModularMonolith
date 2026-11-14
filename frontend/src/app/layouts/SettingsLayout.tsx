import { useLocation, NavLink, Outlet } from 'react-router-dom';
import { ChevronRight, KeyRound, Laptop, Palette, Shield, User } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

const SETTINGS_NAV = [
  { to: '/settings/profile', label: 'Hồ sơ cá nhân', breadcrumb: 'HỒ SƠ CÁ NHÂN', icon: User },
  { to: '/settings/security', label: 'Bảo mật', breadcrumb: 'CÀI ĐẶT BẢO MẬT', icon: KeyRound },
  { to: '/settings/sessions', label: 'Phiên đăng nhập', breadcrumb: 'PHIÊN ĐĂNG NHẬP', icon: Laptop },
  { to: '/settings/privacy', label: 'Quyền riêng tư', breadcrumb: 'QUYỀN RIÊNG TƯ', icon: Shield },
  { to: '/settings/appearance', label: 'Giao diện', breadcrumb: 'GIAO DIỆN', icon: Palette },
];

export function SettingsLayout() {
  const location = useLocation();

  const currentItem =
    SETTINGS_NAV.find((item) => location.pathname.startsWith(item.to)) || SETTINGS_NAV[0];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Top Breadcrumb & Heading Section */}
        <div className="space-y-2">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            <span>TÀI KHOẢN</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
            <span className="text-foreground">{currentItem?.breadcrumb || 'HỒ SƠ CÁ NHÂN'}</span>
          </div>

          {/* Heading with Orange Bar Accent */}
          <div className="flex items-center gap-3 pt-1">
            <div className="h-7 w-1 rounded-full bg-primary" aria-hidden="true" />
            <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              CÀI ĐẶT TÀI KHOẢN
            </h1>
          </div>
        </div>

        {/* 12-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Vertical Sidebar (3 cols) */}
          <aside className="lg:col-span-3 rounded-2xl border border-border bg-card p-2.5 flex flex-col gap-1 shadow-sm">
            {SETTINGS_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition-all',
                      isActive
                        ? 'bg-primary/10 font-semibold text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      {isActive && (
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </aside>

          {/* Right Main Content Area (9 cols) */}
          <main className="lg:col-span-9 rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
