import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui';

export interface RouteStubPageProps {
  screenCode: string;
  title: string;
  description: string;
  backTo?: string;
}

export function RouteStubPage({
  screenCode,
  title,
  description,
  backTo = '/',
}: RouteStubPageProps) {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
      <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <span className="inline-block rounded-full border border-brand-orange/30 bg-brand-orange/10 px-3 py-1 font-mono text-xs font-semibold text-brand-orange">
          {screenCode}
        </span>
        <h1 className="mt-3 font-serif text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
        <div className="mt-6">
          <Button asChild variant="outline" size="sm">
            <Link to={backTo}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>{t('states.backHome')}</span>
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
