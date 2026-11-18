import { Bell, CheckCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Skeleton,
} from '@/shared/ui';
import {
  useDeleteNotificationMutation,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from '../api/notificationApi';
import { NotificationItem } from './NotificationItem';

interface NotificationDropdownProps {
  unreadCount: number;
  className?: string;
}

export function NotificationDropdown({
  unreadCount,
  className,
}: NotificationDropdownProps) {
  const { t } = useTranslation();
  const label =
    unreadCount > 0
      ? t('notifications.unreadCount', { count: unreadCount })
      : t('notifications.label');
  const displayBadge = unreadCount > 99 ? '99+' : String(unreadCount);

  const { data, isLoading } = useNotificationsQuery({ page: 1, pageSize: 5 });
  const { mutate: markRead } = useMarkNotificationReadMutation();
  const { mutate: markAllRead } = useMarkAllNotificationsReadMutation();
  const { mutate: deleteNotification } = useDeleteNotificationMutation();

  const items = data?.items || [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative', className)}
          aria-label={label}
          title={label}
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unreadCount > 0 ? (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-orange px-1 text-[10px] font-bold leading-none text-white ring-2 ring-background"
            >
              {displayBadge}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[360px] p-2 space-y-2 max-w-[90vw]"
      >
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0 font-semibold text-sm">
            Thông báo ({unreadCount})
          </DropdownMenuLabel>
          {unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllRead()}
              className="h-7 px-2 text-xs text-primary hover:text-primary flex items-center gap-1"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Đã đọc hết</span>
            </Button>
          ) : null}
        </div>

        <DropdownMenuSeparator />

        <div className="max-h-[340px] overflow-y-auto space-y-1.5 pr-0.5">
          {isLoading ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Không có thông báo mới nào
            </div>
          ) : (
            items.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={(id) => markRead(id)}
                onDelete={(id) => deleteNotification(id)}
                compact
              />
            ))
          )}
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className="cursor-pointer justify-center">
          <Link
            to="/notifications"
            className="w-full text-center text-xs font-medium text-primary hover:underline py-1.5"
          >
            Xem tất cả thông báo
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
