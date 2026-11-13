import { Lock, Globe, EyeOff, FileText, CheckCircle2, Archive, Clock } from 'lucide-react';

interface AccessBadgeProps {
  mode?: 'PUBLIC' | 'PRIVATE' | 'ONLY_ME' | string;
  className?: string;
}

export function CourseAccessBadge({ mode = 'PUBLIC', className = '' }: AccessBadgeProps) {
  switch (mode) {
    case 'PUBLIC':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ${className}`}
        >
          <Globe className="h-3 w-3" />
          <span>Công khai</span>
        </span>
      );
    case 'PRIVATE':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 ${className}`}
        >
          <Lock className="h-3 w-3" />
          <span>Riêng tư</span>
        </span>
      );
    case 'ONLY_ME':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 ${className}`}
        >
          <EyeOff className="h-3 w-3" />
          <span>Chỉ mình tôi</span>
        </span>
      );
    default:
      return null;
  }
}

interface StatusBadgeProps {
  status?: 'UPDATING' | 'COMPLETED' | 'PAUSED' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | string;
  className?: string;
}

export function CourseStatusBadge({ status = 'UPDATING', className = '' }: StatusBadgeProps) {
  switch (status) {
    case 'UPDATING':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400 ${className}`}
        >
          <Clock className="h-3 w-3" />
          <span>Đang cập nhật</span>
        </span>
      );
    case 'COMPLETED':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ${className}`}
        >
          <CheckCircle2 className="h-3 w-3" />
          <span>Hoàn thành</span>
        </span>
      );
    case 'PAUSED':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 ${className}`}
        >
          <Archive className="h-3 w-3" />
          <span>Tạm ngưng</span>
        </span>
      );
    case 'DRAFT':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground ${className}`}
        >
          <FileText className="h-3 w-3" />
          <span>Bản nháp</span>
        </span>
      );
    case 'PUBLISHED':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary ${className}`}
        >
          <CheckCircle2 className="h-3 w-3" />
          <span>Đã xuất bản</span>
        </span>
      );
    case 'ARCHIVED':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive ${className}`}
        >
          <Archive className="h-3 w-3" />
          <span>Lưu trữ</span>
        </span>
      );
    default:
      return null;
  }
}
