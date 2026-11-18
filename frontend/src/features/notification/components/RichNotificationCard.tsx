import {
  Users,
  GraduationCap,
  MessageSquare,
  Star,
  BookOpen,
  ShieldCheck,
  AlertTriangle,
  Server,
  Flame,
  MoreVertical,
  Check,
  Trash2,
  BellOff,
  Database,
  Compass,
  CornerDownRight,
  FileText,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/shared/ui';
import type { RichNotificationItem } from './notificationsMockData';

interface RichNotificationCardProps {
  item: RichNotificationItem;
  onToggleRead: (id: string) => void;
  onDelete: (id: string) => void;
  onAction?: (id: string, actionLabel: string) => void;
}

export function RichNotificationCard({
  item,
  onToggleRead,
  onDelete,
  onAction,
}: RichNotificationCardProps) {
  // Render Left Icon
  const renderIcon = () => {
    switch (item.iconType) {
      case 'group':
        return (
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        );
      case 'course':
        return (
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
        );
      case 'comment':
        return (
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
        );
      case 'grade':
        return (
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5" />
          </div>
        );
      case 'chapter':
        return (
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
        );
      case 'security':
        return (
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        );
      case 'server':
        return (
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Server className="w-5 h-5" />
          </div>
        );
      case 'streak':
        return (
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        );
    }
  };

  // Render Category Badge
  const getBadgeClasses = () => {
    switch (item.iconType) {
      case 'group':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'course':
        return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20';
      case 'comment':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'grade':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'chapter':
      case 'streak':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
      case 'security':
        return 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
      case 'warning':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'server':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <article
      data-testid="notification-item"
      className={cn(
        'group relative flex items-start gap-3.5 sm:gap-4 p-4 sm:p-5 rounded-xl border transition-all duration-150',
        'bg-card dark:bg-[#141519] border-border/80 dark:border-[#22242b]',
        'hover:border-zinc-300 dark:hover:border-zinc-700/70',
        item.isUnread && 'shadow-2xs'
      )}
    >
      {/* Icon */}
      {renderIcon()}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0">
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center flex-wrap gap-1.5 text-xs">
            <span
              className={cn(
                'px-2.5 py-0.5 rounded-full font-semibold border text-[11px] sm:text-xs',
                getBadgeClasses()
              )}
            >
              {item.category}
            </span>
            <span className="text-zinc-400 dark:text-zinc-600">•</span>
            <span className="text-zinc-500 dark:text-zinc-400 text-xs">
              {item.timeAgo}
            </span>
            {item.isUnread && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 ml-0.5"
                title="Chưa đọc"
              />
            )}
          </div>

          {/* Quick Actions & Menu */}
          <div className="flex items-center gap-1">
            {/* Quick action buttons for accessibility and test suites */}
            <button
              type="button"
              onClick={() => onToggleRead(item.id)}
              className="p-1 rounded text-zinc-400 hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
              title={item.isUnread ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc'}
              aria-label={item.isUnread ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc'}
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="p-1 rounded text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
              title="Xóa thông báo"
              aria-label="Xóa thông báo"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Tùy chọn thông báo"
                  className="p-1 rounded-md text-zinc-400 dark:text-zinc-500 hover:text-foreground dark:hover:text-zinc-200 hover:bg-muted transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onToggleRead(item.id)}>
                  <Check className="w-4 h-4 mr-2" />
                  <span>{item.isUnread ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc'}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onAction?.(item.id, 'Tắt thông báo loại này')}
                >
                  <BellOff className="w-4 h-4 mr-2" />
                  <span>Tắt thông báo loại này</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(item.id)}
                  className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  <span>Xóa thông báo</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm sm:text-[15px] font-semibold text-zinc-900 dark:text-zinc-100 mt-1.5 leading-snug">
          {item.title}
          {item.scoreBadge && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              {item.scoreBadge}
            </span>
          )}
        </h3>

        {/* Body Text */}
        {item.body && (
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
            {item.body}
          </p>
        )}

        {/* Quote Block (for comments) */}
        {item.quoteText && (
          <div className="mt-2.5 p-3 rounded-lg bg-zinc-100 dark:bg-[#1a1b22] border-l-2 border-primary/50 text-xs italic text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {item.quoteText}
          </div>
        )}

        {/* Info Note Pill (for server sync) */}
        {item.infoNote && (
          <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-700 dark:text-emerald-400">
            <Database className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>{item.infoNote}</span>
          </div>
        )}

        {/* Actions Row */}
        {(item.primaryAction || item.secondaryAction || item.linkAction) && (
          <div className="mt-3 flex items-center flex-wrap gap-2.5 pt-0.5">
            {/* Primary Action Button */}
            {item.primaryAction && (
              <button
                type="button"
                onClick={() => onAction?.(item.id, item.primaryAction!.label)}
                className="bg-[#f97316] hover:bg-[#ea580c] text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{item.primaryAction.label}</span>
              </button>
            )}

            {/* Secondary Action Button */}
            {item.secondaryAction && (
              <button
                type="button"
                onClick={() => onAction?.(item.id, item.secondaryAction!.label)}
                className="border border-zinc-300 dark:border-zinc-700/80 bg-zinc-100 dark:bg-zinc-800/60 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {item.secondaryAction.label === 'Vào học ngay' && (
                  <Compass className="w-3.5 h-3.5 text-zinc-400" />
                )}
                {item.secondaryAction.label.startsWith('Khám phá') && (
                  <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                )}
                <span>{item.secondaryAction.label}</span>
              </button>
            )}

            {/* Link Action */}
            {item.linkAction && (
              <a
                href={item.linkAction.href || '#'}
                onClick={(e) => {
                  e.preventDefault();
                  onAction?.(item.id, item.linkAction!.label);
                }}
                className={cn(
                  'text-xs text-zinc-500 dark:text-zinc-400 hover:text-foreground inline-flex items-center gap-1 font-medium transition-colors cursor-pointer',
                  item.linkAction.label.includes('ứng xử cộng đồng') &&
                    'underline underline-offset-4 decoration-zinc-400 dark:decoration-zinc-600 block mt-1'
                )}
              >
                {item.linkAction.label.includes('Phản hồi') && (
                  <CornerDownRight className="w-3 h-3 text-zinc-400 shrink-0" />
                )}
                {item.linkAction.label.includes('chi tiết') && (
                  <FileText className="w-3 h-3 text-zinc-400 shrink-0" />
                )}
                <span>{item.linkAction.label}</span>
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
