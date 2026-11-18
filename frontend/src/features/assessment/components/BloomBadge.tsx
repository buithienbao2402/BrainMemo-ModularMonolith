import { cn } from '@/shared/lib/utils';

export interface BloomBadgeProps {
  levelCode?: string | null;
  className?: string;
}

const FALLBACK_CONFIG = {
  code: 'C3',
  labelVi: 'Vận dụng',
  labelEn: 'Apply',
  textColor: 'text-emerald-600 dark:text-emerald-400',
  borderColor: 'border-emerald-500/30',
  bgColor: 'bg-emerald-500/10',
};

export const BLOOM_LEVEL_CONFIG: Record<
  string,
  { code: string; labelVi: string; labelEn: string; textColor: string; borderColor: string; bgColor: string }
> = {
  REMEMBER: {
    code: 'C1',
    labelVi: 'Nhớ',
    labelEn: 'Remember',
    textColor: 'text-sky-500 dark:text-sky-400',
    borderColor: 'border-sky-500/30',
    bgColor: 'bg-sky-500/10',
  },
  UNDERSTAND: {
    code: 'C2',
    labelVi: 'Hiểu',
    labelEn: 'Understand',
    textColor: 'text-teal-600 dark:text-teal-400',
    borderColor: 'border-teal-500/30',
    bgColor: 'bg-teal-500/10',
  },
  APPLY: {
    code: 'C3',
    labelVi: 'Vận dụng',
    labelEn: 'Apply',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-500/30',
    bgColor: 'bg-emerald-500/10',
  },
  ANALYZE: {
    code: 'C4',
    labelVi: 'Phân tích',
    labelEn: 'Analyze',
    textColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-500/30',
    bgColor: 'bg-amber-500/10',
  },
  EVALUATE: {
    code: 'C5',
    labelVi: 'Đánh giá',
    labelEn: 'Evaluate',
    textColor: 'text-violet-600 dark:text-violet-400',
    borderColor: 'border-violet-500/30',
    bgColor: 'bg-violet-500/10',
  },
  CREATE: {
    code: 'C6',
    labelVi: 'Sáng tạo',
    labelEn: 'Create',
    textColor: 'text-purple-600 dark:text-purple-400',
    borderColor: 'border-purple-500/30',
    bgColor: 'bg-purple-500/10',
  },
};

export function getBloomConfig(
  codeOrLevel?: string | null
): { code: string; labelVi: string; labelEn: string; textColor: string; borderColor: string; bgColor: string } {
  if (!codeOrLevel) return FALLBACK_CONFIG;
  const upper = codeOrLevel.toUpperCase();
  if (BLOOM_LEVEL_CONFIG[upper]) return BLOOM_LEVEL_CONFIG[upper]!;

  // Try matching C1-C6
  if (upper === 'C1' || upper.includes('NHỚ')) return BLOOM_LEVEL_CONFIG.REMEMBER!;
  if (upper === 'C2' || upper.includes('HIỂU')) return BLOOM_LEVEL_CONFIG.UNDERSTAND!;
  if (upper === 'C3' || upper.includes('VẬN DỤNG') || upper.includes('ÁP DỤNG')) return BLOOM_LEVEL_CONFIG.APPLY!;
  if (upper === 'C4' || upper.includes('PHÂN TÍCH')) return BLOOM_LEVEL_CONFIG.ANALYZE!;
  if (upper === 'C5' || upper.includes('ĐÁNH GIÁ')) return BLOOM_LEVEL_CONFIG.EVALUATE!;
  if (upper === 'C6' || upper.includes('SÁNG TẠO')) return BLOOM_LEVEL_CONFIG.CREATE!;

  return FALLBACK_CONFIG;
}

export function BloomBadge({ levelCode, className }: BloomBadgeProps) {
  const cfg = getBloomConfig(levelCode);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border select-none transition-colors',
        cfg.bgColor,
        cfg.borderColor,
        cfg.textColor,
        className
      )}
    >
      <span className="font-semibold">{cfg.code}</span>
      <span>-</span>
      <span>{cfg.labelVi}</span>
    </span>
  );
}
