import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit3,
  Trash2,
  History,
  FolderOpen,
  AlertTriangle,
  FileCheck,
  FileClock,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Skeleton,
  EmptyState,
  ErrorState,
} from '@/shared/ui';
import { useCourseQuery } from '@/features/course/api/courseApi';
import {
  useChaptersQuery,
  useCreateChapterMutation,
  useReorderChaptersMutation,
  useDeleteChapterMutation,
  type ChapterSummary,
} from '../api/contentApi';
import { ChapterVersionsModal } from '../components/ChapterVersionsModal';
import { ResourceDrawer } from '../components/ResourceDrawer';
import { useToast } from '@/shared/ui';

export function ChapterListPage() {
  const { courseId = '' } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { pushToast } = useToast();

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Delete modal state
  const [deletingChapter, setDeletingChapter] = useState<ChapterSummary | null>(null);

  // Versions modal state
  const [historyChapterId, setHistoryChapterId] = useState<string | null>(null);

  // Resource drawer state
  const [isResourceDrawerOpen, setIsResourceDrawerOpen] = useState(false);

  // Queries & Mutations
  const { data: course } = useCourseQuery(courseId);
  const {
    data: chapters,
    isLoading,
    isError,
    error,
    refetch,
  } = useChaptersQuery(courseId);

  const { mutateAsync: createChapter, isPending: isCreating } =
    useCreateChapterMutation(courseId);
  const { mutateAsync: reorderChapters, isPending: isReordering } =
    useReorderChaptersMutation(courseId);
  const { mutateAsync: deleteChapter, isPending: isDeleting } =
    useDeleteChapterMutation(courseId);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      pushToast({
        title: 'Vui lòng nhập tên chương',
        tone: 'warning',
      });
      return;
    }

    try {
      const created = await createChapter({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
      });

      pushToast({
        title: 'Tạo chương mới thành công',
        description: `Chương "${created.title}" đã được tạo ở trạng thái nháp.`,
        tone: 'success',
      });

      setIsCreateOpen(false);
      setNewTitle('');
      setNewDescription('');

      // Navigate to editor for newly created chapter
      if (created.id) {
        navigate(`/courses/${courseId}/manage/content/${created.id}`);
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'detail' in err
          ? String((err as { detail?: string }).detail)
          : err instanceof Error
          ? err.message
          : 'Có lỗi xảy ra khi tạo chương mới.';
      pushToast({
        title: 'Tạo chương thất bại',
        description: msg,
        tone: 'error',
      });
    }
  };

  const handleMove = async (index: number, direction: 'UP' | 'DOWN') => {
    if (!chapters) return;
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= chapters.length) return;

    const reorderedList = [...chapters];
    const [moved] = reorderedList.splice(index, 1);
    if (!moved) return;
    reorderedList.splice(targetIndex, 0, moved);

    const chapterIds = reorderedList.map((c) => c.id!).filter(Boolean);

    try {
      await reorderChapters(chapterIds);
      pushToast({
        title: 'Đã cập nhật thứ tự chương',
        tone: 'success',
      });
    } catch (err: unknown) {
      pushToast({
        title: 'Không thể sắp xếp lại thứ tự',
        description: err instanceof Error ? err.message : 'Lỗi sắp xếp',
        tone: 'error',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingChapter?.id) return;

    try {
      await deleteChapter(deletingChapter.id);
      pushToast({
        title: 'Đã xóa chương',
        description: `Chương "${deletingChapter.title}" đã được xóa mềm.`,
        tone: 'success',
      });
      setDeletingChapter(null);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'detail' in err
          ? String((err as { detail?: string }).detail)
          : err instanceof Error
          ? err.message
          : 'Không thể xóa chương này.';
      pushToast({
        title: 'Xóa chương thất bại',
        description: msg,
        tone: 'error',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Đường dẫn điều hướng" className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link to="/manage/courses" className="hover:text-foreground transition-colors flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" />
          <span>Quản lý khóa học</span>
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link to={`/courses/${courseId}`} className="hover:text-foreground transition-colors truncate max-w-[200px]">
          {course?.name || 'Chi tiết khóa học'}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="font-semibold text-foreground">Nội dung bài học</span>
      </nav>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1
            aria-label="Mục lục chương & bài học"
            className="font-serif text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5"
          >
            <BookOpen className="h-7 w-7 text-primary" />
            <span>Nội dung chương & bài học (SCR-CNT-01)</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Xây dựng đề cương, kéo thả sắp xếp các chương và biên tập nội dung khóa học
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsResourceDrawerOpen(true)}
            className="text-xs"
          >
            <FolderOpen className="h-4 w-4 mr-1.5 text-primary" />
            Thư viện tài nguyên
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white text-xs font-semibold shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Thêm chương mới
          </Button>
        </div>
      </div>

      {/* Chapters Syllabus Container */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Không thể tải mục lục chương bài học"
            error={error}
            onRetry={() => refetch()}
          />
        ) : !chapters || chapters.length === 0 ? (
          <EmptyState
            title="Khóa học chưa có chương bài học nào"
            description="Bắt đầu xây dựng khóa học bằng cách thêm chương đầu tiên vào đề cương giảng dạy."
            action={
              <Button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="bg-primary hover:bg-primary/90 text-white text-xs"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Tạo chương đầu tiên
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {chapters.map((ch, index) => {
              const isFirst = index === 0;
              const isLast = index === chapters.length - 1;

              return (
                <div
                  key={ch.id}
                  data-testid={`chapter-item-${ch.id}`}
                  className="group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-all hover:border-primary/50 hover:shadow-md"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    {/* Position Badge & Order Controls */}
                    <div className="flex items-center gap-1">
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleMove(index, 'UP')}
                          disabled={isFirst || isReordering}
                          title="Di chuyển lên trên"
                          aria-label={`Di chuyển chương ${ch.title} lên`}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-20 disabled:pointer-events-none transition-colors"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(index, 'DOWN')}
                          disabled={isLast || isReordering}
                          title="Di chuyển xuống dưới"
                          aria-label={`Di chuyển chương ${ch.title} xuống`}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-20 disabled:pointer-events-none transition-colors"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>

                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted font-mono text-xs font-bold text-foreground">
                        {ch.position ?? index + 1}
                      </span>
                    </div>

                    {/* Chapter Title & Description */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/courses/${courseId}/manage/content/${ch.id}`}
                          className="font-serif text-base sm:text-lg font-bold text-foreground hover:text-primary transition-colors truncate"
                        >
                          {ch.title}
                        </Link>

                        {/* Status Badges */}
                        {ch.status === 'PUBLISHED' ? (
                          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <FileCheck className="h-3 w-3" />
                            Đã đăng tải
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <FileClock className="h-3 w-3" />
                            Bản nháp
                          </span>
                        )}

                        {ch.hasUnpublishedChanges && ch.status === 'PUBLISHED' && (
                          <span className="rounded-full bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                            Có sửa đổi chưa đăng tải
                          </span>
                        )}
                      </div>

                      {ch.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                          {ch.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <Button
                      asChild
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-white text-xs font-semibold h-8 px-3"
                    >
                      <Link to={`/courses/${courseId}/manage/content/${ch.id}`}>
                        <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                        Soạn bài
                      </Link>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryChapterId(ch.id!)}
                      title="Xem lịch sử phiên bản"
                      aria-label="Xem lịch sử phiên bản"
                      className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <History className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingChapter(ch)}
                      title="Xóa chương này"
                      aria-label={`Xóa chương ${ch.title}`}
                      className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Chapter Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <BookOpen className="h-5 w-5 text-primary" />
                Thêm chương bài học mới
              </DialogTitle>
              <DialogDescription>
                Nhập tiêu đề và mô tả ngắn gọn cho chương mới trong khóa học.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Tiêu đề chương <span className="text-destructive">*</span>
                </label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Chương 1: Giới thiệu tổng quan..."
                  required
                  autoFocus
                  className="text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Mô tả ngắn gọn (Tùy chọn)
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Tóm tắt mục tiêu hoặc kiến thức trọng tâm của chương..."
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background p-3 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateOpen(false)}
                disabled={isCreating}
              >
                Hủy
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreating}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                {isCreating ? 'Đang tạo...' : 'Tạo chương'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Chapter Modal */}
      <Dialog open={Boolean(deletingChapter)} onOpenChange={() => setDeletingChapter(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Xác nhận xóa chương?
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa chương <strong>{deletingChapter?.title}</strong>? Toàn bộ các
              khối nội dung trong chương này sẽ bị ẩn đi.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingChapter(null)}
              disabled={isDeleting}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Versions Modal */}
      {historyChapterId && (
        <ChapterVersionsModal
          courseId={courseId}
          chapterId={historyChapterId}
          isOpen={Boolean(historyChapterId)}
          onClose={() => setHistoryChapterId(null)}
        />
      )}

      {/* Resource Drawer */}
      <ResourceDrawer
        courseId={courseId}
        isOpen={isResourceDrawerOpen}
        onClose={() => setIsResourceDrawerOpen(false)}
      />
    </div>
  );
}
