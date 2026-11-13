import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import brainMemoIcon from '@/assets/brand/brain-memo-icon.png';
import logoDark from '@/assets/brand/logo-dark.png';
import logoLight from '@/assets/brand/logo-light.png';
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
        'inline-flex shrink-0 items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg group',
        className
      )}
      aria-label={t('brand.name')}
    >
      {compact ? (
        <span className="flex shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
          <img
            src={brainMemoIcon}
            alt={t('brand.name')}
            width={32}
            height={32}
            className="h-8 w-8 object-contain select-none"
          />
        </span>
      ) : (
        <div className="flex flex-col">
          <div className="flex items-center">
            {/* Logo cho Light Mode (chữ đen Brain + cam Memo) */}
            <img
              src={logoLight}
              alt={t('brand.name')}
              className="h-8 sm:h-9 w-auto object-contain select-none block dark:hidden"
            />
            {/* Logo cho Dark Mode (chữ trắng Brain + cam Memo) */}
            <img
              src={logoDark}
              alt={t('brand.name')}
              className="h-8 sm:h-9 w-auto object-contain select-none hidden dark:block"
            />
          </div>
          {showSubtitle ? (
            <span className="text-[9px] font-semibold uppercase tracking-[0.45px] text-muted-foreground hidden sm:block pl-1">
              {t('brand.subtitle')}
            </span>
          ) : null}
        </div>
      )}
    </Link>
  );
}
