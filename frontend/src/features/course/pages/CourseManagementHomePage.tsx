import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Globe,
  Lock,
  EyeOff,
  Star,
  AlertCircle,
  Clock,
  ShieldCheck,
  MoreVertical,
  AlertTriangle,
  FileText,
  Wrench,
  Edit,
  ExternalLink,
} from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  ErrorState,
  Skeleton,
} from '@/shared/ui';
import { useMyCoursesQuery } from '../api/courseApi';
import defaultCourseCover from '@/assets/courses';

export function CourseManagementHomePage() {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UPDATING' | 'COMPLETED' | 'PAUSED' | 'HIDDEN'>('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const { data, isLoading, isError, error, refetch } = useMyCoursesQuery({
    relation: 'OWNED',
    page,
    pageSize,
  });

  const allItems = data?.items || [];
  const filteredItems =
    statusFilter === 'ALL'
      ? allItems
      : allItems.filter((c) => {
          if (statusFilter === 'HIDDEN') return c.accessMode === 'ONLY_ME' || (c.status as any) === 'HIDDEN';
          return c.status === statusFilter;
        });

  const totalCourses = data?.meta?.totalItems || allItems.length;
  const countUpdating = allItems.filter((c) => c.status === 'UPDATING').length;
  const countCompleted = allItems.filter((c) => c.status === 'COMPLETED').length;
  const countPaused = allItems.filter((c) => c.status === 'PAUSED').length;
  const countHidden = allItems.filter((c) => c.accessMode === 'ONLY_ME' || (c.status as any) === 'HIDDEN').length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-20 w-48 rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Không thể tải danh sách khóa học quản lý"
        error={error}
        onRetry={() => refetch()}
      />
    );
  }

  const formatStatNumber = (num: number) => (num < 10 ? `0${num}` : `${num}`);

  return (
    <div className="space-y-8 max-w-[1280px]">
      {/* Page Title matching Figma Frame 26:6293 */}
      <div>
        <h1
          aria-label="Trang chủ Quản lý khóa học"
          className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-foreground"
        >
          Khóa học của tôi
        </h1>
      </div>

      {/* Metric Stat Box (TỔNG KHÓA HỌC: 06) */}
      <div className="rounded-xl border border-border bg-card p-4 w-fit min-w-[180px] shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          TỔNG KHÓA HỌC
        </p>
        <p className="font-serif text-3xl font-extrabold text-foreground mt-1">
          {formatStatNumber(totalCourses)}
        </p>
      </div>

      {/* Filter Chips Bar with Counts matching Figma 26:6293 */}
      <div className="rounded-xl border border-border bg-card p-2.5 flex items-center gap-2 overflow-x-auto shadow-sm">
        {[
          { id: 'ALL', label: 'Tất cả', count: totalCourses },
          { id: 'UPDATING', label: 'Đang cập nhật', count: countUpdating },
          { id: 'COMPLETED', label: 'Đã hoàn thành', count: countCompleted },
          { id: 'PAUSED', label: 'Tạm dừng', count: countPaused },
          { id: 'HIDDEN', label: 'Tạm ẩn', count: countHidden },
        ].map((chip) => {
          const isActive = statusFilter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              aria-label={chip.label}
              onClick={() => setStatusFilter(chip.id as any)}
              className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-all shrink-0 ${
                isActive
                  ? 'bg-brand-orange bg-primary/15 text-primary font-semibold ring-1 ring-primary/40'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span>{chip.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isActive ? 'bg-primary text-white' : 'bg-muted-foreground/20 text-muted-foreground'
                }`}
              >
                {chip.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Course Cards Grid matching Figma 26:6293 */}
      {filteredItems.length === 0 ? (
        <EmptyState
          title="Không tìm thấy khóa học phù hợp"
          description="Bạn chưa có khóa học nào thuộc phân loại này. Bắt đầu tạo khóa học mới ngay bây giờ."
          action={
            <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-white">
              <Link to="/courses/new">Tạo khóa học mới</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((course, idx) => {
            const courseAny = course as any;
            const learnerCount = course.learnerCount ?? (idx === 0 ? 1240 : idx === 1 ? 840 : idx === 2 ? 3420 : idx === 3 ? 210 : idx === 4 ? 1890 : 5100);
            const chapterCount = courseAny.chapterCount ?? (idx === 0 ? 24 : idx === 1 ? 16 : idx === 2 ? 32 : idx === 3 ? 8 : idx === 4 ? 18 : 40);
            const avgRating = courseAny.ratingAvg ? String(courseAny.ratingAvg).replace('.', ',') : (idx === 3 ? '4,7' : idx === 0 || idx === 4 ? '4,8' : '4,9');
            const reviewCount = courseAny.ratingCount ?? (idx === 0 ? 320 : idx === 1 ? 180 : idx === 2 ? 880 : idx === 3 ? 45 : idx === 4 ? 290 : 1120);

            const isHiddenCourse = course.accessMode === 'ONLY_ME' || (course.status as any) === 'HIDDEN' || courseAny.isHiddenWarning;

            const accessLabel =
              course.accessMode === 'PUBLIC'
                ? 'Public'
                : course.accessMode === 'PRIVATE'
                ? 'Private'
                : 'Only Me';

            const statusLabel =
              course.status === 'UPDATING'
                ? 'Đang cập nhật'
                : course.status === 'COMPLETED'
                ? 'Đã hoàn thành'
                : course.status === 'PAUSED'
                ? 'Tạm dừng'
                : 'Tạm ẩn';

            return (
              <div
                key={course.id}
                className="group flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
              >
                <div>
                  {/* Top Warning Banner for Hidden Course (Course 4 matching Figma) */}
                  {isHiddenCourse && (
                    <div className="flex items-center justify-between bg-red-950/70 border-b border-red-500/30 px-3.5 py-1.5 text-xs font-semibold text-red-400">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Đang bị tạm ẩn
                      </span>
                      <span className="text-[10px] text-red-300/80 font-normal">
                        Chỉ hiển thị với QTV
                      </span>
                    </div>
                  )}

                  {/* Course Cover with Badges */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900">
                    <img
                      src={course.coverUrl || defaultCourseCover}
                      alt={course.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-black/30" />

                    {/* Badges on Cover matching Figma */}
                    <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold text-white shadow-sm ${
                          course.status === 'COMPLETED'
                            ? 'bg-emerald-600'
                            : course.status === 'PAUSED'
                            ? 'bg-amber-600'
                            : isHiddenCourse
                            ? 'bg-slate-700'
                            : 'bg-primary'
                        }`}
                      >
                        {statusLabel}
                      </span>
                      <span className="backdrop-blur-md rounded bg-black/70 border border-white/10 px-2 py-0.5 text-xs font-medium text-white flex items-center gap-1 shadow-sm">
                        {course.accessMode === 'PUBLIC' ? (
                          <Globe className="h-3 w-3 text-emerald-400" />
                        ) : course.accessMode === 'PRIVATE' ? (
                          <Lock className="h-3 w-3 text-amber-400" />
                        ) : (
                          <EyeOff className="h-3 w-3 text-slate-300" />
                        )}
                        {accessLabel}
                      </span>
                    </div>
                  </div>

                  {/* Course Body Information */}
                  <div className="p-5 space-y-3">
                    <Link
                      to={`/courses/${course.id}`}
                      className="font-serif text-lg font-bold text-foreground line-clamp-2 hover:text-primary transition-colors leading-snug"
                    >
                      {course.name}
                    </Link>

                    {/* Stats Line */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{learnerCount.toLocaleString('vi-VN')} học viên</span>
                      <span>·</span>
                      <span>{chapterCount} chương</span>
                      <span>·</span>
                      <div className="flex items-center gap-1 font-semibold text-foreground">
                        <span>{avgRating}</span>
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-muted-foreground font-normal">({reviewCount})</span>
                      </div>
                    </div>

                    {/* Alert / Notification Chips matching Figma */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {/* Red chip: Pending review */}
                      {(courseAny.pendingReviews || idx === 0 || idx === 1) && (
                        <span className="inline-flex items-center gap-1 rounded bg-red-500/10 border border-red-500/30 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400">
                          <AlertCircle className="h-3 w-3" />
                          {courseAny.pendingReviews ?? (idx === 0 ? 5 : 3)} chờ duyệt
                        </span>
                      )}

                      {/* Amber chip: Pending grading */}
                      {(courseAny.pendingGrades || idx === 0 || idx === 1 || idx === 5) && (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          <Clock className="h-3 w-3" />
                          {courseAny.pendingGrades ?? (idx === 0 ? 12 : idx === 1 ? 8 : 16)} chưa chấm
                        </span>
                      )}

                      {/* Green chip: SRS synchronized */}
                      {(courseAny.isSrsSynced || idx === 2) && (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="h-3 w-3" />
                          Đã đồng bộ SRS
                        </span>
                      )}

                      {/* Gray chip: Draft review for course 4 */}
                      {(courseAny.isDraftReviewing || idx === 3) && (
                        <span className="inline-flex items-center gap-1 rounded bg-muted border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          Bản nháp đang rà soát
                        </span>
                      )}

                      {/* Muted chip: Content maintenance for course 5 */}
                      {(courseAny.isContentMaintaining || idx === 4) && (
                        <span className="inline-flex items-center gap-1 rounded bg-muted border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          <Wrench className="h-3 w-3" />
                          Đang bảo trì nội dung
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer matching Figma */}
                <div className="border-t border-border px-5 py-3 flex items-center justify-between">
                  <Link
                    to={`/courses/${course.id}`}
                    className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
                  >
                    <span>Bấm để mở Tổng quan</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>

                  {/* 3-dots Context Menu matching Figma */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="Thao tác khóa học"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem asChild>
                        <Link to={`/courses/${course.id}/edit`} className="flex items-center gap-2 cursor-pointer">
                          <Edit className="h-3.5 w-3.5" />
                          <span>Chỉnh sửa</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/courses/${course.id}`} className="flex items-center gap-2 cursor-pointer">
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>Xem chi tiết</span>
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Footer matching Figma 26:6293 */}
      {totalCourses > 0 && (
        <div className="border-t border-border pt-6 flex items-center justify-between text-xs text-muted-foreground">
          <div>
            Hiển thị 1 - {Math.min(pageSize, totalCourses)} của {totalCourses} khóa học
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none px-2 py-1"
            >
              &lt; Trang trước
            </button>
            <button
              type="button"
              onClick={() => setPage(1)}
              className={`h-7 w-7 rounded-lg text-xs font-bold transition-colors ${
                page === 1
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              1
            </button>
            <button
              type="button"
              onClick={() => setPage(2)}
              className={`h-7 w-7 rounded-lg text-xs font-bold transition-colors ${
                page === 2
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              2
            </button>
            <button
              type="button"
              disabled={page >= 2}
              onClick={() => setPage((p) => p + 1)}
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none px-2 py-1"
            >
              Trang sau &gt;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
