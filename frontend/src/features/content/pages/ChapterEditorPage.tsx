import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  MoreVertical,
  AlertCircle,
  History,
  Trash2,
  Lock,
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
  useSetChapterAccessMutation,
  type BlockDto,
  type BlockType,
  type ResourceDto,
} from '../api/contentApi';
import { NotionBlockRow } from '../components/NotionBlockRow';
import { SlashCommandMenu, type SlashCommandItem } from '../components/SlashCommandMenu';
import { FloatingTextFormatToolbar } from '../components/FloatingTextFormatToolbar';
import { ResourceDrawer } from '../components/ResourceDrawer';
import { ChapterVersionsModal } from '../components/ChapterVersionsModal';
import { DeleteChapterModal } from '../components/DeleteChapterModal';
import { UnsavedChangesModal } from '../components/UnsavedChangesModal';
import { ChapterAccessPanel } from '../components/ChapterAccessPanel';
import {
  createEmptyRichDocJson,
  isRichDocEmpty,
  isRichDocumentJsonString,
  htmlToRichJson,
} from '../lib/richTextDocument';
import { ApiProblemError, queryKeys } from '@/shared/api';

function generateBlockId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyTextBlock(position: number): BlockDto {
  return {
    id: generateBlockId(),
    blockType: 'RICH_TEXT',
    position,
    title: null,
    body: JSON.stringify(createEmptyRichDocJson()),
    resourceId: null,
    questionId: null,
    aiReviewStatus: 'NOT_APPLICABLE',
  };
}

