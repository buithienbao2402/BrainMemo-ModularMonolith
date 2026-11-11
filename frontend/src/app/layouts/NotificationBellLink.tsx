import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';

export function NotificationBellLink({
  unreadCount,
  className,
}: {
  unreadCount: number;
  className?: string;
}) {
  const { t } = useTranslation();
  const label =
    unreadCount > 0
      ? t('notifications.unreadCount', { count: unreadCount })
      : t('notifications.label');
  const displayBadge = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <Button asChild variant="ghost" size="icon" className={cn('relative', className)}>
      <Link to="/notifications" aria-label={label} title={label}>
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-orange px-1 text-[10px] font-bold leading-none text-white ring-2 ring-background"
          >
            {displayBadge}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
