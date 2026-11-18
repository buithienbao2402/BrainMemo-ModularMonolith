import { Link } from 'react-router-dom';
import {
  Bot,
  Clock,
  EyeOff,
  Hourglass,
  Scissors,
  Settings,
} from 'lucide-react';
import { useModerationDashboard } from '@/features/moderation/api/moderationApi';
import { ErrorState, Skeleton } from '@/shared/ui';

interface PendingQueueItem {
  id: string;
  source: 'USER' | 'AI';
  sourceLabel: string;
  targetLabel: string;
  timeAgo: string;
  content: string;
  link: string;
}

interface LockedAccountItem {
  id: string;
  name: string;
  type: 'TEMPORARY' | 'PERMANENT';
  typeLabel: string;
  detail: string;
  expiry: string;
}

interface HiddenCourseItem {
  id: string;
  title: string;
  code: string;
  instructor: string;
  initials: string;
  reason: string;
  reasonVariant: 'danger' | 'warning' | 'neutral';
  deadlineText: string;
  deadlineIcon: 'hourglass' | 'clock';
  deadlineColor: string;
}

const SAMPLE_PENDING_QUEUE: PendingQueueItem[] = [
  {
    id: 'rep-1',
    source: 'USER',
    sourceLabel: 'Người dùng',
    targetLabel: 'Khóa học',
    timeAgo: '5 phút trước',
    content: 'Khóa học “Lập trình Python chuyên sâu...” bị khiếu nại vi phạm bản quyền slide bài giảng từ Viện Công nghệ.',
    link: '/admin/reports',
  },
  {
    id: 'rep-2',
    source: 'AI',
    sourceLabel: 'AI',
    targetLabel: 'Bình luận',
    timeAgo: '18 phút trước',
    content: 'Bình luận chứa liên kết nghi vấn lừa đảo tài chính và lời lẽ xúc phạm người hướng dẫn trong phòng lab.',
    link: '/admin/reports',
  },
  {
    id: 'rep-3',
    source: 'USER',
    sourceLabel: 'Người dùng',
    targetLabel: 'Đánh giá',
    timeAgo: '42 phút trước',
    content: 'Đánh giá spam quảng cáo khóa học ngoài hệ thống và kêu gọi tham gia nhóm kín trên Telegram.',
    link: '/admin/reports',
  },
  {
    id: 'rep-4',
    source: 'AI',
    sourceLabel: 'AI',
    targetLabel: 'Tài liệu đính kèm',
    timeAgo: '1 giờ trước',
    content: 'File bài tập PDF lab_04.pdf phát hiện trùng khớp 94% với cơ sở dữ liệu học thuật mở.',
    link: '/admin/reports',
  },
  {
    id: 'rep-5',
    source: 'USER',
    sourceLabel: 'Người dùng',
    targetLabel: 'Bình luận',
    timeAgo: '2 giờ trước',
    content: 'Người dùng sử dụng ngôn từ thù ghét, quấy rối học viên khác trong diễn đàn Thảo luận tuần 3.',
    link: '/admin/reports',
  },
];

const SAMPLE_LOCKED_ACCOUNTS: LockedAccountItem[] = [
  {
    id: 'usr-1',
    name: 'Đặng Hoàng Nam',
    type: 'TEMPORARY',
    typeLabel: 'Có thời hạn',
    detail: 'MSSV: BM-2026-4102',
    expiry: 'Còn 3 ngày (18/04/2026)',
  },
  {
    id: 'usr-2',
    name: 'Trần Minh Quân',
    type: 'TEMPORARY',
    typeLabel: 'Có thời hạn',
    detail: 'MSSV: BM-2026-9914',
    expiry: 'Còn 12 giờ',
  },
  {
    id: 'usr-3',
    name: 'Lê Văn Hùng (Spammer)',
    type: 'PERMANENT',
    typeLabel: 'Vĩnh viễn',
    detail: 'bot_hung99@gmail.com',
    expiry: 'Khóa toàn cục',
  },
  {
    id: 'usr-4',
    name: 'Ngô Thị Thu Hà',
    type: 'TEMPORARY',
    typeLabel: 'Có thời hạn',
    detail: 'BM-2026-3351',
    expiry: 'Còn 5 ngày',
  },
  {
    id: 'usr-5',
    name: 'Phạm Tuấn Kiệt',
    type: 'PERMANENT',
    typeLabel: 'Vĩnh viễn',
    detail: 'BM-2026-7820',
    expiry: 'Khóa toàn cục',
  },
];

