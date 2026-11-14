import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Lock,
  BookOpen,
} from 'lucide-react';
import { useToast } from '@/shared/ui';
import { Button, Input, Skeleton } from '@/shared/ui';
import { useAuth } from '@/shared/hooks';
import { useMyProfileQuery, useUpdateMyProfileMutation } from '../api/profileApi';
import {
  updateProfileSchema,
  type UpdateProfileFormValues,
} from '../schemas/profileSchemas';
import { AvatarUpload } from '../components/AvatarUpload';

export function EditProfilePage() {
  const { pushToast } = useToast();
  const { user } = useAuth();
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

  const currentDisplayName = watch('displayName') || '';
  const currentBio = watch('bio') || '';

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
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Skeleton className="h-48 rounded-2xl" />
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="py-12 text-center space-y-4">
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

  const joinDate = profile.joinedAt
    ? new Date(profile.joinedAt).toLocaleDateString('vi-VN')
    : '12/09/2026';

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="border-b border-border pb-5">
        <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">
          Hồ sơ cá nhân
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Thông tin hiển thị công khai trên trang cá nhân của bạn trong cộng đồng học tập BrainMemo.
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

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left Column: Avatar Section */}
          <div className="md:col-span-4 flex flex-col items-center sm:items-start gap-4">
            <label className="text-sm font-medium text-foreground">Ảnh đại diện</label>
            <div className="w-full">
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
            <p className="text-xs text-muted-foreground">
              JPG hoặc PNG, dung lượng tối đa 5 MB
            </p>
          </div>

          {/* Right Column: Information Fields */}
          <div className="md:col-span-8 space-y-6">
            {/* Display Name */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="displayName" className="text-sm font-semibold text-foreground">
                  Họ và tên hiển thị <span className="text-primary">*</span>
                </label>
                <span className="text-xs font-medium text-muted-foreground">
                  {currentDisplayName.length}/50
                </span>
              </div>
              <Input
                id="displayName"
                maxLength={50}
                placeholder="Nhập họ và tên hiển thị"
                {...register('displayName')}
                disabled={isSubmitting}
                className={errors.displayName ? 'border-destructive' : 'bg-background border-input text-foreground'}
              />
              {errors.displayName && (
                <p className="text-xs text-destructive">{errors.displayName.message}</p>
              )}
            </div>

            {/* Email (Readonly) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground">
                  Địa chỉ Email
                </label>
                <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground border border-border">
                  <Lock className="h-3 w-3" />
                  Không thể sửa
                </span>
              </div>
              <div className="relative">
                <input
                  type="email"
                  value={user?.email || 'quang.tran@brainmemo.edu.vn'}
                  disabled
                  className="w-full rounded-xl border border-input bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Đã xác minh</span>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="bio" className="text-sm font-semibold text-foreground">
                  Giới thiệu bản thân
                </label>
                <span className="text-xs font-medium text-muted-foreground">
                  {currentBio.length}/500
                </span>
              </div>
              <textarea
                id="bio"
                aria-label="Giới thiệu bản thân"
                rows={4}
                maxLength={500}
                placeholder="Chia sẻ đôi nét về mục tiêu học tập, sở thích và chuyên môn của bạn..."
                {...register('bio')}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {errors.bio && (
                <p className="text-xs text-destructive">{errors.bio.message}</p>
              )}
            </div>

            {/* Meta Information Cards (Join Date & Courses Count) */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="rounded-xl border border-border bg-muted/40 p-3.5 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ngày tham gia</p>
                  <p className="text-sm font-semibold text-foreground">{joinDate}</p>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3.5 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Số khóa học</p>
                  <p className="text-sm font-semibold text-foreground">Đã ghi danh</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => reset()}
            disabled={isSubmitting}
            className="border-border text-foreground hover:bg-muted"
          >
            Hủy
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90 text-white font-semibold px-6"
          >
            {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </div>
      </form>
    </div>
  );
}
