import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen,
  CheckCircle2,
  BookOpen,
  FileText,
  Award,
  ChevronDown,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useToast } from '@/shared/ui';

interface CourseProgress {
  id: string;
  code: string;
  title: string;
  thumbnail: string;
  completedChapters: number;
  totalChapters: number;
  percent: number;
  isCompleted?: boolean;
  completionDate?: string;
  recentChapter?: string;
  recentTimeAgo?: string;
}

const COURSES_DATA: CourseProgress[] = [
  {
    id: 'python-basic',
    code: 'python',
    title: 'Python cơ bản cho người mới',
    thumbnail:
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=200&auto=format&fit=crop&q=60',
    completedChapters: 12,
    totalChapters: 24,
    percent: 45,
    recentChapter: 'Chương 4 : Hàm & Phạm vi biến',
    recentTimeAgo: '2 giờ trước',
  },
  {
    id: 'dsa',
    code: 'dsa',
    title: 'Cấu trúc dữ liệu & Giải thuật',
    thumbnail:
      'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=200&auto=format&fit=crop&q=60',
    completedChapters: 18,
    totalChapters: 25,
    percent: 72,
    recentChapter: 'Chương 18 : Đồ thị nâng cao & Dijkstra',
    recentTimeAgo: '1 ngày trước',
  },
  {
    id: 'web-django',
    code: 'web',
    title: 'Lập trình Web Django & FastAPI',
    thumbnail:
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=200&auto=format&fit=crop&q=60',
    completedChapters: 20,
    totalChapters: 20,
    percent: 100,
    isCompleted: true,
    completionDate: '20/10/2026',
    recentChapter: 'Chương 20 : Triển khai Docker & Kubernetes',
    recentTimeAgo: '3 tuần trước',
  },
];

const DAILY_STATS_DATA = {
  '7d': {
    total: '6 giờ 20 phút',
    average: '54 phút / ngày',
    days: [
      { label: 'T2', minutes: 40, heightPercent: 42, date: '04/11', info: 'Ôn tập cú pháp' },
      { label: 'T3', minutes: 65, heightPercent: 65, date: '05/11', info: 'Cấu trúc rẽ nhánh' },
      { label: 'T4', minutes: 30, heightPercent: 30, date: '06/11', info: 'Vòng lặp For/While' },
      { label: 'T5', minutes: 75, heightPercent: 75, date: '07/11', info: 'List & Tuple' },
      { label: 'T6', minutes: 45, heightPercent: 45, date: '08/11', info: 'Dictionary & Set' },
      {
        label: 'T7',
        minutes: 85,
        heightPercent: 88,
        date: '09/11',
        timeText: '1 giờ 25 phút',
        info: 'Chương 4 & Bài tập Scope',
        isPeak: true,
      },
      { label: 'CN', minutes: 50, heightPercent: 50, date: '10/11', info: 'Lambda & Map' },
    ],
  },
  '30d': {
    total: '28 giờ 45 phút',
    average: '58 phút / ngày',
    days: [
      { label: 'Tuần 1', minutes: 420, heightPercent: 60, date: '1-7/10', info: '7 giờ học' },
      { label: 'Tuần 2', minutes: 510, heightPercent: 78, date: '8-14/10', info: '8 giờ 30 phút' },
      {
        label: 'Tuần 3',
        minutes: 620,
        heightPercent: 92,
        date: '15-21/10',
        timeText: '10 giờ 20 phút',
        info: 'Tuần học cao điểm',
        isPeak: true,
      },
      { label: 'Tuần 4', minutes: 450, heightPercent: 68, date: '22-28/10', info: '7 giờ 30 phút' },
    ],
  },
  '90d': {
    total: '84 giờ 10 phút',
    average: '56 phút / ngày',
    days: [
      { label: 'Tháng 8', minutes: 1600, heightPercent: 65, date: '08/2026', info: '26 giờ' },
      {
        label: 'Tháng 9',
        minutes: 1950,
        heightPercent: 85,
        date: '09/2026',
        timeText: '32 giờ 30 phút',
        info: 'Tháng bứt phá',
        isPeak: true,
      },
      { label: 'Tháng 10', minutes: 1500, heightPercent: 60, date: '10/2026', info: '25 giờ' },
    ],
  },
};

