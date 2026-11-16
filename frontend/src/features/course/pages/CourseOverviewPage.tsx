import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Home,
  ChevronRight,
  LayoutDashboard,
  BookOpen,
  Users,
  CheckSquare,
  GraduationCap,
  BarChart3,
  ExternalLink,
  MoreVertical,
  Edit3,
  Star,
  Heart,
  MessageSquare,
  Trophy,
  ShieldCheck,
  CheckCircle2,
  Flag,
  Info,
} from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Skeleton,
  ErrorState,
  useToast,
} from '@/shared/ui';
import {
  useCourseOverviewQuery,
  useApproveEnrollmentRequestMutation,
  useRejectEnrollmentRequestMutation,
  type EnrollmentRequestItem,
} from '../api/courseApi';
import defaultCourseCover from '@/assets/courses';

export function CourseOverviewPage() {
  const { courseId = '' } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { pushToast } = useToast();

  const [timeRange, setTimeRange] = useState<'THIS_WEEK' | 'THIS_MONTH' | 'ALL_TIME'>('ALL_TIME');
  const [showEmptySubmissions, setShowEmptySubmissions] = useState(false);
  const [showEmptyRequests, setShowEmptyRequests] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  const { data, isLoading, isError, error, refetch } = useCourseOverviewQuery(courseId, timeRange);
  const { mutateAsync: approveRequest } = useApproveEnrollmentRequestMutation(courseId);
  const { mutateAsync: rejectRequest } = useRejectEnrollmentRequestMutation(courseId);

  const [localRequests, setLocalRequests] = useState<EnrollmentRequestItem[] | null>(null);

  const course = data?.course;
  const stats = data?.stats;
  const ranking = data?.ranking;
  const pendingSubmissions = showEmptySubmissions ? [] : (data?.pendingSubmissions || []);
  const pendingRequests = showEmptyRequests
    ? []
    : localRequests !== null
    ? localRequests
    : data?.pendingRequests || [];
  const reports = data?.reports || [];

  const handleApprove = async (req: EnrollmentRequestItem) => {
    try {
      await approveRequest(req.id);
      setLocalRequests((prev) => (prev ?? (data?.pendingRequests || [])).filter((r) => r.id !== req.id));
      pushToast({
        title: 'Đã duyệt yêu cầu tham gia',
        description: `Học viên "${req.studentName}" đã được cấp quyền vào khóa học.`,
        tone: 'success',
      });
    } catch {
      pushToast({
        title: 'Thao tác thất bại',
        description: 'Không thể duyệt yêu cầu lúc này.',
        tone: 'error',
      });
    }
  };

  const handleReject = async (req: EnrollmentRequestItem) => {
    try {
      await rejectRequest(req.id);
      setLocalRequests((prev) => (prev ?? (data?.pendingRequests || [])).filter((r) => r.id !== req.id));
      pushToast({
        title: 'Đã từ chối yêu cầu',
        description: `Đã từ chối yêu cầu tham gia của "${req.studentName}".`,
        tone: 'default',
      });
    } catch {
      pushToast({
        title: 'Thao tác thất bại',
        description: 'Không thể từ chối yêu cầu lúc này.',
        tone: 'error',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-10 w-full rounded-full" />
        <Skeleton className="h-72 w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <ErrorState
          title="Không thể tải tổng quan khóa học"
          error={error}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const courseTitle = course.name || 'Khóa học chưa đặt tên';
  const coverImage = course.coverUrl || defaultCourseCover;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 text-foreground">
      {/* 1. TOP BREADCRUMB: Trang chủ / Tổng quan {courseTitle} */}
      <nav
        aria-label="Đường dẫn điều hướng"
        className="flex items-center gap-2 text-xs text-muted-foreground"
      >
        <Link
          to="/manage/courses"
          className="hover:text-foreground transition-colors flex items-center gap-1.5"
        >
          <Home className="h-3.5 w-3.5" />
          <span>Trang chủ</span>
        </Link>
        <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
        <span className="font-semibold text-foreground truncate max-w-[320px] sm:max-w-md">
          Khóa học {courseTitle}
        </span>
      </nav>

      {/* 2. SUB-NAVIGATION TABS (Matching Figma Frame 28:7070) */}
      <div className="border-b border-border/70 pb-3 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {/* Active Tab: Tổng quan */}
          <div className="bg-[#ff7a1a] text-[#5e2700] flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs sm:text-sm shadow-xs select-none">
            <LayoutDashboard className="h-4 w-4" />
            <span>Tổng quan</span>
          </div>

          {/* Link Tab: Danh sách chương */}
          <Link
            to={`/courses/${courseId}/manage/content`}
            className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            <span>Danh sách chương</span>
          </Link>

          {/* Link Tab: Danh sách học viên */}
          <Link
            to={`/courses/${courseId}/manage/students`}
            className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <Users className="h-4 w-4" />
            <span>Danh sách học viên</span>
          </Link>

          {/* Link Tab: Chế độ truy cập */}
          <Link
            to={`/courses/${courseId}/manage/access`}
            className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Chế độ truy cập</span>
          </Link>

          {/* Link Tab: Chấm điểm (badge 12) */}
          <button
            type="button"
            onClick={() =>
              pushToast({
                title: 'Hệ thống chấm điểm',
                description: 'Hàng đợi chấm thi & bảng điểm thuộc phạm vi Slice 8 (S8).',
                tone: 'default',
              })
            }
            className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <CheckSquare className="h-4 w-4" />
            <span>Chấm điểm</span>
            <span className="bg-[#93000a] text-[#ffdad6] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              12
            </span>
          </button>

          {/* Link Tab: Chuẩn đầu ra */}
          <button
            type="button"
            onClick={() =>
              pushToast({
                title: 'Chuẩn đầu ra (CLO/PLO)',
                description: 'Hệ thống quản lý chuẩn đầu ra thuộc phạm vi Slice 9 (S9).',
                tone: 'default',
              })
            }
            className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <GraduationCap className="h-4 w-4" />
            <span>Chuẩn đầu ra</span>
          </button>

          {/* Link Tab: Thống kê */}
          <button
            type="button"
            onClick={() =>
              pushToast({
                title: 'Báo cáo thống kê',
                description: 'Hệ thống phân tích & xuất báo cáo chi tiết thuộc phạm vi Slice 9 (S9).',
                tone: 'default',
              })
            }
            className="flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-xs sm:text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <BarChart3 className="h-4 w-4" />
            <span>Thống kê</span>
          </button>
        </div>
      </div>

      {/* 3. SECTION 1: COURSE INFO CARD (Figma Frame 28:7099) */}
      <section
        aria-label="Thông tin tổng quan khóa học"
        className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-sm"
      >
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          {/* Left: 16:10 Cover image */}
          <div className="relative aspect-[16/10] w-full lg:w-[380px] shrink-0 overflow-hidden rounded-xl bg-muted border border-border/80 shadow-inner">
            <img
              src={coverImage}
              alt={courseTitle}
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            />
          </div>

          {/* Right: Course Details & Controls */}
          <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch space-y-4">
            <div>
              {/* Top Row: Title, Badges & Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-2 min-w-0">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-snug">
                    {courseTitle}
                  </h1>

                  {/* Status Badges Row */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {/* Status Badge */}
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-[#ff7a1a]/15 border border-[#ff7a1a]/30 px-2.5 py-1 text-xs font-medium text-[#ffb68e]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#ff7a1a]" />
                      {course.status === 'COMPLETED'
                        ? 'Đã hoàn thành'
                        : course.status === 'UPDATING'
                        ? 'Đang cập nhật'
                        : 'Tạm dừng'}
                    </span>

                    {/* Access Mode Badge */}
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-xs font-medium text-emerald-400">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                      {course.accessMode === 'ONLY_ME'
                        ? 'Chỉ mình tôi'
                        : course.accessMode === 'PRIVATE'
                        ? 'Riêng tư'
                        : 'Public'}
                    </span>
                  </div>
                </div>

                {/* Right Action Controls */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs h-9 text-primary border-primary/40 hover:bg-primary/10"
                  >
                    <Link to={`/courses/${courseId}`}>
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Xem trong trang khóa học
                    </Link>
                  </Button>

                  {/* Dropdown Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="Thao tác khóa học"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem onClick={() => navigate(`/courses/${courseId}/edit`)}>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Chỉnh sửa khóa học
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Description */}
              <div className="pt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                <p className={isDescExpanded ? '' : 'line-clamp-2'}>
                  {course.description ||
                    'Khóa học cung cấp lộ trình từ nền tảng cú pháp đến tư duy lập trình chuyên sâu, tích hợp thuật toán Spaced Repetition (SRS) giúp người học ghi nhớ kiến thức vĩnh viễn.'}
                </p>
                <button
                  type="button"
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                  className="mt-1 text-xs font-semibold text-primary hover:underline focus:outline-none"
                >
                  {isDescExpanded ? 'Thu gọn' : 'Xem thêm'}
                </button>
              </div>
            </div>

            {/* Bottom Meta Row & Category Tags */}
            <div className="border-t border-border/80 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-muted-foreground">
                {/* Creator */}
                <div className="flex items-center gap-1.5">
                  <span>Người tạo:</span>
                  <div className="flex items-center gap-1.5 font-medium text-foreground">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                      {course.owner?.displayName?.[0]?.toUpperCase() || 'Q'}
                    </span>
                    <span>{course.owner?.displayName || 'Quang Trần'}</span>
                  </div>
                </div>

                {/* Created Date */}
                <div className="flex items-center gap-1">
                  <span>Ngày tạo:</span>
                  <span className="font-medium text-foreground">
                    {course.createdAt
                      ? new Date(course.createdAt).toLocaleDateString('vi-VN')
                      : '15/08/2026'}
                  </span>
                </div>

                {/* Updated At */}
                <div className="flex items-center gap-1">
                  <span>Cập nhật:</span>
                  <span className="font-semibold text-emerald-500">10 phút trước</span>
                </div>
              </div>

              {/* Category Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(course.tags && course.tags.length > 0
                  ? course.tags
                  : ['Python', 'Backend', 'Thuật toán', 'Tự động hóa']
                ).map((tag, idx) => (
                  <span
                    key={idx}
                    className="rounded-md bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground border border-border/60"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SECTION 2: 6 STAT CARDS (Figma Frame 28:7168) */}
      <section aria-label="Chỉ số hiệu quả khóa học">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Card 1: Học viên đang học */}
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#ff7a1a]/20 text-[#ff7a1a]">
                <Users className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                +{stats?.activeLearnersChangeWeekly ?? 18} tuần này
              </span>
            </div>
            <div>
              <p className="font-serif text-2xl font-bold text-foreground">
                {(stats?.activeLearners ?? 1240).toLocaleString('vi-VN')}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Học viên đang học</p>
            </div>
          </div>

          {/* Card 2: Đã hoàn thành (Progress Ring) */}
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                <GraduationCap className="h-4 w-4" />
              </div>
              {/* Mini Circular Progress Ring 25% */}
              <div className="relative h-7 w-7">
                <svg className="h-7 w-7 -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-muted stroke-current"
                    strokeWidth="3.5"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#ff7a1a] stroke-current"
                    strokeDasharray="25, 100"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
              </div>
            </div>
            <div>
              <p className="font-serif text-2xl font-bold text-foreground flex items-baseline gap-1">
                <span>{stats?.completedLearners ?? 310}</span>
                <span className="font-sans text-sm font-semibold text-primary">
                  · {stats?.completionRatePercent ?? 25}%
                </span>
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-0.5">
                <span>Đã hoàn thành</span>
                <span className="text-[11px]">Mục tiêu: {stats?.completionTargetPercent ?? 30}%</span>
              </div>
            </div>
          </div>

          {/* Card 3: Số chương học */}
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                <BookOpen className="h-4 w-4" />
              </div>
              <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                {stats?.publishedChapters ?? 22}/{stats?.totalChapters ?? 24} live
              </span>
            </div>
            <div>
              <p className="font-serif text-2xl font-bold text-foreground">
                {stats?.totalChapters ?? 24}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Số chương học</p>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                {stats?.publishedChapters ?? 22} đã xuất bản · {stats?.draftChapters ?? 2} nháp
              </p>
            </div>
          </div>

          {/* Card 4: Số bình luận */}
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
                <MessageSquare className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                +{stats?.newCommentsCount ?? 48} mới
              </span>
            </div>
            <div>
              <p className="font-serif text-2xl font-bold text-foreground">
                {(stats?.totalComments ?? 872).toLocaleString('vi-VN')}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Số bình luận</p>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                Phản hồi trung bình {stats?.avgResponseTimeHours ?? 2}h
              </p>
            </div>
          </div>

          {/* Card 5: Số đánh giá */}
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                <Star className="h-4 w-4 fill-amber-400" />
              </div>
              <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                ★ {stats?.averageRating ?? 4.8}
              </span>
            </div>
            <div>
              <p className="font-serif text-2xl font-bold text-foreground">
                {stats?.totalRatings ?? 320}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Số đánh giá</p>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                {stats?.fiveStarPercentage ?? 92}% đánh giá 5 sao
              </p>
            </div>
          </div>

          {/* Card 6: Số đề cử */}
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400">
                <Heart className="h-4 w-4 fill-rose-400" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                TOP ĐỀ CỬ
              </span>
            </div>
            <div>
              <p className="font-serif text-2xl font-bold text-foreground">
                {stats?.totalRecommendations ?? 560}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Số đề cử</p>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                Xếp #{stats?.systemRank ?? 3} toàn hệ thống
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SECTION 3: COURSE RANKING (Figma Frame 28:7266) */}
      <section
        aria-label="Bảng xếp hạng khóa học"
        className="rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-sm space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider text-foreground">
              XẾP HẠNG KHÓA HỌC
            </h2>
          </div>

          {/* Segmented Time Range Filter */}
          <div className="flex items-center rounded-full bg-muted p-1 text-xs">
            <button
              type="button"
              onClick={() => setTimeRange('THIS_WEEK')}
              className={`rounded-full px-4 py-1.5 font-medium transition-all ${
                timeRange === 'THIS_WEEK'
                  ? 'bg-primary text-[#5e2700] font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Tuần này
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('THIS_MONTH')}
              className={`rounded-full px-4 py-1.5 font-medium transition-all ${
                timeRange === 'THIS_MONTH'
                  ? 'bg-primary text-[#5e2700] font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Tháng này
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('ALL_TIME')}
              className={`rounded-full px-4 py-1.5 font-medium transition-all ${
                timeRange === 'ALL_TIME'
                  ? 'bg-primary text-[#5e2700] font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Toàn thời gian
            </button>
          </div>
        </div>

        {/* 3 Equal Ranking Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card A: Theo số học viên */}
          <div className="rounded-xl border border-border/80 bg-muted/30 p-5 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <Users className="h-4 w-4 text-primary" />
                <span>Theo số học viên</span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                Top {ranking?.byStudents?.percentileTop ?? 1.0}%
              </span>
            </div>
            <div>
              <p className="font-serif text-4xl sm:text-5xl font-bold text-primary flex items-baseline gap-2">
                <span>#{ranking?.byStudents?.rank ?? 12}</span>
                <span className="font-sans text-xs sm:text-sm font-normal text-muted-foreground">
                  / {(ranking?.byStudents?.totalCourses ?? 1240).toLocaleString('vi-VN')} khóa học
                </span>
              </p>
            </div>
            <div className="border-t border-border/60 pt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Quy mô lớp:</span>
              <span className="font-semibold text-foreground">
                {(ranking?.byStudents?.classSize ?? 1240).toLocaleString('vi-VN')} học viên
              </span>
            </div>
          </div>

          {/* Card B: Theo lượt đề cử (Highlight Top 3) */}
          <div className="relative rounded-xl border-2 border-primary/50 bg-primary/5 p-5 flex flex-col justify-between space-y-4 shadow-sm overflow-hidden">
            {/* Subtle glow circle */}
            <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-primary/15 blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <Heart className="h-4 w-4 fill-primary text-primary" />
                <span>Theo lượt đề cử</span>
              </div>
              <span className="rounded-full bg-amber-400/20 text-amber-400 text-xs font-bold px-2 py-0.5">
                Top 3 🏆
              </span>
            </div>
            <div className="relative z-10">
              <p className="font-serif text-4xl sm:text-5xl font-bold text-primary flex items-baseline gap-2">
                <span>#{ranking?.byRecommendations?.rank ?? 3}</span>
                <span className="font-sans text-xs sm:text-sm font-normal text-muted-foreground">
                  / {(ranking?.byRecommendations?.totalCourses ?? 1240).toLocaleString('vi-VN')} khóa học
                </span>
              </p>
            </div>
            <div className="border-t border-primary/20 pt-3 flex items-center justify-between text-xs relative z-10">
              <span className="text-muted-foreground">Tổng đề cử cộng đồng:</span>
              <span className="font-semibold text-primary">
                {ranking?.byRecommendations?.totalRecommendations ?? 560} lượt đề cử
              </span>
            </div>
          </div>

          {/* Card C: Theo lượt đánh giá */}
          <div className="rounded-xl border border-border/80 bg-muted/30 p-5 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span>Theo lượt đánh giá</span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                Top {ranking?.byRatings?.percentileTop ?? 0.6}%
              </span>
            </div>
            <div>
              <p className="font-serif text-4xl sm:text-5xl font-bold text-primary flex items-baseline gap-2">
                <span>#{ranking?.byRatings?.rank ?? 8}</span>
                <span className="font-sans text-xs sm:text-sm font-normal text-muted-foreground">
                  / {(ranking?.byRatings?.totalCourses ?? 1240).toLocaleString('vi-VN')} khóa học
                </span>
              </p>
            </div>
            <div className="border-t border-border/60 pt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Đánh giá trung bình:</span>
              <span className="font-semibold text-foreground">
                {ranking?.byRatings?.ratingsCount ?? 320} đánh giá ({ranking?.byRatings?.averageRating ?? 4.8}★)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SECTION 4: PENDING WORK (Figma Frame 28:7332) */}
      <section aria-label="Việc cần xử lý">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cột trái: Bài tập nộp chưa chấm */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/70 pb-3">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-base text-foreground">Bài tập nộp chưa chấm</h3>
                  <span className="bg-[#93000a] text-[#ffdad6] text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendingSubmissions.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    pushToast({
                      title: 'Chấm điểm bài tập',
                      description: 'Màn hình chấm điểm chi tiết thuộc phạm vi Slice 8 (S8).',
                      tone: 'default',
                    })
                  }
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                >
                  <span>Xem tất cả (Chấm điểm)</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>

              {/* Items List */}
              {pendingSubmissions.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500/60 mb-2" />
                  <p>Tuyệt vời! Không có bài tập nào đang chờ chấm.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {pendingSubmissions.map((item) => (
                    <div
                      key={item.id}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-muted/20 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center font-bold text-xs text-white ${
                            item.avatarBgColor || 'bg-primary'
                          }`}
                        >
                          {item.studentInitials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {item.studentName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.assignmentTitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] text-muted-foreground hidden sm:inline">
                          {item.timeAgo}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() =>
                            pushToast({
                              title: 'Chấm bài tập',
                              description: `Đang mở trình chấm bài "${item.assignmentTitle}" cho học viên ${item.studentName}.`,
                              tone: 'default',
                            })
                          }
                          className="bg-primary hover:bg-primary/90 text-[#5e2700] font-semibold text-xs h-7 px-3 rounded-full"
                        >
                          Chấm
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Toggle demo empty state */}
            <div className="border-t border-border/60 pt-3 text-center">
              <button
                type="button"
                onClick={() => setShowEmptySubmissions(!showEmptySubmissions)}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {showEmptySubmissions ? '(Khôi phục danh sách mẫu)' : '(Xem trạng thái danh sách rỗng)'}
              </button>
            </div>
          </div>

          {/* Cột phải: Yêu cầu tham gia chờ duyệt */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/70 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-base text-foreground">Yêu cầu tham gia chờ duyệt</h3>
                  <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendingRequests.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    pushToast({
                      title: 'Danh sách học viên',
                      description: 'Màn hình duyệt danh sách học viên chi tiết thuộc phạm vi Slice 4 (S4).',
                      tone: 'default',
                    })
                  }
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                >
                  <span>Xem tất cả (Danh sách học viên)</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>

              {/* Items List */}
              {pendingRequests.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500/60 mb-2" />
                  <p>Hiện không có yêu cầu xin tham gia khóa học nào.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {pendingRequests.map((item) => (
                    <div
                      key={item.id}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-muted/20 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center font-bold text-xs text-white ${
                            item.avatarBgColor || 'bg-primary'
                          }`}
                        >
                          {item.studentInitials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {item.studentName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.studentRoleOrSchool}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleApprove(item)}
                          className="bg-primary hover:bg-primary/90 text-[#5e2700] font-semibold text-xs h-7 px-2.5 rounded-full"
                        >
                          Duyệt
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(item)}
                          className="text-muted-foreground hover:text-foreground text-xs h-7 px-2.5 rounded-full"
                        >
                          Từ chối
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Toggle demo empty state */}
            <div className="border-t border-border/60 pt-3 text-center">
              <button
                type="button"
                onClick={() => setShowEmptyRequests(!showEmptyRequests)}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {showEmptyRequests ? '(Khôi phục yêu cầu mẫu)' : '(Xem trạng thái không có yêu cầu)'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. SECTION 5: COURSE REPORTS (Figma Frame 28:7512) */}
      <section
        aria-label="Báo cáo vi phạm của khóa học"
        className="rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-sm space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Flag className="h-5 w-5 text-amber-500" />
            <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider text-foreground">
              BÁO CÁO CỦA KHÓA HỌC
            </h2>
            <Link
              to={`/courses/${courseId}/manage/reports`}
              className="text-xs text-primary font-semibold hover:underline ml-2"
            >
              Xem trang quản lý báo cáo &rarr;
            </Link>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            <span>Danh tính người gửi ẩn danh theo chính sách bảo mật LMS</span>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto rounded-xl border border-border bg-[#1b1b21]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/30 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3 px-4 w-28">ĐỐI TƯỢNG</th>
                <th className="py-3 px-4 min-w-[280px]">NỘI DUNG TRÍCH ĐOẠN</th>
                <th className="py-3 px-4 w-44">LÝ DO</th>
                <th className="py-3 px-4 w-28">NGÀY BÁO CÁO</th>
                <th className="py-3 px-4 w-32 text-right">TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {reports.map((rep) => (
                <tr key={rep.id} className="hover:bg-muted/10 transition-colors">
                  <td className="py-3 px-4">
                    <span className="rounded bg-muted px-2 py-0.5 font-medium text-primary">
                      {rep.targetType}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-normal text-foreground">
                    <p className="line-clamp-2 italic">{rep.excerpt}</p>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{rep.reason}</td>
                  <td className="py-3 px-4 font-mono text-muted-foreground">{rep.reportedDate}</td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        rep.status === 'Chờ xử lý'
                          ? 'bg-amber-500/20 text-amber-400'
                          : rep.status === 'Đã chấp nhận'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {rep.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
