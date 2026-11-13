import { AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { mapValidationErrorsToFields, toApiProblemError } from '@/shared/api';
import { Button } from '@/shared/ui';
import { useResetPasswordMutation } from '../api';
import { PasswordInput } from '../components';
import { resetPasswordSchema, type ResetPasswordFormData } from '../schemas';

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const resetPasswordMutation = useResetPasswordMutation();

  const [formData, setFormData] = React.useState<Omit<ResetPasswordFormData, 'token'>>({
    newPassword: '',
    confirmPassword: '',
  });

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [generalError, setGeneralError] = React.useState<string | null>(null);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const handleChange = (field: 'newPassword' | 'confirmPassword', value: string) => {
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

    const validation = resetPasswordSchema.safeParse({
      token,
      newPassword: formData.newPassword,
      confirmPassword: formData.confirmPassword,
    });

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
      await resetPasswordMutation.mutateAsync({
        token,
        newPassword: formData.newPassword,
      });

      setIsSuccess(true);
    } catch (err) {
      const problem = toApiProblemError(err);
      if (problem.status === 422) {
        setFieldErrors(mapValidationErrorsToFields(problem));
      } else if (problem.status === 400 || problem.code === 'TOKEN_INVALID_OR_EXPIRED') {
        setGeneralError(
          'Mã xác nhận không hợp lệ hoặc đã hết hạn. Vui lòng gửi lại yêu cầu quên mật khẩu.'
        );
      } else {
        setGeneralError(problem.detail || problem.title || t('errors.genericRetry'));
      }
    }
  };

  // Missing token state
  if (!token) {
    return (
      <div className="mx-auto flex min-h-[75vh] w-full max-w-md flex-col justify-center px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-destructive/30 bg-card p-6 text-center shadow-sm dark:bg-[#131319] sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive dark:text-[#ffb4ab]">
            <AlertCircle className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-serif text-2xl font-bold tracking-tight text-foreground">
            Thiếu mã xác nhận
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Đường dẫn đặt lại mật khẩu không hợp lệ do thiếu mã token. Vui lòng kiểm tra lại liên
            kết trong email hoặc gửi lại yêu cầu.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild variant="primary" size="md" className="rounded-xl px-5">
              <Link to="/forgot-password">Yêu cầu liên kết mới</Link>
            </Button>
            <Button asChild variant="outline" size="md" className="rounded-xl px-5">
              <Link to="/login">{t('auth.backToLogin')}</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="mx-auto flex min-h-[75vh] w-full max-w-md flex-col justify-center px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm dark:bg-[#131319] sm:p-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-serif text-2xl font-bold tracking-tight text-foreground">
            {t('auth.resetPasswordSuccessTitle')}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">{t('auth.resetPasswordSuccessDesc')}</p>
          <div className="mt-6 flex justify-center">
            <Button asChild variant="primary" size="md" className="rounded-xl px-6">
              <Link to="/login">{t('auth.loginNow')}</Link>
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
            {t('auth.resetPasswordTitle')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('auth.resetPasswordSubtitle')}</p>
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
            <label
              htmlFor="reset-new-password"
              className="block text-sm font-medium text-foreground"
            >
              {t('auth.newPasswordLabel')}
            </label>
            <div className="mt-1.5">
              <PasswordInput
                id="reset-new-password"
                name="newPassword"
                autoComplete="new-password"
                value={formData.newPassword}
                onChange={(e) => handleChange('newPassword', e.target.value)}
                placeholder={t('auth.newPasswordPlaceholder')}
                hasError={Boolean(fieldErrors.newPassword)}
                disabled={resetPasswordMutation.isPending}
              />
            </div>
            {fieldErrors.newPassword ? (
              <p className="mt-1 text-xs text-destructive dark:text-[#ffb4ab]">
                {fieldErrors.newPassword}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="reset-confirm-password"
              className="block text-sm font-medium text-foreground"
            >
              {t('auth.confirmNewPasswordLabel')}
            </label>
            <div className="mt-1.5">
              <PasswordInput
                id="reset-confirm-password"
                name="confirmPassword"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                placeholder={t('auth.confirmNewPasswordPlaceholder')}
                hasError={Boolean(fieldErrors.confirmPassword)}
                disabled={resetPasswordMutation.isPending}
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
              disabled={resetPasswordMutation.isPending}
              className="w-full rounded-xl py-2.5 font-medium shadow-sm"
            >
              {resetPasswordMutation.isPending
                ? t('auth.submitting')
                : t('auth.resetPasswordSubmit')}
            </Button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <Link
            to="/login"
            className="font-semibold text-brand-orange hover:underline focus:outline-none"
          >
            {t('auth.backToLogin')}
          </Link>
        </p>
      </div>
    </div>
  );
}
