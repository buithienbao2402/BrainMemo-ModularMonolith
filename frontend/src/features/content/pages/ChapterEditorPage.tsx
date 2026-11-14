import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Send,
  Eye,
  History,
  FolderOpen,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  BookOpen,
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
  ErrorState,
} from '@/shared/ui';
import {
  useChapterDraftQuery,
  useSaveChapterDraftMutation,
  usePublishChapterMutation,
  type BlockDto,
  type BlockType,
  type ResourceDto,
} from '../api/contentApi';
import { BlockItem } from '../components/BlockItem';
import { AddBlockMenu } from '../components/AddBlockMenu';
import { ResourceDrawer } from '../components/ResourceDrawer';
import { ChapterVersionsModal } from '../components/ChapterVersionsModal';
import { ChapterPreviewModal } from '../components/ChapterPreviewModal';
import { UnsavedChangesDialog } from '../components/UnsavedChangesDialog';
import { useToast } from '@/shared/ui';
import { ApiProblemError } from '@/shared/api';

export function ChapterEditorPage() {
  const { courseId = '', chapterId = '' } = useParams<{
    courseId: string;
    chapterId: string;
  }>();
  const navigate = useNavigate();
  const { pushToast } = useToast();

  // Working draft local state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [blocks, setBlocks] = useState<BlockDto[]>([]);
  const [baseVersionNo, setBaseVersionNo] = useState<number>(1);
  const [isDirty, setIsDirty] = useState(false);

  // Modals & Drawers state
  const [isResourceDrawerOpen, setIsResourceDrawerOpen] = useState(false);
  const [pickerTargetBlockId, setPickerTargetBlockId] = useState<string | null>(null);
  const [isVersionsModalOpen, setIsVersionsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Unsaved changes warning dialog state
  const [showUnsavedExitDialog, setShowUnsavedExitDialog] = useState(false);
  const pendingExitPathRef = useRef<string | null>(null);

  // Optimistic locking conflict dialog
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictErrorMessage, setConflictErrorMessage] = useState('');

  // Publish blocked dialog
  const [publishBlockedDialogOpen, setPublishBlockedDialogOpen] = useState(false);
  const [publishBlockedMessage, setPublishBlockedMessage] = useState('');

  // Fetch chapter draft
  const {
    data: chapter,
    isLoading,
    isError,
    error,
    refetch,
  } = useChapterDraftQuery(courseId, chapterId);

  const { mutateAsync: saveDraft, isPending: isSaving } =
    useSaveChapterDraftMutation(courseId, chapterId);
  const { mutateAsync: publishChapter, isPending: isPublishing } =
    usePublishChapterMutation(courseId, chapterId);

  // Populate local working state whenever fresh server data arrives
  useEffect(() => {
    if (chapter) {
      setTitle(chapter.title || '');
      setDescription(chapter.description || '');
      setBlocks(chapter.blocks || []);
      setBaseVersionNo(chapter.lastVersionNo || 1);
      setIsDirty(false);
    }
  }, [chapter]);

  // Window beforeunload guard to protect uncommitted data
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'Bạn có thay đổi chưa lưu!';
        return 'Bạn có thay đổi chưa lưu!';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Handle safe back navigation
  const handleSafeBack = (to: string) => {
    if (isDirty) {
      pendingExitPathRef.current = to;
      setShowUnsavedExitDialog(true);
    } else {
      navigate(to);
    }
  };

  const handleConfirmExit = () => {
    setShowUnsavedExitDialog(false);
    setIsDirty(false);
    if (pendingExitPathRef.current) {
      navigate(pendingExitPathRef.current);
    }
  };

  // Block management functions
  const handleAddBlock = (blockType: BlockType) => {
    const newPosition = blocks.length + 1;
    // Generate a client-side stable UUID (v7 style or crypto UUID)
    const newId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const newBlock: BlockDto = {
      id: newId,
      blockType,
      position: newPosition,
      title: null,
      body: blockType === 'RICH_TEXT' ? '<p></p>' : blockType === 'MARKDOWN' ? '' : null,
      resourceId: null,
      questionId: null,
      flashcards: blockType === 'FLASHCARD' ? [{ front: '', back: '' }] : undefined,
      aiReviewStatus: 'NOT_APPLICABLE',
      quizConfig:
        blockType === 'QUIZ'
          ? {
              timeLimitMinutes: 45,
              passScore: 70,
              maxAttempts: 3,
              resultDisplay: 'AFTER_SUBMIT',
              shuffleQuestions: true,
              shuffleOptions: true,
              questions: [],
              randomRules: [],
            }
          : undefined,
      assignmentConfig:
        blockType === 'ASSIGNMENT'
          ? {
              dueAt: null,
              maxPoints: 10,
              maxFileSizeBytes: 10 * 1024 * 1024,
            }
          : undefined,
    };

    setBlocks([...blocks, newBlock]);
    setIsDirty(true);
  };

  const handleUpdateBlock = (updatedBlock: BlockDto) => {
    setBlocks(blocks.map((b) => (b.id === updatedBlock.id ? updatedBlock : b)));
    setIsDirty(true);
  };

  const handleDeleteBlock = (blockId: string) => {
    const remaining = blocks.filter((b) => b.id !== blockId);
    // Re-index positions 1..N
    const reindexed = remaining.map((b, i) => ({ ...b, position: i + 1 }));
    setBlocks(reindexed);
    setIsDirty(true);
  };

  const handleMoveBlock = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;

    const list = [...blocks];
    const [moved] = list.splice(index, 1);
    if (!moved) return;
    list.splice(targetIndex, 0, moved);

    const reindexed = list.map((b, i) => ({ ...b, position: i + 1 }));
    setBlocks(reindexed);
    setIsDirty(true);
  };

  // Open resource picker for a specific media/file block
  const handleOpenPickerForBlock = (blockId: string) => {
    setPickerTargetBlockId(blockId);
    setIsResourceDrawerOpen(true);
  };

  const handleSelectResourceFromDrawer = (resource: ResourceDto) => {
    if (pickerTargetBlockId) {
      setBlocks(
        blocks.map((b) =>
          b.id === pickerTargetBlockId
            ? { ...b, resourceId: resource.id, title: b.title || resource.originalFilename }
            : b
        )
      );
      setIsDirty(true);
      setPickerTargetBlockId(null);
    }
  };

  // Save Draft (Optimistic Locking)
  const handleSaveDraft = async () => {
    if (!title.trim()) {
      pushToast({
        title: 'Tên chương không được để trống',
        tone: 'warning',
      });
      return;
    }

    try {
      const updated = await saveDraft({
        baseVersionNo,
        title: title.trim(),
        description: description.trim() || '',
        blocks,
      });

      setBaseVersionNo(updated.lastVersionNo || baseVersionNo + 1);
      setIsDirty(false);

      pushToast({
        title: 'Lưu bản nháp thành công',
        description: `Bản nháp đã được lưu an toàn (Phiên bản #${updated.lastVersionNo}).`,
        tone: 'success',
      });
    } catch (err: unknown) {
      if (
        (err instanceof ApiProblemError && err.status === 409) ||
        (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'VERSION_CONFLICT') ||
        (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 409)
      ) {
        const detailMsg =
          err && typeof err === 'object' && 'detail' in err
            ? String((err as { detail?: string }).detail)
            : 'Xung đột phiên bản: Chương này đã được chỉnh sửa từ một phiên làm việc khác. Để tránh ghi đè dữ liệu, vui lòng tải lại phiên bản mới nhất.';
        setConflictErrorMessage(detailMsg);
        setConflictDialogOpen(true);
      } else {
        const msg =
          err && typeof err === 'object' && 'detail' in err
            ? String((err as { detail?: string }).detail)
            : err instanceof Error
            ? err.message
            : 'Có lỗi xảy ra khi lưu nháp.';
        pushToast({
          title: 'Lưu bản nháp thất bại',
          description: msg,
          tone: 'error',
        });
      }
    }
  };

  // Publish Chapter
  const handlePublish = async () => {
    if (isDirty) {
      // Prompt user to save first
      await handleSaveDraft();
    }

    try {
      const published = await publishChapter();
      pushToast({
        title: 'Đăng tải chương thành công',
        description: `Chương "${published.title}" hiện đã được xuất bản tới học viên.`,
        tone: 'success',
      });
      setBaseVersionNo(published.lastVersionNo || baseVersionNo);
      setIsDirty(false);
    } catch (err: unknown) {
      if (
        (err instanceof ApiProblemError && err.status === 422) ||
        (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'CHAPTER_PUBLISH_BLOCKED') ||
        (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 422)
      ) {
        const detailMsg =
          err && typeof err === 'object' && 'detail' in err
            ? String((err as { detail?: string }).detail)
            : 'Không thể đăng tải: Chương chưa đáp ứng đủ điều kiện (ví dụ: bộ flashcard AI chưa được phê duyệt, bài kiểm tra thiếu câu hỏi hợp lệ hoặc tài nguyên chưa sẵn sàng).';
        setPublishBlockedMessage(detailMsg);
        setPublishBlockedDialogOpen(true);
      } else {
        const msg =
          err && typeof err === 'object' && 'detail' in err
            ? String((err as { detail?: string }).detail)
            : err instanceof Error
            ? err.message
            : 'Không thể đăng tải chương.';
        pushToast({
          title: 'Đăng tải thất bại',
          description: msg,
          tone: 'error',
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="space-y-4 pt-4">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <ErrorState
          title="Không thể tải bản nháp chương"
          error={error}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Top Sticky Header & Controls Bar */}
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-md px-4 sm:px-6 py-3 shadow-xs">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Left: Back & Chapter Info */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => handleSafeBack(`/courses/${courseId}/manage/content`)}
              aria-label="Quay lại mục lục chương"
              className="rounded-xl border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-muted-foreground">
                  v{baseVersionNo}
                </span>

                {chapter?.status === 'PUBLISHED' ? (
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Đã xuất bản
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.2 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                    Bản nháp
                  </span>
                )}

                {/* Dirty state indicator */}
                {isDirty ? (
                  <span className="text-[11px] font-medium text-amber-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Chưa lưu
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    Đã lưu
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-bold text-foreground truncate max-w-sm sm:max-w-md">
                {title || 'Chương chưa đặt tên'}
              </h2>
            </div>
          </div>

          {/* Right: Actions Bar */}
          <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
            {/* Resource Drawer Trigger */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setPickerTargetBlockId(null);
                setIsResourceDrawerOpen(true);
              }}
              title="Quản lý kho tài nguyên"
              className="text-xs h-9"
            >
              <FolderOpen className="h-3.5 w-3.5 mr-1 text-primary" />
              Tài nguyên
            </Button>

            {/* Version History Trigger */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsVersionsModalOpen(true)}
              title="Lịch sử phiên bản"
              className="text-xs h-9"
            >
              <History className="h-3.5 w-3.5 mr-1" />
              Lịch sử
            </Button>

            {/* Preview Trigger */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewOpen(true)}
              title="Xem trước như học viên"
              aria-label="Xem trước như học viên"
              className="text-xs h-9"
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              Xem trước
            </Button>

            {/* Save Draft Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="text-xs h-9 font-semibold text-foreground border-primary/40 hover:bg-primary/5"
            >
              <Save className="h-3.5 w-3.5 mr-1.5 text-primary" />
              {isSaving ? 'Đang lưu...' : 'Lưu nháp'}
            </Button>

            {/* Publish Button */}
            <Button
              type="button"
              size="sm"
              onClick={handlePublish}
              disabled={isPublishing}
              className="bg-primary hover:bg-primary/90 text-white text-xs h-9 font-semibold shadow-xs"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {isPublishing ? 'Đang đăng...' : 'Đăng tải'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Canvas Area */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Chapter Header Card (Title & Description) */}
        <section
          aria-label="Thông tin cơ bản chương"
          className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-4"
        >
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
              Tiêu đề chương bài học <span className="text-destructive">*</span>
            </label>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Nhập tên chương..."
              className="text-base sm:text-lg font-serif font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
              Mô tả tóm tắt chương (Tùy chọn)
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Mô tả ngắn gọn nội dung và mục tiêu người học sẽ đạt được..."
              rows={2}
              className="w-full rounded-xl border border-border bg-background p-3 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
        </section>

        {/* Blocks Canvas */}
        <section aria-label="Danh sách khối nội dung" className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span>Nội dung bài học ({blocks.length} khối)</span>
            </h3>
            <span className="text-xs text-muted-foreground">
              Hệ thống không tự lưu, hãy nhấn &quot;Lưu nháp&quot; khi hoàn tất
            </span>
          </div>

          {blocks.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border bg-card p-10 text-center space-y-3">
              <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/60" />
              <p className="text-sm font-bold text-foreground">
                Chưa có khối nội dung nào trong chương này
              </p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Chọn một trong các loại khối bên dưới để bắt đầu biên soạn bài giảng (Văn bản,
                Markdown, Hình ảnh, Video, Flashcard, Bài tập, Quiz...).
              </p>
              <div className="pt-2">
                <AddBlockMenu onAddBlock={handleAddBlock} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {blocks.map((block, index) => (
                <React.Fragment key={block.id}>
                  <BlockItem
                    block={block}
                    courseId={courseId}
                    isFirst={index === 0}
                    isLast={index === blocks.length - 1}
                    onMoveUp={() => handleMoveBlock(index, 'UP')}
                    onMoveDown={() => handleMoveBlock(index, 'DOWN')}
                    onDelete={() => handleDeleteBlock(block.id)}
                    onUpdate={handleUpdateBlock}
                    onOpenResourcePicker={handleOpenPickerForBlock}
                  />

                  {/* Add block bar between blocks */}
                  <div className="opacity-40 hover:opacity-100 transition-opacity">
                    <AddBlockMenu onAddBlock={handleAddBlock} />
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Resource Drawer (SCR-CNT-07) */}
      <ResourceDrawer
        courseId={courseId}
        isOpen={isResourceDrawerOpen}
        onClose={() => {
          setIsResourceDrawerOpen(false);
          setPickerTargetBlockId(null);
        }}
        pickerMode={Boolean(pickerTargetBlockId)}
        onSelectResource={handleSelectResourceFromDrawer}
      />

      {/* Version History Modal (SCR-CNT-03) */}
      <ChapterVersionsModal
        courseId={courseId}
        chapterId={chapterId}
        isOpen={isVersionsModalOpen}
        onClose={() => setIsVersionsModalOpen(false)}
        currentVersionNo={baseVersionNo}
      />

      {/* Student View Draft Preview Modal (FR-CNT-03) */}
      <ChapterPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        chapterTitle={title}
        chapterDescription={description}
        blocks={blocks}
      />

      {/* Unsaved Changes Guard Dialog */}
      <UnsavedChangesDialog
        isOpen={showUnsavedExitDialog}
        onCancel={() => setShowUnsavedExitDialog(false)}
        onConfirm={handleConfirmExit}
      />

      {/* Optimistic Locking 409 VERSION_CONFLICT Dialog */}
      <Dialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Phát hiện xung đột phiên bản (409)
            </DialogTitle>
            <DialogDescription className="text-foreground/90 pt-1">
              {conflictErrorMessage}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConflictDialogOpen(false)}
            >
              Tiếp tục giữ bản hiện tại
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                setConflictDialogOpen(false);
                await refetch();
                pushToast({
                  title: 'Đã tải phiên bản mới nhất từ máy chủ',
                  tone: 'success',
                });
              }}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Tải lại bản mới nhất
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish Blocked 422 Dialog */}
      <Dialog
        open={publishBlockedDialogOpen}
        onOpenChange={setPublishBlockedDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertCircle className="h-5 w-5" />
              Chưa thể đăng tải chương
            </DialogTitle>
            <DialogDescription className="text-foreground/90 pt-1">
              {publishBlockedMessage}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              size="sm"
              onClick={() => setPublishBlockedDialogOpen(false)}
            >
              Đã hiểu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