export function ChapterEditorPage() {
  const { courseId = '', chapterId = '' } = useParams<{
    courseId: string;
    chapterId: string;
  }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();

  const isNewMode = !chapterId || chapterId === 'new';
  const afterChapterId = searchParams.get('after');

  // Course query for displaying course name and checking access mode
  const { data: course } = useCourseQuery(courseId);
  const { data: allChapters } = useChaptersQuery(courseId);

  // Working draft state
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<BlockDto[]>([createEmptyTextBlock(1)]);
  const [baseVersionNo, setBaseVersionNo] = useState<number>(1);
  const [accessMode, setAccessMode] = useState<'PUBLIC' | 'PROTECTED'>('PUBLIC');
  const [passcode, setPasscode] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [focusDirection, setFocusDirection] = useState<'FROM_TOP' | 'FROM_BOTTOM' | null>(null);

  // Multi-select blocks state & Marquee selection box
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
  const [marqueeRect, setMarqueeRect] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const isMarqueeDraggingRef = useRef(false);
  const marqueeStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Drag and drop block state
  const draggedIndexRef = useRef<number | null>(null);

  // Undo / Redo history state
  const undoStackRef = useRef<Array<{ title: string; blocks: BlockDto[] }>>([]);
  const redoStackRef = useRef<Array<{ title: string; blocks: BlockDto[] }>>([]);
  const isUndoRedoActionRef = useRef(false);

  // Push current state into undo history
  const pushUndoSnapshot = useCallback((newTitle: string, newBlocks: BlockDto[]) => {
    if (isUndoRedoActionRef.current) return;
    undoStackRef.current.push({
      title: newTitle,
      blocks: JSON.parse(JSON.stringify(newBlocks)),
    });
    if (undoStackRef.current.length > 50) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
  }, []);

  // Floating menus & context menus state
  const [activeTypeMenu, setActiveTypeMenu] = useState<{
    coords: { top: number; left: number };
    blockId: string;
  } | null>(null);

  const [activeSelection, setActiveSelection] = useState<{
    coords: { top: number; left: number };
    blockId: string;
  } | null>(null);

  // Modals & Panels state
  const [isAccessPanelOpen, setIsAccessPanelOpen] = useState(false);
  const [isResourceDrawerOpen, setIsResourceDrawerOpen] = useState(false);
  const [pickerTargetBlockId, setPickerTargetBlockId] = useState<string | null>(null);
  const [isVersionsModalOpen, setIsVersionsModalOpen] = useState(false);
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
  const { mutateAsync: setChapterAccess, isPending: isSettingAccess } = useSetChapterAccessMutation(
    courseId,
    isNewMode ? '' : chapterId
  );

  // Luôn đảm bảo có ít nhất 1 khối text trống ở dưới cùng
  const ensureTrailingEmptyTextBlock = useCallback((currentBlocks: BlockDto[]): BlockDto[] => {
    if (currentBlocks.length === 0) {
      return [createEmptyTextBlock(1)];
    }
    const lastBlock = currentBlocks[currentBlocks.length - 1];
    if (!lastBlock) {
      return [createEmptyTextBlock(1)];
    }
    const isLastBlockEmptyText =
      lastBlock.blockType === 'RICH_TEXT' && isRichDocEmpty(lastBlock.body);

    if (!isLastBlockEmptyText) {
      // Tự động append một khối text trống ở dưới cùng
      const nextList = [...currentBlocks, createEmptyTextBlock(currentBlocks.length + 1)];
      return nextList.map((b, i) => ({ ...b, position: i + 1 }));
    }
    return currentBlocks;
  }, []);

  // Populate draft data in edit mode
  useEffect(() => {
    if (!isNewMode && chapter) {
      const initTitle = chapter.title || '';
      setTitle(initTitle);
      const mode = ((chapter as any)?.accessMode as any) || 'PUBLIC';
      setAccessMode(mode);
      setPasscode((prev) => (chapter as any)?.passcode || prev || '');
      setBaseVersionNo(chapter.lastVersionNo || 1);

      let loadedBlocks: BlockDto[] = [];
      if (chapter.blocks && chapter.blocks.length > 0) {
        loadedBlocks = chapter.blocks;
      } else {
        loadedBlocks = [createEmptyTextBlock(1)];
      }
      const guaranteed = ensureTrailingEmptyTextBlock(loadedBlocks);
      setBlocks(guaranteed);
      setIsDirty(false);
      undoStackRef.current = [{ title: initTitle, blocks: JSON.parse(JSON.stringify(guaranteed)) }];
      redoStackRef.current = [];
    }
  }, [isNewMode, chapter, ensureTrailingEmptyTextBlock]);

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

  // Global Keyboard shortcuts: Undo (Ctrl+Z), Redo (Ctrl+Y / Ctrl+Shift+Z), Delete selected blocks
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. Undo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (undoStackRef.current.length > 1) {
          e.preventDefault();
          const current = undoStackRef.current.pop();
          if (current) {
            redoStackRef.current.push({
              title,
              blocks: JSON.parse(JSON.stringify(blocks)),
            });
            const prev = undoStackRef.current[undoStackRef.current.length - 1];
            if (prev) {
              isUndoRedoActionRef.current = true;
              setTitle(prev.title);
              setBlocks(JSON.parse(JSON.stringify(prev.blocks)));
              setIsDirty(true);
              setTimeout(() => {
                isUndoRedoActionRef.current = false;
              }, 50);
            }
          }
        }
        return;
      }

      // 2. Redo
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        if (redoStackRef.current.length > 0) {
          e.preventDefault();
          const next = redoStackRef.current.pop();
          if (next) {
            undoStackRef.current.push({
              title,
              blocks: JSON.parse(JSON.stringify(blocks)),
            });
            isUndoRedoActionRef.current = true;
            setTitle(next.title);
            setBlocks(JSON.parse(JSON.stringify(next.blocks)));
            setIsDirty(true);
            setTimeout(() => {
              isUndoRedoActionRef.current = false;
            }, 50);
          }
        }
        return;
      }

      // 3. Xóa các block đã chọn bằng Delete / Backspace khi không focus ô input
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlockIds.size > 0) {
        const activeTag = (document.activeElement?.tagName || '').toLowerCase();
        const isEditingText =
          activeTag === 'input' ||
          activeTag === 'textarea' ||
          document.activeElement?.getAttribute('contenteditable') === 'true';

        if (!isEditingText) {
          e.preventDefault();
          handleDeleteSelectedBlocks();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [title, blocks, selectedBlockIds]);

  // Marquee / Box Selection effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!marqueeStartPosRef.current) return;

      const dx = e.clientX - marqueeStartPosRef.current.x;
      const dy = e.clientY - marqueeStartPosRef.current.y;

      if (!isMarqueeDraggingRef.current) {
        if (Math.hypot(dx, dy) >= 6) {
          isMarqueeDraggingRef.current = true;
          window.getSelection()?.removeAllRanges();
        } else {
          return;
        }
      }

      const selLeft = Math.min(marqueeStartPosRef.current.x, e.clientX);
      const selTop = Math.min(marqueeStartPosRef.current.y, e.clientY);
      const selRight = Math.max(marqueeStartPosRef.current.x, e.clientX);
      const selBottom = Math.max(marqueeStartPosRef.current.y, e.clientY);

      setMarqueeRect({
        startX: marqueeStartPosRef.current.x,
        startY: marqueeStartPosRef.current.y,
        currentX: e.clientX,
        currentY: e.clientY,
      });

      const blockElements = document.querySelectorAll<HTMLElement>('[data-block-id]');
      const matchedIds = new Set<string>();

      blockElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const isOverlap = !(
          rect.right < selLeft ||
          rect.left > selRight ||
          rect.bottom < selTop ||
          rect.top > selBottom
        );
        if (isOverlap) {
          const id = el.getAttribute('data-block-id');
          if (id) matchedIds.add(id);
        }
      });

      setSelectedBlockIds(matchedIds);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (marqueeStartPosRef.current && !isMarqueeDraggingRef.current) {
        const target = e.target as HTMLElement;
        const isClickOnBlockGrip = target.closest('[data-drag-handle="true"]');
        const isClickInsideModal = target.closest('[role="dialog"], [role="menu"]');
        if (!isClickOnBlockGrip && !isClickInsideModal) {
          setSelectedBlockIds(new Set());
        }
      }

      marqueeStartPosRef.current = null;
      isMarqueeDraggingRef.current = false;
      setMarqueeRect(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [blocks]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // RULE: Kéo chuột trên canvas chỉ kích hoạt khi kéo chuột từ bên ngoài phạm vi block!
    // Còn kéo từ trong block thì không kích hoạt (sẽ chỉ bôi đen nội dung trong block)
    if (target.closest('[data-block-id]')) {
      if (!target.closest('[data-drag-handle="true"]')) {
        setSelectedBlockIds(new Set());
      }
      return;
    }

    if (
      target.closest('header') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('button') ||
      target.closest('[role="dialog"]') ||
      target.closest('[role="menu"]')
    ) {
      return;
    }

    marqueeStartPosRef.current = { x: e.clientX, y: e.clientY };
    isMarqueeDraggingRef.current = false;
  };

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

  // Block management
  const handleAddBlockBelow = (targetIndex: number, type: BlockType = 'RICH_TEXT') => {
    pushUndoSnapshot(title, blocks);
    const newId = generateBlockId();
    const newBlock: BlockDto = {
      id: newId,
      blockType: type,
      position: targetIndex + 2,
      title: null,
      body:
        type === 'RICH_TEXT'
          ? JSON.stringify(createEmptyRichDocJson())
          : type === 'MARKDOWN'
          ? ''
          : null,
      resourceId: null,
      questionId: null,
      flashcards: type === 'FLASHCARD' ? [{ front: '', back: '' }] : undefined,
      aiReviewStatus: 'NOT_APPLICABLE',
    };

    const nextList = [...blocks];
    nextList.splice(targetIndex + 1, 0, newBlock);
    const guaranteed = ensureTrailingEmptyTextBlock(nextList);
    setBlocks(guaranteed);
    setFocusedBlockId(newId);
    setSelectedBlockIds(new Set());
    setIsDirty(true);
  };

  const handleUpdateBlock = (updatedBlock: BlockDto) => {
    const next = blocks.map((b) => (b.id === updatedBlock.id ? updatedBlock : b));
    const guaranteed = ensureTrailingEmptyTextBlock(next);
    setBlocks(guaranteed);
    setIsDirty(true);
  };

  const handleDeleteBlock = (blockId: string) => {
    pushUndoSnapshot(title, blocks);
    if (blocks.length <= 1) {
      setBlocks([createEmptyTextBlock(1)]);
    } else {
      const remaining = blocks.filter((b) => b.id !== blockId);
      const guaranteed = ensureTrailingEmptyTextBlock(remaining);
      setBlocks(guaranteed);
    }
    setSelectedBlockIds(new Set());
    setIsDirty(true);
  };

  const handleDeleteSelectedBlocks = () => {
    if (selectedBlockIds.size === 0) return;
    pushUndoSnapshot(title, blocks);
    const remaining = blocks.filter((b) => !selectedBlockIds.has(b.id));
    const guaranteed = ensureTrailingEmptyTextBlock(remaining);
    setBlocks(guaranteed);
    setSelectedBlockIds(new Set());
    setIsDirty(true);
  };

  const handleMoveBlock = (index: number, direction: 'UP' | 'DOWN') => {
    const block = blocks[index];
    if (!block) return;

    let movingBlocks: BlockDto[];
    if (selectedBlockIds.has(block.id) && selectedBlockIds.size > 1) {
      movingBlocks = blocks.filter((b) => selectedBlockIds.has(b.id));
    } else {
      movingBlocks = [block];
    }

    const movingBlockIds = new Set(movingBlocks.map((b) => b.id));
    const firstMovingIdx = blocks.findIndex((b) => movingBlockIds.has(b.id));
    const lastMovingIdx =
      blocks.length - 1 - [...blocks].reverse().findIndex((b) => movingBlockIds.has(b.id));

    if (direction === 'UP' && firstMovingIdx <= 0) return;
    if (direction === 'DOWN' && lastMovingIdx >= blocks.length - 1) return;

    pushUndoSnapshot(title, blocks);

    const remainingBlocks = blocks.filter((b) => !movingBlockIds.has(b.id));

    if (direction === 'UP') {
      const blockAboveFirst = blocks[firstMovingIdx - 1];
      if (!blockAboveFirst) return;
      const targetIdxInRemaining = remainingBlocks.findIndex((b) => b.id === blockAboveFirst.id);
      remainingBlocks.splice(targetIdxInRemaining, 0, ...movingBlocks);
    } else {
      const blockBelowLast = blocks[lastMovingIdx + 1];
      if (!blockBelowLast) return;
      const targetIdxInRemaining = remainingBlocks.findIndex((b) => b.id === blockBelowLast.id);
      remainingBlocks.splice(targetIdxInRemaining + 1, 0, ...movingBlocks);
    }

    const guaranteed = ensureTrailingEmptyTextBlock(remainingBlocks);
    setBlocks(guaranteed);
    setIsDirty(true);
  };

  // Drag and Drop block reordering (Hỗ trợ kéo thả 1 hoặc nhiều block cùng lúc)
  const handleDragStart = (index: number) => {
    draggedIndexRef.current = index;
    const block = blocks[index];
    if (block && !selectedBlockIds.has(block.id)) {
      setSelectedBlockIds(new Set([block.id]));
    }
  };

  const handleDragOver = (e: React.DragEvent, _targetIndex: number) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number, position: 'TOP' | 'BOTTOM' = 'BOTTOM') => {
    const sourceIndex = draggedIndexRef.current;
    if (sourceIndex === null) return;

    const draggedBlock = blocks[sourceIndex];
    if (!draggedBlock) return;

    let movingBlocks: BlockDto[];
    if (selectedBlockIds.has(draggedBlock.id)) {
      movingBlocks = blocks.filter((b) => selectedBlockIds.has(b.id));
    } else {
      movingBlocks = [draggedBlock];
      setSelectedBlockIds(new Set([draggedBlock.id]));
    }

    if (movingBlocks.length === 0) return;

    const targetBlock = blocks[targetIndex];
    if (!targetBlock) return;

    if (movingBlocks.some((b) => b.id === targetBlock.id)) {
      draggedIndexRef.current = null;
      return;
    }

    pushUndoSnapshot(title, blocks);

    const movingBlockIds = new Set(movingBlocks.map((b) => b.id));
    const remainingBlocks = blocks.filter((b) => !movingBlockIds.has(b.id));

    const targetIdxInRemaining = remainingBlocks.findIndex((b) => b.id === targetBlock.id);
    if (targetIdxInRemaining === -1) {
      draggedIndexRef.current = null;
      return;
    }

    const insertIndex = position === 'TOP' ? targetIdxInRemaining : targetIdxInRemaining + 1;
    remainingBlocks.splice(insertIndex, 0, ...movingBlocks);

    const guaranteed = ensureTrailingEmptyTextBlock(remainingBlocks);
    setBlocks(guaranteed);
    draggedIndexRef.current = null;
    setIsDirty(true);
  };

  // Convert block type (nội dung cũ biến mất)
  const handleConvertBlockType = (blockId: string, targetType: BlockType) => {
    pushUndoSnapshot(title, blocks);
    setBlocks(
      blocks.map((b) => {
        if (b.id !== blockId) return b;
        return {
          id: b.id,
          blockType: targetType,
          position: b.position,
          title: null,
          body:
            targetType === 'RICH_TEXT'
              ? JSON.stringify(createEmptyRichDocJson())
              : targetType === 'MARKDOWN'
              ? ''
              : null,
          resourceId: null,
          questionId: null,
          flashcards: targetType === 'FLASHCARD' ? [{ front: '', back: '' }] : undefined,
          aiReviewStatus: 'NOT_APPLICABLE',
        };
      })
    );
    setIsDirty(true);
  };

  // Keyboard navigation across blocks (ArrowUp / ArrowDown)
  const handleFocusPrevBlock = (currentIndex: number) => {
    if (currentIndex > 0) {
      const prevBlock = blocks[currentIndex - 1];
      if (prevBlock) {
        setFocusDirection('FROM_BOTTOM');
        setFocusedBlockId(prevBlock.id);
      }
    }
  };

  const handleFocusNextBlock = (currentIndex: number) => {
    if (currentIndex < blocks.length - 1) {
      const nextBlock = blocks[currentIndex + 1];
      if (nextBlock) {
        setFocusDirection('FROM_TOP');
        setFocusedBlockId(nextBlock.id);
      }
    }
  };

  // Block type popup menu selection (Khi bấm dấu +)
  const handleSelectTypeCommand = (item: SlashCommandItem) => {
    if (!activeTypeMenu) return;
    const targetId = activeTypeMenu.blockId;
    setActiveTypeMenu(null);
    const targetIdx = blocks.findIndex((b) => b.id === targetId);
    if (targetIdx !== -1) {
      handleAddBlockBelow(targetIdx, item.blockType);
    }
  };

  // Floating text format commands
  const handleExecuteFormatCommand = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    setIsDirty(true);
  };

  // Apply heading (H1 - H6, p)
  const handleApplyHeading = (level: 1 | 2 | 3 | 4 | 5 | 6 | 'p') => {
    const tag = level === 'p' ? '<p>' : `<h${level}>`;
    document.execCommand('formatBlock', false, tag);
    const sel = window.getSelection();
    if (sel?.anchorNode) {
      const parent =
        sel.anchorNode.nodeType === Node.TEXT_NODE
          ? sel.anchorNode.parentElement
          : (sel.anchorNode as HTMLElement);
      const editable = parent?.closest('[contenteditable="true"]') as HTMLElement | null;
      if (editable) {
        editable.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    setIsDirty(true);
  };

  // Format code (<>)
  const handleToggleCode = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const parentCode = (sel.anchorNode?.nodeType === Node.TEXT_NODE
      ? sel.anchorNode.parentElement
      : (sel.anchorNode as HTMLElement)
    )?.closest('code');

    if (parentCode) {
      // Unwrap
      const textNode = document.createTextNode(parentCode.textContent || '');
      parentCode.parentNode?.replaceChild(textNode, parentCode);
    } else {
      // Wrap code
      const codeEl = document.createElement('code');
      codeEl.className =
        'bg-muted/80 text-[#ff7a1a] px-1.5 py-0.5 rounded font-mono text-xs border border-border/60';
      codeEl.textContent = range.toString() || 'code';
      range.deleteContents();
      range.insertNode(codeEl);
    }
    setIsDirty(true);
  };

  // Chèn bảng với số dòng & số cột tùy chọn
  const handleInsertTableCustom = (rows: number, cols: number) => {
    let headerThs = '';
    for (let c = 1; c <= cols; c++) {
      headerThs += `<th class="border border-border/80 p-2.5 text-left font-semibold">Cột ${c}</th>`;
    }

    let bodyRows = '';
    for (let r = 1; r < rows; r++) {
      let cells = '';
      for (let c = 1; c <= cols; c++) {
        cells += `<td class="border border-border/80 p-2.5">Dữ liệu ${r}.${c}</td>`;
      }
      bodyRows += `<tr>${cells}</tr>`;
    }

    const tableHtml = `
      <table class="border-collapse w-full my-3 border border-border/80">
        <thead>
          <tr class="bg-muted/40">${headerThs}</tr>
        </thead>
        <tbody>
          ${bodyRows || `<tr><td class="border border-border/80 p-2.5" colspan="${cols}">Nội dung hàng</td></tr>`}
        </tbody>
      </table><p></p>
    `;

    document.execCommand('insertHTML', false, tableHtml);
    setIsDirty(true);
  };

  // Áp dụng chế độ truy cập từ Panel
  const handleApplyAccess = async (newMode: 'PUBLIC' | 'PROTECTED', newPasscode: string) => {
    setAccessMode(newMode);
    setPasscode(newPasscode);

    if (!isNewMode) {
      try {
        await setChapterAccess({
          accessMode: newMode,
          passcode: newMode === 'PROTECTED' ? newPasscode : undefined,
        });
        queryClient.setQueryData(
          queryKeys.content.chapterDraft(courseId, chapterId),
          (old: any) =>
            old
              ? {
                  ...old,
                  accessMode: newMode,
                  passcode: newPasscode,
                }
              : old
        );
        pushToast({
          title: 'Cập nhật chế độ truy cập thành công',
          description: `Chương đã chuyển sang chế độ ${
            newMode === 'PROTECTED' ? 'Protected (Có mật khẩu)' : 'Public (Công khai)'
          }.`,
          tone: 'success',
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Không thể lưu chế độ truy cập.';
        pushToast({
          title: 'Lỗi',
          description: msg,
          tone: 'error',
        });
        return;
      }
    } else {
      pushToast({
        title: 'Đã lưu thiết lập truy cập',
        description: 'Chế độ truy cập sẽ được áp dụng khi bạn lưu nháp chương mới.',
        tone: 'default',
      });
      setIsDirty(true);
    }
    setIsAccessPanelOpen(false);
  };

  // Save Draft (Chỉ lưu khi click nút "Lưu nháp")
  const handleSaveDraft = async (): Promise<boolean> => {
    if (!title.trim()) {
      pushToast({
        title: 'Vui lòng nhập tên chương',
        tone: 'warning',
      });
      return false;
    }

    try {
      const normalizedBlocks = blocks.map((b) => {
        if (b.blockType === 'RICH_TEXT') {
          const bodyStr = b.body || '';
          const isJson = isRichDocumentJsonString(bodyStr);
          const jsonBody = isJson ? bodyStr : JSON.stringify(htmlToRichJson(bodyStr));
          return { ...b, body: jsonBody };
        }
        return b;
      });

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

        // 3. Cập nhật access mode nếu được thiết lập
        if (created.id && accessMode === 'PROTECTED') {
          await setChapterAccess({
            accessMode: 'PROTECTED',
            passcode: passcode || undefined,
          });
        }

        // 4. Lưu nội dung draft vừa soạn vào chương mới (với body đã là JSON)
        if (created.id) {
          await saveDraft({
            chapterId: created.id,
            body: {
              baseVersionNo: 1,
              title: title.trim(),
              description: '',
              blocks: normalizedBlocks,
            },
          });

          pushToast({
            title: 'Lưu bản nháp thành công',
            description: `Chương "${created.title}" đã được tạo và lưu thành công.`,
            tone: 'success',
          });

          setIsDirty(false);
          navigate(`/courses/${courseId}/manage/content/${created.id}`, { replace: true });
        }
      } else {
        // Lưu chương hiện có (với body đã là JSON)
        const updated = await saveDraft({
          chapterId,
          body: {
            baseVersionNo,
            title: title.trim(),
            description: chapter?.description || '',
            blocks: normalizedBlocks,
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
  const isCourseOnlyMe =
    (course as any)?.accessMode === 'ONLY_ME' || (course as any)?.visibility === 'ONLY_ME';

  return (
    <div
      onMouseDown={handleCanvasMouseDown}
      className="min-h-screen bg-background text-foreground flex flex-col"
    >
      {/* 1. TOP HEADER BAR */}
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
              className="bg-[#ff7a1a] hover:bg-[#ff7a1a]/90 text-[#3b1700] text-xs h-8 px-4 font-bold rounded-lg shadow-xs"
            >
              {isPublishing ? 'Đang đăng...' : 'Đăng tải'}
            </Button>

            {/* Menu 3 chấm (CHỈ GIỮ 3 MỤC: Chế độ truy cập, Lịch sử phiên bản, Xóa chương) */}
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
              <DropdownMenuContent align="end" className="w-52 text-xs bg-popover border border-border text-popover-foreground shadow-xl">
                {/* 1. Chế độ truy cập */}
                <DropdownMenuItem
                  onClick={() => setIsAccessPanelOpen(true)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-[#ff7a1a]" />
                    <span>Chế độ truy cập</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground font-medium">
                    {accessMode === 'PROTECTED' ? 'Protected' : 'Public'}
                  </span>
                </DropdownMenuItem>

                {/* 2. Lịch sử phiên bản */}
                {!isNewMode && (
                  <DropdownMenuItem onClick={() => setIsVersionsModalOpen(true)}>
                    <History className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>Lịch sử phiên bản</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                {/* 3. Xóa chương */}
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
      <main
        onMouseDown={handleCanvasMouseDown}
        className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-12 py-10 space-y-6 relative"
      >
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

        {/* Thanh công cụ khi chọn nhiều block */}
        {selectedBlockIds.size > 1 && (
          <div className="ml-12 flex items-center justify-between p-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-xs">
            <span className="font-semibold text-foreground">
              Đã chọn {selectedBlockIds.size} khối nội dung
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedBlockIds(new Set())}
                className="h-7 text-xs border-border/80"
              >
                Bỏ chọn
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDeleteSelectedBlocks}
                className="h-7 text-xs"
              >
                Xóa {selectedBlockIds.size} khối đã chọn
              </Button>
            </div>
          </div>
        )}

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
              focusDirection={focusedBlockId === block.id ? focusDirection : null}
              isSelected={selectedBlockIds.has(block.id)}
              onUpdate={handleUpdateBlock}
              onDelete={() => handleDeleteBlock(block.id)}
              onAddBelow={(type?: BlockType) => handleAddBlockBelow(index, type)}
              onMoveUp={() => handleMoveBlock(index, 'UP')}
              onMoveDown={() => handleMoveBlock(index, 'DOWN')}
              onConvertType={(targetType) => handleConvertBlockType(block.id, targetType)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onOpenTypeMenu={(coords, blockId) => setActiveTypeMenu({ coords, blockId })}
              onOpenResourcePicker={(blockId: string) => {
                setPickerTargetBlockId(blockId);
                setIsResourceDrawerOpen(true);
              }}
              onSelectionChange={(coords, blockId) => {
                // Không hiển thị floating format bar nếu đang chọn nhiều block
                if (coords && selectedBlockIds.size <= 1) {
                  setActiveSelection({ coords, blockId });
                } else {
                  setActiveSelection(null);
                }
              }}
              onFocusPrevBlock={() => handleFocusPrevBlock(index)}
              onFocusNextBlock={() => handleFocusNextBlock(index)}
              onFocusBlock={(blockId) => {
                setFocusedBlockId(blockId);
                setFocusDirection(null);
                setSelectedBlockIds(new Set());
              }}
              onSelectThisBlock={(blockId) => {
                setSelectedBlockIds(new Set([blockId]));
              }}
              onDeselectThisBlock={(blockId) => {
                setSelectedBlockIds((prev) => {
                  if (prev.has(blockId)) {
                    const next = new Set(prev);
                    next.delete(blockId);
                    return next;
                  }
                  return prev;
                });
              }}
            />
          ))}
        </div>
      </main>

      {/* MARQUEE SELECTION RECTANGLE (Bôi đen nhiều block với con trỏ chuột) */}
      {marqueeRect && (
        <div
          className="fixed pointer-events-none z-50 rounded border border-blue-500/70 bg-blue-500/20"
          style={{
            left: `${Math.min(marqueeRect.startX, marqueeRect.currentX)}px`,
            top: `${Math.min(marqueeRect.startY, marqueeRect.currentY)}px`,
            width: `${Math.abs(marqueeRect.currentX - marqueeRect.startX)}px`,
            height: `${Math.abs(marqueeRect.currentY - marqueeRect.startY)}px`,
          }}
        />
      )}

      {/* 3. MENU CHỌN LOẠI BLOCK (KHI BẤM DẤU +) */}
      <SlashCommandMenu
        isOpen={Boolean(activeTypeMenu)}
        position={activeTypeMenu?.coords}
        onClose={() => setActiveTypeMenu(null)}
        onSelect={handleSelectTypeCommand}
      />

      {/* 4. FLOATING TEXT FORMAT TOOLBAR (Chỉ hiện khi bôi đen text trong 1 block) */}
      {selectedBlockIds.size <= 1 && (
        <FloatingTextFormatToolbar
          position={activeSelection?.coords || null}
          onCommand={handleExecuteFormatCommand}
          onApplyHeading={handleApplyHeading}
          onToggleCode={handleToggleCode}
          onInsertTable={handleInsertTableCustom}
          onClose={() => setActiveSelection(null)}
        />
      )}

      {/* 5. RIGHT DRAWER: CHẾ ĐỘ TRUY CẬP (Theo ảnh specimen) */}
      <ChapterAccessPanel
        isOpen={isAccessPanelOpen}
        initialMode={accessMode}
        initialPasscode={passcode}
        isCourseOnlyMe={isCourseOnlyMe}
        onClose={() => setIsAccessPanelOpen(false)}
        onApply={handleApplyAccess}
        isPending={isSettingAccess}
      />

      {/* 6. MODAL: XÓA CHƯƠNG HỌC */}
      <DeleteChapterModal
        isOpen={isDeleteDialogOpen}
        chapterTitle={title}
        blockCount={blocks.length}
        onCancel={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteChapterConfirm}
        isDeleting={isDeleting}
      />

      {/* 7. MODAL: RỜI KHỎI TRANG KHI CHƯA LƯU */}
      <UnsavedChangesModal
        isOpen={showUnsavedExitDialog}
        chapterTitle={title}
        onStay={() => setShowUnsavedExitDialog(false)}
        onSaveDraft={handleSaveAndExit}
        onLeave={handleConfirmExitDiscard}
        isSaving={isSaving || isCreating}
      />

      {/* 8. MODAL: RESOURCE DRAWER */}
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

      {/* 9. MODAL: VERSION HISTORY */}
      {!isNewMode && (
        <ChapterVersionsModal
          isOpen={isVersionsModalOpen}
          courseId={courseId}
          chapterId={chapterId}
          onClose={() => setIsVersionsModalOpen(false)}
          currentVersionNo={baseVersionNo}
        />
      )}

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
