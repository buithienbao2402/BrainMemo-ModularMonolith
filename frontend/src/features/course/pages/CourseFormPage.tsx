import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  Save,
  Trash2,
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  Globe,
  Lock,
  EyeOff,
  FileText,
  CheckCircle2,
  Archive,
} from 'lucide-react';
import { useAuth } from '@/shared/hooks';
import {
  Button,
  Input,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  useToast,
} from '@/shared/ui';
import {
  useCourseQuery,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
} from '../api/courseApi';
import {
  courseUpsertSchema,
  type CourseUpsertFormValues,
} from '../schemas/courseSchemas';
import { CourseCoverUpload } from '../components/CourseCoverUpload';
import { TagInput } from '../components/TagInput';

export function CourseFormPage() {
  const { t } = useTranslation();
  const { courseId } = useParams<{ courseId: string }>();
  const isEditMode = Boolean(courseId);
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { pushToast } = useToast();

  const [formError, setFormError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const {
    data: existingCourse,
    isLoading: isCourseLoading,
    isError: isCourseError,
  } = useCourseQuery(courseId || '');

  const createMutation = useCreateCourseMutation();
  const updateMutation = useUpdateCourseMutation(courseId || '');
  const deleteMutation = useDeleteCourseMutation();

  const isEmailVerified = currentUser?.emailVerified ?? true;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CourseUpsertFormValues>({
    resolver: zodResolver(courseUpsertSchema),
    defaultValues: {
      name: '',
      description: '',
      accessMode: 'PUBLIC',
      status: 'DRAFT',
      tags: [],
      coverUploadKey: undefined,
      removeCover: false,
    },
  });

  const currentAccessMode = watch('accessMode');
  const currentStatus = watch('status');
  const currentTags = watch('tags') || [];
  const currentDescription = watch('description') || '';

  useEffect(() => {
    if (isEditMode && existingCourse) {
      reset({
        name: existingCourse.name || '',
        description: existingCourse.description || '',
        accessMode: (existingCourse.accessMode as any) || 'PUBLIC',
        status: (existingCourse.status as any) || 'DRAFT',
        tags: existingCourse.tags || [],
        coverUploadKey: undefined,
        removeCover: false,
      });
    }
  }, [isEditMode, existingCourse, reset]);

  const onSubmit = async (values: CourseUpsertFormValues) => {
    setFormError(null);

    // FR-CRS-01 Check: Require verified email
    if (!isEmailVerified) {
      const msg = 'Bạn cần xác minh địa chỉ email trước khi tạo hoặc cập nhật khóa học.';
      setFormError(msg);
      pushToast({
        title: 'Chưa xác minh email',
        description: msg,
        tone: 'error',
      });
      return;
    }

    try {
      if (isEditMode && courseId) {
        await updateMutation.mutateAsync({
          name: values.name,
          description: values.description,
          accessMode: values.accessMode,
          status: values.status,
          tags: values.tags,
          coverUploadKey: values.coverUploadKey,
          removeCover: values.removeCover,
        });

        pushToast({
          title: 'Cập nhật thành công',
          description: 'Thông tin khóa học đã được lưu.',
          tone: 'success',
        });
        navigate(`/courses/${courseId}`);
      } else {
        const created = await createMutation.mutateAsync({
          name: values.name,
          description: values.description,
          accessMode: values.accessMode,
          status: values.status,
          tags: values.tags,
          coverUploadKey: values.coverUploadKey,
        });

        pushToast({
          title: 'Tạo khóa học thành công!',
          description: 'Khóa học của bạn đã được khởi tạo.',
          tone: 'success',
        });

        if (created.id) {
          navigate(`/courses/${created.id}`);
        } else {
          navigate('/me/courses');
        }
      }
    } catch (err: any) {
      const msg =
        err?.detail ||
        err?.message ||
        'Không thể lưu khóa học. Vui lòng kiểm tra lại thông tin.';
      setFormError(msg);
      pushToast({
        title: 'Thao tác thất bại',
        description: msg,
        tone: 'error',
      });
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseId) return;
    try {
      await deleteMutation.mutateAsync(courseId);
      setIsDeleteDialogOpen(false);
      pushToast({
        title: 'Đã xóa khóa học',
        description: 'Khóa học đã được xóa mềm thành công.',
        tone: 'success',
      });
      navigate('/me/courses');
    } catch (err: any) {
      pushToast({
        title: 'Không thể xóa khóa học',
        description: err?.detail || err?.message || 'Có lỗi xảy ra khi xóa.',
        tone: 'error',
      });
    }
  };

  if (isEditMode && isCourseLoading) {
    return (
      <div className="mx-auto max-w-[800px] px-4 py-8 sm:px-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isEditMode && (isCourseError || !existingCourse)) {
    return (
      <div className="mx-auto max-w-[800px] px-4 py-12 sm:px-6 text-center space-y-4">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold text-foreground">Không tìm thấy khóa học cần chỉnh sửa</h2>
        <Button asChild variant="outline">
          <Link to="/me/courses">Quay lại danh sách khóa học</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[800px] px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 px-2">
              <Link to={isEditMode ? `/courses/${courseId}` : '/me/courses'}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span>Quay lại</span>
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {isEditMode ? 'Chỉnh sửa khóa học' : 'Tạo khóa học mới'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEditMode
              ? 'Cập nhật nội dung mô tả, chế độ truy cập và cài đặt khóa học.'
              : 'Thiết lập các thông tin cơ bản để bắt đầu soạn thảo nội dung bài giảng.'}
          </p>
        </div>

        {isEditMode && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="self-start sm:self-auto"
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Xóa khóa học
          </Button>
        )}
      </div>

      {/* Verified Email Warning Banner */}
      {!isEmailVerified && (
        <div
          className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400"
          role="alert"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Yêu cầu xác minh địa chỉ email</p>
            <p>
              Theo quy định của BrainMemo (FR-CRS-01), bạn cần xác minh địa chỉ email trước khi có thể xuất bản khóa học công khai. Vui lòng kiểm tra hộp thư kích hoạt.
            </p>
          </div>
        </div>
      )}

      {/* Form Error Banner */}
      {formError && (
        <div
          className="mb-6 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
          role="alert"
        >
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Lỗi thao tác</p>
            <p>{formError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Cover Section */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-foreground">Ảnh bìa khóa học</h2>
          <CourseCoverUpload
            currentCoverUrl={existingCourse?.coverUrl}
            onCoverUploaded={(uploadKey) => {
              setValue('coverUploadKey', uploadKey, { shouldDirty: true });
              setValue('removeCover', false, { shouldDirty: true });
            }}
            onCoverRemoved={() => {
              setValue('coverUploadKey', undefined, { shouldDirty: true });
              setValue('removeCover', true, { shouldDirty: true });
            }}
            disabled={isSubmitting}
          />
        </div>

        {/* Basic Information */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
          <h2 className="text-base font-semibold text-foreground">Thông tin chung</h2>

          {/* Name */}
          <div className="space-y-2">
            <label htmlFor="courseName" className="text-sm font-medium text-foreground">
              Tên khóa học <span className="text-destructive">*</span>
            </label>
            <Input
              id="courseName"
              placeholder="Ví dụ: Thiết kế hệ thống Modular Monolith với ASP.NET Core & React"
              {...register('name')}
              disabled={isSubmitting}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="courseDescription" className="text-sm font-medium text-foreground">
                Mô tả chi tiết khóa học
              </label>
              <span className="text-xs text-muted-foreground">
                {currentDescription.length} / 5000 ký tự
              </span>
            </div>
            <textarea
              id="courseDescription"
              rows={5}
              placeholder="Tóm tắt mục tiêu khóa học, đối tượng học viên hướng tới và những kiến thức sẽ đạt được..."
              {...register('description')}
              disabled={isSubmitting}
              className={`w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                errors.description ? 'border-destructive' : ''
              }`}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Thẻ phân loại (Tags)</label>
            <TagInput
              tags={currentTags}
              onChange={(newTags) => setValue('tags', newTags, { shouldDirty: true })}
              maxTags={10}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Access Mode & Publication Status */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
          <h2 className="text-base font-semibold text-foreground">Chế độ truy cập & Phát hành</h2>

          {/* Access Mode */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Chế độ truy cập</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setValue('accessMode', 'PUBLIC', { shouldDirty: true })}
                className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                  currentAccessMode === 'PUBLIC'
                    ? 'border-emerald-500 bg-emerald-500/10 text-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm mb-1 text-emerald-600 dark:text-emerald-400">
                  <Globe className="h-4 w-4" />
                  <span>Công khai (Public)</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Mọi người đều có thể tìm thấy và tự do ghi danh học ngay.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setValue('accessMode', 'PRIVATE', { shouldDirty: true })}
                className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                  currentAccessMode === 'PRIVATE'
                    ? 'border-amber-500 bg-amber-500/10 text-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm mb-1 text-amber-600 dark:text-amber-400">
                  <Lock className="h-4 w-4" />
                  <span>Riêng tư (Private)</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Yêu cầu phê duyệt từ bạn hoặc tham gia qua lời mời.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setValue('accessMode', 'ONLY_ME', { shouldDirty: true })}
                className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all ${
                  currentAccessMode === 'ONLY_ME'
                    ? 'border-purple-500 bg-purple-500/10 text-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm mb-1 text-purple-600 dark:text-purple-400">
                  <EyeOff className="h-4 w-4" />
                  <span>Chỉ mình tôi</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tạm ẩn hoàn toàn khỏi danh mục và người khác (404).
                </p>
              </button>
            </div>
          </div>

          {/* Publication Status */}
          <div className="space-y-3 pt-2">
            <label className="text-sm font-medium text-foreground">Trạng thái phát hành</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setValue('status', 'DRAFT', { shouldDirty: true })}
                className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-sm font-medium transition-all ${
                  currentStatus === 'DRAFT'
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Bản nháp (Draft)</span>
              </button>

              <button
                type="button"
                onClick={() => setValue('status', 'PUBLISHED', { shouldDirty: true })}
                className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-sm font-medium transition-all ${
                  currentStatus === 'PUBLISHED'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 font-semibold'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Xuất bản (Published)</span>
              </button>

              <button
                type="button"
                onClick={() => setValue('status', 'ARCHIVED', { shouldDirty: true })}
                className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-sm font-medium transition-all ${
                  currentStatus === 'ARCHIVED'
                    ? 'border-destructive bg-destructive/10 text-destructive font-semibold'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                <Archive className="h-4 w-4" />
                <span>Lưu trữ (Archived)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            asChild
            disabled={isSubmitting}
          >
            <Link to={isEditMode ? `/courses/${courseId}` : '/me/courses'}>
              Hủy
            </Link>
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
            className="min-w-[150px]"
          >
            {isSubmitting || createMutation.isPending || updateMutation.isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                <span>Đang lưu...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Save className="h-4 w-4" />
                <span>{isEditMode ? 'Lưu thay đổi' : 'Tạo khóa học'}</span>
              </span>
            )}
          </Button>
        </div>
      </form>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa khóa học?</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa khóa học &ldquo;{existingCourse?.name}&rdquo;? Khóa học sẽ bị ẩn khỏi mọi học viên và chuyển sang trạng thái đã xóa mềm. Thao tác này có thể hoàn tác bởi quản trị viên.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteCourse}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Đang xóa...' : 'Xác nhận xóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
