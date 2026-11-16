import { Link } from 'react-router-dom';
import { Info, LogIn } from 'lucide-react';

interface GuestBannerProps {
  courseId: string;
}

export function GuestBanner({ courseId }: GuestBannerProps) {
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-xs sm:text-sm text-amber-800 dark:text-amber-300 flex flex-col sm:flex-row items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span>
          Bạn đang xem ở <strong>chế độ Khách (chỉ đọc)</strong>. Tiến độ học tập và kết quả bài làm sẽ không được lưu.
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          to={`/login?redirect=/courses/${courseId}/learn`}
          className="inline-flex items-center gap-1 font-semibold text-xs px-3 py-1 rounded-full bg-amber-600 hover:bg-amber-700 text-white transition-colors"
        >
          <LogIn className="h-3 w-3" />
          <span>Đăng nhập để lưu tiến độ</span>
        </Link>
      </div>
    </div>
  );
}
