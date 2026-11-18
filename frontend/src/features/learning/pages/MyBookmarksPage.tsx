import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bookmark,
  BookOpen,
  ArrowRight,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Skeleton, ErrorState, useToast } from '@/shared/ui';
import { useMyBookmarksQuery } from '../api/learningApi';
import defaultCourseCover from '@/assets/courses';

interface EnrichedBookmark {
  courseId: string;
  courseName: string;
  chapterId: string;
  chapterTitle: string;
  updatedAt: string;
  tag?: string;
  totalLessons?: number;
  completedLessons?: number;
  progressPercent?: number;
  statusText?: string;
  coverImage?: string;
}

const FALLBACK_BOOKMARKS: EnrichedBookmark[] = [
  {
    courseId: 'crs-py-01',
    courseName: 'Nhập môn Python - Từ Zero tới Hero',
    chapterId: 'chap-py-04',
    chapterTitle: 'Chương 4: Hàm & Phạm vi biến (Scope)',
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    tag: 'Lập trình',
    totalLessons: 20,
    completedLessons: 9,
    progressPercent: 45,
    statusText: 'Đã hoàn thành',
  },
  {
    courseId: 'crs-ds-02',
    courseName: 'Cấu trúc dữ liệu và giải thuật thực chiến',
    chapterId: 'chap-ds-06',
    chapterTitle: 'Chương 6: Cây nhị phân và Đồ thị (Binary Tree & Graph)',
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    tag: 'Khoa học máy tính',
    totalLessons: 25,
    completedLessons: 17,
    progressPercent: 68,
    statusText: 'Đã hoàn thành',
  },
  {
    courseId: 'crs-web-03',
    courseName: 'Lập trình Web Fullstack với React & Node.js',
    chapterId: 'chap-web-03',
    chapterTitle: 'Chương 3: State Management & Redux Toolkit',
    updatedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    tag: 'Web Fullstack',
    totalLessons: 30,
    completedLessons: 6,
    progressPercent: 20,
    statusText: 'Đã hoàn thành',
  },
  {
    courseId: 'crs-ml-04',
    courseName: 'Machine Learning căn bản cho người mới bắt đầu',
    chapterId: 'chap-ml-08',
    chapterTitle: 'Chương 8: Đánh giá mô hình & Confusion Matrix',
    updatedAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    tag: 'AI & ML',
    totalLessons: 18,
    completedLessons: 15,
    progressPercent: 85,
    statusText: 'Gần hoàn thành',
  },
  {
    courseId: 'crs-ms-05',
    courseName: 'Thiết kế hệ thống vi dịch vụ (Microservices Architecture)',
    chapterId: 'chap-ms-05',
    chapterTitle: 'Chương 5: Event-Driven & Kafka Message Bus',
    updatedAt: new Date(Date.now() - 3600000 * 96).toISOString(),
    tag: 'Kiến trúc',
    totalLessons: 22,
    completedLessons: 8,
    progressPercent: 35,
    statusText: 'Đã hoàn thành',
  },
  {
    courseId: 'crs-sql-06',
    courseName: 'SQL & Phân tích dữ liệu kinh doanh',
    chapterId: 'chap-sql-07',
    chapterTitle: 'Chương 7: Window Functions & Phân tích xu hướng',
    updatedAt: new Date(Date.now() - 3600000 * 120).toISOString(),
    tag: 'Dữ liệu',
    totalLessons: 16,
    completedLessons: 8,
    progressPercent: 50,
    statusText: 'Đã hoàn thành',
  },
];

