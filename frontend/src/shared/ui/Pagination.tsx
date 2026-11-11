import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/utils';
import { Button } from './Button';
import { clampPageSize } from './paginationUtils';

export interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (nextPage: number) => void;
  disabled?: boolean;
  className?: string;
}

export function Pagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  disabled = false,
  className,
}: PaginationProps) {
  const { t } = useTranslation();
  const safePageSize = clampPageSize(pageSize);
  const safeTotal = Math.max(0, totalItems);
  const totalPages = Math.max(1, Math.ceil(safeTotal / safePageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  return (
    <nav
      aria-label="Phân trang"
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm',
        className
      )}
    >
      <span className="text-muted-foreground">
        {t('pagination.summary', {
          page: currentPage,
          totalPages,
          total: safeTotal,
        })}
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          {t('pagination.previous')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          {t('pagination.next')}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
