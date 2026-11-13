import { AlertCircle, Lock, ShieldAlert } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { mapValidationErrorsToFields, toApiProblemError } from '@/shared/api';
import { useAuth } from '@/shared/hooks';
import { Button, Input, useToast } from '@/shared/ui';
import { useLoginMutation } from '../api';
import { GoogleAuthButton, PasswordInput } from '../components';
import { loginSchema, type LoginFormData } from '../schemas';

export function LoginPage() {
  const { t } = useTranslation();
  const { status, setAuthenticatedSession } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { pushToast } = useToast();

  const nextUrl = searchParams.get('next') || '/';
  const loginMutation = useLoginMutation();

  const [formData, setFormData] = React.useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [generalError, setGeneralError] = React.useState<string | null>(null);
  const [isLocked, setIsLocked] = React.useState(false);

  // If already authenticated, redirect to next target
  React.useEffect(() => {
    if (status === 'authenticated') {
      navigate(nextUrl, { replace: true });
    }
  }, [navigate, nextUrl, status]);

  const handleChange = (field: keyof LoginFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
    setGeneralError(null);
    setIsLocked(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setIsLocked(false);

    const validation = loginSchema.safeParse(formData);
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
      const tokens = await loginMutation.mutateAsync({
        email: formData.email,
        password: formData.password,
      });

      await setAuthenticatedSession(tokens);

      pushToast({
        id: 'login-success',
        title: t('auth.login'),
        description: t('auth.loginSuccess', { defaultValue: 'Đăng nhập thành công!' }),
        tone: 'success',
      });

      navigate(nextUrl, { replace: true });
    } catch (err) {
      const problem = toApiProblemError(err);
      if (problem.status === 422) {
        setFieldErrors(mapValidationErrorsToFields(problem));
      } else if (problem.status === 403 && problem.code === 'ACCOUNT_LOCKED') {
        setIsLocked(true);
        setGeneralError(problem.lockReason || problem.detail || t('errors.lockedPage.title'));
      } else if (problem.status === 401) {
        setGeneralError(problem.detail || 'Email hoặc mật khẩu không chính xác.');
      } else {
        setGeneralError(problem.detail || problem.title || t('errors.genericRetry'));
      }
    }
  };

  return (
    <div className="mx-auto flex min-h-[75vh] w-full max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm dark:bg-[#131319] sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange">
            <Lock className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-serif text-2xl font-bold tracking-tight text-foreground">
            {t('auth.loginTitle')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('auth.loginSubtitle')}</p>
        </div>

        {generalError ? (
          <div
            role="alert"
            className="mt-6 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive dark:text-[#ffb4ab]"
          >
            {isLocked ? (
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <div className="flex-1">
              <span>{generalError}</span>
              {isLocked ? (
                <div className="mt-2">
                  <Link to="/locked" className="font-medium underline hover:text-destructive/80">
                    Xem chi tiết hạn chế tài khoản
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              {t('auth.emailLabel')}
            </label>
            <div className="mt-1.5">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                hasError={Boolean(fieldErrors.email)}
                disabled={loginMutation.isPending}
              />
            </div>
            {fieldErrors.email ? (
              <p className="mt-1 text-xs text-destructive dark:text-[#ffb4ab]">
                {fieldErrors.email}
              </p>
            ) : null}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                {t('auth.passwordLabel')}
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-brand-orange hover:underline focus:outline-none"
              >
                {t('auth.forgotPasswordLink')}
              </Link>
            </div>
            <div className="mt-1.5">
              <PasswordInput
                id="password"
                name="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
                hasError={Boolean(fieldErrors.password)}
                disabled={loginMutation.isPending}
              />
            </div>
            {fieldErrors.password ? (
              <p className="mt-1 text-xs text-destructive dark:text-[#ffb4ab]">
                {fieldErrors.password}
              </p>
            ) : null}
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={loginMutation.isPending}
              className="w-full rounded-xl py-2.5 font-medium shadow-sm"
            >
              {loginMutation.isPending ? t('auth.submitting') : t('auth.loginSubmit')}
            </Button>
          </div>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground dark:bg-[#131319]">
              {t('auth.orDivider')}
            </span>
          </div>
        </div>

        <GoogleAuthButton disabled={loginMutation.isPending} />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t('auth.noAccount')}{' '}
          <Link
            to="/register"
            className="font-semibold text-brand-orange hover:underline focus:outline-none"
          >
            {t('auth.registerNow')}
          </Link>
        </p>
      </div>
    </div>
  );
}