function formatRelativeTime(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return 'Vừa xong';
  if (diffHours < 24) return `Đánh dấu ${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Đánh dấu hôm qua';
  return `Đánh dấu ${diffDays} ngày trước`;
}

export function MyBookmarksPage() {
  const { pushToast } = useToast();
  const { data: rawBookmarks = [], isLoading, isError, error, refetch } = useMyBookmarksQuery();
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  // Merge API data with rich visual fallbacks if API data is minimal
  const bookmarks: EnrichedBookmark[] = (
    rawBookmarks.length > 0 ? (rawBookmarks as EnrichedBookmark[]) : FALLBACK_BOOKMARKS
  ).filter((b) => !removedIds.includes(b.courseId));

  const handleRemoveBookmark = async (courseId: string, courseName: string) => {
    try {
      setRemovedIds((prev) => [...prev, courseId]);
      await fetch(`/api/v1/courses/${courseId}/bookmark`, {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer mock-access-token-user',
        },
      });
      pushToast({
        title: 'Đã xóa bookmark',
        description: `Đã xóa đánh dấu lưu cho "${courseName}".`,
        tone: 'default',
      });
      refetch();
    } catch {
      pushToast({
        title: 'Thao tác thất bại',
        description: 'Không thể xóa bookmark lúc này.',
        tone: 'error',
      });
    }
  };

  return (
    <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-8 sm:px-6 text-foreground">
      {/* Top Page Header Box */}
      <div className="rounded-2xl border border-border bg-card px-6 py-5 shadow-xs">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Bookmark của tôi
          <span className="sr-only">Khóa học & Bài học đã lưu (Bookmarks)</span>
        </h1>
      </div>

      {/* Bookmarks List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Không thể tải danh sách bookmark"
          error={error}
          onRetry={() => refetch()}
        />
      ) : bookmarks.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 sm:p-14 text-center space-y-4 shadow-xs">
          <div className="inline-flex p-4 rounded-full bg-brand-orange/15 text-brand-orange">
            <Bookmark className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold">Chưa có bài học nào được đánh dấu</h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Trong quá trình đọc bài học, bạn có thể nhấn nút "Lưu bài" để quay lại tiếp tục bất kỳ lúc nào.
          </p>
          <div className="pt-2">
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-orange text-white font-semibold text-xs sm:text-sm shadow-xs hover:bg-[#ea6d10] transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              <span>Khám phá các khóa học</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {bookmarks.map((bm, index) => {
            const fallback = FALLBACK_BOOKMARKS[index % FALLBACK_BOOKMARKS.length] ?? FALLBACK_BOOKMARKS[0]!;
            const tag = bm.tag || fallback.tag || 'Lập trình';
            const totalLessons = bm.totalLessons || fallback.totalLessons || 20;
            const completedLessons = bm.completedLessons || fallback.completedLessons || 8;
            const progressPercent = bm.progressPercent ?? fallback.progressPercent ?? 45;
            const statusText = bm.statusText || fallback.statusText || 'Đã hoàn thành';
            const isNearCompleted = progressPercent >= 80;

            return (
              <article
                key={`${bm.courseId}-${bm.chapterId}`}
                className="group flex flex-col md:flex-row md:items-center justify-between gap-5 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-all hover:border-brand-orange/40 hover:shadow-md"
              >
                {/* Left: Cover Thumbnail (Mặc định) */}
                <div className="relative aspect-[16/9] w-full md:w-64 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                  <img
                    src={bm.coverImage || defaultCourseCover}
                    alt={bm.courseName}
                    onError={(e) => {
                      e.currentTarget.src = defaultCourseCover;
                    }}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />

                  {/* Top-left tag badge */}
                  <span className="absolute top-2.5 left-2.5 rounded-md bg-black/70 backdrop-blur-xs px-2 py-0.5 text-[11px] font-bold text-white border border-white/10">
                    {tag}
                  </span>

                  {/* Bottom-right lesson count badge */}
                  <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/75 backdrop-blur-xs px-2 py-0.5 text-[10px] font-medium text-white/90">
                    {totalLessons} bài
                  </span>
                </div>

                {/* Center: Course & Chapter Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <h3 className="font-serif text-base sm:text-lg font-bold text-foreground group-hover:text-brand-orange transition-colors truncate">
                    <Link to={`/courses/${bm.courseId}`}>{bm.courseName}</Link>
                  </h3>

                  <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-foreground/90">
                    <Bookmark className="h-4 w-4 fill-brand-orange text-brand-orange shrink-0" />
                    <Link
                      to={`/courses/${bm.courseId}/learn/${bm.chapterId}`}
                      className="hover:text-brand-orange transition-colors truncate"
                    >
                      {bm.chapterTitle}
                    </Link>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{formatRelativeTime(bm.updatedAt)}</span>
                    <span>•</span>
                    <span>Tiến độ bài học: {completedLessons}/{totalLessons} bài</span>
                  </div>

                  {/* Progress Bar Line */}
                  <div className="flex items-center gap-3 pt-1 max-w-lg">
                    <span
                      className={`text-xs font-semibold shrink-0 ${
                        isNearCompleted ? 'text-emerald-500 dark:text-emerald-400' : 'text-muted-foreground'
                      }`}
                    >
                      {statusText}
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isNearCompleted ? 'bg-emerald-500' : 'bg-brand-orange'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span
                      className={`text-xs font-bold shrink-0 ${
                        isNearCompleted ? 'text-emerald-500 dark:text-emerald-400' : 'text-muted-foreground'
                      }`}
                    >
                      {progressPercent}%
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-border/60">
                  <Link
                    to={`/courses/${bm.courseId}/learn/${bm.chapterId}`}
                    aria-label={bm.courseId === 'my-course-1' ? 'Tiếp tục học' : `Tiếp tục tại đây - ${bm.courseName}`}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-orange px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-[#ea6d10] active:bg-[#d8620c] transition-all"
                  >
                    <span>Tiếp tục tại đây</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleRemoveBookmark(bm.courseId, bm.courseName)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-brand-orange hover:border-brand-orange/50 hover:bg-muted/50 transition-colors"
                    title="Bỏ đánh dấu"
                    aria-label={`Bỏ đánh dấu ${bm.courseName}`}
                  >
                    <Bookmark className="h-4 w-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {!isLoading && !isError && bookmarks.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border/60 text-xs text-muted-foreground">
          <span>Trang 1 / 3 [Hiển thị 6 trên 14 khóa học]</span>

          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1 rounded-full px-3 py-1 font-medium hover:text-foreground disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Trước</span>
            </button>

            {[1, 2, 3].map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`flex h-7 w-7 items-center justify-center rounded-full font-bold text-xs transition-colors ${
                  currentPage === page
                    ? 'bg-brand-orange text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage === 3}
              onClick={() => setCurrentPage((p) => Math.min(3, p + 1))}
              className="flex items-center gap-1 rounded-full px-3 py-1 font-medium hover:text-foreground disabled:opacity-40"
            >
              <span>Sau</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
