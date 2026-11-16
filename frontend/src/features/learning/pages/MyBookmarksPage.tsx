import { Link } from 'react-router-dom';
import {
  Bookmark,
  BookOpen,
  Trash2,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { Button, Skeleton, ErrorState, useToast } from '@/shared/ui';
import { useMyBookmarksQuery } from '../api/learningApi';

export function MyBookmarksPage() {
  const { pushToast } = useToast();
  const { data: bookmarks = [], isLoading, isError, error, refetch } = useMyBookmarksQuery();

  const handleRemoveBookmark = async (courseId: string, courseName: string) => {
    try {
      const res = await fetch(`/api/v1/courses/${courseId}/bookmark`, {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer mock-access-token-user',
        },
      });
      if (res.ok) {
        pushToast({
          title: 'Đã xóa bookmark',
          description: `Đã xóa đánh dấu lưu cho "${courseName}".`,
          tone: 'default',
        });
        refetch();
      }
    } catch {
      pushToast({
        title: 'Thao tác thất bại',
        description: 'Không thể xóa bookmark lúc này.',
        tone: 'error',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 text-foreground">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
          <Bookmark className="h-4 w-4 fill-current" />
          <span>Học tập & Ghi nhớ</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Khóa học & Bài học đã lưu (Bookmarks)
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Theo dõi các bài học đang dang dở và nhanh chóng tiếp tục học tập từ điểm đã đánh dấu.
        </p>
      </div>

      {/* Bookmarks List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Không thể tải danh sách bookmark"
          error={error}
          onRetry={() => refetch()}
        />
      ) : bookmarks.length === 0 ? (
        <div className="bg-card border border-border/70 rounded-2xl p-10 sm:p-14 text-center space-y-4">
          <div className="inline-flex p-4 rounded-full bg-primary/10 text-primary">
            <Bookmark className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold">Chưa có bài học nào được đánh dấu</h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Trong quá trình đọc bài học, bạn có thể nhấn nút "Lưu bài" để quay lại tiếp tục bất kỳ lúc nào.
          </p>
          <div className="pt-2">
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm shadow-xs hover:bg-primary/90 transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              <span>Khám phá các khóa học</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {bookmarks.map((bm) => (
            <div
              key={`${bm.courseId}-${bm.chapterId}`}
              className="bg-card border border-border/70 hover:border-primary/40 rounded-2xl p-5 sm:p-6 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary truncate max-w-xs sm:max-w-md">
                    {bm.courseName}
                  </span>
                  <span className="text-border">•</span>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(bm.updatedAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>

                <h3 className="font-bold text-base sm:text-lg text-foreground hover:text-primary transition-colors">
                  <Link to={`/courses/${bm.courseId}/learn/${bm.chapterId}`}>
                    {bm.chapterTitle}
                  </Link>
                </h3>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                <Link
                  to={`/courses/${bm.courseId}/learn/${bm.chapterId}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:bg-primary/90 transition-colors shadow-xs"
                >
                  <span>Tiếp tục học</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveBookmark(bm.courseId, bm.courseName)}
                  className="h-9 px-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Xóa đánh dấu"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