export function LearningDashboardPage() {
  const navigate = useNavigate();
  const { pushToast } = useToast();

  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('ALL');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Active course preview on the right card
  const previewCourse = useMemo(() => {
    if (selectedCourseFilter !== 'ALL') {
      const match = COURSES_DATA.find((c) => c.code === selectedCourseFilter);
      if (match) return match;
    }
    return COURSES_DATA[0]!; // Default to Python cơ bản
  }, [selectedCourseFilter]);

  const currentChartData = DAILY_STATS_DATA[timeRange];

  // Radial gauge calculations
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (previewCourse.percent / 100) * circumference;

  return (
    <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Top Filter Bar: Course Selector */}
      <div className="flex items-center justify-end">
        <div className="relative inline-block text-left">
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={selectedCourseFilter}
                onChange={(e) => {
                  setSelectedCourseFilter(e.target.value);
                  pushToast({
                    title:
                      e.target.value === 'ALL'
                        ? 'Hiển thị dữ liệu tất cả khóa học'
                        : `Lọc dữ liệu theo khóa: ${e.target.value}`,
                    tone: 'default',
                  });
                }}
                className="appearance-none h-9 pl-8 pr-8 rounded-xl bg-white dark:bg-[#141519] border border-zinc-200 dark:border-[#22242b] text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs transition-colors cursor-pointer"
              >
                <option value="ALL">Tất cả khóa học</option>
                <option value="python">Python cơ bản cho người mới</option>
                <option value="dsa">Cấu trúc dữ liệu & Giải thuật</option>
                <option value="web">Lập trình Web Django & FastAPI</option>
              </select>
              <Filter className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: TỶ LỆ HOÀN THÀNH KHÓA HỌC */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="w-1 h-5 rounded-full bg-[#f97316]" />
          <h2 className="text-sm sm:text-base font-bold tracking-wider text-zinc-800 dark:text-zinc-100 uppercase">
            TỶ LỆ HOÀN THÀNH KHÓA HỌC
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Course List Progress (col-span-8) */}
          <div className="lg:col-span-8 rounded-2xl border border-zinc-200 dark:border-[#22242b] bg-white dark:bg-[#141519] p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-1 border-b border-zinc-100 dark:border-zinc-800/60">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                <FolderOpen className="w-4 h-4 text-amber-500" />
                <span>Danh sách khóa học</span>
              </div>
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                Đang hiển thị: Tất cả khóa
              </span>
            </div>

            <div className="space-y-4 pt-1">
              {COURSES_DATA.map((course) => (
                <div
                  key={course.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/40 hover:border-zinc-300 dark:hover:border-zinc-700/60 transition-colors"
                >
                  {/* Left: Thumbnail & Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-12 h-10 sm:w-14 sm:h-11 rounded-lg object-cover bg-zinc-900 shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
                        <span>{course.title}</span>
                        {course.isCompleted && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 inline" />
                        )}
                      </h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {course.isCompleted
                          ? `${course.completedChapters}/${course.totalChapters} chương - Hoàn thành: ${course.completionDate}`
                          : `Tiến độ: ${course.completedChapters}/${course.totalChapters} chương hoàn thành`}
                      </p>
                    </div>
                  </div>

                  {/* Middle & Right: Progress bar & Action */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-1 sm:pt-0">
                    <div className="w-32 sm:w-36">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-zinc-400">Tiến độ</span>
                        <span
                          className={`font-semibold ${
                            course.percent === 100
                              ? 'text-emerald-500'
                              : 'text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {course.percent}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            course.percent === 100
                              ? 'bg-emerald-500'
                              : 'bg-[#f97316]'
                          }`}
                          style={{ width: `${course.percent}%` }}
                        />
                      </div>
                    </div>

                    {course.isCompleted ? (
                      <button
                        type="button"
                        onClick={() => navigate('/courses')}
                        className="h-8 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Xem lại
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate('/courses')}
                        className="h-8 px-4 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        Tiếp tục học
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Filter Preview Gauge Card (col-span-4) */}
          <div className="lg:col-span-4 rounded-2xl border border-zinc-200 dark:border-[#22242b] bg-white dark:bg-[#141519] p-5 sm:p-6 flex flex-col justify-between items-center shadow-xs">
            {/* Top Info */}
            <div className="w-full">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 pb-1">
                <span className="uppercase font-bold tracking-wider text-[10px]">
                  XEM TRƯỚC CHẾ ĐỘ LỌC
                </span>
                <span>Khóa đơn lẻ</span>
              </div>
              <p className="text-xs text-center text-zinc-600 dark:text-zinc-400 mt-1 font-medium">
                Khi lọc theo 1 khóa học ({previewCourse.title.split(' ')[0]} cơ bản)
              </p>
            </div>

            {/* Circular Gauge */}
            <div className="relative my-4 flex items-center justify-center">
              <svg width="140" height="140" className="transform -rotate-90">
                {/* Background circle */}
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  className="stroke-zinc-200 dark:stroke-[#22242b]"
                  strokeWidth="10"
                  fill="transparent"
                />
                {/* Progress circle */}
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  className="stroke-[#f97316] transition-all duration-700 ease-out"
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white">
                  {previewCourse.percent}%
                </span>
                <span className="text-[11px] text-zinc-400 mt-0.5">
                  Hoàn thành
                </span>
              </div>
            </div>

            {/* Completed chapter info */}
            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
              {previewCourse.completedChapters} / {previewCourse.totalChapters}{' '}
              chương hoàn thành
            </p>

            {/* Recent Chapter Box */}
            <div className="w-full mt-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/80 text-left">
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                <BookOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Học gần nhất</span>
              </div>
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-1 truncate">
                {previewCourse.recentChapter}
              </p>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                {previewCourse.recentTimeAgo}
              </p>
            </div>

            {/* CTA Button */}
            <button
              type="button"
              onClick={() => navigate('/courses')}
              className="w-full mt-4 py-2.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white text-xs sm:text-sm font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              Tiếp tục học ngay
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 2: THỜI GIAN HỌC THEO NGÀY */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="w-1 h-5 rounded-full bg-[#f97316]" />
          <h2 className="text-sm sm:text-base font-bold tracking-wider text-zinc-800 dark:text-zinc-100 uppercase">
            THỜI GIAN HỌC THEO NGÀY
          </h2>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-[#22242b] bg-white dark:bg-[#141519] p-5 sm:p-6 space-y-6 shadow-xs">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-100 dark:border-zinc-800/60">
            {/* Range Pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setTimeRange('7d')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  timeRange === '7d'
                    ? 'bg-[#f97316] text-white shadow-2xs'
                    : 'text-zinc-500 hover:text-foreground'
                }`}
              >
                7 ngày
              </button>
              <button
                type="button"
                onClick={() => setTimeRange('30d')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  timeRange === '30d'
                    ? 'bg-[#f97316] text-white shadow-2xs'
                    : 'text-zinc-500 hover:text-foreground'
                }`}
              >
                30 ngày
              </button>
              <button
                type="button"
                onClick={() => setTimeRange('90d')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  timeRange === '90d'
                    ? 'bg-[#f97316] text-white shadow-2xs'
                    : 'text-zinc-500 hover:text-foreground'
                }`}
              >
                90 ngày
              </button>
            </div>

            {/* Total & Average Stats */}
            <div className="flex items-center gap-2 sm:gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              <div>
                <span>Tổng thời gian: </span>
                <strong className="text-zinc-900 dark:text-white font-bold">
                  {currentChartData.total}
                </strong>
              </div>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <div>
                <span>Trung bình: </span>
                <strong className="text-zinc-900 dark:text-white font-bold">
                  {currentChartData.average}
                </strong>
              </div>
            </div>
          </div>

          {/* Bar Chart Area */}
          <div className="pt-8 pb-2">
            <div className="h-44 flex items-end justify-between gap-2 sm:gap-6 px-2 sm:px-8">
              {currentChartData.days.map((item, idx) => {
                const isHovered = hoveredBarIndex === idx;
                const isPeak = Boolean(item.isPeak);
                const showTooltip = isPeak || isHovered;

                return (
                  <div
                    key={item.label}
                    className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer"
                    onMouseEnter={() => setHoveredBarIndex(idx)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                  >
                    {/* Tooltip on peak or hover */}
                    {showTooltip && (
                      <div className="absolute -top-11 z-20 whitespace-nowrap p-1.5 px-2.5 rounded-lg bg-zinc-900 text-white dark:bg-[#1f2027] dark:text-zinc-200 border border-zinc-700/80 text-[10px] sm:text-[11px] text-center shadow-lg transition-transform pointer-events-none">
                        <div className="font-bold text-[#f97316]">
                          {item.date}: {item.timeText || `${item.minutes} phút`}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {item.info}
                        </div>
                      </div>
                    )}

                    {/* Bar */}
                    <div
                      className={`w-full max-w-[42px] sm:max-w-[48px] rounded-t-lg transition-all duration-300 ${
                        isPeak
                          ? 'bg-[#f97316] shadow-sm'
                          : 'bg-zinc-200 dark:bg-[#282a33] group-hover:bg-zinc-300 dark:group-hover:bg-[#343642]'
                      }`}
                      style={{ height: `${item.heightPercent}%` }}
                    />

                    {/* Day Label */}
                    <span className="mt-3 text-xs text-zinc-500 font-medium">
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: BÀI TẬP SẮP ĐẾN HẠN & BÀI KIỂM TRA SẮP TỚI HẠN */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left: Bài tập sắp đến hạn */}
        <div className="rounded-2xl border border-zinc-200 dark:border-[#22242b] bg-white dark:bg-[#141519] p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-1 border-b border-zinc-100 dark:border-zinc-800/60">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              <FileText className="w-4 h-4 text-amber-500" />
              <span>BÀI TẬP SẮP ĐẾN HẠN</span>
            </div>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              2 bài tập
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {/* Item 1 */}
            <div className="p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/40 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[11px] text-zinc-400 font-medium">
                  Python cơ bản
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate mt-0.5">
                  Bài tập 04: Xây dựng hàm Decorator tính thời gian
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  <span>Hạn: 20/11/2026 23:59</span>
                  <span>•</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    Còn 10 ngày
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  pushToast({
                    title: 'Chuyển đến màn hình nộp bài tập 04',
                    tone: 'default',
                  })
                }
                className="px-4 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold shrink-0 transition-colors cursor-pointer"
              >
                Nộp bài
              </button>
            </div>

            {/* Item 2 */}
            <div className="p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/40 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[11px] text-zinc-400 font-medium">
                  Lập trình Web Django
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate mt-0.5">
                  Bài tập 01: Thiết lập môi trường Docker
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  <span>Hạn: 18/11/2026 18:00</span>
                  <span>•</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40">
                    Còn 14 giờ
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  pushToast({
                    title: 'Chuyển đến màn hình nộp gấp bài tập Docker',
                    tone: 'warning',
                  })
                }
                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shrink-0 shadow-2xs transition-colors cursor-pointer"
              >
                Nộp gấp
              </button>
            </div>
          </div>
        </div>

        {/* Right: Bài kiểm tra sắp tới hạn */}
        <div className="rounded-2xl border border-zinc-200 dark:border-[#22242b] bg-white dark:bg-[#141519] p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-1 border-b border-zinc-100 dark:border-zinc-800/60">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              <Award className="w-4 h-4 text-sky-500" />
              <span>BÀI KIỂM TRA SẮP TỚI HẠN</span>
            </div>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              2 bài thi
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {/* Item 1 */}
            <div className="p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/40 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[11px] text-zinc-400 font-medium">
                  Python cơ bản
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate mt-0.5">
                  Kiểm tra Giữa kỳ: Cấu trúc điều khiển & Hàm
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  <span>Hạn chót: 17/11/2026 21:00</span>
                  <span>•</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                    Còn 3 ngày
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[10px] text-zinc-400">Số lần làm: 1/2</span>
                <button
                  type="button"
                  onClick={() =>
                    pushToast({
                      title: 'Bắt đầu bài kiểm tra Giữa kỳ Python',
                      tone: 'success',
                    })
                  }
                  className="px-4 py-1.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  Làm bài
                </button>
              </div>
            </div>

            {/* Item 2 */}
            <div className="p-3.5 rounded-xl bg-zinc-50/80 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/40 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[11px] text-zinc-400 font-medium">
                  Cấu trúc dữ liệu & Giải thuật
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate mt-0.5">
                  Kiểm tra Đánh giá Năng lực Thuật toán 01
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  <span>Mở lúc: 19/11/2026 08:00</span>
                  <span>•</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    Chưa bắt đầu
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[10px] text-zinc-400">Số lần làm: 0/1</span>
                <button
                  type="button"
                  disabled
                  className="px-4 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800/60 text-zinc-400 dark:text-zinc-500 text-xs font-semibold cursor-not-allowed"
                >
                  Chưa mở
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: BẢNG ĐIỂM CÁ NHÂN */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="w-1 h-5 rounded-full bg-[#f97316]" />
          <h2 className="text-sm sm:text-base font-bold tracking-wider text-zinc-800 dark:text-zinc-100 uppercase">
            BẢNG ĐIỂM CÁ NHÂN
          </h2>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-[#22242b] bg-white dark:bg-[#141519] p-5 sm:p-6 overflow-x-auto shadow-xs">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                <th className="py-2.5 pr-4">KHÓA HỌC</th>
                <th className="py-2.5 px-4 text-center">ĐIỂM TỔNG KẾT</th>
                <th className="py-2.5 px-4 text-center">XẾP LOẠI</th>
                <th className="py-2.5 px-4">ĐÁNH GIÁ CHUẨN ĐẦU RA (CLO)</th>
                <th className="py-2.5 px-4 text-center">TRẠNG THÁI CLO</th>
                <th className="py-2.5 pl-4 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
              {/* Row 1: Python cơ bản */}
              <tr className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30 transition-colors">
                <td className="py-3.5 pr-4 font-semibold text-zinc-900 dark:text-zinc-100">
                  Python cơ bản
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    8,2
                  </span>
                  <span className="text-[11px] text-zinc-400 ml-1">/ 10</span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                    Giỏi
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                      CLO1: Tốt
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/40">
                      CLO2: Đạt
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                      CLO3: Tốt
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                    <span>✓</span> Đạt chuẩn đầu ra
                  </span>
                </td>
                <td className="py-3.5 pl-4 text-right">
                  <button
                    type="button"
                    onClick={() => navigate('/courses/python-basic/gradebook')}
                    className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-foreground inline-flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  >
                    <span>Xem bảng điểm</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>

              {/* Row 2: Cấu trúc dữ liệu & Giải thuật */}
              <tr className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30 transition-colors">
                <td className="py-3.5 pr-4 font-semibold text-zinc-900 dark:text-zinc-100">
                  Cấu trúc dữ liệu & Giải thuật
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    6,8
                  </span>
                  <span className="text-[11px] text-zinc-400 ml-1">/ 10</span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/40">
                    Khá
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/40">
                      CLO1: Đạt
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40">
                      CLO2: Chưa đạt
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/40">
                      CLO3: Đạt
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40">
                    <span>!</span> Chưa đạt chuẩn
                  </span>
                </td>
                <td className="py-3.5 pl-4 text-right">
                  <button
                    type="button"
                    onClick={() => navigate('/courses/dsa/gradebook')}
                    className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-foreground inline-flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  >
                    <span>Xem bảng điểm</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>

              {/* Row 3: Lập trình Web Django & FastAPI */}
              <tr className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30 transition-colors">
                <td className="py-3.5 pr-4 font-semibold text-zinc-900 dark:text-zinc-100">
                  Lập trình Web Django & FastAPI
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    9,0
                  </span>
                  <span className="text-[11px] text-zinc-400 ml-1">/ 10</span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                    Xuất sắc
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                      CLO1: Xuất sắc
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/40">
                      CLO2: Tốt
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                      CLO3: Xuất sắc
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                    <span>✓</span> Đạt chuẩn đầu ra
                  </span>
                </td>
                <td className="py-3.5 pl-4 text-right">
                  <button
                    type="button"
                    onClick={() => navigate('/courses/web-django/gradebook')}
                    className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-foreground inline-flex items-center gap-1 font-medium transition-colors cursor-pointer"
                  >
                    <span>Xem bảng điểm</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
