import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  Bold,
  Italic,
  Strikethrough,
  Link as LinkIcon,
  Code,
  Quote,
  List,
  ListOrdered,
  Heading,
  Globe,
  Lock,
  EyeOff,
  Clock,
  Calendar,
  X,
  UploadCloud,
  ChevronRight,
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
import { uploadFileToStorage, ApiProblemError } from '@/shared/api';
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
import defaultCourseCover from '@/assets/courses';

const QUICK_TAG_SUGGESTIONS = ['Toán học', 'Ngoại ngữ', 'Microservices', 'AI', 'Lập trình'];

export function CourseFormPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const isEditMode = Boolean(courseId);
  const navigate = useNavigate();
  const { user: currentUser, profile: currentProfile } = useAuth();
  const { pushToast } = useToast();

  const [formError, setFormError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    data: existingCourse,
    isLoading: isCourseLoading,
  } = useCourseQuery(courseId || '');

  const createMutation = useCreateCourseMutation();
  const updateMutation = useUpdateCourseMutation(courseId || '');
  const deleteMutation = useDeleteCourseMutation();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const isEmailVerified = currentUser?.emailVerified ?? true;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CourseUpsertFormValues>({
    resolver: zodResolver(courseUpsertSchema),
    defaultValues: {
      name: '',
      description: '',
      accessMode: 'PUBLIC',
      status: 'UPDATING',
      tags: ['Lập trình', 'Backend'],
      coverUploadKey: undefined,
      removeCover: false,
    },
  });

  const isInitializedRef = useRef(false);
  const currentName = watch('name') || '';
  const currentDescription = watch('description') || '';
  const currentAccessMode = watch('accessMode');
  const currentStatus = watch('status');
  const currentTags = watch('tags') || [];

  const descriptionRegister = register('description');

  useEffect(() => {
    if (isEditMode && existingCourse && (!isInitializedRef.current || !isDirty)) {
      reset({
        name: existingCourse.name || '',
        description: existingCourse.description || '',
        accessMode: (existingCourse.accessMode as any) || 'PUBLIC',
        status: (existingCourse.status as any) || 'UPDATING',
        tags: existingCourse.tags || [],
        coverUploadKey: undefined,
        removeCover: false,
      });
      isInitializedRef.current = true;
      if (existingCourse.coverUrl) {
        setCoverPreview(existingCourse.coverUrl);
      }
    }
  }, [isEditMode, existingCourse, reset, isDirty]);

  // Insert markdown helpers into description
  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selected = text.substring(start, end);
    const replacement = `${prefix}${selected || 'nội dung'}${suffix}`;
    const nextValue = text.substring(0, start) + replacement + text.substring(end);
    setValue('description', nextValue, { shouldDirty: true });
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + (selected ? selected.length : 7));
    }, 0);
  };

  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim().replace(/^#+/, '');
    if (!trimmed) return;
    if (currentTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) return;
    if (currentTags.length >= 10) return;
    setValue('tags', [...currentTags, trimmed], { shouldDirty: true });
    setTagInput('');
  };

  const handleRemoveTag = (idxToRemove: number) => {
    setValue(
      'tags',
      currentTags.filter((_, idx) => idx !== idxToRemove),
      { shouldDirty: true }
    );
  };

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    try {
      const localUrl = URL.createObjectURL(file);
      setCoverPreview(localUrl);

      const uploadKey = await uploadFileToStorage({
        file,
        purpose: 'COURSE_COVER',
      });

      setValue('coverUploadKey', uploadKey, { shouldDirty: true });
      setValue('removeCover', false, { shouldDirty: true });
    } catch (err: unknown) {
      setCoverPreview(existingCourse?.coverUrl || null);
      setValue('coverUploadKey', undefined, { shouldDirty: true });
      console.error('Failed to upload course cover:', err);

      const description =
        err instanceof ApiProblemError
          ? err.detail || err.title
          : 'Không thể tải ảnh bìa lên hệ thống. Vui lòng thử lại.';

      pushToast({
        title: 'Lỗi tải ảnh bìa',
        description,
        tone: 'error',
      });
    } finally {
      setIsUploadingCover(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (values: CourseUpsertFormValues) => {
    setFormError(null);

    if (!isEmailVerified) {
      const msg = 'Bạn cần xác minh địa chỉ email trước khi tạo khóa học.';
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
          description: 'Khóa học đã được cập nhật thành công.',
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
          description: 'Khóa học mới của bạn đã sẵn sàng để soạn bài học.',
          tone: 'success',
        });
        navigate(`/courses/${created.id}`);
      }
    } catch (err: any) {
      const msg = err?.detail || err?.message || 'Có lỗi xảy ra khi lưu khóa học.';
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
      pushToast({
        title: 'Đã xóa khóa học',
        description: 'Khóa học đã được xóa khỏi hệ thống.',
        tone: 'success',
      });
      setIsDeleteDialogOpen(false);
      navigate('/manage/courses');
    } catch {
      pushToast({
        title: 'Lỗi',
        description: 'Không thể xóa khóa học lúc này.',
        tone: 'error',
      });
    }
  };

  if (isEditMode && isCourseLoading) {
    return (
      <div className="space-y-6 max-w-[1280px] mx-auto p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-96 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <Skeleton className="lg:col-span-8 h-96 rounded-2xl" />
          <Skeleton className="lg:col-span-4 h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  const authorName = currentProfile?.displayName?.trim() || currentUser?.email || 'Người dùng';
  const authorInitials = authorName
    .trim()
    .split(/\s+/)
    .map((w: string) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase();
  const todayFormatted = new Date().toLocaleDateString('vi-VN');

  return (
    <div className="space-y-6 max-w-[1280px] mx-auto">
      {/* Breadcrumb & Title Section matching Figma 27:6697 */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          <Link to="/manage/courses" className="hover:text-foreground transition-colors">
            Quản trị khóa học
          </Link>
          <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
          <span className="text-foreground">
            {isEditMode ? 'Chỉnh sửa khóa học' : 'Tạo khóa học mới'}
          </span>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          {isEditMode ? 'Chỉnh sửa khóa học' : 'Tạo khóa học mới'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {formError && (
          <div
            className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Lỗi biểu mẫu</p>
              <p>{formError}</p>
            </div>
          </div>
        )}

        {/* 2-Column Grid Layout matching Figma 27:6697 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Main Form (~65% = 8 cols) */}
          <div className="lg:col-span-8 rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-sm">
            {/* Form Section Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="font-serif text-xl font-bold text-foreground">Thông tin khóa học</h2>
              <span className="rounded bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
                Bắt buộc (*)
              </span>
            </div>

            {/* Field 1: Tên khóa học */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="name" className="text-sm font-semibold text-foreground">
                  Tên khóa học <span className="text-primary">*</span>
                </label>
                <span className="text-xs font-medium text-muted-foreground">
                  {currentName.length}/120
                </span>
              </div>
              <Input
                id="name"
                maxLength={120}
                placeholder="Ví dụ: Nhập môn Python - Từ Zero tới Hero"
                {...register('name')}
                disabled={isSubmitting}
                className={`bg-background border-input text-foreground ${
                  errors.name ? 'border-destructive' : ''
                }`}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            {/* Field 2: Row 2 cols (Người tạo & Ngày khởi tạo) matching Figma 27:6742 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Col A: Người tạo */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Người tạo</span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    Cố định
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-muted/40 border border-border px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    {currentProfile?.avatarUrl ? (
                      <img
                        src={currentProfile.avatarUrl}
                        alt=""
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-xs">
                        {authorInitials || 'QT'}
                      </div>
                    )}
                    <span className="text-sm font-semibold text-foreground">{authorName}</span>
                  </div>
                  <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {currentUser?.isAdmin ? 'Admin' : 'Giảng viên'}
                  </span>
                </div>
              </div>

              {/* Col B: Ngày khởi tạo */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Ngày khởi tạo</span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Tự động
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-muted/40 border border-border px-3 py-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{todayFormatted}</span>
                  </div>
                  <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground font-mono">
                    UTC+7
                  </span>
                </div>
              </div>
            </div>

            {/* Field 3: Giới thiệu (Markdown / Rich Text) matching Figma 27:6780 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="description" className="text-sm font-semibold text-foreground">
                  Mô tả chi tiết khóa học
                </label>
                <span className="text-xs font-medium text-muted-foreground">
                  {currentDescription.length}/2000
                </span>
              </div>

              {/* Mini Toolbar */}
              <div className="overflow-hidden rounded-xl border border-input bg-background">
                <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/50 px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => insertMarkdown('**', '**')}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="Đậm"
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('*', '*')}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="Nghiêng"
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('~~', '~~')}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="Gạch ngang"
                  >
                    <Strikethrough className="h-3.5 w-3.5" />
                  </button>
                  <div className="h-4 w-px bg-border mx-1" />
                  <button
                    type="button"
                    onClick={() => insertMarkdown('[', '](https://)')}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="Chèn liên kết"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('`', '`')}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="Mã nguồn inline"
                  >
                    <Code className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('> ')}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="Trích dẫn"
                  >
                    <Quote className="h-3.5 w-3.5" />
                  </button>
                  <div className="h-4 w-px bg-border mx-1" />
                  <button
                    type="button"
                    onClick={() => insertMarkdown('- ')}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="Danh sách gạch đầu dòng"
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('1. ')}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="Danh sách đánh số"
                  >
                    <ListOrdered className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('### ')}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                    title="Tiêu đề"
                  >
                    <Heading className="h-3.5 w-3.5" />
                  </button>
                </div>

                <textarea
                  id="description"
                  aria-label="Mô tả chi tiết khóa học"
                  {...descriptionRegister}
                  ref={(e) => {
                    descriptionRegister.ref(e);
                    (textareaRef as any).current = e;
                  }}
                  rows={6}
                  maxLength={2000}
                  placeholder="Người học được tiếp cận kiến thức toàn diện, cơ chế thực hành trực tiếp kết hợp bộ flashcard ghi nhớ thông minh..."
                  disabled={isSubmitting}
                  className="w-full bg-transparent p-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
            </div>

            {/* Field 4: Trạng thái (Status) */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Trạng thái khóa học</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'UPDATING', label: 'Đang cập nhật' },
                  { id: 'COMPLETED', label: 'Đã hoàn thành' },
                  { id: 'PAUSED', label: 'Tạm dừng' },
                ].map((s) => {
                  const isSelected = currentStatus === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setValue('status', s.id as any, { shouldDirty: true })}
                      className={`rounded-xl py-2.5 px-3 text-xs font-semibold transition-all border ${
                        isSelected
                          ? 'border-primary bg-primary/15 text-primary'
                          : 'border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Field 5: Thẻ phân loại (Tags) matching Figma 27:6830 */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Thẻ phân loại (Tags)</label>
              <div className="flex flex-wrap gap-2 items-center rounded-xl border border-input bg-background p-2.5 min-h-[46px]">
                {currentTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-lg bg-muted border border-border px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(idx)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag(tagInput);
                    }
                  }}
                  placeholder="Gõ tag và bấm Enter..."
                  className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none min-w-[140px] px-1"
                />
              </div>

              {/* Quick Tag Suggestions */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="text-muted-foreground">Gợi ý nhanh:</span>
                {QUICK_TAG_SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => handleAddTag(sug)}
                    className="rounded-full bg-muted hover:bg-primary/20 hover:text-primary border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>

            {/* Field 6: Chế độ hiển thị (Access Mode) matching Figma 27:6850 */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Chế độ hiển thị</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Công khai */}
                <div
                  onClick={() => setValue('accessMode', 'PUBLIC', { shouldDirty: true })}
                  className={`cursor-pointer rounded-xl border p-4 flex flex-col justify-between transition-all ${
                    currentAccessMode === 'PUBLIC'
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'border-input bg-background hover:border-primary/50'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Globe className="h-5 w-5 text-primary" />
                      <span className="rounded bg-primary px-1.5 py-0.2 text-[9px] font-bold text-white uppercase">
                        KHUYÊN DÙNG
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Công khai</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ai cũng có thể tìm thấy và tự do ghi danh học tập.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Riêng tư */}
                <div
                  onClick={() => setValue('accessMode', 'PRIVATE', { shouldDirty: true })}
                  className={`cursor-pointer rounded-xl border p-4 flex flex-col justify-between transition-all ${
                    currentAccessMode === 'PRIVATE'
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'border-input bg-background hover:border-primary/50'
                  }`}
                >
                  <div className="space-y-2">
                    <Lock className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-sm font-bold text-foreground">Riêng tư</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Chỉ người có mã mời hoặc được xét duyệt mới xem được.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Chỉ mình tôi */}
                <div
                  onClick={() => setValue('accessMode', 'ONLY_ME', { shouldDirty: true })}
                  className={`cursor-pointer rounded-xl border p-4 flex flex-col justify-between transition-all ${
                    currentAccessMode === 'ONLY_ME'
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'border-input bg-background hover:border-primary/50'
                  }`}
                >
                  <div className="space-y-2">
                    <EyeOff className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-bold text-foreground">Chỉ mình tôi</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Lưu trữ cá nhân để biên soạn, ẩn toàn bộ khỏi thư viện.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions Buttons */}
            <div className="flex items-center justify-between border-t border-border pt-6">
              <div>
                {isEditMode && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    disabled={isSubmitting || deleteMutation.isPending}
                    className="border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
                  >
                    Xóa khóa học
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/manage/courses')}
                  disabled={isSubmitting}
                  className="border-border text-foreground hover:bg-muted"
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/90 text-white font-semibold px-6 shadow-sm"
                >
                  {isSubmitting
                    ? 'Đang xử lý...'
                    : isEditMode
                    ? 'Lưu thay đổi'
                    : 'Tạo khóa học'}
                </Button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Cover Upload & Live Preview Card (~35% = 4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Card 1: Ảnh bìa khóa học */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-foreground">Ảnh bìa khóa học</h3>
                <span className="rounded bg-muted border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  Chuẩn 16:10
                </span>
              </div>

              {/* Cover Preview / Dropzone */}
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-muted/40 border border-border">
                <img
                  src={coverPreview || defaultCourseCover}
                  alt="Ảnh bìa"
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Upload CTA */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleCoverFileChange}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingCover || isSubmitting}
                className="w-full border-border text-foreground hover:bg-muted text-xs h-9"
              >
                <UploadCloud className="h-4 w-4 mr-2" />
                <span>{isUploadingCover ? 'Đang tải lên...' : coverPreview ? 'Đổi ảnh' : 'Tải ảnh lên'}</span>
              </Button>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Định dạng JPG, PNG hoặc WebP dung lượng tối đa 5 MB. Ảnh sắc nét giúp tăng 40% tỷ lệ
                ghi danh học tập.
              </p>
            </div>

            {/* Card 2: Xem trước hiển thị (Live Student Card Preview) */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
              <h3 className="font-serif text-base font-bold text-foreground">Xem trước hiển thị</h3>

              {/* Live Preview Card matching Figma 27:6870 */}
              <div className="overflow-hidden rounded-xl border border-border bg-background shadow-md">
                <div className="relative aspect-[16/10] w-full overflow-hidden">
                  <img
                    src={coverPreview || defaultCourseCover}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                  <div className="absolute left-2.5 top-2.5 flex gap-1.5">
                    <span className="rounded bg-primary px-2 py-0.5 text-[10px] font-bold text-white">
                      Hôm nay
                    </span>
                    <span className="backdrop-blur-md rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white flex items-center gap-1">
                      {currentAccessMode === 'PUBLIC' ? (
                        <Globe className="h-2.5 w-2.5" />
                      ) : currentAccessMode === 'PRIVATE' ? (
                        <Lock className="h-2.5 w-2.5" />
                      ) : (
                        <EyeOff className="h-2.5 w-2.5" />
                      )}
                      {currentAccessMode === 'PUBLIC'
                        ? 'Public'
                        : currentAccessMode === 'PRIVATE'
                        ? 'Private'
                        : 'Only Me'}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                    {currentTags[0] || 'Lập trình'}
                  </span>
                  <h4 className="font-serif text-base font-bold text-foreground line-clamp-2 leading-snug">
                    {currentName || 'Tên khóa học của bạn'}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    0 học viên · 0 chương · Chưa có đánh giá
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Bản xem trước trực tiếp tương tự giao diện người học khám phá trên Thư viện.
              </p>
            </div>
          </div>
        </div>
      </form>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa khóa học?</DialogTitle>
            <DialogDescription>
              Hành động này không thể hoàn tác. Toàn bộ nội dung chương học, flashcard và bài tập của khóa học sẽ bị xóa vĩnh viễn.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteCourse}
              disabled={deleteMutation.isPending}
            >
              Xác nhận xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
