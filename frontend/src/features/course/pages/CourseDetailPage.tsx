import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Star,
  Heart,
  BookOpen,
  Edit,
  Settings,
  Share2,
  Calendar,
  Lock,
  Globe,
  EyeOff,
  CheckCircle2,
  Clock,
  ArrowRight,
  LogOut,
  MailQuestion,
} from 'lucide-react';
import { useAuth } from '@/shared/hooks';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  EmptyState,
  ErrorState,
  Skeleton,
  useToast,
} from '@/shared/ui';
import {
  useCourseQuery,
  useEnrollMutation,
  useLeaveCourseMutation,
  useAcceptInvitationMutation,
  useNominateCourseMutation,
  useWithdrawNominationMutation,
} from '../api/courseApi';
import { CourseAccessBadge, CourseStatusBadge } from '../components/CourseBadges';

export function CourseDetailPage() {
  const { t } = useTranslation();
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { pushToast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'chapters' | 'reviews'>('overview');
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);

  const {
    data: course,
    isLoading,
    isError,
    error,
    refetch,
  } = useCourseQuery(courseId || '');

  const enrollMutation = useEnrollMutation(courseId || '');
  const leaveMutation = useLeaveCourseMutation(courseId || '');
  const acceptInvitationMutation = useAcceptInvitationMutation();
  const nominateMutation = useNominateCourseMutation(courseId || '');
  const withdrawNominationMutation = useWithdrawNominationMutation(courseId || '');

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return (
      name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() || '')
        .join('') || 'U'
    );
  };

  const handleEnroll = async () => {
    if (!currentUser) {
      navigate(`/login?next=/courses/${courseId}`);
      return;
    }

    try {
      const res = await enrollMutation.mutateAsync();
      if (res.status === 'ACTIVE') {
        pushToast({
          title: 'Ghi danh thành công!',
          description: 'Chào mừng bạn đến với khóa học.',
          tone: 'success',
        });
      } else if (res.status === 'PENDING_APPROVAL') {
        pushToast({
          title: 'Đã gửi yêu cầu tham gia',
          description: 'Yêu cầu của bạn đang chờ giảng viên phê duyệt.',
          tone: 'default',
        });
      }
    } catch (err: any) {
      pushToast({
        title: 'Không thể ghi danh',
        description: err?.detail || err?.message || 'Có lỗi xảy ra khi ghi danh.',
        tone: 'error',
      });
    }
  };

  const handleLeaveCourse = async () => {
    try {
      await leaveMutation.mutateAsync();
      setIsLeaveDialogOpen(false);
      pushToast({
        title: 'Đã rời khóa học',
        description: 'Bạn đã hủy ghi danh khỏi khóa học này.',
        tone: 'default',
      });
    } catch (err: any) {
      pushToast({
        title: 'Không thể rời khóa học',
        description: err?.detail || err?.message || 'Có lỗi xảy ra khi thực hiện.',
        tone: 'error',
      });
    }
  };

  const handleAcceptInvitation = async () => {
    if (!courseId) return;
    try {
      await acceptInvitationMutation.mutateAsync(courseId);
      pushToast({
        title: 'Chấp nhận lời mời thành công!',
        description: 'Bạn đã chính thức trở thành học viên của khóa học.',
        tone: 'success',
      });
    } catch (err: any) {
      pushToast({
        title: 'Không thể chấp nhận lời mời',
        description: err?.detail || err?.message || 'Có lỗi xảy ra.',
        tone: 'error',
      });
    }
  };

  const handleToggleNominate = async () => {
    if (!currentUser) {
      navigate(`/login?next=/courses/${courseId}`);
      return;
    }

    try {
      if (course?.viewer?.hasNominated) {
        await withdrawNominationMutation.mutateAsync();
        pushToast({
          title: 'Đã rút đề cử',
          description: 'Bạn đã hủy đề cử khóa học này.',
          tone: 'default',
        });
      } else {
        await nominateMutation.mutateAsync();
        pushToast({
          title: 'Đã đề cử khóa học!',
          description: 'Cảm ơn bạn đã đề cử khóa học này lên bảng xếp hạng cộng đồng.',
          tone: 'success',
        });
      }
    } catch (err: any) {
      pushToast({
        title: 'Thao tác thất bại',
        description: err?.detail || err?.message || 'Không thể cập nhật đề cử.',
        tone: 'error',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 space-y-8">
        <Skeleton className="h-64 sm:h-80 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !course) {
    const is404 = (error as any)?.status === 404;
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6">
        <ErrorState
          title={is404 ? 'Không tìm thấy khóa học' : 'Lỗi tải khóa học'}
          description={
            is404
              ? 'Khóa học này không tồn tại, đã bị xóa hoặc đang ở chế độ Chỉ mình tôi / Tạm ẩn.'
              : 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra đường truyền mạng.'
          }
          actionLabel={is404 ? 'Khám phá khóa học khác' : 'Thử lại'}
          actionTo={is404 ? '/courses' : undefined}
          onAction={is404 ? undefined : () => refetch()}
        />
      </div>
    );
  }

  const viewer = course.viewer || {};
  const isOwner = viewer.isOwner || (currentUser && currentUser.id === course.owner?.id);
  const enrollmentStatus = viewer.enrollmentStatus;
  const isEnrolledActive = enrollmentStatus === 'ACTIVE';
  const isPendingApproval = enrollmentStatus === 'PENDING_APPROVAL';
  const isInvited = enrollmentStatus === 'INVITED';

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
      {/* Hero Header Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-border bg-card shadow-sm mb-8">
        <div className="relative aspect-[21/9] sm:aspect-[24/8] w-full bg-muted overflow-hidden">
          {course.coverUrl ? (
            <img
              src={course.coverUrl}
              alt={course.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-r from-brand-orange/20 via-primary/20 to-brand-orange/30 text-brand-orange font-bold text-3xl">
              BrainMemo LMS
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* Badges on cover */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            {course.accessMode && <CourseAccessBadge mode={course.accessMode} />}
            {isOwner && course.status && <CourseStatusBadge status={course.status} />}
          </div>

          {/* Nominate / Share quick actions */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToggleNominate}
              disabled={nominateMutation.isPending || withdrawNominationMutation.isPending}
              className={`rounded-full backdrop-blur-md border-white/20 transition-all ${
                viewer.hasNominated
                  ? 'bg-rose-500 text-white hover:bg-rose-600'
                  : 'bg-black/40 text-white hover:bg-black/60'
              }`}
            >
              <Heart
                className={`h-4 w-4 mr-1.5 ${
                  viewer.hasNominated ? 'fill-current text-white' : ''
                }`}
              />
              <span>{viewer.hasNominated ? 'Đã đề cử' : 'Đề cử'}</span>
            </Button>
          </div>

          {/* Title overlay in cover */}
          <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight line-clamp-2">
              {course.name}
            </h1>

            {course.tags && course.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {course.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details & Tabs */}
        <div className="lg:col-span-2 space-y-8">
          {/* Action Row for Mobile / Overview */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card shadow-sm">
            {/* Instructor Info */}
            {course.owner && (
              <Link
                to={`/users/${course.owner.id}`}
                className="flex items-center gap-3 group hover:opacity-90 transition-opacity"
              >
                <div className="h-11 w-11 rounded-full overflow-hidden bg-muted border border-border flex items-center justify-center font-bold text-brand-orange">
                  {course.owner.avatarUrl ? (
                    <img
                      src={course.owner.avatarUrl}
                      alt={course.owner.displayName || ''}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitials(course.owner.displayName)
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Giảng viên / Tác giả</p>
                  <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    {course.owner.displayName || 'Tác giả khóa học'}
                  </p>
                </div>
              </Link>
            )}

            {/* Quick Stats */}
            <div className="flex items-center gap-4 text-xs sm:text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-4 w-4 text-primary" />
                <strong className="text-foreground">{course.ratingCount ?? 0}</strong> học viên
              </span>

              {course.ratingAvg ? (
                <span className="flex items-center gap-1 font-semibold text-amber-500">
                  <Star className="h-4 w-4 fill-current" />
                  <span>{course.ratingAvg.toFixed(1)}</span>
                </span>
              ) : null}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-border">
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Tổng quan khóa học
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('chapters')}
                className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'chapters'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Mục lục chương bài học
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === 'reviews'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Đánh giá ({course.ratingCount ?? 0})
              </button>
            </div>
          </div>

          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-bold text-foreground">Giới thiệu khóa học</h2>
                {course.description ? (
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-line">
                    {course.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Khóa học chưa có phần giới thiệu chi tiết.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-bold text-foreground">Thông tin truy cập & Điều kiện</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="p-4 rounded-xl bg-muted/50 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Chế độ tham gia</p>
                    <p className="font-semibold text-foreground">
                      {course.accessMode === 'PUBLIC'
                        ? 'Công khai (Tự do tham gia ngay)'
                        : course.accessMode === 'PRIVATE'
                          ? 'Riêng tư (Cần giảng viên phê duyệt)'
                          : 'Chỉ mình tôi (Bảo mật tác giả)'}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/50 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Trạng thái phát hành</p>
                    <p className="font-semibold text-foreground">
                      {course.status === 'PUBLISHED'
                        ? 'Đã xuất bản (Sẵn sàng học tập)'
                        : course.status === 'DRAFT'
                          ? 'Bản nháp (Đang biên soạn)'
                          : 'Lưu trữ'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Chapters Outline */}
          {activeTab === 'chapters' && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">Mục lục chương học</h2>
                <span className="text-xs text-muted-foreground">
                  Nội dung đầy đủ sẽ hiển thị trong không gian học tập
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium text-sm text-foreground">Chương 1: Khởi động & Nền tảng</p>
                      <p className="text-xs text-muted-foreground">3 bài học · Lý thuyết & Thực hành</p>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 font-medium">
                    Học thử miễn phí
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm text-foreground">Chương 2: Kiến trúc chuyên sâu</p>
                      <p className="text-xs text-muted-foreground">5 bài học · Bài tập nộp</p>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-md bg-muted text-muted-foreground font-medium flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Thành viên
                  </span>
                </div>
              </div>

              {viewer.canReadContent && (
                <div className="pt-2">
                  <Button asChild className="w-full sm:w-auto">
                    <Link to={`/courses/${courseId}/learn`}>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Mở không gian học tập (Learning Player)
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Reviews */}
          {activeTab === 'reviews' && (
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-foreground">Đánh giá từ học viên</h2>
              {course.ratingCount && course.ratingCount > 0 ? (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  <Star className="h-8 w-8 fill-current" />
                  <div>
                    <p className="text-2xl font-bold">
                      {course.ratingAvg?.toFixed(1) || '0.0'} / 5.0
                    </p>
                    <p className="text-xs">Dựa trên {course.ratingCount} lượt đánh giá từ học viên</p>
                  </div>
                </div>
              ) : (
                <EmptyState
                  title="Chưa có đánh giá nào"
                  description="Hãy là người đầu tiên tham gia và để lại đánh giá sau khi hoàn thành các bài học nhé."
                />
              )}
            </div>
          )}
        </div>

        {/* Right Column: CTA & Management Card */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-md space-y-6 sticky top-20">
            <h3 className="font-bold text-lg text-foreground">Học tập & Quản lý</h3>

            {/* Dynamic Buttons depending on Viewer State */}
            {isOwner ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Bạn là chủ biên soạn khóa học này.</span>
                </div>

                <Button asChild className="w-full" size="lg">
                  <Link to={`/courses/${courseId}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Chỉnh sửa khóa học
                  </Link>
                </Button>

                <Button asChild variant="outline" className="w-full">
                  <Link to={`/courses/${courseId}/manage`}>
                    <Settings className="h-4 w-4 mr-2" />
                    Bảng quản lý khóa học
                  </Link>
                </Button>

                <Button asChild variant="ghost" className="w-full">
                  <Link to={`/courses/${courseId}/learn`}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Xem với tư cách người học
                  </Link>
                </Button>
              </div>
            ) : isEnrolledActive ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Bạn đã ghi danh vào khóa học này.</span>
                </div>

                <Button asChild className="w-full" size="lg">
                  <Link to={`/courses/${courseId}/learn`}>
                    <BookOpen className="h-4 w-4 mr-2" />
                    Tiếp tục học ngay
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsLeaveDialogOpen(true)}
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Rời khóa học
                </Button>
              </div>
            ) : isPendingApproval ? (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 font-medium space-y-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>Yêu cầu đang chờ phê duyệt</span>
                  </div>
                  <p>Giảng viên sẽ xem xét yêu cầu tham gia của bạn sớm nhất.</p>
                </div>

                <Button disabled className="w-full opacity-70">
                  Đang chờ phê duyệt
                </Button>
              </div>
            ) : isInvited ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary font-medium flex items-center gap-2">
                  <MailQuestion className="h-4 w-4 shrink-0" />
                  <span>Bạn có lời mời tham gia khóa học này.</span>
                </div>

                <Button
                  type="button"
                  onClick={handleAcceptInvitation}
                  disabled={acceptInvitationMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {acceptInvitationMutation.isPending ? 'Đang chấp nhận...' : 'Chấp nhận lời mời'}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {course.accessMode === 'PUBLIC'
                    ? 'Khóa học công khai, bạn có thể tham gia học ngay lập tức hoàn toàn miễn phí.'
                    : 'Khóa học riêng tư, bạn cần gửi yêu cầu để giảng viên phê duyệt tham gia.'}
                </p>

                <Button
                  type="button"
                  onClick={handleEnroll}
                  disabled={enrollMutation.isPending}
                  className="w-full font-bold uppercase tracking-wider"
                  size="lg"
                >
                  {enrollMutation.isPending
                    ? 'Đang gửi...'
                    : course.accessMode === 'PUBLIC'
                      ? 'Tham gia khóa học'
                      : 'Gửi yêu cầu tham gia'}
                </Button>
              </div>
            )}

            <div className="pt-4 border-t border-border text-xs text-muted-foreground space-y-2">
              <div className="flex justify-between">
                <span>Số chương bài học</span>
                <span className="font-medium text-foreground">Đang cập nhật</span>
              </div>
              <div className="flex justify-between">
                <span>Quyền truy cập</span>
                <span className="font-medium text-foreground">Trọn đời</span>
              </div>
              <div className="flex justify-between">
                <span>Đề cử cộng đồng</span>
                <span className="font-medium text-foreground">
                  {viewer.hasNominated ? 'Đã đề cử' : 'Chưa đề cử'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Leaving Course */}
      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận rời khỏi khóa học?</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn rời khỏi khóa học &ldquo;{course.name}&rdquo;? Tiến độ học tập cá nhân của bạn sẽ được bảo lưu, nhưng bạn sẽ không thể tiếp tục truy cập các nội dung giới hạn nếu đây là khóa học riêng tư.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsLeaveDialogOpen(false)}
              disabled={leaveMutation.isPending}
            >
              Hủy bỏ
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleLeaveCourse}
              disabled={leaveMutation.isPending}
            >
              {leaveMutation.isPending ? 'Đang rời...' : 'Xác nhận rời khóa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
