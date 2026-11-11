import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import brandLogoLg from '@/assets/figma/brand-logo-lg.svg';
import brandLogoSm from '@/assets/figma/brand-logo-sm.svg';
import { cn } from '@/shared/lib/utils';

export interface BrandLogoProps {
  to?: string;
  showSubtitle?: boolean;
  compact?: boolean;
  className?: string;
}

export function BrandLogo({
  to = '/',
  showSubtitle = true,
  compact = false,
  className,
}: BrandLogoProps) {
  const { t } = useTranslation();

  return (
    <Link
      to={to}
      className={cn(
        'inline-flex shrink-0 items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg',
        className
      )}
    >
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-xl border transition-shadow',
          'border-[#e5e7eb] bg-white shadow-[0_0_12px_rgba(255,122,26,0.22)] dark:border-[#2a2a36] dark:bg-[#1b1b21]',
          compact ? 'h-8 w-8 rounded-lg' : 'h-10 w-10'
        )}
      >
        <img
          src={compact ? brandLogoLg : brandLogoSm}
          alt=""
          width={compact ? 24 : 22}
          height={compact ? 24 : 16}
          className="block select-none"
        />
      </span>
      <span className="flex flex-col">
        <span
          className={cn(
            'font-serif font-bold tracking-[-0.475px] text-foreground leading-none',
            compact ? 'text-base' : 'text-[19px]'
          )}
        >
          {t('brand.name')}
        </span>
        {showSubtitle && !compact ? (
          <span className="mt-1 hidden text-[9px] font-semibold uppercase tracking-[0.45px] text-muted-foreground sm:block">
            {t('brand.subtitle')}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
