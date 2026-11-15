import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  MoreVertical,
  AlertCircle,
  Eye,
  History,
  FolderOpen,
  Trash2,
  Lock,
  Globe,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Skeleton,
  ErrorState,
  useToast,
} from '@/shared/ui';
import { useCourseQuery } from '@/features/course/api/courseApi';
import {
  useChapterDraftQuery,
  useSaveChapterDraftDynamicMutation,
  usePublishChapterDynamicMutation,
  useCreateChapterMutation,
  useDeleteChapterMutation,
  useChaptersQuery,
  useReorderChaptersMutation,
  type BlockDto,
  type BlockType,
  type ResourceDto,
} from '../api/contentApi';
import { NotionBlockRow } from '../components/NotionBlockRow';
import { SlashCommandMenu, type SlashCommandItem } from '../components/SlashCommandMenu';
import { FloatingTextFormatToolbar } from '../components/FloatingTextFormatToolbar';
import { ResourceDrawer } from '../components/ResourceDrawer';
import { ChapterVersionsModal } from '../components/ChapterVersionsModal';
import { ChapterPreviewModal } from '../components/ChapterPreviewModal';
import { DeleteChapterModal } from '../components/DeleteChapterModal';
import { UnsavedChangesModal } from '../components/UnsavedChangesModal';
import { ApiProblemError } from '@/shared/api';

