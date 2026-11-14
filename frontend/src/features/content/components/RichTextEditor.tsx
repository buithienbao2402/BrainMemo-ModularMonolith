import { useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Eraser,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Nhập nội dung văn bản tại đây...',
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChangeRef = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isInternalChangeRef.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
    isInternalChangeRef.current = false;
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalChangeRef.current = true;
      onChange(editorRef.current.innerHTML);
    }
  };

  const executeCommand = (command: string, arg: string | undefined = undefined) => {
    document.execCommand(command, false, arg);
    handleInput();
    editorRef.current?.focus();
  };

  const handleAddLink = () => {
    const url = window.prompt('Nhập địa chỉ liên kết (URL):', 'https://');
    if (url && url !== 'https://') {
      executeCommand('createLink', url);
    }
  };

  return (
    <div className={cn('rounded-xl border border-border bg-card overflow-hidden shadow-sm', className)}>
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 p-2 text-muted-foreground select-none">
        <button
          type="button"
          onClick={() => executeCommand('bold')}
          title="In đậm (Ctrl+B)"
          aria-label="In đậm"
          className="rounded p-1.5 hover:bg-muted hover:text-foreground transition-colors"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('italic')}
          title="In nghiêng (Ctrl+I)"
          aria-label="In nghiêng"
          className="rounded p-1.5 hover:bg-muted hover:text-foreground transition-colors"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('underline')}
          title="Gạch chân (Ctrl+U)"
          aria-label="Gạch chân"
          className="rounded p-1.5 hover:bg-muted hover:text-foreground transition-colors"
        >
          <Underline className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('strikeThrough')}
          title="Gạch ngang"
          aria-label="Gạch ngang"
          className="rounded p-1.5 hover:bg-muted hover:text-foreground transition-colors"
        >
          <Strikethrough className="h-4 w-4" />
        </button>

        <div className="mx-1 h-5 w-[1px] bg-border" />

        <button
          type="button"
          onClick={() => executeCommand('formatBlock', '<h2>')}
          title="Tiêu đề lớn (H2)"
          aria-label="Tiêu đề H2"
          className="rounded p-1.5 hover:bg-muted hover:text-foreground transition-colors"
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('formatBlock', '<h3>')}
          title="Tiêu đề vừa (H3)"
          aria-label="Tiêu đề H3"
          className="rounded p-1.5 hover:bg-muted hover:text-foreground transition-colors"
        >
          <Heading3 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('formatBlock', '<p>')}
          title="Đoạn văn bản thường"
          aria-label="Đoạn văn"
          className="rounded px-2 py-1 text-xs font-medium hover:bg-muted hover:text-foreground transition-colors"
        >
          Văn bản
        </button>

        <div className="mx-1 h-5 w-[1px] bg-border" />

        <button
          type="button"
          onClick={() => executeCommand('insertUnorderedList')}
          title="Danh sách dấu đầu dòng"
          aria-label="Danh sách dấu đầu dòng"
          className="rounded p-1.5 hover:bg-muted hover:text-foreground transition-colors"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('insertOrderedList')}
          title="Danh sách số"
          aria-label="Danh sách số"
          className="rounded p-1.5 hover:bg-muted hover:text-foreground transition-colors"
        >
          <ListOrdered className="h-4 w-4" />
        </button>

        <div className="mx-1 h-5 w-[1px] bg-border" />

        <button
          type="button"
          onClick={() => executeCommand('formatBlock', '<blockquote>')}
          title="Trích dẫn"
          aria-label="Trích dẫn"
          className="rounded p-1.5 hover:bg-muted hover:text-foreground transition-colors"
        >
          <Quote className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => executeCommand('formatBlock', '<pre>')}
          title="Khối mã lệnh (Code)"
          aria-label="Khối code"
          className="rounded p-1.5 hover:bg-muted hover:text-foreground transition-colors"
        >
          <Code className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleAddLink}
          title="Thêm liên kết"
          aria-label="Chèn liên kết"
          className="rounded p-1.5 hover:bg-muted hover:text-foreground transition-colors"
        >
          <LinkIcon className="h-4 w-4" />
        </button>

        <div className="mx-1 h-5 w-[1px] bg-border" />

        <button
          type="button"
          onClick={() => executeCommand('removeFormat')}
          title="Xóa định dạng"
          aria-label="Xóa định dạng"
          className="rounded p-1.5 hover:bg-muted hover:text-foreground transition-colors"
        >
          <Eraser className="h-4 w-4" />
        </button>
      </div>

      {/* Editable Canvas */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        aria-label="Khung soạn thảo văn bản phong phú"
        data-placeholder={placeholder}
        className="min-h-[140px] max-h-[480px] overflow-y-auto p-4 text-sm text-foreground focus:outline-none prose dark:prose-invert max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:pointer-events-none"
      />
    </div>
  );
}
