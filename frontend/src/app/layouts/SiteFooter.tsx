import { useTranslation } from 'react-i18next';
import { BrandLogo } from './BrandLogo';

export function SiteFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border bg-white dark:bg-[#0e0e12]">
      <div className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-3 px-4 py-5 text-sm sm:flex-row sm:items-center sm:px-6">
        <div className="flex flex-wrap items-center gap-2.5 text-muted-foreground">
          <BrandLogo to="/" compact showSubtitle={false} />
          <span aria-hidden="true" className="text-border">
            |
          </span>
          <span className="text-xs sm:text-sm">{t('brand.slogan')}</span>
        </div>
        <p className="text-xs text-muted-foreground">{t('brand.copyright')}</p>
      </div>
    </footer>
  );
}
