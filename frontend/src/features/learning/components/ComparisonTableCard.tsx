import { cn } from '@/shared/lib/utils';

interface ComparisonTableCardProps {
  title?: string;
  headers?: string[];
  rows?: string[][];
  className?: string;
}

export function ComparisonTableCard({
  title,
  headers = ['Tiêu chí', '*args', '**kwargs'],
  rows = [
    ['Kiểu dữ liệu nội tại', 'tuple', 'dict'],
    ['Hình thức truyền tham số', 'Theo thứ tự vị trí (Positional)', 'Theo tên từ khóa (Keyword/Named)'],
    ['Trường hợp ứng dụng chính', 'Gom tổng danh sách, decorator logging', 'Cấu hình tham số tùy chọn (Options/Config)'],
  ],
  className,
}: ComparisonTableCardProps) {
  return (
    <div className={cn('space-y-3 my-4', className)}>
      {title && (
        <h4 className="font-semibold text-sm text-foreground">{title}</h4>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-xs">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="border-b border-border/80 bg-muted/40 font-semibold text-foreground">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className={cn(
                    'p-3 sm:p-3.5',
                    i === 0 ? 'w-1/3' : 'w-1/3 font-mono font-bold text-primary'
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className="hover:bg-muted/20 transition-colors"
              >
                {row.map((cell, cIdx) => (
                  <td
                    key={cIdx}
                    className={cn(
                      'p-3 sm:p-3.5 text-foreground/90 align-top',
                      cIdx === 0
                        ? 'font-medium text-foreground'
                        : 'font-mono text-xs sm:text-sm text-emerald-600 dark:text-emerald-400'
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
