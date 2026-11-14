import { AlertCircle, Clock, LogOut, Mail, ShieldAlert, UserX } from 'lucide-react';
import { Button } from '@/shared/ui';

interface PermanentLockedViewProps {
  data?: {
    title?: string;
    lockReason?: string | null;
    lockedUntil?: string | null;
  } | null;
  accountCode?: string;
  userName?: string;
  onLogout: () => void;
}

export function PermanentLockedView({
  data,
  accountCode = 'BM-902144',
  userName = 'Lê Minh',
  onLogout,
}: PermanentLockedViewProps) {
  const title = data?.title || 'Tài khoản đã bị khóa vĩnh viễn';
  const reason =
    data?.lockReason ||
    'Vi phạm nghiêm trọng chính sách bảo mật nội dung & sao chép trái phép đề thi';
  const appliedTime = '09:15 - 15/05/2026';

  return (
    <section
      aria-labelledby="locked-title"
      className="w-full rounded-2xl border border-border/60 bg-card p-6 shadow-xl dark:border-[#2b2d3d] dark:bg-[#161722] sm:p-8"
    >
      {/* Red Shield Circular Badge */}
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-red-500/25 bg-red-500/10 text-red-500 dark:bg-red-500/15">
        <ShieldAlert className="h-6 w-6 text-red-500" aria-hidden="true" />
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
      <div className="my-6 space-y-3.5 rounded-xl border border-border/40 bg-muted/40 p-4 text-xs dark:bg-[#11121b] sm:p-5 sm:text-sm">
        {/* Row 1: Lý do */}
        <div className="flex items-start justify-between gap-3">
          <div className="mt-0.5 flex shrink-0 items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>Lý do:</span>
          </div>
          <div className="flex-1 text-right font-medium leading-relaxed text-red-500 dark:text-[#ff6b6b]">
            {reason}
          </div>
        </div>

        {/* Row 2: Thời điểm áp dụng */}
        <div className="flex items-center justify-between gap-3 border-t border-border/30 pt-3">
          <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>Thời điểm áp dụng:</span>
          </div>
          <div className="text-right font-medium text-foreground">{appliedTime}</div>
        </div>

        {/* Row 3: Trạng thái */}
        <div className="flex items-center justify-between gap-3 border-t border-border/30 pt-3">
          <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
            <UserX className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>Trạng thái:</span>
          </div>
          <div className="text-right font-semibold text-red-500 dark:text-[#ff6b6b]">
            Vô hiệu hóa toàn diện
            <span className="sr-only">Vĩnh viễn</span>
          </div>
        </div>
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

        {/* Secondary Contact Admin Button */}
        <a
          href="mailto:hotro@brainmemo.vn?subject=Khiếu nại khóa tài khoản vĩnh viễn"
          className="flex h-10 w-full items-center justify-center gap-2 rounded-full border border-border/70 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground sm:text-sm"
        >
          <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span>Liên hệ ban quản trị (hotro@brainmemo.vn)</span>
        </a>
      </div>
    </section>
  );
}
