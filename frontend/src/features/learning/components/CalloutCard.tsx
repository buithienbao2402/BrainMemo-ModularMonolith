import { cn } from '@/shared/lib/utils';

interface CalloutCardProps {
  tag?: string;
  quote: string;
  author?: string;
  className?: string;
}

export function CalloutCard({
  tag = 'First-class citizen 1',
  quote = 'Độ phức tạp là kẻ thù lớn nhất của phần mềm. Bằng các giới hạn phạm vi tác động của biến trong từng giới hạn, bạn giảm thiểu được 80% lỗi tiềm ẩn liên quan đến state.',
  author,
  className,
}: CalloutCardProps) {
  return (
    <div
      className={cn(
        'relative border-l-4 border-amber-500 bg-amber-500/10 dark:bg-amber-500/15 rounded-r-2xl p-4 sm:p-5 my-5 space-y-2 text-foreground transition-all shadow-xs',
        className
      )}
    >
      {tag && (
        <div className="flex items-center justify-end">
          <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/10 text-amber-500 dark:text-amber-400 border border-amber-500/30">
            {tag}
          </span>
        </div>
      )}

      <div className="relative pl-0 sm:pl-1">
        <p className="text-xs sm:text-sm font-medium italic leading-relaxed text-foreground/95">
          &ldquo;{quote}&rdquo;
        </p>
      </div>

      {author && (
        <p className="text-[11px] text-muted-foreground text-right font-medium">
          — {author}
        </p>
      )}
    </div>
  );
}
