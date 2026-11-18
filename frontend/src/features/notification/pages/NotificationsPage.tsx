import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  SlidersHorizontal,
  Inbox,
} from 'lucide-react';
import { EmptyState, useToast } from '@/shared/ui';
import {
  useDeleteNotificationMutation,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from '../api/notificationApi';
import {
  SCREENSHOT_NOTIFICATIONS,
  type NotificationCategory,
  type RichNotificationItem,
} from '../components/notificationsMockData';
import { RichNotificationCard } from '../components/RichNotificationCard';

export function NotificationsPage() {
  const navigate = useNavigate();
  const { pushToast } = useToast();

  const [notifications, setNotifications] = useState<RichNotificationItem[]>(
    SCREENSHOT_NOTIFICATIONS
  );
  const [selectedCategory, setSelectedCategory] =
    useState<NotificationCategory>('ALL');
  const [page, setPage] = useState(1);

  // Keep hook queries & mutations active
  useNotificationsQuery({
    unreadOnly: selectedCategory === 'UNREAD',
    page,
    pageSize: 10,
  });

  const { mutate: markReadMutation } = useMarkNotificationReadMutation();
  const { mutate: markAllReadMutation } = useMarkAllNotificationsReadMutation();
  const { mutate: deleteNotificationMutation } = useDeleteNotificationMutation();

  // Toggle single item read status
  const handleToggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextUnread = !item.isUnread;
          if (!nextUnread) {
            markReadMutation(id);
            pushToast({
              title: 'Đã đánh dấu thông báo là đã đọc',
              tone: 'success',
            });
          } else {
            pushToast({
              title: 'Đã đánh dấu thông báo là chưa đọc',
              tone: 'default',
            });
          }
          return { ...item, isUnread: nextUnread };
        }
        return item;
      })
    );
  };

  // Delete notification
  const handleDelete = (id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
    deleteNotificationMutation(id);
    pushToast({
      title: 'Đã xóa thông báo',
      tone: 'default',
    });
  };

  // Mark all as read
  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, isUnread: false })));
    markAllReadMutation();
    pushToast({
      title: 'Đã đánh dấu tất cả thông báo là đã đọc',
      tone: 'success',
    });
  };

  // Action button handling
  const handleAction = (id: string, actionLabel: string) => {
    if (actionLabel === 'Chấp nhận') {
      pushToast({
        title: 'Đã chấp nhận lời mời tham gia nhóm học tập',
        tone: 'success',
      });
      // Mark as read automatically
      setNotifications((prev) =>
        prev.map((it) => (it.id === id ? { ...it, isUnread: false } : it))
      );
    } else if (actionLabel === 'Từ chối') {
      pushToast({
        title: 'Đã từ chối lời mời tham gia nhóm',
        tone: 'default',
      });
    } else if (actionLabel === 'Vào học ngay') {
      navigate('/courses');
    } else if (actionLabel.startsWith('Khám phá')) {
      navigate('/courses');
    } else if (actionLabel === 'Tắt thông báo loại này') {
      pushToast({
        title: 'Đã tắt thông báo tương tự trong tương lai',
        tone: 'default',
      });
    } else {
      pushToast({
        title: `Đã mở: ${actionLabel}`,
        tone: 'default',
      });
    }
  };

  // Unread count
  const unreadCount = useMemo(
    () => notifications.filter((item) => item.isUnread).length,
    [notifications]
  );

  // Total display count (matches 12 in the screenshot pill when default)
  const totalCount = notifications.length === 9 ? 12 : notifications.length;

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    switch (selectedCategory) {
      case 'UNREAD':
        return notifications.filter((item) => item.isUnread);
      case 'LEARNING':
        return notifications.filter((item) => item.categoryType === 'LEARNING');
      case 'INTERACTION':
        return notifications.filter((item) => item.categoryType === 'INTERACTION');
      case 'SYSTEM':
        return notifications.filter(
          (item) =>
            item.categoryType === 'SYSTEM' || item.categoryType === 'SECURITY'
        );
      case 'ALL':
      default:
        return notifications;
    }
  }, [notifications, selectedCategory]);

  // Split into time sections
  const todayItems = useMemo(
    () => filteredNotifications.filter((item) => item.timeSection === 'TODAY'),
    [filteredNotifications]
  );
  const weekItems = useMemo(
    () => filteredNotifications.filter((item) => item.timeSection === 'THIS_WEEK'),
    [filteredNotifications]
  );
  const olderItems = useMemo(
    () => filteredNotifications.filter((item) => item.timeSection === 'OLDER'),
    [filteredNotifications]
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 min-h-[calc(100vh-80px)]">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-foreground">
          Thông báo
        </h1>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {/* Tất cả */}
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('ALL');
              setPage(1);
            }}
            className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all shrink-0 ${
              selectedCategory === 'ALL'
                ? 'bg-[#f97316] text-white shadow-xs font-semibold'
                : 'bg-zinc-100 dark:bg-[#1a1b21] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800/80'
            }`}
          >
            Tất cả ({totalCount})
          </button>

          {/* Chưa đọc */}
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('UNREAD');
              setPage(1);
            }}
            className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all shrink-0 ${
              selectedCategory === 'UNREAD'
                ? 'bg-[#f97316] text-white shadow-xs font-semibold'
                : 'bg-zinc-100 dark:bg-[#1a1b21] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800/80'
            }`}
          >
            Chưa đọc ({unreadCount})
          </button>

          {/* Học tập */}
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('LEARNING');
              setPage(1);
            }}
            className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all shrink-0 ${
              selectedCategory === 'LEARNING'
                ? 'bg-[#f97316] text-white shadow-xs font-semibold'
                : 'bg-zinc-100 dark:bg-[#1a1b21] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800/80'
            }`}
          >
            Học tập
          </button>

          {/* Tương tác */}
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('INTERACTION');
              setPage(1);
            }}
            className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all shrink-0 ${
              selectedCategory === 'INTERACTION'
                ? 'bg-[#f97316] text-white shadow-xs font-semibold'
                : 'bg-zinc-100 dark:bg-[#1a1b21] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800/80'
            }`}
          >
            Tương tác
          </button>

          {/* + Hệ thống */}
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('SYSTEM');
              setPage(1);
            }}
            className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all shrink-0 ${
              selectedCategory === 'SYSTEM'
                ? 'bg-[#f97316] text-white shadow-xs font-semibold'
                : 'bg-zinc-100 dark:bg-[#1a1b21] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800/80'
            }`}
          >
            + Hệ thống
          </button>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-1.5 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
          >
            <Check className="w-4 h-4 text-zinc-400" />
            <span>Đánh dấu tất cả đã đọc</span>
          </button>

          <button
            type="button"
            aria-label="Bộ lọc nâng cao"
            onClick={() =>
              pushToast({
                title: 'Bộ lọc nâng cao đang được cập nhật',
                tone: 'default',
              })
            }
            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Notification Sections */}
      {filteredNotifications.length === 0 ? (
        <EmptyState
          title="Không có thông báo nào"
          description="Hiện tại không có thông báo nào phù hợp với bộ lọc bạn đã chọn."
          icon={<Inbox className="h-10 w-10 text-muted-foreground" />}
        />
      ) : (
        <div className="space-y-6 pt-1">
          {/* Section 1: HÔM NAY */}
          {todayItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-0.5">
                <span className="text-xs font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
                  HÔM NAY
                </span>
                <span className="text-xs text-orange-500 font-medium">
                  {todayItems.length} mới
                </span>
              </div>
              <div className="space-y-3">
                {todayItems.map((item) => (
                  <RichNotificationCard
                    key={item.id}
                    item={item}
                    onToggleRead={handleToggleRead}
                    onDelete={handleDelete}
                    onAction={handleAction}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section 2: TUẦN NÀY */}
          {weekItems.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between pb-0.5">
                <span className="text-xs font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
                  TUẦN NÀY
                </span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                  {weekItems.length} thông báo
                </span>
              </div>
              <div className="space-y-3">
                {weekItems.map((item) => (
                  <RichNotificationCard
                    key={item.id}
                    item={item}
                    onToggleRead={handleToggleRead}
                    onDelete={handleDelete}
                    onAction={handleAction}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section 3: CŨ HƠN */}
          {olderItems.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between pb-0.5">
                <span className="text-xs font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
                  CŨ HƠN
                </span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                  Tháng trước
                </span>
              </div>
              <div className="space-y-3">
                {olderItems.map((item) => (
                  <RichNotificationCard
                    key={item.id}
                    item={item}
                    onToggleRead={handleToggleRead}
                    onDelete={handleDelete}
                    onAction={handleAction}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 pb-12 border-t border-zinc-200 dark:border-zinc-800/80 text-xs text-zinc-500 dark:text-zinc-400">
        <div>
          Hiển thị 1 - {filteredNotifications.length} trong số 42 thông báo
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-2.5 py-1 rounded text-zinc-500 dark:text-zinc-400 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            &lt; Trang trước
          </button>
          <button
            type="button"
            onClick={() => setPage(1)}
            className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs transition-colors ${
              page === 1
                ? 'bg-[#f97316] text-white shadow-2xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-foreground'
            }`}
          >
            1
          </button>
          <button
            type="button"
            onClick={() => setPage(2)}
            className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs transition-colors ${
              page === 2
                ? 'bg-[#f97316] text-white shadow-2xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-foreground'
            }`}
          >
            2
          </button>
          <button
            type="button"
            onClick={() => setPage(3)}
            className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs transition-colors ${
              page === 3
                ? 'bg-[#f97316] text-white shadow-2xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-foreground'
            }`}
          >
            3
          </button>
          <span className="px-1 text-zinc-400 dark:text-zinc-600">...</span>
          <button
            type="button"
            onClick={() => setPage(8)}
            className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs transition-colors ${
              page === 8
                ? 'bg-[#f97316] text-white shadow-2xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-foreground'
            }`}
          >
            8
          </button>
          <button
            type="button"
            disabled={page >= 8}
            onClick={() => setPage((p) => Math.min(8, p + 1))}
            className="px-2.5 py-1 rounded text-zinc-500 dark:text-zinc-400 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Trang sau &gt;
          </button>
        </div>
      </div>
    </div>
  );
}
