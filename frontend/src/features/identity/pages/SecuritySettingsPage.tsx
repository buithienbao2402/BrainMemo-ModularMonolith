import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Check, Eye, EyeOff, ShieldAlert, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { mapValidationErrorsToFields, toApiProblemError } from '@/shared/api';
import { Button, useToast } from '@/shared/ui';
import { useChangePasswordMutation } from '../api';
import { changePasswordSchema, type ChangePasswordFormData } from '../schemas';

export function SecuritySettingsPage() {
  const { t } = useTranslation();
  const { pushToast } = useToast();
  const changePasswordMutation = useChangePasswordMutation();

  const [formData, setFormData] = useState<ChangePasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleChange = (field: keyof ChangePasswordFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
    setGeneralError(null);
  };

  // Password strength checks
  const criteria = useMemo(() => {
    const pwd = formData.newPassword;
    return {
      minLength: pwd.length >= 8,
      hasUpperLower: /[a-z]/.test(pwd) && /[A-Z]/.test(pwd),
      hasNumber: /\d/.test(pwd),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    };
  }, [formData.newPassword]);

  const strengthScore = useMemo(() => {
    const list = [criteria.minLength, criteria.hasUpperLower, criteria.hasNumber, criteria.hasSpecial];
    return list.filter(Boolean).length;
  }, [criteria]);

  const strengthLabel = useMemo(() => {
    if (!formData.newPassword) return 'Chưa nhập';
    if (strengthScore <= 1) return 'Rất yếu';
    if (strengthScore === 2) return 'Trung bình';
    if (strengthScore === 3) return 'Khá mạnh';
    return 'Rất mạnh';
  }, [strengthScore, formData.newPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

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

      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setFieldErrors({});

      pushToast({
        title: 'Đổi mật khẩu thành công',
        description:
          'Đổi mật khẩu thành công. Các phiên đăng nhập trên thiết bị khác đã được thu hồi.',
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

  const handleReset = () => {
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setFieldErrors({});
    setGeneralError(null);
  };

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="border-b border-border pb-5">
        <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">
          Đổi mật khẩu
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cập nhật mật khẩu định kỳ giúp bảo vệ tài khoản và lịch sử học tập của bạn.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {generalError && (
          <div
            className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Lỗi đổi mật khẩu</p>
              <p>{generalError}</p>
            </div>
          </div>
        )}

        {/* Current Password Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="currentPassword" className="text-sm font-semibold text-foreground">
              Mật khẩu hiện tại <span className="text-primary">*</span>
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Quên mật khẩu?
            </Link>
          </div>
          <div className="relative">
            <input
              id="currentPassword"
              aria-label="Mật khẩu hiện tại"
              type={showCurrentPassword ? 'text' : 'password'}
              value={formData.currentPassword}
              onChange={(e) => handleChange('currentPassword', e.target.value)}
              placeholder="••••••••••••"
              disabled={changePasswordMutation.isPending}
              className={`w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${
                fieldErrors.currentPassword ? 'border-destructive' : 'border-input'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showCurrentPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {fieldErrors.currentPassword && (
            <p className="text-xs text-destructive">{fieldErrors.currentPassword}</p>
          )}
        </div>

        {/* New Password Field */}
        <div className="space-y-1.5">
          <label htmlFor="newPassword" className="text-sm font-semibold text-foreground">
            Mật khẩu mới <span className="text-primary">*</span>
          </label>
          <div className="relative">
            <input
              id="newPassword"
              aria-label="Mật khẩu mới"
              type={showNewPassword ? 'text' : 'password'}
              value={formData.newPassword}
              onChange={(e) => handleChange('newPassword', e.target.value)}
              placeholder="Nhập mật khẩu mới ít nhất 8 ký tự"
              disabled={changePasswordMutation.isPending}
              className={`w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${
                fieldErrors.newPassword ? 'border-destructive' : 'border-input'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {fieldErrors.newPassword && (
            <p className="text-xs text-destructive">{fieldErrors.newPassword}</p>
          )}
        </div>

        {/* Password Strength Indicator Card */}
        <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground uppercase tracking-wider">ĐỘ MẠNH MẬT KHẨU:</span>
            <span
              className={
                strengthScore <= 1
                  ? 'text-destructive'
                  : strengthScore === 2
                  ? 'text-amber-500 dark:text-amber-400'
                  : strengthScore === 3
                  ? 'text-primary'
                  : 'text-emerald-600 dark:text-emerald-400'
              }
            >
              {strengthLabel}
            </span>
          </div>

          {/* 4-Segment Bar */}
          <div className="flex gap-2 h-2">
            {[1, 2, 3, 4].map((seg) => (
              <div
                key={seg}
                className={`flex-1 rounded-full transition-all duration-300 ${
                  seg <= strengthScore ? 'bg-primary' : 'bg-muted-foreground/20'
                }`}
              />
            ))}
          </div>

          {/* Checklist Criteria Grid (2x2) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                  criteria.minLength
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-muted text-muted-foreground/50'
                }`}
              >
                <Check className="h-2.5 w-2.5" />
              </div>
              <span className={criteria.minLength ? 'text-foreground' : 'text-muted-foreground'}>
                Tối thiểu 8 ký tự
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                  criteria.hasUpperLower
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-muted text-muted-foreground/50'
                }`}
              >
                <Check className="h-2.5 w-2.5" />
              </div>
              <span className={criteria.hasUpperLower ? 'text-foreground' : 'text-muted-foreground'}>
                Chứa chữ hoa & chữ thường
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                  criteria.hasNumber
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-muted text-muted-foreground/50'
                }`}
              >
                <Check className="h-2.5 w-2.5" />
              </div>
              <span className={criteria.hasNumber ? 'text-foreground' : 'text-muted-foreground'}>
                Có ít nhất 1 chữ số
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                  criteria.hasSpecial
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-muted text-muted-foreground/50'
                }`}
              >
                <Check className="h-2.5 w-2.5" />
              </div>
              <span className={criteria.hasSpecial ? 'text-foreground' : 'text-muted-foreground'}>
                Ký tự đặc biệt (!@#$)
              </span>
            </div>
          </div>
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="text-sm font-semibold text-foreground">
            Xác nhận mật khẩu mới <span className="text-primary">*</span>
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              aria-label="Xác nhận mật khẩu mới"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              placeholder="Khớp với mật khẩu mới ở trên"
              disabled={changePasswordMutation.isPending}
              className={`w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${
                fieldErrors.confirmPassword ? 'border-destructive' : 'border-input'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {fieldErrors.confirmPassword && (
            <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>
          )}
        </div>

        {/* Safety Note Box */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3 text-xs text-amber-900 dark:text-amber-200">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-amber-700 dark:text-amber-300">Lưu ý an toàn:</strong> Sau khi đổi mật khẩu thành
            công, các phiên đăng nhập khác có thể sẽ bị đăng xuất để bảo đảm an toàn dữ liệu và tiến
            độ học tập của bạn.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={changePasswordMutation.isPending}
            className="border-border text-foreground hover:bg-muted"
          >
            Hủy thay đổi
          </Button>
          <Button
            type="submit"
            disabled={changePasswordMutation.isPending}
            className="bg-primary hover:bg-primary/90 text-white font-semibold px-6"
          >
            {changePasswordMutation.isPending ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
          </Button>
        </div>
      </form>
    </div>
  );
}
