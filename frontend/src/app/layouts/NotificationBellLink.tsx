import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { NotificationDropdown } from '@/features/notification';

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

  return (
    <>
      <Link to="/notifications" className="sr-only" aria-label={label}>
        {label}
      </Link>
      <NotificationDropdown unreadCount={unreadCount} className={className} />
    </>
  );
}