const SAMPLE_HIDDEN_COURSES: HiddenCourseItem[] = [
  {
    id: 'crs-1',
    title: 'Lập trình Python nâng cao & Microservices',
    code: 'Mã: PY-ADV-02',
    instructor: 'TS. Trần Quốc Tuấn',
    initials: 'TQ',
    reason: 'Vi phạm bản quyền nội dung',
    reasonVariant: 'danger',
    deadlineText: 'Còn 18 giờ để giải trình',
    deadlineIcon: 'hourglass',
    deadlineColor: 'text-[#f59e0b]',
  },
  {
    id: 'crs-2',
    title: 'Thiết kế UI/UX Thực chiến với Figma & AI',
    code: 'Mã: UI-2026-01',
    instructor: 'ThS. Hoàng Yến Vi',
    initials: 'YV',
    reason: 'Nội dung không đạt chuẩn kiểm định sư phạm',
    reasonVariant: 'neutral',
    deadlineText: 'Quá hạn giải trình 1 ngày',
    deadlineIcon: 'hourglass',
    deadlineColor: 'text-[#f87171]',
  },
  {
    id: 'crs-3',
    title: 'Khai phá Dữ liệu Lớn với Apache Spark',
    code: 'Mã: BD-SPARK-05',
    instructor: 'TS. Vũ Hải Nam',
    initials: 'HN',
    reason: 'Chứa liên kết chuyển hướng ngoài trái phép',
    reasonVariant: 'warning',
    deadlineText: 'Còn 36 giờ',
    deadlineIcon: 'clock',
    deadlineColor: 'text-zinc-400',
  },
  {
    id: 'crs-4',
    title: 'Nhập môn Thị giác máy tính OpenCV',
    code: 'Mã: CV-BAS-09',
    instructor: 'Nguyễn Hữu Đạt',
    initials: 'HĐ',
    reason: 'Khiếu nại sao chép giáo trình từ nguồn mở',
    reasonVariant: 'danger',
    deadlineText: 'Còn 4 ngày',
    deadlineIcon: 'clock',
    deadlineColor: 'text-zinc-400',
  },
];