function generateBlockId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ChapterEditorPage() {
  const { courseId = '', chapterId = '' } = useParams<{
    courseId: string;
    chapterId: string;
  }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { pushToast } = useToast();

  const isNewMode = !chapterId || chapterId === 'new';
  const afterChapterId = searchParams.get('after');

  // Course query for displaying course name
  const { data: course } = useCourseQuery(courseId);
  const { data: allChapters } = useChaptersQuery(courseId);

  // Working draft state
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<BlockDto[]>([
    {
      id: generateBlockId(),
      blockType: 'RICH_TEXT',
      position: 1,
      title: null,
      body: '<p></p>',
      resourceId: null,
      questionId: null,
      aiReviewStatus: 'NOT_APPLICABLE',
    },
  ]);
  const [baseVersionNo, setBaseVersionNo] = useState<number>(1);
  const [accessMode, setAccessMode] = useState<'PUBLIC' | 'PROTECTED'>('PUBLIC');
  const [isDirty, setIsDirty] = useState(false);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);

  // Floating menus & context menus state
  const [activeSlashMenu, setActiveSlashMenu] = useState<{
    coords: { top: number; left: number };
    blockId: string;
  } | null>(null);

  const [activeSelection, setActiveSelection] = useState<{
    coords: { top: number; left: number };
    blockId: string;
  } | null>(null);

  // Modals & Drawers state
  const [isResourceDrawerOpen, setIsResourceDrawerOpen] = useState(false);
  const [pickerTargetBlockId, setPickerTargetBlockId] = useState<string | null>(null);
  const [isVersionsModalOpen, setIsVersionsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Unsaved changes exit dialog state
  const [showUnsavedExitDialog, setShowUnsavedExitDialog] = useState(false);
  const pendingExitPathRef = useRef<string | null>(null);

  // Optimistic locking conflict dialog
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictErrorMessage, setConflictErrorMessage] = useState('');

  // Publish blocked dialog
  const [publishBlockedDialogOpen, setPublishBlockedDialogOpen] = useState(false);
  const [publishBlockedMessage, setPublishBlockedMessage] = useState('');

  // Chapter Draft Query (for edit mode)
  const {
    data: chapter,
    isLoading: isChapterLoading,
    isError: isChapterError,
    error: chapterError,
    refetch,
  } = useChapterDraftQuery(courseId, isNewMode ? '' : chapterId);

  // Mutations
  const { mutateAsync: createChapter, isPending: isCreating } = useCreateChapterMutation(courseId);
  const { mutateAsync: saveDraft, isPending: isSaving } = useSaveChapterDraftDynamicMutation(courseId);
  const { mutateAsync: publishChapter, isPending: isPublishing } = usePublishChapterDynamicMutation(courseId);
  const { mutateAsync: deleteChapter, isPending: isDeleting } = useDeleteChapterMutation(courseId);
  const { mutateAsync: reorderChapters } = useReorderChaptersMutation(courseId);

  // Populate draft data in edit mode
  useEffect(() => {
    if (!isNewMode && chapter) {
      setTitle(chapter.title || '');
      setAccessMode(((chapter as any)?.accessMode as any) || 'PUBLIC');
      setBaseVersionNo(chapter.lastVersionNo || 1);
      if (chapter.blocks && chapter.blocks.length > 0) {
        setBlocks(chapter.blocks);
      } else {
        setBlocks([
          {
            id: generateBlockId(),
            blockType: 'RICH_TEXT',
            position: 1,
            title: null,
            body: '<p></p>',
            resourceId: null,
            questionId: null,
            aiReviewStatus: 'NOT_APPLICABLE',
          },
        ]);
      }
      setIsDirty(false);
    }
  }, [isNewMode, chapter]);

  // Window beforeunload guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'Bạn có thay đổi chưa lưu trên chương!';
        return 'Bạn có thay đổi chưa lưu trên chương!';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Navigation exit guard
  const handleExitToChapterList = () => {
    if (isDirty) {
      pendingExitPathRef.current = `/courses/${courseId}/manage/content`;
      setShowUnsavedExitDialog(true);
    } else {
      navigate(`/courses/${courseId}/manage/content`);
    }
  };

  const handleConfirmExitDiscard = () => {
    setShowUnsavedExitDialog(false);
    setIsDirty(false);
    const target = pendingExitPathRef.current || `/courses/${courseId}/manage/content`;
    navigate(target);
  };

  const handleSaveAndExit = async () => {
    const success = await handleSaveDraft();
    if (success) {
      setShowUnsavedExitDialog(false);
      const target = pendingExitPathRef.current || `/courses/${courseId}/manage/content`;
      navigate(target);
    }
  };

  // Block handlers
  const handleAddBlockBelow = (targetIndex: number, type: BlockType = 'RICH_TEXT') => {
    const newId = generateBlockId();
    const newBlock: BlockDto = {
      id: newId,
      blockType: type,
      position: targetIndex + 2,
      title: null,
      body: type === 'RICH_TEXT' ? '<p></p>' : type === 'MARKDOWN' ? '' : null,
      resourceId: null,
      questionId: null,
      flashcards: type === 'FLASHCARD' ? [{ front: '', back: '' }] : undefined,
      aiReviewStatus: 'NOT_APPLICABLE',
    };

    const nextList = [...blocks];
    nextList.splice(targetIndex + 1, 0, newBlock);
    const reindexed = nextList.map((b, i) => ({ ...b, position: i + 1 }));
    setBlocks(reindexed);
    setFocusedBlockId(newId);
    setIsDirty(true);
  };

  const handleUpdateBlock = (updatedBlock: BlockDto) => {
    setBlocks(blocks.map((b) => (b.id === updatedBlock.id ? updatedBlock : b)));
    setIsDirty(true);
  };

  const handleDeleteBlock = (blockId: string) => {
    if (blocks.length <= 1) {
      // Keep at least one empty rich text block
      setBlocks([
        {
          id: generateBlockId(),
          blockType: 'RICH_TEXT',
          position: 1,
          title: null,
          body: '<p></p>',
          resourceId: null,
          questionId: null,
          aiReviewStatus: 'NOT_APPLICABLE',
        },
      ]);
    } else {
      const remaining = blocks.filter((b) => b.id !== blockId);
      const reindexed = remaining.map((b, i) => ({ ...b, position: i + 1 }));
      setBlocks(reindexed);
    }
    setIsDirty(true);
  };

  const handleMoveBlock = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;

    const nextList = [...blocks];
    const [moved] = nextList.splice(index, 1);
    if (!moved) return;
    nextList.splice(targetIndex, 0, moved);

    const reindexed = nextList.map((b, i) => ({ ...b, position: i + 1 }));
    setBlocks(reindexed);
    setIsDirty(true);
  };

  const handleDuplicateBlock = (index: number) => {
    const current = blocks[index];
    if (!current) return;
    const duplicated: BlockDto = {
      ...JSON.parse(JSON.stringify(current)),
      id: generateBlockId(),
      position: index + 2,
    };

    const nextList = [...blocks];
    nextList.splice(index + 1, 0, duplicated);
    const reindexed = nextList.map((b, i) => ({ ...b, position: i + 1 }));
    setBlocks(reindexed);
    setIsDirty(true);
  };

  // Slash menu selection
  const handleSelectSlashCommand = (item: SlashCommandItem) => {
    if (!activeSlashMenu) return;
    const targetId = activeSlashMenu.blockId;
    setActiveSlashMenu(null);

    setBlocks(
      blocks.map((b) => {
        if (b.id !== targetId) return b;

        let initialBody = b.body;
        if (item.initialFormat === 'H2') {
          initialBody = '<h2>Tiêu đề phần</h2>';
        } else if (item.initialFormat === 'H3') {
          initialBody = '<h3>Tiêu đề phụ</h3>';
        } else if (item.initialFormat === 'BULLET') {
          initialBody = '<ul><li>Nội dung mục</li></ul>';
        } else if (item.initialFormat === 'NUMBERED') {
          initialBody = '<ol><li>Nội dung thứ tự</li></ol>';
        } else if (item.initialFormat === 'TABLE') {
          initialBody = `
            <table class="w-full border-collapse border border-border my-2">
              <thead>
                <tr class="bg-muted/30">
                  <th class="border border-border p-2 text-left font-semibold">Cột 1</th>
                  <th class="border border-border p-2 text-left font-semibold">Cột 2</th>
                  <th class="border border-border p-2 text-left font-semibold">Cột 3</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="border border-border p-2">Dữ liệu 1</td>
                  <td class="border border-border p-2">Dữ liệu 2</td>
                  <td class="border border-border p-2">Dữ liệu 3</td>
                </tr>
              </tbody>
            </table><p></p>
          `;
        }

        return {
          ...b,
          blockType: item.blockType,
          body: initialBody,
          flashcards: item.blockType === 'FLASHCARD' ? [{ front: '', back: '' }] : b.flashcards,
        };
      })
    );
    setIsDirty(true);
  };

  // Floating text format command
  const handleExecuteFormatCommand = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    setIsDirty(true);
  };

  const handleInsertTableAtSelection = () => {
    const tableHtml = `
      <table class="w-full border-collapse border border-border my-2">
        <thead>
          <tr class="bg-muted/30">
            <th class="border border-border p-2 text-left font-semibold">Cột 1</th>
            <th class="border border-border p-2 text-left font-semibold">Cột 2</th>
            <th class="border border-border p-2 text-left font-semibold">Cột 3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border border-border p-2">Dữ liệu 1</td>
            <td class="border border-border p-2">Dữ liệu 2</td>
            <td class="border border-border p-2">Dữ liệu 3</td>
          </tr>
        </tbody>
      </table><p></p>
    `;
    document.execCommand('insertHTML', false, tableHtml);
    setIsDirty(true);
  };

  // Save Draft (Only when user clicks "Lưu nháp")
  const handleSaveDraft = async (): Promise<boolean> => {
    if (!title.trim()) {
      pushToast({
        title: 'Vui lòng nhập tên chương',
        tone: 'warning',
      });
      return false;
    }

    try {
      if (isNewMode) {
        // 1. Tạo chương mới
        const created = await createChapter({
          title: title.trim(),
          description: '',
        });

        // 2. Nếu chèn sau một chương, reorder
        if (afterChapterId && created.id && allChapters) {
          const remainingIds = allChapters
            .map((c) => c.id!)
            .filter((id) => id !== created.id);
          const targetIdx = remainingIds.findIndex((id) => id === afterChapterId);
          if (targetIdx !== -1) {
            remainingIds.splice(targetIdx + 1, 0, created.id);
            await reorderChapters(remainingIds);
          }
        }

        // 3. Lưu nội dung draft vừa soạn vào chương mới
        if (created.id) {
          await saveDraft({
            chapterId: created.id,
            body: {
              baseVersionNo: 1,
              title: title.trim(),
              description: '',
              blocks,
            },
          });

          pushToast({
            title: 'Lưu bản nháp thành công',
            description: `Chương "${created.title}" đã được tạo và lưu thành công.`,
            tone: 'success',
          });

          setIsDirty(false);
          // Chuyển URL sang id chương mới
          navigate(`/courses/${courseId}/manage/content/${created.id}`, { replace: true });
        }
      } else {
        // Lưu chương hiện có
        const updated = await saveDraft({
          chapterId,
          body: {
            baseVersionNo,
            title: title.trim(),
            description: chapter?.description || '',
            blocks,
          },
        });

        setBaseVersionNo(updated.lastVersionNo || baseVersionNo + 1);
        setIsDirty(false);

        pushToast({
          title: 'Lưu bản nháp thành công',
          description: `Bản nháp đã được lưu an toàn (Phiên bản #${updated.lastVersionNo}).`,
          tone: 'success',
        });
      }
      return true;
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
      return false;
    }
  };

  // Publish Chapter
  const handlePublish = async () => {
    if (isDirty) {
      const saved = await handleSaveDraft();
      if (!saved) return;
    }

    try {
      const targetId = isNewMode ? chapterId : chapterId;
      const published = await publishChapter(targetId);
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
            : 'Không thể đăng tải: Chương chưa đáp ứng đủ điều kiện kiểm duyệt.';
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

  // Delete chapter confirm
  const handleDeleteChapterConfirm = async () => {
    if (isNewMode) {
      setIsDirty(false);
      navigate(`/courses/${courseId}/manage/content`);
      return;
    }

    try {
      await deleteChapter(chapterId);
      pushToast({
        title: 'Đã xóa chương',
        description: 'Chương bài học đã được xóa vĩnh viễn.',
        tone: 'success',
      });
      setIsDeleteDialogOpen(false);
      navigate(`/courses/${courseId}/manage/content`);
    } catch {
      pushToast({
        title: 'Lỗi',
        description: 'Không thể xóa chương vào lúc này.',
        tone: 'error',
      });
    }
  };

  if (!isNewMode && isChapterLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-6 sm:p-12">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-14 w-full rounded-2xl" />
        <div className="space-y-3 pt-6">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!isNewMode && isChapterError) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <ErrorState
          title="Không thể tải nội dung chương"
          error={chapterError}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const courseTitle = course?.name || 'Khóa học';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* 1. TOP HEADER BAR: Notion-style matching Figma Frame */}
      <header className="sticky top-0 z-30 border-b border-border/80 bg-card/90 backdrop-blur-md px-4 sm:px-8 py-2.5 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Exit button & Course Name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={handleExitToChapterList}
              aria-label="Quay lại mục lục chương"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors shrink-0 p-1.5 rounded-lg hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Danh sách chương</span>
            </button>

            <div className="h-4 w-px bg-border/60 shrink-0" />

            <span className="text-xs text-muted-foreground/80 font-medium truncate max-w-[160px] sm:max-w-xs">
              {courseTitle}
            </span>
          </div>

          {/* Center: Status pill badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-card border border-border/80 text-xs shadow-xs">
            {chapter?.status === 'PUBLISHED' && !isNewMode ? (
              <span className="text-emerald-500 font-medium">Đã xuất bản</span>
            ) : (
              <span className="text-muted-foreground font-medium">Nháp</span>
            )}
            <span className="text-muted-foreground/40">•</span>
            {isDirty ? (
              <span className="text-amber-500 font-medium flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                Chưa lưu thay đổi
              </span>
            ) : (
              <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
                Đã lưu
              </span>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Version indicator */}
            {!isNewMode && (
              <span className="hidden md:inline-block font-mono text-[11px] font-bold text-muted-foreground px-2 py-0.5 rounded bg-muted/40">
                v{baseVersionNo}
              </span>
            )}

            {/* Xem trước như học viên */}
            <button
              type="button"
              title="Xem trước như học viên"
              aria-label="Xem trước như học viên"
              onClick={() => setIsPreviewOpen(true)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <Eye className="h-4 w-4" />
            </button>

            {/* Lịch sử phiên bản */}
            {!isNewMode && (
              <button
                type="button"
                title="Lịch sử phiên bản"
                aria-label="Lịch sử phiên bản"
                onClick={() => setIsVersionsModalOpen(true)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <History className="h-4 w-4" />
              </button>
            )}

            {/* Tài nguyên */}
            <button
              type="button"
              title="Quản lý tài nguyên"
              aria-label="Tài nguyên"
              onClick={() => setIsResourceDrawerOpen(true)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <FolderOpen className="h-4 w-4" />
            </button>

            {/* Lưu nháp (Chỉ lưu khi click) */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSaving || isCreating}
              className="text-xs h-8 px-3.5 font-medium border-border/80 hover:bg-muted"
            >
              {isSaving || isCreating ? 'Đang lưu...' : 'Lưu nháp'}
            </Button>

            {/* Đăng tải */}
            <Button
              type="button"
              size="sm"
              onClick={handlePublish}
              disabled={isPublishing || isSaving || isCreating}
              className="bg-[#ff7a1a] hover:bg-[#ff7a1a]/90 text-[#5e2700] text-xs h-8 px-4 font-bold rounded-lg shadow-xs"
            >
              {isPublishing ? 'Đang đăng...' : 'Đăng tải'}
            </Button>

            {/* Menu MoreVertical */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  title="Tùy chọn khác"
                  aria-label="Tùy chọn khác cho chương"
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 text-xs">
                {/* Chế độ truy cập toggle */}
                <DropdownMenuItem
                  onClick={() => {
                    const nextMode = accessMode === 'PUBLIC' ? 'PROTECTED' : 'PUBLIC';
                    setAccessMode(nextMode);
                    setIsDirty(true);
                  }}
                >
                  {accessMode === 'PROTECTED' ? (
                    <Lock className="h-4 w-4 mr-2 text-zinc-400" />
                  ) : (
                    <Globe className="h-4 w-4 mr-2 text-emerald-400" />
                  )}
                  <span>Chế độ: {accessMode === 'PROTECTED' ? 'Protected' : 'Public'}</span>
                </DropdownMenuItem>

                {/* Xem trước như học viên */}
                <DropdownMenuItem onClick={() => setIsPreviewOpen(true)}>
                  <Eye className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>Xem trước như học viên</span>
                </DropdownMenuItem>

                {/* Kho tài nguyên */}
                <DropdownMenuItem onClick={() => setIsResourceDrawerOpen(true)}>
                  <FolderOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>Kho tài nguyên</span>
                </DropdownMenuItem>

                {/* Lịch sử phiên bản */}
                {!isNewMode && (
                  <DropdownMenuItem onClick={() => setIsVersionsModalOpen(true)}>
                    <History className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>Lịch sử phiên bản</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                {/* Xóa chương */}
                <DropdownMenuItem
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span>Xóa chương</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* 2. NOTION CANVAS CONTAINER */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-12 py-10 space-y-6">
        {/* DÒNG TO ĐẦU TIÊN: Tiêu đề chương (Không có mô tả tóm tắt) */}
        <div className="pl-12">
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setIsDirty(true);
            }}
            placeholder="Chương: Tiêu đề chương bài học..."
            aria-label="Tiêu đề chương bài học"
            className="w-full bg-transparent font-serif text-3xl sm:text-4xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/30 border-none outline-none focus:ring-0 p-0"
          />
        </div>

        {/* DANH SÁCH CÁC KHỐI NOTION BLOCKS */}
        <div className="space-y-1">
          {blocks.map((block, index) => (
            <NotionBlockRow
              key={block.id}
              block={block}
              index={index}
              totalBlocks={blocks.length}
              courseId={courseId}
              isFocused={focusedBlockId === block.id}
              onUpdate={handleUpdateBlock}
              onDelete={() => handleDeleteBlock(block.id)}
              onAddBelow={(type?: BlockType) => handleAddBlockBelow(index, type)}
              onMoveUp={() => handleMoveBlock(index, 'UP')}
              onMoveDown={() => handleMoveBlock(index, 'DOWN')}
              onDuplicate={() => handleDuplicateBlock(index)}
              onOpenSlashMenu={(coords: { top: number; left: number }, blockId: string) => setActiveSlashMenu({ coords, blockId })}
              onOpenResourcePicker={(blockId: string) => {
                setPickerTargetBlockId(blockId);
                setIsResourceDrawerOpen(true);
              }}
              onSelectionChange={(coords: { top: number; left: number } | null, blockId: string) => {
                if (coords) {
                  setActiveSelection({ coords, blockId });
                } else {
                  setActiveSelection(null);
                }
              }}
            />
          ))}
        </div>
      </main>

      {/* 3. SLASH COMMAND POPUP MENU */}
      <SlashCommandMenu
        isOpen={Boolean(activeSlashMenu)}
        position={activeSlashMenu?.coords}
        onClose={() => setActiveSlashMenu(null)}
        onSelect={handleSelectSlashCommand}
      />

      {/* 4. FLOATING TEXT FORMAT TOOLBAR */}
      <FloatingTextFormatToolbar
        position={activeSelection?.coords || null}
        onCommand={handleExecuteFormatCommand}
        onInsertTable={handleInsertTableAtSelection}
        onClose={() => setActiveSelection(null)}
      />

      {/* 5. MODAL: XÓA CHƯƠNG HỌC (Figma Specimen) */}
      <DeleteChapterModal
        isOpen={isDeleteDialogOpen}
        chapterTitle={title}
        blockCount={blocks.length}
        onCancel={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteChapterConfirm}
        isDeleting={isDeleting}
      />

      {/* 6. MODAL: RỜI KHỎI TRANG (Figma Specimen) */}
      <UnsavedChangesModal
        isOpen={showUnsavedExitDialog}
        chapterTitle={title}
        onStay={() => setShowUnsavedExitDialog(false)}
        onSaveDraft={handleSaveAndExit}
        onLeave={handleConfirmExitDiscard}
        isSaving={isSaving || isCreating}
      />

      {/* 7. MODAL: RESOURCE DRAWER */}
      <ResourceDrawer
        isOpen={isResourceDrawerOpen}
        courseId={courseId}
        onClose={() => {
          setIsResourceDrawerOpen(false);
          setPickerTargetBlockId(null);
        }}
        onSelectResource={(resource: ResourceDto) => {
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
        }}
      />

      {/* 8. MODAL: VERSION HISTORY */}
      {!isNewMode && (
        <ChapterVersionsModal
          isOpen={isVersionsModalOpen}
          courseId={courseId}
          chapterId={chapterId}
          onClose={() => setIsVersionsModalOpen(false)}
          currentVersionNo={baseVersionNo}
        />
      )}

      {/* 9. MODAL: CHAPTER PREVIEW */}
      <ChapterPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        chapterTitle={title || 'Xem trước chương bài học'}
        chapterDescription={chapter?.description}
        blocks={blocks}
      />

      {/* 10. MODAL: OPTIMISTIC LOCKING CONFLICT */}
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
              onClick={() => {
                setConflictDialogOpen(false);
                refetch();
              }}
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Tải lại bản mới nhất
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 11. MODAL: PUBLISH BLOCKED */}
      <Dialog open={publishBlockedDialogOpen} onOpenChange={setPublishBlockedDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Đăng tải bị chặn
            </DialogTitle>
            <DialogDescription className="text-foreground/90 pt-1">
              {publishBlockedMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
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
