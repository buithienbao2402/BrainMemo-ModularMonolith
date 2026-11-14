import { Compass, Home, LayoutDashboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/shared/hooks';
import { cn } from '@/shared/lib/utils';

interface NavTabItem {
  to: string;
  label: string;
  end?: boolean;
  icon: typeof Home;
}

export function SubNav() {
  const { t } = useTranslation();
  const { status, user } = useAuth();

  const items: NavTabItem[] = [
    { to: '/', label: t('nav.home'), end: true, icon: Home },
    { to: '/courses', label: t('nav.explore'), end: true, icon: Compass },
  ];

  if (status === 'authenticated' && user) {
    items.push({
      to: '/learning-dashboard',
      label: t('nav.learningDashboard'),
      icon: LayoutDashboard,
    });
  }

  return (
    <nav
      aria-label="Điều hướng chính"
      className="border-b border-[#e5e7eb] bg-[#f9fafb] dark:border-[#1e1e26] dark:bg-[#131319]"
    >
      <div className="mx-auto flex max-w-[1280px] items-center gap-2 overflow-x-auto px-4 py-2.5 sm:px-6">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'border-[rgba(255,122,26,0.3)] bg-[rgba(255,122,26,0.15)] font-semibold text-brand-orange'
                    : 'border-transparent text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                )
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
