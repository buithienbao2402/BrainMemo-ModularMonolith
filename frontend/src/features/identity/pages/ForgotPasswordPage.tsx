import { ArrowLeft, KeyRound, MailCheck } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { mapValidationErrorsToFields, toApiProblemError } from '@/shared/api';
import { Button, Input } from '@/shared/ui';
import { useForgotPasswordMutation } from '../api';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../schemas';

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const forgotPasswordMutation = useForgotPasswordMutation();

  const [formData, setFormData] = React.useState<ForgotPasswordFormData>({
    email: '',
  });

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [generalError, setGeneralError] = React.useState<string | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  const handleChange = (value: string) => {
    setFormData({ email: value });
    setFieldErrors({});
    setGeneralError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    const validation = forgotPasswordSchema.safeParse(formData);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const path = issue.path[0];
        if (path && typeof path === 'string' && !errors[path]) {
          errors[path] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    try {
      await forgotPasswordMutation.mutateAsync({
        email: formData.email,
      });

      setSubmitted(true);
    } catch (err) {
      const problem = toApiProblemError(err);
      if (problem.status === 422) {
        setFieldErrors(mapValidationErrorsToFields(problem));
      } else {
        setGeneralError(problem.detail || problem.title || t('errors.genericRetry'));
      }
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto flex min-h-[75vh] w-full max-w-md flex-col justify-center px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm dark:bg-[#131319] sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange">
            <MailCheck className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-serif text-2xl font-bold tracking-tight text-foreground">
            {t('auth.forgotPasswordSuccessTitle')}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {t('auth.forgotPasswordSuccessDesc')}
          </p>
          <div className="mt-6 flex justify-center">
            <Button asChild variant="primary" size="md" className="rounded-xl px-6">
              <Link to="/login">{t('auth.backToLogin')}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[75vh] w-full max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm dark:bg-[#131319] sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange">
            <KeyRound className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-serif text-2xl font-bold tracking-tight text-foreground">
            {t('auth.forgotPasswordTitle')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('auth.forgotPasswordSubtitle')}</p>
        </div>

        {generalError ? (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive dark:text-[#ffb4ab]"
          >
            {generalError}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="forgot-email" className="block text-sm font-medium text-foreground">
              {t('auth.emailLabel')}
            </label>
            <div className="mt-1.5">
              <Input
                id="forgot-email"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={(e) => handleChange(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                hasError={Boolean(fieldErrors.email)}
                disabled={forgotPasswordMutation.isPending}
              />
            </div>
            {fieldErrors.email ? (
              <p className="mt-1 text-xs text-destructive dark:text-[#ffb4ab]">
                {fieldErrors.email}
              </p>
            ) : null}
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={forgotPasswordMutation.isPending}
              className="w-full rounded-xl py-2.5 font-medium shadow-sm"
            >
              {forgotPasswordMutation.isPending
                ? t('auth.submitting')
                : t('auth.forgotPasswordSubmit')}
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-orange hover:underline focus:outline-none"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {t('auth.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
}
