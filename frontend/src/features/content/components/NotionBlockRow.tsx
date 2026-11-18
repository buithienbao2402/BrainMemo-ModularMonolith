import React, { useRef, useEffect, useState } from 'react';
import {
  Plus,
  GripVertical,
  Trash2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  AlignLeft,
  FileCode,
  Image as ImageIcon,
  Video,
  Music,
  Paperclip,
  Sparkles,
  HelpCircle,
  FileUp,
  ListChecks,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from '@/shared/ui';
import { normalizeBlockType, type BlockDto, type BlockType } from '../api/contentApi';
import { richJsonToHtml, htmlToRichJson, isRichDocEmpty } from '../lib/richTextDocument';
import { isCaretAtTop, isCaretAtBottom, setCaretToStart, setCaretToEnd } from '../lib/editorSelection';
import { MarkdownEditor } from './MarkdownEditor';
import { MediaBlockEditor } from './MediaBlockEditor';
import { FileBlockEditor } from './FileBlockEditor';
import { FlashcardBlockEditor } from './FlashcardBlockEditor';
import { QuestionBlockEditor } from './QuestionBlockEditor';
import { AssignmentBlockEditor } from './AssignmentBlockEditor';
import { QuizBlockEditor } from './QuizBlockEditor';

interface NotionBlockRowProps {
  block: BlockDto;
  index: number;
  totalBlocks: number;
  courseId: string;
  isFocused?: boolean;
  focusDirection?: 'FROM_TOP' | 'FROM_BOTTOM' | null;
  isSelected?: boolean;
  onUpdate: (updatedBlock: BlockDto) => void;
  onDelete: () => void;
  onAddBelow: (type?: BlockType) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onConvertType: (targetType: BlockType) => void;
  onDragStart?: (index: number) => void;
  onDragOver?: (e: React.DragEvent, index: number) => void;
  onDrop?: (targetIndex: number, position: 'TOP' | 'BOTTOM') => void;
  onOpenTypeMenu: (coords: { top: number; left: number }, blockId: string) => void;
  onOpenResourcePicker: (blockId: string) => void;
  onSelectionChange: (coords: { top: number; left: number } | null, blockId: string) => void;
  onFocusPrevBlock?: () => void;
  onFocusNextBlock?: () => void;
  onFocusBlock?: (blockId: string) => void;
  onSelectThisBlock?: (blockId: string) => void;
  onDeselectThisBlock?: (blockId: string) => void;
}

export function NotionBlockRow({
  block,
  index,
  totalBlocks,
  courseId,
  isFocused,
  focusDirection,
  isSelected = false,
  onUpdate,
  onDelete,
  onAddBelow: _onAddBelow,
  onMoveUp,
  onMoveDown,
  onConvertType,
  onDragStart,
  onDragOver,
  onDrop,
  onOpenTypeMenu,
  onOpenResourcePicker,
  onSelectionChange,
  onFocusPrevBlock,
  onFocusNextBlock,
  onFocusBlock,
  onSelectThisBlock,
  onDeselectThisBlock,
}: NotionBlockRowProps) {
  const editableRef = useRef<HTMLDivElement>(null);
  const isInternalChangeRef = useRef(false);
  const [dropIndicator, setDropIndicator] = useState<'TOP' | 'BOTTOM' | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isDraggingRef = useRef(false);

  const normalizedType = normalizeBlockType(block.blockType);
  const isRichText = normalizedType === 'RICH_TEXT';

  // Sync content with server/state value for RICH_TEXT
  useEffect(() => {
    if (isRichText && editableRef.current && !isInternalChangeRef.current) {
      const currentHtml = editableRef.current.innerHTML;
      const targetHtml = richJsonToHtml(block.body);
      if (currentHtml !== targetHtml) {
        editableRef.current.innerHTML = targetHtml;
      }
    }
    isInternalChangeRef.current = false;
  }, [block.body, isRichText]);

  // Handle focus & caret placement
  useEffect(() => {
    if (isFocused && isRichText && editableRef.current) {
      if (focusDirection === 'FROM_BOTTOM') {
        setCaretToEnd(editableRef.current);
      } else if (focusDirection === 'FROM_TOP') {
        setCaretToStart(editableRef.current);
      } else {
        editableRef.current.focus();
      }
    }
  }, [isFocused, focusDirection, isRichText]);

  const handleInput = () => {
    if (editableRef.current) {
      isInternalChangeRef.current = true;
      const html = editableRef.current.innerHTML;
      const docJson = htmlToRichJson(html);
      const bodyJson = JSON.stringify(docJson);
      onUpdate({ ...block, body: bodyJson });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // 1. Phím Backspace khi ô trống và không phải block duy nhất -> xóa block
    if (e.key === 'Backspace') {
      const text = editableRef.current?.innerText.trim() || '';
      if ((text === '' || isRichDocEmpty(block.body)) && totalBlocks > 1) {
        e.preventDefault();
        onDelete();
        return;
      }
    }

    // 2. Phím Mũi tên Lên / Xuống để di chuyển tự do giữa các block
    if (e.key === 'ArrowUp' && !e.shiftKey) {
      if (editableRef.current && isCaretAtTop(editableRef.current) && onFocusPrevBlock) {
        e.preventDefault();
        onFocusPrevBlock();
        return;
      }
    } else if (e.key === 'ArrowDown' && !e.shiftKey) {
      if (editableRef.current && isCaretAtBottom(editableRef.current) && onFocusNextBlock) {
        e.preventDefault();
        onFocusNextBlock();
        return;
      }
    }
  };

  // Text selection detection for floating toolbar
  const handleMouseUpOrKeyUp = () => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim().length > 0) {
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect && rect.width > 0) {
          onSelectionChange(
            {
              top: rect.top,
              left: rect.left + rect.width / 2 - 160,
            },
            block.id
          );
          return;
        }
      } catch {
        // Ignore range errors
      }
    }
    onSelectionChange(null, block.id);
  };

  // Drag over calculations
  const handleDragOverRow = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const isTop = e.clientY < rect.top + rect.height / 2;
    setDropIndicator(isTop ? 'TOP' : 'BOTTOM');
    onDragOver?.(e, index);
  };

  const handleDragLeaveRow = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropIndicator(null);
    }
  };

  const handleDropRow = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const targetPos = dropIndicator || 'BOTTOM';
    setDropIndicator(null);
    onDrop?.(index, targetPos);
  };

  // Meta helper
  const getBlockMeta = (type: BlockType | string | undefined) => {
    const clean = normalizeBlockType(type);
    switch (clean) {
      case 'RICH_TEXT':
        return { label: 'Văn bản (Rich Text)', icon: AlignLeft, color: 'text-blue-500' };
      case 'MARKDOWN':
        return { label: 'Markdown', icon: FileCode, color: 'text-indigo-500' };
      case 'IMAGE':
        return { label: 'Hình ảnh', icon: ImageIcon, color: 'text-emerald-500' };
      case 'VIDEO':
        return { label: 'Video bài giảng', icon: Video, color: 'text-rose-500' };
      case 'AUDIO':
        return { label: 'Âm thanh (Audio)', icon: Music, color: 'text-amber-500' };
      case 'FILE':
        return { label: 'Tệp đính kèm', icon: Paperclip, color: 'text-cyan-500' };
      case 'FLASHCARD':
        return { label: 'Bộ thẻ nhớ (Flashcard)', icon: Sparkles, color: 'text-primary' };
      case 'QUESTION':
        return { label: 'Câu hỏi thực hành', icon: HelpCircle, color: 'text-purple-500' };
      case 'ASSIGNMENT':
        return { label: 'Bài tập nộp tệp', icon: FileUp, color: 'text-orange-500' };
      case 'QUIZ':
        return { label: 'Bài kiểm tra (Quiz)', icon: ListChecks, color: 'text-pink-500' };
      default:
        return { label: 'Văn bản (Rich Text)', icon: AlignLeft, color: 'text-blue-500' };
    }
  };

  const meta = getBlockMeta(normalizedType);

  return (
    <div
      data-testid={`block-item-${block.id}`}
      data-block-id={block.id}
      draggable={isSelected}
      onDragStart={(e) => {
        const target = e.target as HTMLElement;
        if (target.isContentEditable && target === document.activeElement) {
          return;
        }
        e.dataTransfer.setData('text/plain', block.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.(index);
      }}
      onDragOver={handleDragOverRow}
      onDragLeave={handleDragLeaveRow}
      onDrop={handleDropRow}
      className={`group relative flex items-start gap-1 py-1 rounded-xl transition-all ${
        isSelected
          ? 'bg-blue-500/15 ring-2 ring-blue-500/50 dark:bg-blue-600/25 dark:ring-blue-400/50 shadow-xs'
          : 'hover:bg-muted/15'
      }`}
    >
      {/* Drop Indicator Lines */}
      {dropIndicator === 'TOP' && (
        <div className="absolute -top-1 left-4 right-4 h-1 bg-[#ff7a1a] rounded-full shadow-md z-30 pointer-events-none animate-in fade-in duration-100" />
      )}
      {dropIndicator === 'BOTTOM' && (
        <div className="absolute -bottom-1 left-4 right-4 h-1 bg-[#ff7a1a] rounded-full shadow-md z-30 pointer-events-none animate-in fade-in duration-100" />
      )}

      {/* 1. LEFT GUTTER CONTROLS (Hover visible, or visible when selected) */}
      <div
        className={`flex items-center gap-0.5 ${
          isSelected
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
        } transition-opacity select-none pt-1 shrink-0 w-12 justify-end`}
      >
        {/* Nút +: Chèn thêm 1 khối xuống dưới khối đang chọn */}
        <button
          type="button"
          title="Chèn khối xuống dưới"
          aria-label="Thêm khối nội dung mới"
          onClick={(e) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            onOpenTypeMenu({ top: rect.bottom + 4, left: rect.left }, block.id);
          }}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>

        {/* Nút ⠿: Dấu 6 chấm - Kéo thả di chuyển linh động & Click mở menu */}
        <div className="relative">
          <button
            type="button"
            draggable
            data-drag-handle="true"
            onDragStart={(e) => {
              isDraggingRef.current = true;
              setIsMenuOpen(false);
              e.dataTransfer.setData('text/plain', block.id);
              e.dataTransfer.effectAllowed = 'move';
              onDragStart?.(index);
            }}
            onDragEnd={() => {
              setTimeout(() => {
                isDraggingRef.current = false;
              }, 100);
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectThisBlock?.(block.id);
              setIsMenuOpen((prev) => !prev);
            }}
            title="Dấu 6 chấm: Kéo thả di chuyển lên xuống hoặc click mở tùy chọn"
            aria-label={`Tùy chọn khối ${block.id}`}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-grab active:cursor-grabbing transition-colors"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>

          <DropdownMenu
            open={isMenuOpen}
            onOpenChange={(open) => {
              setIsMenuOpen(open);
              if (!open) {
                onDeselectThisBlock?.(block.id);
              }
            }}
          >
            <DropdownMenuTrigger asChild>
              <span className="sr-only" tabIndex={-1} />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              avoidCollisions={true}
              collisionPadding={16}
              sideOffset={4}
              className="w-52 text-xs bg-popover border border-border text-popover-foreground shadow-2xl"
            >
            {/* Đổi thứ tự: Di chuyển lên / xuống */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <div className="flex items-center gap-2">
                  <ArrowUp className="h-3.5 w-3.5" />
                  <span>Đổi thứ tự</span>
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-40 bg-popover border border-border text-popover-foreground shadow-xl">
                <DropdownMenuItem onClick={onMoveUp} disabled={index === 0}>
                  <ArrowUp className="h-3.5 w-3.5 mr-2" />
                  <span>Di chuyển lên</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onMoveDown} disabled={index === totalBlocks - 1}>
                  <ArrowDown className="h-3.5 w-3.5 mr-2" />
                  <span>Di chuyển xuống</span>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Chuyển thành (đổi loại block; nội dung cũ biến mất) */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5 text-amber-500" />
                  <span>Chuyển thành</span>
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-52 bg-popover border border-border text-popover-foreground shadow-xl">
                <DropdownMenuItem onClick={() => onConvertType('RICH_TEXT')}>
                  <AlignLeft className="h-3.5 w-3.5 mr-2 text-blue-500" />
                  <span>Văn bản (Rich Text)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onConvertType('MARKDOWN')}>
                  <FileCode className="h-3.5 w-3.5 mr-2 text-indigo-500" />
                  <span>Markdown</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onConvertType('IMAGE')}>
                  <ImageIcon className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                  <span>Hình ảnh</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onConvertType('VIDEO')}>
                  <Video className="h-3.5 w-3.5 mr-2 text-rose-500" />
                  <span>Video bài giảng</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onConvertType('AUDIO')}>
                  <Music className="h-3.5 w-3.5 mr-2 text-amber-500" />
                  <span>Âm thanh (Audio)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onConvertType('FILE')}>
                  <Paperclip className="h-3.5 w-3.5 mr-2 text-cyan-500" />
                  <span>Tệp đính kèm</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onConvertType('FLASHCARD')}>
                  <Sparkles className="h-3.5 w-3.5 mr-2 text-[#ff7a1a]" />
                  <span>Bộ thẻ nhớ (Flashcard)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onConvertType('QUESTION')}>
                  <HelpCircle className="h-3.5 w-3.5 mr-2 text-purple-500" />
                  <span>Câu hỏi thực hành</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onConvertType('ASSIGNMENT')}>
                  <FileUp className="h-3.5 w-3.5 mr-2 text-orange-500" />
                  <span>Bài tập nộp tệp</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onConvertType('QUIZ')}>
                  <ListChecks className="h-3.5 w-3.5 mr-2 text-pink-500" />
                  <span>Bài kiểm tra (Quiz)</span>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            {/* Xóa block */}
            <DropdownMenuItem
              onClick={onDelete}
              className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              <span>Xóa block</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      {/* 2. BLOCK CONTENT CANVAS */}
      <div className="flex-1 min-w-0 px-2">
        {isRichText ? (
          <div className="relative">
            <div
              ref={editableRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onMouseUp={handleMouseUpOrKeyUp}
              onKeyUp={handleMouseUpOrKeyUp}
              onFocus={() => onFocusBlock?.(block.id)}
              data-placeholder="Nhập nội dung văn bản..."
              className="min-h-[1.75rem] py-0.5 text-sm sm:text-base leading-relaxed text-foreground outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/30 break-words
                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_ul]:my-2
                [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1 [&_ol]:my-2
                [&_li]:my-0.5
                [&_table]:border-collapse [&_table]:w-full [&_table]:my-3 [&_table]:border [&_table]:border-border/80
                [&_thead]:bg-muted/40
                [&_th]:border [&_th]:border-border/80 [&_th]:p-2.5 [&_th]:bg-muted/40 [&_th]:text-left [&_th]:font-semibold [&_th]:min-w-[70px] [&_th_p]:my-0 [&_th_p]:leading-normal
                [&_td]:border [&_td]:border-border/80 [&_td]:p-2.5 [&_td]:min-w-[70px] [&_td_p]:my-0 [&_td_p]:leading-normal
                [&_code]:bg-muted/80 [&_code]:text-[#ff7a1a] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:font-mono [&_code]:text-xs [&_code]:border [&_code]:border-border/60
                [&_pre]:bg-muted/50 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:font-mono [&_pre]:text-xs [&_pre]:my-2 [&_pre]:overflow-x-auto
                [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:font-serif [&_h1]:my-2
                [&_h2]:text-xl [&_h2]:font-bold [&_h2]:font-serif [&_h2]:my-1.5
                [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:my-1
                [&_h4]:text-base [&_h4]:font-semibold [&_h4]:my-1
                [&_h5]:text-sm [&_h5]:font-semibold [&_h5]:my-0.5
                [&_h6]:text-xs [&_h6]:font-semibold [&_h6]:text-muted-foreground [&_h6]:my-0.5"
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-3">
            {/* Header info for specialized block */}
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="flex items-center gap-2">
                <meta.icon className={`h-4 w-4 ${meta.color}`} />
                <span className="text-xs font-semibold text-foreground">{meta.label}</span>
              </div>
              <button
                type="button"
                onClick={onDelete}
                title="Xóa khối"
                aria-label="Xóa khối"
                className="p-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Specialized block body */}
            {normalizedType === 'MARKDOWN' && (
              <MarkdownEditor
                value={block.body || ''}
                onChange={(body) => onUpdate({ ...block, body })}
              />
            )}

            {(normalizedType === 'IMAGE' ||
              normalizedType === 'VIDEO' ||
              normalizedType === 'AUDIO') && (
              <MediaBlockEditor
                courseId={courseId}
                blockType={normalizedType}
                title={block.title}
                resourceId={block.resourceId}
                onUpdate={(updates) => onUpdate({ ...block, ...updates })}
                onOpenResourcePicker={() => onOpenResourcePicker(block.id)}
              />
            )}

            {normalizedType === 'FILE' && (
              <FileBlockEditor
                courseId={courseId}
                title={block.title}
                resourceId={block.resourceId}
                onUpdate={(updates) => onUpdate({ ...block, ...updates })}
                onOpenResourcePicker={() => onOpenResourcePicker(block.id)}
              />
            )}

            {normalizedType === 'FLASHCARD' && (
              <FlashcardBlockEditor
                flashcards={block.flashcards || []}
                aiReviewStatus={block.aiReviewStatus}
                onUpdate={(updates) => onUpdate({ ...block, ...updates })}
              />
            )}

            {normalizedType === 'QUESTION' && (
              <QuestionBlockEditor
                title={block.title}
                questionId={block.questionId}
                onUpdate={(updates) => onUpdate({ ...block, ...updates })}
              />
            )}

            {normalizedType === 'ASSIGNMENT' && (
              <AssignmentBlockEditor
                title={block.title}
                body={block.body}
                assignmentConfig={block.assignmentConfig}
                onUpdate={(updates) => onUpdate({ ...block, ...updates })}
              />
            )}

            {normalizedType === 'QUIZ' && (
              <QuizBlockEditor
                title={block.title}
                quizConfig={block.quizConfig}
                onUpdate={(updates) => onUpdate({ ...block, ...updates })}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
