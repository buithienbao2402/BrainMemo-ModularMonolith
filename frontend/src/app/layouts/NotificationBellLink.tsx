import { NotificationDropdown } from '@/features/notification';

export function NotificationBellLink({
  unreadCount,
  className,
}: {
  unreadCount: number;
  className?: string;
}) {
  return <NotificationDropdown unreadCount={unreadCount} className={className} />;
}

