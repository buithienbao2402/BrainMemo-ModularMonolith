import { Compass, FileQuestion, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <div className="w-full rounded-2xl border border-border bg-card p-8 shadow-sm sm:p-12">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-orange/30 bg-brand-orange/10 text-brand-orange">
          <FileQuestion className="h-8 w-8" aria-hidden="true" />
        </div>
        <p className="font-mono text-4xl font-extrabold tracking-tight text-brand-orange sm:text-5xl">
          {t('errors.notFoundPage.code')}
        </p>
        <h1 className="mt-3 font-serif text-2xl font-bold text-foreground sm:text-3xl">
          {t('errors.notFoundPage.title')}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t('errors.notFoundPage.description')}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="pill">
            <Link to="/">
              <Home className="h-4 w-4" aria-hidden="true" />
              <span>{t('states.backHome')}</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="pill">
            <Link to="/courses">
              <Compass className="h-4 w-4" aria-hidden="true" />
              <span>{t('states.exploreCourses')}</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

