import { AlertCircle, Calendar, HelpCircle, Hourglass, Info, Lock, LogOut } from 'lucide-react';
import { Button } from '@/shared/ui';

interface TemporaryLockedViewProps {
  data?: {
    title?: string;
    lockReason?: string | null;
    lockedUntil?: string | null;
  } | null;
  accountCode?: string;
  userName?: string;
  onLogout: () => void;
}

export function TemporaryLockedView({
  data,
  accountCode = 'BM-883921',
  userName = 'Quang Trần',
  onLogout,
}: TemporaryLockedViewProps) {
  const title = data?.title || 'Tài khoản của bạn đang bị khóa';
  const reason =
    data?.lockReason || 'Spam bình luận thảo luận trong khóa học "Python cơ bản"';

  // Format expiration date and calculate remaining duration
  let formattedUntil = 'đến 20/11/2026 14:00';
  let remainingText = '11 ngày 3 giờ';

  if (data?.lockedUntil) {
    const untilDate = new Date(data.lockedUntil);
    const day = String(untilDate.getDate()).padStart(2, '0');
    const month = String(untilDate.getMonth() + 1).padStart(2, '0');
    const year = untilDate.getFullYear();
    const hours = String(untilDate.getHours()).padStart(2, '0');
    const minutes = String(untilDate.getMinutes()).padStart(2, '0');
    formattedUntil = `đến ${day}/${month}/${year} ${hours}:${minutes}`;

    const diffMs = untilDate.getTime() - Date.now();
    if (diffMs > 0) {
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      if (diffDays > 0) {
        remainingText = `${diffDays} ngày ${diffHours} giờ`;
      } else if (diffHours > 0) {
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        remainingText = `${diffHours} giờ ${diffMinutes} phút`;
      } else {
        remainingText = 'Hết hạn trong ít phút';
      }
    } else {
      remainingText = 'Đã hết hạn';
    }
  }

  return (
    <section
      aria-labelledby="locked-title"
      className="w-full rounded-2xl border border-border/60 bg-card p-6 shadow-xl dark:border-[#2b2d3d] dark:bg-[#161722] sm:p-8"
    >
      {/* Red Lock Circular Badge */}
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-red-500/25 bg-red-500/10 text-red-500 dark:bg-red-500/15">
        <Lock className="h-6 w-6 text-red-500" aria-hidden="true" />
      </div>

      {/* Card Title */}
      <h2
        id="locked-title"
        className="text-center font-serif text-xl font-bold text-foreground sm:text-2xl"
      >
        {title}
      </h2>

      {/* Account Code & Name Subtitle */}
      <p className="mt-1.5 text-center text-xs text-muted-foreground sm:text-sm">
        Mã số tài khoản: <strong className="font-bold text-foreground">{accountCode}</strong> (
        {userName})
      </p>

      {/* Details Box */}
      <div className="my-5 space-y-3.5 rounded-xl border border-border/40 bg-muted/40 p-4 text-xs dark:bg-[#11121b] sm:p-5 sm:text-sm">
        {/* Row 1: Lý do khóa */}
        <div className="flex items-start justify-between gap-3">
          <div className="mt-0.5 flex shrink-0 items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>Lý do khóa:</span>
          </div>
          <div className="flex-1 text-right font-medium leading-relaxed text-foreground pl-4">
            {reason}
          </div>
        </div>

        {/* Row 2: Thời hạn */}
        <div className="flex items-center justify-between gap-3 border-t border-border/30 pt-3">
          <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>Thời hạn:</span>
          </div>
          <div className="text-right font-semibold text-foreground">{formattedUntil}</div>
        </div>

        {/* Row 3: Còn lại */}
        <div className="flex items-center justify-between gap-3 border-t border-border/30 pt-3">
          <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
            <Hourglass className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>Còn lại:</span>
          </div>
          <div className="text-right font-bold text-[#f97316]">{remainingText}</div>
        </div>
      </div>

      {/* Notice Callout Box */}
      <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5 text-left text-xs leading-relaxed text-muted-foreground dark:bg-[#131722]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400" aria-hidden="true" />
        <p>
          <strong className="font-semibold text-foreground">Lưu ý:</strong> Tài khoản sẽ tự động mở
          khi hết hạn. Trong thời gian này, bạn không thể truy cập bài giảng hoặc nộp bài tập.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col gap-3">
        {/* Primary Logout Button */}
        <Button
          type="button"
          onClick={onLogout}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#f97316] text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#ea580c]"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span>Đăng xuất</span>
        </Button>

        {/* Secondary Dispute Decision Button */}
        <a
          href="mailto:hotro@brainmemo.vn?subject=Khiếu nại quyết định khóa tài khoản tạm thời"
          className="flex h-10 w-full items-center justify-center gap-2 rounded-full border border-border/70 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground sm:text-sm"
        >
          <HelpCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span>Gửi khiếu nại quyết định</span>
        </a>
      </div>
    </section>
  );
}
