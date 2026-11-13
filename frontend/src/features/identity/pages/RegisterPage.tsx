import { CheckCircle2, UserPlus } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { mapValidationErrorsToFields, toApiProblemError } from '@/shared/api';
import { Button, Input } from '@/shared/ui';
import { useRegisterMutation } from '../api';
import { PasswordInput } from '../components';
import { registerSchema, type RegisterFormData } from '../schemas';

export function RegisterPage() {
  const { t } = useTranslation();
  const registerMutation = useRegisterMutation();

  const [formData, setFormData] = React.useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [generalError, setGeneralError] = React.useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = React.useState<string | null>(null);

  const handleChange = (field: keyof RegisterFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
    setGeneralError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    const validation = registerSchema.safeParse(formData);
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
      await registerMutation.mutateAsync({
        email: formData.email,
        password: formData.password,
      });

      setRegisteredEmail(formData.email);
    } catch (err) {
      const problem = toApiProblemError(err);
      if (problem.status === 422) {
        setFieldErrors(mapValidationErrorsToFields(problem));
      } else if (problem.status === 409 || problem.code === 'EMAIL_TAKEN') {
        setFieldErrors({
          email: 'Địa chỉ email này đã được đăng ký. Vui lòng chọn email khác hoặc đăng nhập.',
        });
      } else {
        setGeneralError(problem.detail || problem.title || t('errors.genericRetry'));
      }
    }
  };

  if (registeredEmail) {
    return (
      <div className="mx-auto flex min-h-[75vh] w-full max-w-md flex-col justify-center px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm dark:bg-[#131319] sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-serif text-2xl font-bold tracking-tight text-foreground">
            {t('auth.registerSuccessTitle')}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {t('auth.registerSuccessDesc', { email: registeredEmail })}
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
            <UserPlus className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-serif text-2xl font-bold tracking-tight text-foreground">
            {t('auth.registerTitle')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('auth.registerSubtitle')}</p>
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
            <label htmlFor="reg-email" className="block text-sm font-medium text-foreground">
              {t('auth.emailLabel')}
            </label>
            <div className="mt-1.5">
              <Input
                id="reg-email"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                hasError={Boolean(fieldErrors.email)}
                disabled={registerMutation.isPending}
              />
            </div>
            {fieldErrors.email ? (
              <p className="mt-1 text-xs text-destructive dark:text-[#ffb4ab]">
                {fieldErrors.email}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium text-foreground">
              {t('auth.passwordLabel')}
            </label>
            <div className="mt-1.5">
              <PasswordInput
                id="reg-password"
                name="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder={t('auth.newPasswordPlaceholder')}
                hasError={Boolean(fieldErrors.password)}
                disabled={registerMutation.isPending}
              />
            </div>
            {fieldErrors.password ? (
              <p className="mt-1 text-xs text-destructive dark:text-[#ffb4ab]">
                {fieldErrors.password}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="reg-confirm-password"
              className="block text-sm font-medium text-foreground"
            >
              {t('auth.confirmPasswordLabel')}
            </label>
            <div className="mt-1.5">
              <PasswordInput
                id="reg-confirm-password"
                name="confirmPassword"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                hasError={Boolean(fieldErrors.confirmPassword)}
                disabled={registerMutation.isPending}
              />
            </div>
            {fieldErrors.confirmPassword ? (
              <p className="mt-1 text-xs text-destructive dark:text-[#ffb4ab]">
                {fieldErrors.confirmPassword}
              </p>
            ) : null}
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={registerMutation.isPending}
              className="w-full rounded-xl py-2.5 font-medium shadow-sm"
            >
              {registerMutation.isPending ? t('auth.submitting') : t('auth.registerSubmit')}
            </Button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t('auth.hasAccount')}{' '}
          <Link
            to="/login"
            className="font-semibold text-brand-orange hover:underline focus:outline-none"
          >
            {t('auth.loginNow')}
          </Link>
        </p>
      </div>
    </div>
  );
}
