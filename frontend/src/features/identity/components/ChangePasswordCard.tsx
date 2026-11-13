import { KeyRound, ShieldAlert } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { mapValidationErrorsToFields, toApiProblemError } from '@/shared/api';
import { Button, useToast } from '@/shared/ui';
import { useChangePasswordMutation } from '../api';
import { changePasswordSchema, type ChangePasswordFormData } from '../schemas';
import { PasswordInput } from './PasswordInput';

export function ChangePasswordCard() {
  const { t } = useTranslation();
  const { pushToast } = useToast();
  const changePasswordMutation = useChangePasswordMutation();

  const [formData, setFormData] = React.useState<ChangePasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [generalError, setGeneralError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const handleChange = (field: keyof ChangePasswordFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
    setGeneralError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setSuccessMessage(null);

    const validation = changePasswordSchema.safeParse(formData);
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
      await changePasswordMutation.mutateAsync({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      setSuccessMessage(t('auth.changePasswordSuccess'));
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setFieldErrors({});

      pushToast({
        id: 'change-password-success',
        title: t('auth.changePasswordHeading'),
        description: t('auth.changePasswordSuccess'),
        tone: 'success',
      });
    } catch (err) {
      const problem = toApiProblemError(err);
      if (problem.status === 422) {
        setFieldErrors(mapValidationErrorsToFields(problem));
      } else {
        setGeneralError(problem.detail || problem.title || t('errors.genericRetry'));
      }
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm dark:bg-[#131319] sm:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
          <KeyRound className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-serif text-lg font-bold text-foreground">
            {t('auth.changePasswordHeading')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('auth.changePasswordDesc')}</p>
        </div>
      </div>

      {generalError ? (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive dark:text-[#ffb4ab]"
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{generalError}</span>
        </div>
      ) : null}

      {successMessage ? (
        <div
          role="status"
          className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"
        >
          {successMessage}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-foreground">
            {t('auth.currentPasswordLabel')}
          </label>
          <div className="mt-1.5">
            <PasswordInput
              id="currentPassword"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={(e) => handleChange('currentPassword', e.target.value)}
              placeholder={t('auth.currentPasswordPlaceholder')}
              hasError={Boolean(fieldErrors.currentPassword)}
              disabled={changePasswordMutation.isPending}
            />
          </div>
          {fieldErrors.currentPassword ? (
            <p className="mt-1 text-xs text-destructive dark:text-[#ffb4ab]">
              {fieldErrors.currentPassword}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-foreground">
            {t('auth.newPasswordLabel')}
          </label>
          <div className="mt-1.5">
            <PasswordInput
              id="newPassword"
              name="newPassword"
              value={formData.newPassword}
              onChange={(e) => handleChange('newPassword', e.target.value)}
              placeholder={t('auth.newPasswordPlaceholder')}
              hasError={Boolean(fieldErrors.newPassword)}
              disabled={changePasswordMutation.isPending}
            />
          </div>
          {fieldErrors.newPassword ? (
            <p className="mt-1 text-xs text-destructive dark:text-[#ffb4ab]">
              {fieldErrors.newPassword}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
            {t('auth.confirmNewPasswordLabel')}
          </label>
          <div className="mt-1.5">
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              placeholder={t('auth.confirmNewPasswordPlaceholder')}
              hasError={Boolean(fieldErrors.confirmPassword)}
              disabled={changePasswordMutation.isPending}
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
            disabled={changePasswordMutation.isPending}
            className="rounded-xl px-5"
          >
            {changePasswordMutation.isPending
              ? t('auth.submitting')
              : t('auth.changePasswordSubmit')}
          </Button>
        </div>
      </form>
    </section>
  );
}
