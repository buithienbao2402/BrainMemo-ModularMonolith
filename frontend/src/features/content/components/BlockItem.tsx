import { useState } from 'react';
import {
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
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Trash2,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { BlockDto, BlockType } from '../api/contentApi';
import { RichTextEditor } from './RichTextEditor';
import { MarkdownEditor } from './MarkdownEditor';
import { MediaBlockEditor } from './MediaBlockEditor';
import { FileBlockEditor } from './FileBlockEditor';
import { FlashcardBlockEditor } from './FlashcardBlockEditor';
import { QuestionBlockEditor } from './QuestionBlockEditor';
import { AssignmentBlockEditor } from './AssignmentBlockEditor';
import { QuizBlockEditor } from './QuizBlockEditor';

interface BlockItemProps {
  block: BlockDto;
  courseId: string;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onUpdate: (updatedBlock: BlockDto) => void;
  onOpenResourcePicker: (blockId: string) => void;
}

export function BlockItem({
  block,
  courseId,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onDelete,
  onUpdate,
  onOpenResourcePicker,
}: BlockItemProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

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
  const Icon = meta.icon;

  return (
    <div
      data-testid={`block-item-${block.id}`}
      className="group rounded-2xl border border-border bg-card shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
    >
      {/* Block Header bar */}
      <div className="flex items-center justify-between border-b border-border/80 px-4 py-2.5 bg-muted/20 rounded-t-2xl">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted font-mono text-xs font-bold text-muted-foreground">
            {block.position}
          </span>
          <div className="flex items-center gap-2">
            <Icon className={cn('h-4 w-4', meta.color)} />
            <span className="text-xs sm:text-sm font-semibold text-foreground">
              {meta.label}
            </span>
          </div>
          {block.title && (
            <span className="hidden sm:inline-block text-xs text-muted-foreground truncate max-w-[200px]">
              · {block.title}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* Reorder Buttons */}
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            title="Di chuyển lên trên"
            aria-label="Di chuyển lên"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            title="Di chuyển xuống dưới"
            aria-label="Di chuyển xuống"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>

          <div className="mx-1 h-4 w-[1px] bg-border" />

          {/* Delete Block */}
          <button
            type="button"
            onClick={onDelete}
            title="Xóa khối này"
            aria-label="Xóa khối"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          {/* Collapse/Expand */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Mở rộng khối' : 'Thu gọn khối'}
            aria-label={isCollapsed ? 'Mở rộng khối' : 'Thu gọn khối'}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Block Body Content */}
      {!isCollapsed && (
        <div className="p-4">
          {block.blockType === 'RICH_TEXT' && (
            <RichTextEditor
              value={block.body || ''}
              onChange={(body) => onUpdate({ ...block, body })}
            />
          )}

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
  );
}
