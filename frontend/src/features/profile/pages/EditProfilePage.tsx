import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, User, AlertCircle } from 'lucide-react';
import { useToast } from '@/shared/ui';
import { Button, Input, Skeleton } from '@/shared/ui';
import { useMyProfileQuery, useUpdateMyProfileMutation } from '../api/profileApi';
import {
  updateProfileSchema,
  type UpdateProfileFormValues,
} from '../schemas/profileSchemas';
import { AvatarUpload } from '../components/AvatarUpload';

export function EditProfilePage() {
  const { pushToast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: profile,
    isLoading,
    isError,
    refetch,
  } = useMyProfileQuery();

  const updateMutation = useUpdateMyProfileMutation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      displayName: '',
      bio: '',
      showCourseList: true,
      uiTheme: 'DARK',
      avatarUploadKey: undefined,
      removeAvatar: false,
    },
  });

  const currentDisplayName = watch('displayName');
  const currentBio = watch('bio') || '';
  const currentShowCourseList = watch('showCourseList');
  const currentTheme = watch('uiTheme');

  useEffect(() => {
    if (profile) {
      reset({
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        showCourseList: profile.showCourseList ?? true,
        uiTheme: (profile.uiTheme as 'LIGHT' | 'DARK') || 'DARK',
        avatarUploadKey: undefined,
        removeAvatar: false,
      });
    }
  }, [profile, reset]);

  const onSubmit = async (values: UpdateProfileFormValues) => {
    setFormError(null);
    try {
      await updateMutation.mutateAsync({
        displayName: values.displayName,
        bio: values.bio,
        showCourseList: values.showCourseList,
        uiTheme: values.uiTheme,
        avatarUploadKey: values.avatarUploadKey,
        removeAvatar: values.removeAvatar,
      });

      pushToast({
        title: 'Cập nhật thành công',
        description: 'Thông tin hồ sơ cá nhân đã được lưu.',
        tone: 'success',
      });
    } catch (err: any) {
      const msg =
        err?.detail ||
        err?.message ||
        'Không thể cập nhật hồ sơ. Vui lòng kiểm tra lại thông tin.';
      setFormError(msg);
      pushToast({
        title: 'Cập nhật thất bại',
        description: msg,
        tone: 'error',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[800px] px-4 py-8 sm:px-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="mx-auto max-w-[800px] px-4 py-12 sm:px-6 text-center space-y-4">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold text-foreground">Không thể tải thông tin hồ sơ</h2>
        <p className="text-sm text-muted-foreground">
          Đã có lỗi xảy ra khi kết nối máy chủ. Vui lòng thử lại.
        </p>
        <Button onClick={() => refetch()} variant="outline">
          Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[800px] px-4 py-8 sm:px-6">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Hồ sơ cá nhân</h1>
        <p className="text-sm text-muted-foreground">
          Quản lý thông tin công khai, giới thiệu và tùy chỉnh giao diện học tập.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {formError && (
          <div
            className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Lỗi cập nhật hồ sơ</p>
              <p>{formError}</p>
            </div>
          </div>
        )}

        {/* Avatar Section */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <span>Ảnh đại diện</span>
          </h2>
          <AvatarUpload
            currentAvatarUrl={profile.avatarUrl}
            displayName={currentDisplayName || profile.displayName}
            onAvatarUploaded={(uploadKey) => {
              setValue('avatarUploadKey', uploadKey, { shouldDirty: true });
              setValue('removeAvatar', false, { shouldDirty: true });
            }}
            onAvatarRemoved={() => {
              setValue('avatarUploadKey', undefined, { shouldDirty: true });
              setValue('removeAvatar', true, { shouldDirty: true });
            }}
            disabled={isSubmitting}
          />
        </div>

        {/* Basic Details Section */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
          <h2 className="text-base font-semibold text-foreground">Thông tin chung</h2>

          {/* Display Name */}
          <div className="space-y-2">
            <label htmlFor="displayName" className="text-sm font-medium text-foreground">
              Họ và tên hiển thị <span className="text-destructive">*</span>
            </label>
            <Input
              id="displayName"
              placeholder="Nhập họ và tên hiển thị"
              {...register('displayName')}
              disabled={isSubmitting}
              className={errors.displayName ? 'border-destructive' : ''}
            />
            {errors.displayName && (
              <p className="text-xs text-destructive">{errors.displayName.message}</p>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="bio" className="text-sm font-medium text-foreground">
                Giới thiệu bản thân
              </label>
              <span className="text-xs text-muted-foreground">
                {currentBio.length} / 2000 ký tự
              </span>
            </div>
            <textarea
              id="bio"
              rows={4}
              placeholder="Chia sẻ đôi nét về kinh nghiệm, lĩnh vực chuyên môn hoặc sở thích học tập của bạn..."
              {...register('bio')}
              disabled={isSubmitting}
              className={`w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                errors.bio ? 'border-destructive' : ''
              }`}
            />
            {errors.bio && (
              <p className="text-xs text-destructive">{errors.bio.message}</p>
            )}
          </div>
        </div>

        {/* Settings & Privacy Section */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
          <h2 className="text-base font-semibold text-foreground">Quyền riêng tư & Tùy chọn</h2>

          {/* Show course list toggle */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <label
                htmlFor="showCourseList"
                className="text-sm font-medium text-foreground cursor-pointer"
              >
                Hiển thị danh sách khóa học trên hồ sơ công khai
              </label>
              <p className="text-xs text-muted-foreground">
                Cho phép người khác xem danh sách các khóa học bạn đã tạo và đang tham gia.
              </p>
            </div>
            <input
              type="checkbox"
              id="showCourseList"
              checked={currentShowCourseList}
              onChange={(e) =>
                setValue('showCourseList', e.target.checked, { shouldDirty: true })
              }
              disabled={isSubmitting}
              className="h-5 w-5 rounded border-input text-primary focus:ring-primary cursor-pointer"
            />
          </div>

          <div className="border-t border-border pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Giao diện ứng dụng mặc định
              </label>
              <div className="grid grid-cols-2 gap-4 max-w-sm">
                <button
                  type="button"
                  onClick={() => setValue('uiTheme', 'LIGHT', { shouldDirty: true })}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                    currentTheme === 'LIGHT'
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Giao diện sáng (Light)
                </button>
                <button
                  type="button"
                  onClick={() => setValue('uiTheme', 'DARK', { shouldDirty: true })}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                    currentTheme === 'DARK'
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Giao diện tối (Dark)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            disabled={isSubmitting || updateMutation.isPending}
            className="min-w-[140px]"
          >
            {isSubmitting || updateMutation.isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>Đang lưu...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Save className="h-4 w-4" />
                <span>Lưu thay đổi</span>
              </span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
