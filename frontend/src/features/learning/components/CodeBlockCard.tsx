import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface CodeBlockCardProps {
  code: string;
  language?: string;
  className?: string;
}

export function CodeBlockCard({
  code,
  language = 'python',
  className,
}: CodeBlockCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  // Simple syntax highlighter for Python / code
  const renderHighlightedCode = (rawCode: string) => {
    return rawCode.split('\n').map((line, lineIdx) => {
      // Comment highlight
      if (line.trim().startsWith('#')) {
        return (
          <div key={lineIdx} className="text-emerald-400/90 italic">
            {line}
          </div>
        );
      }

      // Inline comment detection
      let codePart = line;
      let commentPart = '';
      const commentIndex = line.indexOf('  #');
      if (commentIndex !== -1) {
        codePart = line.substring(0, commentIndex);
        commentPart = line.substring(commentIndex);
      }

      // Highlight keywords in codePart
      const words = codePart.split(/(\bdef\b|\breturn\b|\bif\b|\bnot\b|\bin\b|\bprint\b|\bint\b|\bNone\b|\bTrue\b|\bFalse\b|\bself\b|\bclass\b|->)/g);

      return (
        <div key={lineIdx} className="leading-6">
          {words.map((chunk, wIdx) => {
            if (['def', 'return', 'class'].includes(chunk)) {
              return (
                <span key={wIdx} className="text-amber-400 font-semibold">
                  {chunk}
                </span>
              );
            }
            if (['if', 'not', 'in', '->'].includes(chunk)) {
              return (
                <span key={wIdx} className="text-purple-400 font-semibold">
                  {chunk}
                </span>
              );
            }
            if (['print', 'int', 'len', 'range'].includes(chunk)) {
              return (
                <span key={wIdx} className="text-cyan-400">
                  {chunk}
                </span>
              );
            }
            return <span key={wIdx}>{chunk}</span>;
          })}
          {commentPart && (
            <span className="text-emerald-400/90 italic">{commentPart}</span>
          )}
        </div>
      );
    });
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/80 bg-[#12131a] dark:bg-[#0c0d12] text-[#f1f5f9] overflow-hidden shadow-md my-4 font-mono text-xs sm:text-sm',
        className
      )}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10 select-none">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-white/10"
          title="Sao chép mã"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-sans">Đã sao chép</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span className="font-sans">Sao chép</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body */}
      <div className="p-4 sm:p-5 overflow-x-auto">
        <pre className="font-mono text-xs sm:text-sm leading-relaxed whitespace-pre">
          {renderHighlightedCode(code)}
        </pre>
      </div>
    </div>
  );
}
