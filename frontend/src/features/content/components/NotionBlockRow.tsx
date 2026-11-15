import React, { useRef, useEffect } from 'react';
import {
  Plus,
  GripVertical,
  Trash2,
  ArrowUp,
  ArrowDown,
  Copy,
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
  onUpdate: (updatedBlock: BlockDto) => void;
  onDelete: () => void;
  onAddBelow: (type?: BlockType) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onOpenSlashMenu: (coords: { top: number; left: number }, blockId: string) => void;
  onOpenResourcePicker: (blockId: string) => void;
  onSelectionChange: (coords: { top: number; left: number } | null, blockId: string) => void;
}

export function NotionBlockRow({
  block,
  index,
  totalBlocks,
  courseId,
  isFocused,
  onUpdate,
  onDelete,
  onAddBelow,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onOpenSlashMenu,
  onOpenResourcePicker,
  onSelectionChange,
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
    // Enter key creates a new default text block below
    if (e.key === 'Enter' && !e.shiftKey) {
      // If cursor is inside list or table, allow normal multiline
      const selection = window.getSelection();
      const anchorNode = selection?.anchorNode;
      const isInList = anchorNode?.parentElement?.closest('li, table, td, th');

      if (!isInList) {
        e.preventDefault();
        onAddBelow('RICH_TEXT');
        return;
      }
    }

    // Backspace on empty block removes this block
    if (e.key === 'Backspace') {
      const text = editableRef.current?.innerText.trim() || '';
      if (text === '' && totalBlocks > 1) {
        e.preventDefault();
        onDelete();
        return;
      }
    }

    // Typing '/' trigger slash menu
    if (e.key === '/') {
      // If cursor is at start of block or block is empty
      setTimeout(() => {
        const rect = editableRef.current?.getBoundingClientRect();
        if (rect) {
          onOpenSlashMenu({ top: rect.bottom + 4, left: rect.left }, block.id);
        }
      }, 10);
    }
  };

  // Right-click opens block slash command menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onOpenSlashMenu({ top: e.clientY, left: e.clientX }, block.id);
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
        // Range exception ignore
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
      className="group relative flex items-start gap-1 py-1 rounded-xl transition-colors hover:bg-muted/10"
      onContextMenu={handleContextMenu}
    >
      {/* 1. LEFT GUTTER CONTROLS (Hover visible) */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity select-none pt-1 shrink-0 w-12 justify-end">
        {/* Nút +: Thêm khối bên dưới */}
        <button
          type="button"
          title="Thêm khối bên dưới"
          aria-label="Thêm khối nội dung mới"
          onClick={(e) => onOpenSlashMenu({ top: e.clientY, left: e.clientX }, block.id)}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>

        {/* Nút ⠿: Nắm kéo / Menu tùy chọn khối */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title="Tùy chọn khối"
              aria-label={`Tùy chọn khối ${block.id}`}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-grab active:cursor-grabbing transition-colors"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 text-xs">
            {index > 0 && (
              <DropdownMenuItem onClick={onMoveUp}>
                <ArrowUp className="h-3.5 w-3.5 mr-2" />
                <span>Di chuyển lên</span>
              </DropdownMenuItem>
            )}
            {index < totalBlocks - 1 && (
              <DropdownMenuItem onClick={onMoveDown}>
                <ArrowDown className="h-3.5 w-3.5 mr-2" />
                <span>Di chuyển xuống</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-3.5 w-3.5 mr-2" />
              <span>Nhân bản khối</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              <span>Xóa khối</span>
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
              data-placeholder="Gõ '/' để chèn block, hoặc click chuột phải..."
              className="min-h-[1.75rem] py-0.5 text-sm sm:text-base leading-relaxed text-foreground outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/40 break-words"
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
