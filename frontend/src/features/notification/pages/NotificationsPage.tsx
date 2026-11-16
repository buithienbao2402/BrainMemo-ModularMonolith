import { useState } from 'react';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import { Button, EmptyState, Skeleton } from '@/shared/ui';
import {
  useDeleteNotificationMutation,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from '../api/notificationApi';
import { NotificationItem } from '../components/NotificationItem';

export function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading } = useNotificationsQuery({
    unreadOnly,
    page,
    pageSize,
  });

  const { mutate: markRead } = useMarkNotificationReadMutation();
  const { mutate: markAllRead, isPending: isMarkingAll } =
    useMarkAllNotificationsReadMutation();
  const { mutate: deleteNotification } = useDeleteNotificationMutation();

  const items = data?.items || [];
  const meta = data?.meta;
  const totalPages = meta ? Math.ceil(meta.totalItems / pageSize) : 1;

  return (
    <div className="container max-w-4xl py-6 sm:py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              Thông báo
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Cập nhật hoạt động học tập, phản hồi khóa học và tin từ hệ thống.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => markAllRead()}
          disabled={isMarkingAll || items.every((n) => !!n.readAt)}
          className="flex items-center gap-1.5 self-start sm:self-auto"
        >
          <CheckCheck className="h-4 w-4" />
          <span>Đánh dấu tất cả đã đọc</span>
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-2">
        <button
          type="button"
          onClick={() => {
            setUnreadOnly(false);
            setPage(1);
          }}
          className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
            !unreadOnly
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          Tất cả
        </button>
        <button
          type="button"
          onClick={() => {
            setUnreadOnly(true);
            setPage(1);
          }}
          className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
            unreadOnly
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          Chưa đọc
        </button>
      </div>

      {/* Notification list */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, idx) => (
              <Skeleton key={idx} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title={unreadOnly ? 'Không có thông báo chưa đọc' : 'Hộp thư trống'}
            description={
              unreadOnly
                ? 'Bạn đã đọc hết tất cả các thông báo.'
                : 'Hiện tại bạn chưa nhận được thông báo mới nào.'
            }
            icon={<Inbox className="h-10 w-10 text-muted-foreground" />}
          />
        ) : (
          items.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={(id) => markRead(id)}
              onDelete={(id) => deleteNotification(id)}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between border-t border-border/60 pt-4">
          <p className="text-xs text-muted-foreground">
            Trang {page} / {totalPages} (Tổng {meta?.totalItems ?? items.length}{' '}
            thông báo)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Trang trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Trang sau
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
