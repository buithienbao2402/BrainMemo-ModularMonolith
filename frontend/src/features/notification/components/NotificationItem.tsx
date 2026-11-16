import {
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  MessageSquare,
  ShieldAlert,
  Trash2,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui';
import type { NotificationDto, NotificationType } from '../api/notificationApi';

interface NotificationItemProps {
  notification: NotificationDto;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'ENROLLMENT':
    case 'ENROLLMENT_INVITE_JOIN':
      return <Users className="h-4 w-4 text-emerald-500" />;
    case 'COMMENT':
      return <MessageSquare className="h-4 w-4 text-primary" />;
    case 'GRADE_FEEDBACK':
      return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
    case 'NEW_CHAPTER':
      return <BookOpen className="h-4 w-4 text-amber-500" />;
    case 'REPORT_RESULT':
    case 'SANCTION':
      return <ShieldAlert className="h-4 w-4 text-red-500" />;
    case 'SYSTEM_ANNOUNCEMENT':
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

function formatTimeAgo(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return new Date(isoString).toLocaleDateString('vi-VN');
  } catch {
    return '';
  }
}

export function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
  compact = false,
}: NotificationItemProps) {
  const navigate = useNavigate();
  const isUnread = !notification.readAt;

  const handleClick = () => {
    if (isUnread) {
      onMarkRead(notification.id);
    }
    const payload = notification.payload;
    if (payload?.courseId && payload?.chapterId) {
      navigate(`/courses/${payload.courseId}/learn/${payload.chapterId}`);
    } else if (payload?.courseId) {
      navigate(`/courses/${payload.courseId}`);
    }
  };

  return (
    <div
      role="article"
      data-testid="notification-item"
      onClick={handleClick}
      className={cn(
        'group relative flex items-start gap-3 rounded-xl border border-border/60 transition-all cursor-pointer select-none',
        compact ? 'p-3 text-xs' : 'p-4 text-sm',
        isUnread
          ? 'bg-primary/5 hover:bg-primary/10 border-primary/20'
          : 'bg-card hover:bg-muted/50'
      )}
    >
      {/* Icon badge */}
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-lg bg-background border border-border shadow-2xs',
          compact ? 'h-8 w-8' : 'h-9 w-9'
        )}
      >
        {getNotificationIcon(notification.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              'truncate font-medium text-foreground',
              isUnread && 'font-semibold'
            )}
          >
            {notification.title || 'Thông báo từ hệ thống'}
          </p>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {formatTimeAgo(notification.createdAt)}
          </span>
        </div>

        {notification.body ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {notification.body}
          </p>
        ) : null}
      </div>

      {/* Unread indicator & action buttons */}
      <div
        className="flex shrink-0 items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        {isUnread ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => onMarkRead(notification.id)}
            title="Đánh dấu đã đọc"
            aria-label="Đánh dấu đã đọc"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        ) : null}

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground opacity-60 hover:opacity-100 hover:text-destructive group-hover:opacity-100"
          onClick={() => onDelete(notification.id)}
          title="Xóa thông báo"
          aria-label="Xóa thông báo"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Unread dot */}
      {isUnread ? (
        <span
          className="absolute -top-1 -left-1 flex h-2.5 w-2.5 rounded-full bg-brand-orange ring-2 ring-background"
          aria-label="Chưa đọc"
        />
      ) : null}
    </div>
  );
}
