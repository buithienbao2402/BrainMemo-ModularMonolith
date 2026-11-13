import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { toApiProblemError } from '@/shared/api';
import { useAuth } from '@/shared/hooks';
import { Button } from '@/shared/ui';
import { useVerifyEmailMutation } from '../api';

export function VerifyEmailPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { status } = useAuth();

  const verifyEmailMutation = useVerifyEmailMutation();
  const [verifyState, setVerifyState] = React.useState<'idle' | 'verifying' | 'success' | 'error'>(
    () => (!token ? 'idle' : 'verifying')
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) {
      return;
    }

    let isMounted = true;

    verifyEmailMutation
      .mutateAsync({ token })
      .then(() => {
        if (isMounted) {
          setVerifyState('success');
        }
      })
      .catch((err) => {
        if (isMounted) {
          const problem = toApiProblemError(err);
          setVerifyState('error');
          setErrorMessage(
            problem.status === 400 || problem.code === 'TOKEN_INVALID_OR_EXPIRED'
              ? t('auth.verifyEmailErrorDesc')
              : problem.detail || problem.title || t('errors.genericRetry')
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token, t]); // eslint-disable-line react-hooks/exhaustive-deps

  const isMissingToken = !token;

  return (
    <div className="mx-auto flex min-h-[75vh] w-full max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm dark:bg-[#131319] sm:p-8">
        {isMissingToken && (
          <div>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive dark:text-[#ffb4ab]">
              <AlertCircle className="h-8 w-8" aria-hidden="true" />
            </div>
            <h1 className="mt-4 font-serif text-2xl font-bold tracking-tight text-foreground">
              {t('auth.verifyEmailTitle')}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {t('auth.verifyEmailMissingToken')}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild variant="primary" size="md" className="rounded-xl px-5">
                <Link to="/">{t('auth.backToHome')}</Link>
              </Button>
              <Button asChild variant="outline" size="md" className="rounded-xl px-5">
                <Link to="/login">{t('auth.loginNow')}</Link>
              </Button>
            </div>
          </div>
        )}

        {!isMissingToken && verifyState === 'verifying' && (
          <div data-testid="verify-email-loading">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange">
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
            </div>
            <h1 className="mt-4 font-serif text-2xl font-bold tracking-tight text-foreground">
              {t('auth.verifyEmailTitle')}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">{t('auth.verifyEmailVerifying')}</p>
          </div>
        )}

        {!isMissingToken && verifyState === 'success' && (
          <div data-testid="verify-email-success">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
            </div>
            <h1 className="mt-4 font-serif text-2xl font-bold tracking-tight text-foreground">
              {t('auth.verifyEmailSuccessTitle')}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">{t('auth.verifyEmailSuccessDesc')}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {status === 'authenticated' ? (
                <>
                  <Button asChild variant="primary" size="md" className="rounded-xl px-5">
                    <Link to="/courses/new">{t('auth.goToCreateCourse')}</Link>
                  </Button>
                  <Button asChild variant="outline" size="md" className="rounded-xl px-5">
                    <Link to="/">{t('auth.backToHome')}</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="primary" size="md" className="rounded-xl px-5">
                    <Link to="/login">{t('auth.loginNow')}</Link>
                  </Button>
                  <Button asChild variant="outline" size="md" className="rounded-xl px-5">
                    <Link to="/">{t('auth.backToHome')}</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {!isMissingToken && verifyState === 'error' && (
          <div data-testid="verify-email-error">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive dark:text-[#ffb4ab]">
              <AlertCircle className="h-8 w-8" aria-hidden="true" />
            </div>
            <h1 className="mt-4 font-serif text-2xl font-bold tracking-tight text-foreground">
              {t('auth.verifyEmailErrorTitle')}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {errorMessage || t('auth.verifyEmailErrorDesc')}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild variant="primary" size="md" className="rounded-xl px-5">
                <Link to="/">{t('auth.backToHome')}</Link>
              </Button>
              <Button asChild variant="outline" size="md" className="rounded-xl px-5">
                <Link to="/login">{t('auth.loginNow')}</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
