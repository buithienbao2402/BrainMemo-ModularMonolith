import React, { useRef, useEffect } from 'react';
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
import type { BlockDto, BlockType } from '../api/contentApi';
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
  isSelected?: boolean;
  onUpdate: (updatedBlock: BlockDto) => void;
  onDelete: () => void;
  onAddBelow: (type?: BlockType) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onConvertType: (targetType: BlockType) => void;
  onDragStart?: (index: number) => void;
  onDragOver?: (e: React.DragEvent, index: number) => void;
  onDrop?: (index: number) => void;
  onOpenTypeMenu: (coords: { top: number; left: number }, blockId: string) => void;
  onOpenResourcePicker: (blockId: string) => void;
  onSelectionChange: (coords: { top: number; left: number } | null, blockId: string) => void;
  onFocusPrevBlock?: () => void;
  onFocusNextBlock?: () => void;
  onToggleSelect?: (e: React.MouseEvent) => void;
}

export function NotionBlockRow({
  block,
  index,
  totalBlocks,
  courseId,
  isFocused,
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
  onToggleSelect,
}: NotionBlockRowProps) {
  const editableRef = useRef<HTMLDivElement>(null);
  const isInternalChangeRef = useRef(false);

  // Sync content with server/state value for RICH_TEXT
  useEffect(() => {
    if (block.blockType === 'RICH_TEXT' && editableRef.current && !isInternalChangeRef.current) {
      const currentHtml = editableRef.current.innerHTML;
      const targetHtml = block.body || '';
      if (currentHtml !== targetHtml) {
        editableRef.current.innerHTML = targetHtml;
      }
    }
    isInternalChangeRef.current = false;
  }, [block.body, block.blockType]);

  // Handle focus
  useEffect(() => {
    if (isFocused && block.blockType === 'RICH_TEXT' && editableRef.current) {
      editableRef.current.focus();
    }
  }, [isFocused, block.blockType]);

  const handleInput = () => {
    if (editableRef.current) {
      isInternalChangeRef.current = true;
      const html = editableRef.current.innerHTML;
      onUpdate({ ...block, body: html });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // 1. Nhấn Enter: KHÔNG tạo block mới, cho phép xuống dòng tự nhiên trong cùng khối text
    // Trình duyệt tự sinh <p> hoặc <div> bên trong contentEditable.

    // 2. Phím Backspace khi ô trống và không phải block duy nhất -> xóa block
    if (e.key === 'Backspace') {
      const text = editableRef.current?.innerText.trim() || '';
      if (text === '' && totalBlocks > 1) {
        e.preventDefault();
        onDelete();
        return;
      }
    }

    // 3. Phím Mũi tên Lên / Xuống để di chuyển qua lại giữa các block
    if (e.key === 'ArrowUp') {
      const sel = window.getSelection();
      if (sel && sel.anchorOffset === 0 && onFocusPrevBlock) {
        // Con trỏ đang ở đầu block, chuyển lên block trước
        onFocusPrevBlock();
      }
    } else if (e.key === 'ArrowDown') {
      const sel = window.getSelection();
      const textLen = editableRef.current?.innerText.length || 0;
      if (sel && sel.anchorOffset >= textLen && onFocusNextBlock) {
        // Con trỏ đang ở cuối block, chuyển xuống block sau
        onFocusNextBlock();
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

  // Meta helper
  const getBlockMeta = (type: BlockType) => {
    switch (type) {
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
    }
  };

  const meta = getBlockMeta(block.blockType);

  return (
    <div
      data-testid={`block-item-${block.id}`}
      data-block-id={block.id}
      draggable={false}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver?.(e, index);
      }}
      onDrop={() => onDrop?.(index)}
      onClick={(e) => {
        if (e.shiftKey && onToggleSelect) {
          e.preventDefault();
          onToggleSelect(e);
        }
      }}
      className={`group relative flex items-start gap-1 py-1 rounded-xl transition-all ${
        isSelected
          ? 'bg-[#ff7a1a]/10 ring-1 ring-[#ff7a1a]/40 shadow-xs'
          : 'hover:bg-muted/10'
      }`}
    >
      {/* 1. LEFT GUTTER CONTROLS (Hover visible) */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity select-none pt-1 shrink-0 w-12 justify-end">
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

        {/* Nút ⠿: Dấu 6 chấm - Nắm kéo / Menu tùy chọn khối */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', String(index));
                onDragStart?.(index);
              }}
              title="Dấu 6 chấm: Kéo thả di chuyển hoặc click mở tùy chọn"
              aria-label={`Tùy chọn khối ${block.id}`}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-grab active:cursor-grabbing transition-colors"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52 text-xs bg-[#1e1e24] border-border/80 text-foreground">
            {/* Đổi thứ tự: Di chuyển lên / xuống */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <div className="flex items-center gap-2">
                  <ArrowUp className="h-3.5 w-3.5" />
                  <span>Đổi thứ tự</span>
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-40 bg-[#1e1e24] border-border/80 text-foreground">
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
                  <RefreshCw className="h-3.5 w-3.5 text-amber-400" />
                  <span>Chuyển thành</span>
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-52 bg-[#1e1e24] border-border/80 text-foreground">
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

      {/* 2. BLOCK CONTENT CANVAS */}
      <div className="flex-1 min-w-0 px-2">
        {block.blockType === 'RICH_TEXT' ? (
          <div className="relative">
            <div
              ref={editableRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onMouseUp={handleMouseUpOrKeyUp}
              onKeyUp={handleMouseUpOrKeyUp}
              data-placeholder="Nhập nội dung văn bản..."
              className="min-h-[1.75rem] py-0.5 text-sm sm:text-base leading-relaxed text-foreground outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/30 break-words
                [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_ul]:my-2
                [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1 [&_ol]:my-2
                [&_li]:my-0.5
                [&_table]:border-collapse [&_table]:w-full [&_table]:my-3 [&_table]:border [&_table]:border-border/80
                [&_th]:border [&_th]:border-border/80 [&_th]:p-2.5 [&_th]:bg-muted/40 [&_th]:text-left [&_th]:font-semibold
                [&_td]:border [&_td]:border-border/80 [&_td]:p-2.5
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
            {block.blockType === 'MARKDOWN' && (
              <MarkdownEditor
                value={block.body || ''}
                onChange={(body) => onUpdate({ ...block, body })}
              />
            )}

            {(block.blockType === 'IMAGE' ||
              block.blockType === 'VIDEO' ||
              block.blockType === 'AUDIO') && (
              <MediaBlockEditor
                courseId={courseId}
                blockType={block.blockType}
                title={block.title}
                resourceId={block.resourceId}
                onUpdate={(updates) => onUpdate({ ...block, ...updates })}
                onOpenResourcePicker={() => onOpenResourcePicker(block.id)}
              />
            )}

            {block.blockType === 'FILE' && (
              <FileBlockEditor
                courseId={courseId}
                title={block.title}
                resourceId={block.resourceId}
                onUpdate={(updates) => onUpdate({ ...block, ...updates })}
                onOpenResourcePicker={() => onOpenResourcePicker(block.id)}
              />
            )}

            {block.blockType === 'FLASHCARD' && (
              <FlashcardBlockEditor
                flashcards={block.flashcards || []}
                aiReviewStatus={block.aiReviewStatus}
                onUpdate={(updates) => onUpdate({ ...block, ...updates })}
              />
            )}

            {block.blockType === 'QUESTION' && (
              <QuestionBlockEditor
                title={block.title}
                questionId={block.questionId}
                onUpdate={(updates) => onUpdate({ ...block, ...updates })}
              />
            )}

            {block.blockType === 'ASSIGNMENT' && (
              <AssignmentBlockEditor
                title={block.title}
                body={block.body}
                assignmentConfig={block.assignmentConfig}
                onUpdate={(updates) => onUpdate({ ...block, ...updates })}
              />
            )}

            {block.blockType === 'QUIZ' && (
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