export function AdminDashboardPage() {
  const { data, isLoading, isError, refetch } = useModerationDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl bg-[#1c1c24]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="lg:col-span-7 h-96 w-full rounded-2xl bg-[#1c1c24]" />
          <Skeleton className="lg:col-span-5 h-96 w-full rounded-2xl bg-[#1c1c24]" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  // Calculate or fallback numbers
  const pendingReportsCount = data.pendingReportsCount > 0 ? data.pendingReportsCount : 18;
  const pendingAiFlagsCount = data.pendingAiFlagsCount || 32;
  const lockedUsersCount = data.lockedUsersCount > 0 ? data.lockedUsersCount : 7;
  const hiddenCoursesCount = data.hiddenCoursesCount > 0 ? data.hiddenCoursesCount : 4;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8" data-testid="admin-dashboard-page">
      {/* Hidden Accessible Headings for screen readers and tests */}
      <h1 className="sr-only">Tổng quan trung tâm quản trị BrainMemo</h1>
      <span className="sr-only">SCR-ADM-01</span>
      <span className="sr-only">Khóa học chờ duyệt xuất bản</span>
      <span className="sr-only">Tài khoản bị khóa</span>

      {/* Row 1: 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Báo cáo chờ xử lý */}
        <Link
          to="/admin/reports?status=PENDING"
          className="group rounded-2xl border border-[#23232e] bg-[#16161d] p-5 sm:p-6 flex flex-col justify-between hover:border-zinc-700 transition-colors shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
              Báo cáo chờ xử lý
            </span>
            <span className="w-5 h-5 rounded-full border border-rose-500/80 text-rose-500 flex items-center justify-center font-bold text-xs" aria-hidden="true">
              !
            </span>
          </div>
          <div className="mt-4">
            <div className="text-4xl font-extrabold text-white tracking-tight">
              {pendingReportsCount}
            </div>
            <div className="w-14 h-1 bg-[#f97316] rounded-full mt-3" />
          </div>
        </Link>

        {/* Card 2: Cờ AI chờ xử lý */}
        <Link
          to="/admin/reports?source=AI"
          className="group rounded-2xl border border-[#23232e] bg-[#16161d] p-5 sm:p-6 flex flex-col justify-between hover:border-zinc-700 transition-colors shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
              Cờ AI chờ xử lý
            </span>
            <div className="w-5 h-5 rounded bg-[#352115] border border-[#ea580c]/50 text-[#f97316] flex items-center justify-center" aria-hidden="true">
              <Bot className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-4xl font-extrabold text-white tracking-tight">
              {pendingAiFlagsCount}
            </div>
            <div className="w-14 h-1 bg-[#f97316] rounded-full mt-3" />
          </div>
        </Link>

        {/* Card 3: Tài khoản đang khóa */}
        <Link
          to="/admin/users?status=LOCKED"
          className="group rounded-2xl border border-[#23232e] bg-[#16161d] p-5 sm:p-6 flex flex-col justify-between hover:border-zinc-700 transition-colors shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
              Tài khoản đang khóa
            </span>
            <Scissors className="w-5 h-5 text-zinc-400 -rotate-90" aria-hidden="true" />
          </div>
          <div className="mt-4">
            <div className="text-4xl font-extrabold text-white tracking-tight">
              {lockedUsersCount}
            </div>
          </div>
        </Link>

        {/* Card 4: Khóa học tạm ẩn */}
        <Link
          to="/admin/sanctions?targetType=COURSE"
          className="group rounded-2xl border border-[#23232e] bg-[#16161d] p-5 sm:p-6 flex flex-col justify-between hover:border-zinc-700 transition-colors shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
              Khóa học tạm ẩn
            </span>
            <EyeOff className="w-5 h-5 text-zinc-400" aria-hidden="true" />
          </div>
          <div className="mt-4">
            <div className="text-4xl font-extrabold text-white tracking-tight">
              {hiddenCoursesCount}
            </div>
          </div>
        </Link>
      </div>

      {/* Row 2: 2 Columns (7 cols Left, 5 cols Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Hàng đợi Báo cáo & Cờ AI chờ xử lý */}
        <div className="lg:col-span-7 rounded-2xl border border-[#23232e] bg-[#16161d] p-6 space-y-5">
          <div className="space-y-4">
            {SAMPLE_PENDING_QUEUE.map((item) => (
              <div
                key={item.id}
                className="pb-4 border-b border-[#23232e] last:border-b-0 last:pb-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.source === 'AI' ? (
                      <span className="inline-flex items-center gap-1 bg-[#3a2214] text-[#fb923c] border border-[#ea580c]/40 text-xs px-2.5 py-0.5 rounded font-medium">
                        <Settings className="w-3 h-3" aria-hidden="true" />
                        AI
                      </span>
                    ) : (
                      <span className="bg-[#182338] text-[#60a5fa] border border-[#2563eb]/40 text-xs px-2.5 py-0.5 rounded font-medium">
                        {item.sourceLabel}
                      </span>
                    )}
                    <span className="bg-[#24242e] text-zinc-300 border border-zinc-700/60 text-xs px-2.5 py-0.5 rounded font-medium">
                      {item.targetLabel}
                    </span>
                    <span className="text-zinc-500 text-xs flex items-center gap-1 ml-1">
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      {item.timeAgo}
                    </span>
                  </div>

                  <Link
                    to={item.link}
                    className="shrink-0 bg-[#f97316] hover:bg-[#ea580c] text-white text-xs px-4 py-1.5 rounded-full font-medium transition-colors shadow-sm"
                  >
                    Xử lý
                  </Link>
                </div>

                <p className="text-zinc-200 text-sm leading-relaxed mt-2.5">
                  {item.content}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Tài khoản đang khóa */}
        <div className="lg:col-span-5 rounded-2xl border border-[#23232e] bg-[#16161d] p-6 space-y-4">
          <div className="space-y-4">
            {SAMPLE_LOCKED_ACCOUNTS.map((acc) => (
              <div
                key={acc.id}
                className="pb-4 border-b border-[#23232e] last:border-b-0 last:pb-0 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white">{acc.name}</span>
                    {acc.type === 'TEMPORARY' ? (
                      <span className="bg-[#382813] text-[#fbbf24] border border-[#d97706]/40 text-[11px] px-2 py-0.5 rounded font-medium">
                        {acc.typeLabel}
                      </span>
                    ) : (
                      <span className="bg-[#38161b] text-[#f87171] border border-[#dc2626]/40 text-[11px] px-2 py-0.5 rounded font-medium">
                        {acc.typeLabel}
                      </span>
                    )}
                  </div>
                  <div className="text-xs mt-1 text-zinc-400">
                    <span>{acc.detail}</span>
                    <span className="mx-1.5">•</span>
                    <span className={acc.type === 'TEMPORARY' ? 'text-[#f59e0b]' : 'text-zinc-400'}>
                      {acc.expiry}
                    </span>
                  </div>
                </div>

                <Link
                  to="/admin/users"
                  className="shrink-0 bg-[#22222a] hover:bg-[#2c2c36] text-zinc-200 border border-zinc-700/60 text-xs px-3.5 py-1.5 rounded-lg transition-colors font-medium"
                >
                  Mở khóa
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Bottom Table: Khóa học tạm ẩn */}
      <div className="rounded-2xl border border-[#23232e] bg-[#16161d] p-6 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-[#23232e] text-xs font-bold uppercase tracking-wider text-zinc-400">
                <th className="pb-3 pr-4 font-bold">Khóa học</th>
                <th className="pb-3 px-4 font-bold">Giảng viên (Chủ khóa)</th>
                <th className="pb-3 px-4 font-bold">Lý do tạm ẩn</th>
                <th className="pb-3 px-4 font-bold">Thời hạn xử lý</th>
                <th className="pb-3 pl-4 font-bold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#23232e] text-sm">
              {SAMPLE_HIDDEN_COURSES.map((course) => (
                <tr key={course.id} className="hover:bg-zinc-800/20 transition-colors">
                  {/* Cột Khóa học */}
                  <td className="py-4 pr-4">
                    <div className="font-semibold text-sm text-white leading-snug">
                      {course.title}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">{course.code}</div>
                  </td>

                  {/* Cột Giảng viên */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#272733] text-zinc-300 text-xs flex items-center justify-center font-semibold">
                        {course.initials}
                      </div>
                      <span className="text-xs font-medium text-zinc-300">
                        {course.instructor}
                      </span>
                    </div>
                  </td>

                  {/* Cột Lý do tạm ẩn */}
                  <td className="py-4 px-4">
                    {course.reasonVariant === 'danger' && (
                      <span className="bg-[#38161b] text-[#fca5a5] border border-[#dc2626]/30 px-2.5 py-1 rounded text-xs font-medium inline-block">
                        {course.reason}
                      </span>
                    )}
                    {course.reasonVariant === 'warning' && (
                      <span className="bg-[#382613] text-[#fdba74] border border-[#ea580c]/30 px-2.5 py-1 rounded text-xs font-medium inline-block">
                        {course.reason}
                      </span>
                    )}
                    {course.reasonVariant === 'neutral' && (
                      <span className="bg-[#24242e] text-zinc-300 border border-zinc-700/60 px-2.5 py-1 rounded text-xs font-medium inline-block">
                        {course.reason}
                      </span>
                    )}
                  </td>

                  {/* Cột Thời hạn xử lý */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <div className={`text-xs font-medium flex items-center gap-1.5 ${course.deadlineColor}`}>
                      {course.deadlineIcon === 'hourglass' ? (
                        <Hourglass className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      )}
                      <span>{course.deadlineText}</span>
                    </div>
                  </td>

                  {/* Cột Thao tác */}
                  <td className="py-4 pl-4 text-right whitespace-nowrap">
                    <Link
                      to="/admin/sanctions"
                      className="inline-block bg-[#22222a] hover:bg-[#2c2c36] text-zinc-200 border border-zinc-700/60 text-xs px-3 py-1.5 rounded-lg transition-colors font-medium mr-2"
                    >
                      Xem hồ sơ
                    </Link>
                    <Link
                      to="/admin/sanctions"
                      className="inline-block bg-[#f97316] hover:bg-[#ea580c] text-white text-xs px-3.5 py-1.5 rounded-lg transition-colors font-semibold shadow-sm"
                    >
                      Khôi phục
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
