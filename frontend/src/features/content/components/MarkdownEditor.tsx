import { useState } from 'react';
import { Eye, Edit3 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Nhập nội dung cú pháp Markdown tại đây...',
  className,
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');

  // Simple Markdown to HTML preview renderer for common tags
  const renderSimpleMarkdown = (md: string) => {
    if (!md) return '<p class="text-muted-foreground italic">Chưa có nội dung xem trước.</p>';

    let html = md
      // Escaping
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-5 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-extrabold mt-6 mb-3">$1</h1>')
      // Bold / Italic
      .replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      // Code blocks
      .replace(/```([\s\S]*?)```/gim, '<pre class="bg-muted p-3 rounded-lg overflow-x-auto text-xs my-2 font-mono"><code>$1</code></pre>')
      .replace(/`(.*?)`/gim, '<code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
      // Blockquote
      .replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-primary pl-4 italic text-muted-foreground my-2">$1</blockquote>')
      // Unordered lists
      .replace(/^\s*\-\s(.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
      .replace(/^\s*\*\s(.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
      // Links
      .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary/80">$1</a>')
      // Line breaks
      .replace(/\n$/gim, '<br />');

    return html;
  };

  return (
    <div className={cn('rounded-xl border border-border bg-card overflow-hidden shadow-sm', className)}>
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-1.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            aria-label="Chế độ soạn thảo"
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-colors',
              activeTab === 'write'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Soạn thảo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            aria-label="Chế độ xem trước Markdown"
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-colors',
              activeTab === 'preview'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Xem trước</span>
          </button>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground">Markdown GFM</span>
      </div>

      {activeTab === 'write' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={7}
          aria-label="Nội dung Markdown"
          className="w-full resize-y bg-transparent p-4 font-mono text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      ) : (
        <div
          aria-label="Bản xem trước Markdown"
          className="min-h-[160px] p-4 text-sm text-foreground prose dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(value) }}
        />
      )}
    </div>
  );
}
