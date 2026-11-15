import { useEffect, useRef } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Code,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Table as TableIcon,
  Eraser,
} from 'lucide-react';

interface FloatingTextFormatToolbarProps {
  position: { top: number; left: number } | null;
  onCommand: (command: string, arg?: string) => void;
  onInsertTable: () => void;
  onClose: () => void;
}

export function FloatingTextFormatToolbar({
  position,
  onCommand,
  onInsertTable,
  onClose,
}: FloatingTextFormatToolbarProps) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseDownOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleMouseDownOutside);
    return () => document.removeEventListener('mousedown', handleMouseDownOutside);
  }, [onClose]);

  if (!position) return null;

  return (
    <div
      ref={barRef}
      style={{
        position: 'fixed',
        top: `${Math.max(10, position.top - 48)}px`,
        left: `${Math.max(10, Math.min(position.left, window.innerWidth - 380))}px`,
      }}
      className="z-50 flex items-center gap-0.5 rounded-xl border border-border/80 bg-popover/95 px-1.5 py-1 backdrop-blur-md shadow-xl text-popover-foreground animate-in fade-in zoom-in-95 duration-100 select-none"
      onMouseDown={(e) => {
        // Prevent loss of selection
        e.preventDefault();
      }}
    >
      {/* 1. In đậm */}
      <button
        type="button"
        title="In đậm (Bold)"
        aria-label="In đậm"
        onClick={() => onCommand('bold')}
        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Bold className="h-3.5 w-3.5" />
      </button>

      {/* 2. In nghiêng */}
      <button
        type="button"
        title="In nghiêng (Italic)"
        aria-label="In nghiêng"
        onClick={() => onCommand('italic')}
        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Italic className="h-3.5 w-3.5" />
      </button>

      {/* 3. Gạch chân */}
      <button
        type="button"
        title="Gạch chân (Underline)"
        aria-label="Gạch chân"
        onClick={() => onCommand('underline')}
        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Underline className="h-3.5 w-3.5" />
      </button>

      {/* 4. Mã code nội dòng */}
      <button
        type="button"
        title="Mã code (Inline Code)"
        aria-label="Mã code"
        onClick={() => onCommand('formatBlock', '<code>')}
        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Code className="h-3.5 w-3.5" />
      </button>

      <div className="h-4 w-px bg-border/60 mx-1" />

      {/* 5. Tiêu đề H2 */}
      <button
        type="button"
        title="Tiêu đề H2"
        aria-label="Tiêu đề H2"
        onClick={() => onCommand('formatBlock', '<h2>')}
        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Heading2 className="h-3.5 w-3.5" />
      </button>

      {/* 6. Tiêu đề H3 */}
      <button
        type="button"
        title="Tiêu đề H3"
        aria-label="Tiêu đề H3"
        onClick={() => onCommand('formatBlock', '<h3>')}
        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Heading3 className="h-3.5 w-3.5" />
      </button>

      <div className="h-4 w-px bg-border/60 mx-1" />

      {/* 7. Gạch đầu dòng */}
      <button
        type="button"
        title="Gạch đầu dòng (Bullet list)"
        aria-label="Gạch đầu dòng"
        onClick={() => onCommand('insertUnorderedList')}
        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <List className="h-3.5 w-3.5" />
      </button>

      {/* 8. Thứ tự đầu dòng */}
      <button
        type="button"
        title="Thứ tự đầu dòng (Numbered list)"
        aria-label="Thứ tự đầu dòng"
        onClick={() => onCommand('insertOrderedList')}
        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </button>

      {/* 9. Bảng */}
      <button
        type="button"
        title="Chèn bảng (Table)"
        aria-label="Chèn bảng"
        onClick={onInsertTable}
        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <TableIcon className="h-3.5 w-3.5" />
      </button>

      <div className="h-4 w-px bg-border/60 mx-1" />

      {/* 10. Xóa định dạng */}
      <button
        type="button"
        title="Xóa định dạng"
        aria-label="Xóa định dạng"
        onClick={() => onCommand('removeFormat')}
        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Eraser className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
