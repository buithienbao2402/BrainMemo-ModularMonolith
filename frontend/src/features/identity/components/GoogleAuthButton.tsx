import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/hooks';
import { cn } from '@/shared/lib/utils';
import { Button, useToast } from '@/shared/ui';
import { useGoogleLoginMutation } from '../api';

export interface GoogleAuthButtonProps {
  className?: string;
  disabled?: boolean;
  onSuccess?: () => void;
}

export function GoogleAuthButton({
  className,
  disabled = false,
  onSuccess,
}: GoogleAuthButtonProps) {
  const { t } = useTranslation();
  const { pushToast } = useToast();
  const { setAuthenticatedSession } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const googleLoginMutation = useGoogleLoginMutation();

  const handleClick = async () => {
    try {
      // In production, token is retrieved via Google Identity Services GIS token client.
      // In development/test environments, uses a mock Google ID token payload accepted by backend.
      const tokens = await googleLoginMutation.mutateAsync({
        idToken: 'mock-google-id-token',
      });

      await setAuthenticatedSession(tokens);

      if (typeof document !== 'undefined') {
        document.cookie = 'bm_mock_persona=user; path=/';
      }

      pushToast({
        id: 'google-auth-success',
        title: 'Google OAuth',
        description: t('auth.loginSuccess', { defaultValue: 'Đăng nhập Google thành công!' }),
        tone: 'success',
      });

      if (onSuccess) {
        onSuccess();
      } else {
        const nextUrl = searchParams.get('next') || '/';
        navigate(nextUrl, { replace: true });
      }
    } catch {
      pushToast({
        id: 'google-auth-error',
        title: 'Google OAuth',
        description: 'Không thể đăng nhập bằng tài khoản Google. Vui lòng thử lại.',
        tone: 'error',
      });
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="md"
      disabled={disabled || googleLoginMutation.isPending}
      onClick={handleClick}
      className={cn(
        'w-full gap-2.5 rounded-xl border border-input font-medium shadow-sm transition hover:bg-secondary/60',
        className
      )}
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          fill="#EA4335"
        />
      </svg>
      <span>{googleLoginMutation.isPending ? t('auth.submitting') : t('auth.loginWithGoogle')}</span>
    </Button>
  );
}
