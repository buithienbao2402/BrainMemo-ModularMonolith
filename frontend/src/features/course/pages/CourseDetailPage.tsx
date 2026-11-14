import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Star,
  Heart,
  BookOpen,
  Edit,
  Settings,
  CheckCircle2,
  Clock,
  ArrowRight,
  LogOut,
  MailQuestion,
  Layers,
  Flame,
  Bookmark,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  CornerDownRight,
  Sparkles,
  Check,
  Send,
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
import defaultCourseCover from '@/assets/courses';

interface ReviewItem {
  id: string;
  authorName: string;
  avatarText: string;
  roleText: string;
  rating: number;
  content: string;
  reply?: {
    authorName: string;
    roleBadge: string;
    timeText: string;
    content: string;
  };
}

const INITIAL_REVIEWS: ReviewItem[] = [
  {
    id: 'rev-1',
    authorName: 'Nguyễn Hoàng Nam',
    avatarText: 'NH',
    roleText: 'Học viên chính quy • 2 ngày trước',
    rating: 5,
    content:
      'Mình từng học nhiều khóa Python trên mạng nhưng cách thiết kế bài giảng ở đây thực sự quá đỉnh, giải thích cặn kẽ từ bản chất cơ chế bộ nhớ đến cách viết code Pythonic. Rất khuyến khích các bạn mới bắt đầu học theo lộ trình này!',
    reply: {
      authorName: 'Thầy Code Dạo',
      roleBadge: 'Giảng viên',
      timeText: '1 ngày trước',
      content:
        'Cảm ơn bạn Nam nhé! Chúc bạn giữ vững ngọn lửa đam mê và ứng dụng tốt kiến thức Python vào các dự án thực tế sắp tới!',
    },
  },
  {
    id: 'rev-2',
    authorName: 'Lê Thu Trang',
    avatarText: 'LT',
    roleText: 'Sinh viên ĐH Bách Khoa • 1 tuần trước',
    rating: 5,
    content:
      'Khóa học rất hay và bám sát thực tế, phần Exception Handling và Context Manager (\'with\' statement) thầy giảng cực chi tiết. Video sắc nét không có quảng cáo, hệ thống flashcard thông minh giúp ghi nhớ cực nhanh.',
  },
  {
    id: 'rev-3',
    authorName: 'Đặng Minh Quân',
    avatarText: 'ĐQ',
    roleText: 'Lập trình viên Golang • 2 tuần trước',
    rating: 5,
    content:
      'Khóa học rất chuẩn chỉ! Điểm mình thích nhất là phần thực hành với pytest và async/await. Rất mong thầy ra thêm khóa Python nâng cao chuyên sâu về Microservices và Data Engineering.',
  },
];

function getStarLabel(rating: number): string {
  const labels: Record<number, string> = {
    5: '5 sao - Tuyệt vời',
    4.5: '4,5 sao - Rất hài lòng',
    4: '4 sao - Rất tốt',
    3.5: '3,5 sao - Khá tốt',
    3: '3 sao - Bình thường',
    2.5: '2,5 sao - Tạm ổn',
    2: '2 sao - Tạm được',
    1.5: '1,5 sao - Chưa hài lòng',
    1: '1 sao - Cần cải thiện',
    0.5: '0,5 sao - Rất thất vọng',
  };
  return labels[rating] || `${rating.toString().replace('.', ',')} sao`;
}

function RatingStarsDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5 text-amber-500">
      {[1, 2, 3, 4, 5].map((s) => {
        let fillWidth = '0%';
        if (rating >= s) {
          fillWidth = '100%';
        } else if (rating >= s - 0.5) {
          fillWidth = '50%';
        }

        return (
          <div key={s} className="relative inline-flex items-center justify-center w-3.5 h-3.5">
            {/* Background empty star */}
            <Star className="h-3.5 w-3.5 text-muted-foreground/30 pointer-events-none" />

            {/* Foreground filled amber star, clipped cleanly */}
            {fillWidth !== '0%' && (
              <div
                className="absolute top-0 left-0 h-3.5 overflow-hidden pointer-events-none"
                style={{ width: fillWidth === '100%' ? '14px' : '7px' }}
              >
                <Star className="h-3.5 w-3.5 min-w-[14px] max-w-none fill-current pointer-events-none shrink-0" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface StarRatingInputProps {
  value: number;
  onChange: (val: number) => void;
  hoverValue: number;
  onHoverChange: (val: number) => void;
}

function StarRatingInput({
  value,
  onChange,
  hoverValue,
  onHoverChange,
}: StarRatingInputProps) {
  const currentRating = hoverValue > 0 ? hoverValue : value;

  const handleMouseMove = (starIndex: number, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - rect.left < rect.width / 2;
    onHoverChange(isLeftHalf ? starIndex - 0.5 : starIndex);
  };

  const handleClick = (starIndex: number, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const isLeftHalf = e.clientX - rect.left < rect.width / 2;
    onChange(isLeftHalf ? starIndex - 0.5 : starIndex);
  };

  return (
    <div
      className="flex items-center gap-2.5"
      onMouseLeave={() => onHoverChange(0)}
    >
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((starIndex) => {
          let fillWidth = '0%';
          if (currentRating >= starIndex) {
            fillWidth = '100%';
          } else if (currentRating >= starIndex - 0.5) {
            fillWidth = '50%';
          }

          return (
            <button
              key={starIndex}
              type="button"
              onClick={(e) => handleClick(starIndex, e)}
              onMouseMove={(e) => handleMouseMove(starIndex, e)}
              className="relative w-6 h-6 p-0 flex items-center justify-center focus:outline-none cursor-pointer select-none"
              aria-label={`${starIndex} sao`}
            >
              {/* Background empty star - static, fixed position, zero motion */}
              <Star className="w-5 h-5 text-muted-foreground/30 pointer-events-none" />

              {/* Foreground filled amber star, clipped cleanly without scaling or shifting */}
              <div
                className="absolute top-0.5 left-0.5 h-5 overflow-hidden pointer-events-none"
                style={{ width: fillWidth === '100%' ? '20px' : fillWidth === '50%' ? '10px' : '0px' }}
              >
                <Star className="w-5 h-5 min-w-[20px] max-w-none text-amber-500 fill-amber-500 shrink-0" />
              </div>
            </button>
          );
        })}
      </div>
      <span className="text-xs font-semibold text-amber-500 min-w-[130px]">
        {getStarLabel(currentRating)}
      </span>
    </div>
  );
}

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user: currentUser, profile } = useAuth();
  const { pushToast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'chapters' | 'comments' | 'reviews'>('overview');
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Reviews submission state
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewHover, setReviewHover] = useState<number>(0);
  const [reviewContent, setReviewContent] = useState<string>('');
  const [reviewsList, setReviewsList] = useState<ReviewItem[]>(INITIAL_REVIEWS);

  // Comment submission state
  const [commentContent, setCommentContent] = useState<string>('');
  const [commentsList, setCommentsList] = useState<Array<{ id: string; authorName: string; avatarText: string; timeText: string; content: string }>>([
    {
      id: 'cmt-1',
      authorName: 'Trần Mạnh Dũng',
      avatarText: 'TM',
      timeText: '3 giờ trước',
      content: 'Cho mình hỏi là sau khi hoàn thành khóa này có đủ kiến thức để apply thực tập Backend Python không ạ?',
    },
  ]);

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

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      navigate(`/login?next=/courses/${courseId}`);
      return;
    }
    if (!reviewContent.trim()) {
      pushToast({
        title: 'Vui lòng nhập nội dung đánh giá',
        tone: 'warning',
      });
      return;
    }

    const newRev: ReviewItem = {
      id: `rev-${Date.now()}`,
      authorName: profile?.displayName || (currentUser as any)?.name || 'Tôi (Bạn)',
      avatarText: profile?.displayName?.slice(0, 2).toUpperCase() || 'ME',
      roleText: 'Học viên • Vừa xong',
      rating: reviewRating,
      content: reviewContent.trim(),
    };

    setReviewsList([newRev, ...reviewsList]);
    setReviewContent('');
    pushToast({
      title: 'Gửi đánh giá thành công!',
      description: 'Cảm ơn bạn đã để lại nhận xét quý giá cho khóa học.',
      tone: 'success',
    });
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      navigate(`/login?next=/courses/${courseId}`);
      return;
    }
    if (!commentContent.trim()) {
      pushToast({
        title: 'Vui lòng nhập nội dung bình luận',
        tone: 'warning',
      });
      return;
    }

    setCommentsList([
      {
        id: `cmt-${Date.now()}`,
        authorName: profile?.displayName || (currentUser as any)?.name || 'Tôi (Bạn)',
        avatarText: profile?.displayName?.slice(0, 2).toUpperCase() || 'ME',
        timeText: 'Vừa xong',
        content: commentContent.trim(),
      },
      ...commentsList,
    ]);
    setCommentContent('');
    pushToast({
      title: 'Đã gửi bình luận',
      description: 'Bình luận của bạn đã được đăng thành công.',
      tone: 'success',
    });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-6 space-y-8">
        <Skeleton className="h-96 w-full rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-96 rounded-xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="mx-auto max-w-[1240px] px-4 py-12 sm:px-6">
        <ErrorState
          title="Không tìm thấy khóa học"
          error={error}
          onRetry={() => refetch()}
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

  // Display metadata matching Figma screenshot
  const courseTitle = course.name || 'Nhập môn Python - Từ Zero tới Hero';
  const authorName = course.owner?.displayName || 'Thầy Code Dạo';
  const learnerCountText = (course.ratingCount ? course.ratingCount * 445 : 12460).toLocaleString('vi-VN');
  const chapterCount = 34;
  const ratingAvgText = (course.ratingAvg || 4.8).toFixed(1).replace('.', ',');
  const reviewCount = 320;
  const nominationCount = viewer.hasNominated ? 561 : 560;



  return (
    <div className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 space-y-8 text-foreground selection:bg-primary/20 pb-20">
      {/* 1. Top Hero Card (2-column layout in elevated dark container, NO Video Preview button, NO breadcrumb) */}
      <section
        aria-label="Thông tin giới thiệu khóa học"
        className="rounded-2xl border border-border/60 bg-card p-6 lg:p-8 shadow-sm dark:bg-[#13141f] dark:border-[#26283b]"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: 16:9 Thumbnail without video preview button */}
          <div className="lg:col-span-5">
            <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-border/50 bg-black/40 shadow-inner group">
              <img
                src={course.coverUrl || defaultCourseCover}
                alt={courseTitle}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />

              {/* Top-left: "Chi tiết khóa học" badge */}
              <div className="absolute top-3.5 left-3.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-white text-[11px] font-semibold shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Chi tiết khóa học</span>
              </div>

              {/* Bottom-right: Watermark */}
              <div className="absolute bottom-3.5 right-3.5 text-[10px] font-mono tracking-wider text-white/60 select-none">
                BrainMemo LMS
              </div>
            </div>
          </div>

          {/* Right Column: Title, Author, Badges, Metrics & CTA */}
          <div className="lg:col-span-7 space-y-4">
            {/* Title */}
            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight">
              {courseTitle}
            </h1>

            {/* Author Row */}
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full overflow-hidden border border-border/80 bg-muted flex items-center justify-center font-bold text-xs text-primary">
                {course.owner?.avatarUrl ? (
                  <img
                    src={course.owner.avatarUrl}
                    alt={authorName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  'TC'
                )}
              </div>
              <span className="text-sm font-semibold text-foreground">{authorName}</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/20" aria-label="Đã xác minh" />
            </div>

            {/* Status & Category Badges Row */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {/* Status Badge: Đang cập nhật */}
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-orange-500/15 text-orange-500 border border-orange-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                <span>Đang cập nhật</span>
              </span>

              {/* Access Mode Badge: Public */}
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Công khai</span>
                <span className="text-[10px] opacity-75 font-normal">(Public)</span>
              </span>

              {/* Tags */}
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border border-border/70 text-muted-foreground bg-secondary/30">
                # Python
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border border-border/70 text-muted-foreground bg-secondary/30">
                # Lập trình cơ bản
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border border-border/70 text-muted-foreground bg-secondary/30 hidden sm:inline-block">
                # AI/Data
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border border-border/70 text-muted-foreground bg-secondary/30 hidden md:inline-block">
                # Backend
              </span>
            </div>

            {/* Key Metrics Strip (4 columns: Học viên, Chương học, Đánh giá, Đề cử) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2 border-y border-border/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-secondary/60 text-muted-foreground">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-base font-bold text-foreground leading-none">{learnerCountText}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Học viên</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-secondary/60 text-muted-foreground">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-base font-bold text-foreground leading-none">{chapterCount}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Chương học</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                  <Star className="h-4 w-4 fill-current" />
                </div>
                <div>
                  <p className="text-base font-bold text-foreground leading-none">
                    {ratingAvgText} <span className="text-xs font-normal text-muted-foreground">({reviewCount})</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">Đánh giá</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                  <Flame className="h-4 w-4 fill-current" />
                </div>
                <div>
                  <p className="text-base font-bold text-foreground leading-none">{nominationCount}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Đề cử</p>
                </div>
              </div>
            </div>

            {/* Last Updated line */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Cập nhật lần cuối: 15/05/2026 • Ngôn ngữ: Tiếng Việt</span>
            </div>

            {/* CTA Buttons Row */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {isOwner ? (
                <div className="w-full space-y-3">
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/25 text-xs text-primary font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Bạn là chủ biên soạn khóa học này.</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button asChild size="pill" className="bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold">
                      <Link to={`/courses/${courseId}/edit`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Chỉnh sửa khóa học
                      </Link>
                    </Button>
                    <Button asChild size="pill" variant="outline">
                      <Link to={`/courses/${courseId}/manage`}>
                        <Settings className="h-4 w-4 mr-2" />
                        Bảng quản lý khóa học
                      </Link>
                    </Button>
                    <Button asChild size="pill" variant="ghost">
                      <Link to={`/courses/${courseId}/learn`}>
                        <BookOpen className="h-4 w-4 mr-2" />
                        Vào học ngay
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : isEnrolledActive ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Button asChild size="pill" className="bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold px-8">
                    <Link to={`/courses/${courseId}/learn`}>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Tiếp tục học ngay
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="pill"
                    onClick={() => setIsLeaveDialogOpen(true)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-1.5" />
                    Rời khóa học
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="pill"
                    onClick={handleToggleNominate}
                    className={viewer.hasNominated ? 'text-orange-500 border-orange-500/40 bg-orange-500/10' : ''}
                  >
                    <Heart className={`h-4 w-4 mr-1.5 ${viewer.hasNominated ? 'fill-current' : ''}`} />
                    <span>Đề cử ({nominationCount})</span>
                  </Button>
                </div>
              ) : isInvited ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    size="pill"
                    onClick={handleAcceptInvitation}
                    disabled={acceptInvitationMutation.isPending}
                    className="bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold px-8 py-2.5 shadow-md text-sm flex items-center gap-2"
                  >
                    <MailQuestion className="h-4 w-4" />
                    <span>{acceptInvitationMutation.isPending ? 'Đang chấp nhận...' : 'Chấp nhận lời mời'}</span>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    size="pill"
                    onClick={handleEnroll}
                    disabled={enrollMutation.isPending || isPendingApproval}
                    className="bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold px-8 py-2.5 shadow-md text-sm flex items-center gap-2"
                  >
                    <ArrowRight className="h-4 w-4" />
                    <span>{isPendingApproval ? 'Đang chờ phê duyệt' : 'Tham gia khóa học'}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="pill"
                    onClick={handleToggleNominate}
                    disabled={nominateMutation.isPending || withdrawNominationMutation.isPending}
                    className={`border-border/70 text-foreground text-sm font-medium ${
                      viewer.hasNominated ? 'text-orange-500 border-orange-500/40 bg-orange-500/10' : ''
                    }`}
                  >
                    <Heart className={`h-4 w-4 mr-1.5 ${viewer.hasNominated ? 'fill-current text-orange-500' : ''}`} />
                    <span>Đề cử ({nominationCount})</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setIsBookmarked(!isBookmarked);
                      pushToast({
                        title: !isBookmarked ? 'Đã lưu khóa học' : 'Đã bỏ lưu khóa học',
                        tone: 'default',
                      });
                    }}
                    className={`rounded-full border-border/70 ${isBookmarked ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
                    title="Lưu khóa học"
                    aria-label="Lưu khóa học"
                  >
                    <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Horizontal Navigation Tabs Bar */}
      <section aria-label="Điều hướng tab nội dung" className="border-b border-border/60">
        <div className="flex items-center gap-8 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`pb-3.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'overview'
                ? 'border-[#f97316] text-[#f97316]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Giới thiệu</span>
            <span className="sr-only">Tổng quan khóa học</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chapters')}
            className={`pb-3.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'chapters'
                ? 'border-[#f97316] text-[#f97316]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Danh sách chương</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/80 text-muted-foreground font-mono">
              34
            </span>
            <span className="sr-only">Mục lục chương bài học</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comments')}
            className={`pb-3.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'comments'
                ? 'border-[#f97316] text-[#f97316]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Bình luận</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/80 text-muted-foreground font-mono">
              128
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`pb-3.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'reviews'
                ? 'border-[#f97316] text-[#f97316]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Star className="h-4 w-4" />
            <span>Đánh giá</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/80 text-muted-foreground font-mono">
              320
            </span>
          </button>
        </div>
      </section>

      {/* 3. Tab 1 Content: Giới thiệu */}
      {activeTab === 'overview' && (
        <div className="space-y-12">
          {/* Section: Về khóa học này */}
          <section aria-labelledby="about-course-heading" className="space-y-6">
            <h2 id="about-course-heading" className="font-serif text-xl sm:text-2xl font-bold text-foreground">
              Về khóa học này
            </h2>

            <div className="space-y-4 text-sm sm:text-base leading-relaxed text-muted-foreground">
              <p>
                Lập trình không phải là việc nhớ một đống lý thuyết cú pháp khô cứng. <strong className="font-semibold text-foreground">Nhập môn Python: Từ Zero tới Hero</strong> được thiết kế theo tư duy kiến trúc sư phần mềm, kết hợp triết lý code sạch chuẩn PEP-8 với phương pháp tự động phân rã bài toán phức tạp thành các đơn nguyên logic sắc bén.
              </p>
              <p>
                Dù bạn là người chuyển ngành, sinh viên chuyên ngành khoa học máy tính đang tìm kiếm định hướng thực chiến, hay kỹ sư đang tìm kiếm một ngôn ngữ thứ hai cho các chuẩn ecosystem Machine Learning và AI: mọi bài giải thích trong khóa học đều đi kèm demo trực quan và case study giải thích.
              </p>

              {isDescriptionExpanded && (
                <div className="space-y-3 pt-2 text-muted-foreground border-t border-border/40">
                  <h3 className="font-semibold text-foreground text-sm">Bạn sẽ học được gì sau khóa học này:</h3>
                  <ul className="list-disc pl-5 space-y-1.5 text-sm">
                    <li>Làm chủ tư duy lập trình hàm và hướng đối tượng (OOP) nâng cao trong Python 3.12+.</li>
                    <li>Sử dụng thành thạo Type Hinting, Decorator, Generator, Context Manager và Async/Await.</li>
                    <li>Hiểu sâu cơ chế quản lý bộ nhớ, Garbage Collection và Global Interpreter Lock (GIL).</li>
                    <li>Tự tin xây dựng RESTful API và Microservice hoàn chỉnh với FastAPI, SQLAlchemy và Pydantic.</li>
                  </ul>
                </div>
              )}
            </div>

            {/* SRS Exclusive Callout Box */}
            <div className="rounded-2xl border border-orange-500/25 bg-gradient-to-br from-orange-500/10 via-card to-card dark:from-[#201511] dark:via-[#161724] dark:to-[#12131c] p-6 lg:p-7 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {/* Left Description */}
                <div className="md:col-span-7 space-y-3">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#f97316]">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>HOT / ĐỘC QUYỀN TẠI BRAINMEMO</span>
                  </div>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-foreground">
                    Mô hình học tập SRS độc quyền của BrainMemo
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Với cơ chế Spaced Repetition (SRS) được tích hợp trực tiếp vào từng bài giảng, BrainMemo giúp bạn ôn tập tự động ngay trước thời điểm não bộ chuẩn bị quên kiến thức vừa học. Tiết kiệm 40% thời gian so với cách học truyền thống.
                  </p>

                  <div className="pt-2 space-y-2 text-xs sm:text-sm font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                      <span>Tự động nhắc lại thông minh</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                      <span>Lộ trình cá nhân hóa dựa trên hiệu suất</span>
                    </div>
                  </div>
                </div>

                {/* Right Interactive Chart Visual */}
                <div className="md:col-span-5 flex flex-col items-center justify-center">
                  <div className="w-full rounded-xl border border-border/50 bg-black/40 p-4 text-center">
                    <svg viewBox="0 0 320 120" className="w-full h-24 stroke-current">
                      <line x1="10" y1="100" x2="310" y2="100" stroke="#333" strokeDasharray="3 3" strokeWidth="1" />
                      <line x1="10" y1="60" x2="310" y2="60" stroke="#333" strokeDasharray="3 3" strokeWidth="1" />
                      <line x1="10" y1="20" x2="310" y2="20" stroke="#333" strokeDasharray="3 3" strokeWidth="1" />

                      <path
                        d="M 20 25 Q 50 85 90 85 Q 92 30 140 70 Q 142 30 200 55 Q 202 25 290 35"
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="2.5"
                      />

                      <circle cx="20" cy="25" r="4.5" fill="#10b981" />
                      <circle cx="91" cy="40" r="4.5" fill="#f59e0b" />
                      <circle cx="141" cy="35" r="4.5" fill="#06b6d4" />
                      <circle cx="201" cy="28" r="4.5" fill="#f97316" />
                      <circle cx="290" cy="35" r="5" fill="#10b981" />
                    </svg>

                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Biểu đồ giữ lại kiến thức <strong className="text-foreground">85% sau 30 ngày</strong> (với thuật toán SRS)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Toggle Expand Button */}
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                size="pill"
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <span>{isDescriptionExpanded ? 'Thu gọn nội dung chi tiết' : 'Xem toàn bộ nội dung chi tiết'}</span>
                {isDescriptionExpanded ? <ChevronUp className="h-3.5 w-3.5 ml-1.5" /> : <ChevronDown className="h-3.5 w-3.5 ml-1.5" />}
              </Button>
            </div>
          </section>

          {/* Section: Chương mới nhất */}
          <section aria-labelledby="latest-chapters-heading" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-5 rounded-full bg-[#f97316]" />
                <h2 id="latest-chapters-heading" className="font-serif text-lg sm:text-xl font-bold text-foreground">
                  Chương mới nhất
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('chapters')}
                className="text-xs font-semibold text-[#f97316] hover:underline flex items-center gap-1"
              >
                <span>Xem tất cả 34 chương</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Chapter 34 */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card hover:bg-secondary/40 transition-colors shadow-sm dark:bg-[#151622]">
                <div className="flex items-center gap-4">
                  <span className="px-2.5 py-1 rounded-lg bg-secondary text-xs font-bold text-muted-foreground font-mono shrink-0">
                    Chương 34
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Đề kháng cao & Kỹ thuật tối ưu hiệu năng: Vòng lặp vs List Comprehension
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      4 bài học • 18 bài tập • 1 bài kiểm tra • Đăng ngày 12/05/2026
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>

              {/* Chapter 33 */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card hover:bg-secondary/40 transition-colors shadow-sm dark:bg-[#151622]">
                <div className="flex items-center gap-4">
                  <span className="px-2.5 py-1 rounded-lg bg-secondary text-xs font-bold text-muted-foreground font-mono shrink-0">
                    Chương 33
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Kiến trúc Microservices với FastAPI & gRPC: Xây dựng Event-Driven System
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-medium text-[10px]">
                        Có video
                      </span>
                      <span>• 10 bài học • 0/12 bài tập • Cập nhật 08/05/2026</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>

              {/* Chapter 32 */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card hover:bg-secondary/40 transition-colors shadow-sm dark:bg-[#151622]">
                <div className="flex items-center gap-4">
                  <span className="px-2.5 py-1 rounded-lg bg-secondary text-xs font-bold text-muted-foreground font-mono shrink-0">
                    Chương 32
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Xử lý dữ liệu lớn với Pandas, Polars & Tối ưu hóa Cache Memory
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-medium text-[10px]">
                        Có video
                      </span>
                      <span>• 14 bài học • Chưa bắt đầu • Đăng ngày 02/05/2026</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </div>
          </section>

          {/* Section: Khóa học cùng tác giả Thầy Code Dạo (NO left/right buttons) */}
          <section aria-labelledby="author-courses-heading" className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-5 rounded-full bg-[#f97316]" />
              <h2 id="author-courses-heading" className="font-serif text-lg sm:text-xl font-bold text-foreground">
                Khóa học cùng tác giả Thầy Code Dạo
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Course 1 */}
              <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm dark:bg-[#151622] hover:border-border transition-colors group">
                <div className="aspect-video w-full bg-muted relative overflow-hidden">
                  <img
                    src={defaultCourseCover}
                    alt="TypeScript & Thiết kế Design System"
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500 text-white">
                    Chuyên sâu
                  </span>
                </div>
                <div className="p-3.5 space-y-2">
                  <h3 className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                    TypeScript & Thiết kế Design System React Chuẩn Doanh Nghiệp
                  </h3>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> 8.120
                    </span>
                    <span className="flex items-center gap-1 text-amber-500 font-semibold">
                      <Star className="h-3 w-3 fill-current" /> 4,9
                    </span>
                  </div>
                </div>
              </div>

              {/* Course 2 */}
              <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm dark:bg-[#151622] hover:border-border transition-colors group">
                <div className="aspect-video w-full bg-muted relative overflow-hidden">
                  <img
                    src={defaultCourseCover}
                    alt="SQL Thực Chiến"
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500 text-white">
                    Đang cập nhật
                  </span>
                </div>
                <div className="p-3.5 space-y-2">
                  <h3 className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                    SQL Thực Chiến & Nghệ Thuật Đánh Index Tối Ưu Triệu Bản Ghi
                  </h3>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> 6.450
                    </span>
                    <span className="flex items-center gap-1 text-amber-500 font-semibold">
                      <Star className="h-3 w-3 fill-current" /> 4,8
                    </span>
                  </div>
                </div>
              </div>

              {/* Course 3 */}
              <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm dark:bg-[#151622] hover:border-border transition-colors group">
                <div className="aspect-video w-full bg-muted relative overflow-hidden">
                  <img
                    src={defaultCourseCover}
                    alt="Docker & Kubernetes"
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
                    Cơ bản
                  </span>
                </div>
                <div className="p-3.5 space-y-2">
                  <h3 className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                    Docker & Kubernetes Tinh Gọn Cho Lập Trình Viên Ứng Dụng
                  </h3>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> 5.710
                    </span>
                    <span className="flex items-center gap-1 text-amber-500 font-semibold">
                      <Star className="h-3 w-3 fill-current" /> 4,7
                    </span>
                  </div>
                </div>
              </div>

              {/* Course 4: Xem thêm */}
              <div className="rounded-xl border border-dashed border-border/80 bg-card/60 flex flex-col items-center justify-center p-6 text-center hover:bg-card transition-colors cursor-pointer group">
                <div className="h-10 w-10 rounded-full border border-border bg-secondary flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors mb-3">
                  <ArrowRight className="h-4 w-4" />
                </div>
                <p className="text-xs font-bold text-foreground">Xem thêm</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">4 khóa học khác cùng tác giả</p>
              </div>
            </div>
          </section>

          {/* Section: Đánh giá từ học viên (With rating input & submit form) */}
          <section aria-labelledby="student-reviews-heading" className="space-y-6">
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-5 rounded-full bg-[#f97316]" />
              <h2 id="student-reviews-heading" className="font-serif text-lg sm:text-xl font-bold text-foreground">
                Đánh giá từ học viên
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-mono">
                {reviewsList.length + 317} nhận xét
              </span>
            </div>

            {/* Rating Breakdown Card */}
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm dark:bg-[#151622]">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                {/* Left: Overall Score */}
                <div className="md:col-span-4 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-border/50 pb-6 md:pb-0">
                  <p className="text-5xl font-extrabold text-foreground tracking-tight">4,8</p>
                  <div className="flex items-center gap-1 text-amber-500 my-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">(Dựa trên 320 đánh giá thực tế)</p>
                </div>

                {/* Right: Star Distribution Bars */}
                <div className="md:col-span-8 space-y-2 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-10 text-muted-foreground text-right shrink-0">5 sao</span>
                    <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-[#f97316] rounded-full" style={{ width: '85%' }} />
                    </div>
                    <span className="w-8 text-muted-foreground text-right font-mono">85%</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-10 text-muted-foreground text-right shrink-0">4 sao</span>
                    <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-[#f97316] rounded-full" style={{ width: '10%' }} />
                    </div>
                    <span className="w-8 text-muted-foreground text-right font-mono">10%</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-10 text-muted-foreground text-right shrink-0">3 sao</span>
                    <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-[#f97316] rounded-full" style={{ width: '3%' }} />
                    </div>
                    <span className="w-8 text-muted-foreground text-right font-mono">3%</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-10 text-muted-foreground text-right shrink-0">2 sao</span>
                    <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-[#f97316] rounded-full" style={{ width: '1%' }} />
                    </div>
                    <span className="w-8 text-muted-foreground text-right font-mono">1%</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-10 text-muted-foreground text-right shrink-0">1 sao</span>
                    <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-[#f97316] rounded-full" style={{ width: '1%' }} />
                    </div>
                    <span className="w-8 text-muted-foreground text-right font-mono">1%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* FORM ĐÁNH GIÁ (Chọn sao, nội dung và nút gửi) */}
            <form
              onSubmit={handleSubmitReview}
              className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm dark:bg-[#151622] space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
                <span className="text-sm font-bold text-foreground">Gửi đánh giá của bạn:</span>
                {/* Interactive Star Picker */}
                <StarRatingInput
                  value={reviewRating}
                  onChange={setReviewRating}
                  hoverValue={reviewHover}
                  onHoverChange={setReviewHover}
                />
              </div>

              {/* Review Textarea */}
              <textarea
                rows={3}
                value={reviewContent}
                onChange={(e) => setReviewContent(e.target.value)}
                placeholder="Chia sẻ cảm nhận, chất lượng giảng dạy và trải nghiệm học tập của bạn về khóa học này..."
                className="w-full rounded-xl border border-border/70 bg-background p-3.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#f97316]/50 resize-none transition-all"
              />

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="pill"
                  className="bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold px-6 text-xs sm:text-sm shadow-md"
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  <span>Gửi đánh giá</span>
                </Button>
              </div>
            </form>

            {/* Reviews List */}
            <div className="space-y-4">
              {reviewsList.map((rev) => (
                <div
                  key={rev.id}
                  className="rounded-xl border border-border/50 bg-card p-5 space-y-3 dark:bg-[#151622]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center">
                        {rev.avatarText}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{rev.authorName}</p>
                        <p className="text-[11px] text-muted-foreground">{rev.roleText}</p>
                      </div>
                    </div>
                    <RatingStarsDisplay rating={rev.rating} />
                  </div>
                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                    {rev.content}
                  </p>

                  {/* Nested Author Reply */}
                  {rev.reply && (
                    <div className="rounded-lg bg-secondary/50 p-3.5 border border-border/40 ml-4 sm:ml-8 mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-bold text-foreground">{rev.reply.authorName}</span>
                        <span className="px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-500 text-[10px] font-semibold">
                          {rev.reply.roleBadge}
                        </span>
                        <span className="text-[10px] text-muted-foreground">• {rev.reply.timeText}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed pl-5">
                        {rev.reply.content}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* View more reviews button */}
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                size="pill"
                onClick={() => setActiveTab('reviews')}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground"
              >
                <span>Xem thêm 317 đánh giá khác</span>
              </Button>
            </div>
          </section>

          {/* Section: Khóa học tương tự có thể bạn quan tâm */}
          <section aria-labelledby="related-courses-heading" className="space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="w-1.5 h-5 rounded-full bg-[#f97316]" />
              <h2 id="related-courses-heading" className="font-serif text-lg sm:text-xl font-bold text-foreground">
                Khóa học tương tự có thể bạn quan tâm
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1 */}
              <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm dark:bg-[#151622] hover:border-border transition-colors group">
                <div className="aspect-video w-full bg-muted relative overflow-hidden">
                  <img
                    src={defaultCourseCover}
                    alt="Toán Rời Rạc & Lý Thuyết Đồ Thị"
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="p-3.5 space-y-2">
                  <h3 className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                    Toán Rời Rạc & Lý Thuyết Đồ Thị Dành Cho Lập Trình Viên
                  </h3>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> 4.120
                    </span>
                    <span className="flex items-center gap-1 text-amber-500 font-semibold">
                      <Star className="h-3 w-3 fill-current" /> 4,9
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2 */}
              <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm dark:bg-[#151622] hover:border-border transition-colors group">
                <div className="aspect-video w-full bg-muted relative overflow-hidden">
                  <img
                    src={defaultCourseCover}
                    alt="Cấu Trúc Dữ Liệu & Giải Thuật"
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="p-3.5 space-y-2">
                  <h3 className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                    Cấu Trúc Dữ Liệu & Giải Thuật: Chinh Phục LeetCode Cơ Bản
                  </h3>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> 9.350
                    </span>
                    <span className="flex items-center gap-1 text-amber-500 font-semibold">
                      <Star className="h-3 w-3 fill-current" /> 4,8
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3 */}
              <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm dark:bg-[#151622] hover:border-border transition-colors group">
                <div className="aspect-video w-full bg-muted relative overflow-hidden">
                  <img
                    src={defaultCourseCover}
                    alt="Thiết Kế Hệ Thống Phân Tán"
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="p-3.5 space-y-2">
                  <h3 className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                    Thiết Kế Hệ Thống Phân Tán (System Design Fundamentals)
                  </h3>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> 7.820
                    </span>
                    <span className="flex items-center gap-1 text-amber-500 font-semibold">
                      <Star className="h-3 w-3 fill-current" /> 4,9
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 4 */}
              <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm dark:bg-[#151622] hover:border-border transition-colors group">
                <div className="aspect-video w-full bg-muted relative overflow-hidden">
                  <img
                    src={defaultCourseCover}
                    alt="Deep Learning & Mạng Nơ-ron"
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="p-3.5 space-y-2">
                  <h3 className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">
                    Deep Learning & Xây Dựng Mạng Nơ-ron Từ Con Số 0
                  </h3>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" /> 4.190
                    </span>
                    <span className="flex items-center gap-1 text-amber-500 font-semibold">
                      <Star className="h-3 w-3 fill-current" /> 4,8
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* 4. Tab 2 Content: Danh sách chương (Syllabus - NO "Học thử miễn phí" or "Thành viên" badges) */}
      {activeTab === 'chapters' && (
        <section aria-labelledby="syllabus-heading" className="space-y-6">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div>
              <h2 id="syllabus-heading" className="font-serif text-xl font-bold text-foreground">
                Mục lục chương bài học
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Tổng cộng 34 chương • 142 bài giảng • 68 bài tập thực hành • 12 đề kiểm tra
              </p>
            </div>
            {viewer.canReadContent && (
              <Button asChild size="pill" className="bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold">
                <Link to={`/courses/${courseId}/learn`}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Mở trình phát học tập
                </Link>
              </Button>
            )}
          </div>

          <div className="space-y-3">
            {[
              {
                num: 1,
                title: 'Khởi động & Cài đặt môi trường Python 3.12 chuẩn Production',
                lessons: 4,
                duration: '45 phút',
              },
              {
                num: 2,
                title: 'Cơ chế biến số, Quản lý vùng nhớ Heap/Stack & Reference Counting',
                lessons: 6,
                duration: '1 giờ 15 phút',
              },
              {
                num: 3,
                title: 'Cấu trúc dữ liệu nguyên bản: List, Tuple, Dict, Set & Hiệu năng O(1)',
                lessons: 8,
                duration: '2 giờ',
              },
              {
                num: 4,
                title: 'Tư duy Hướng đối tượng (OOP): Dunder Methods, Metaclass & Inheritance',
                lessons: 7,
                duration: '1 giờ 50 phút',
              },
              {
                num: 5,
                title: 'Lập trình bất đồng bộ (Asynchronous Programming) với Asyncio & Event Loop',
                lessons: 9,
                duration: '2 giờ 30 phút',
              },
            ].map((c) => (
              <div
                key={c.num}
                className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card hover:bg-secondary/40 transition-colors shadow-sm dark:bg-[#151622]"
              >
                <div className="flex items-center gap-4">
                  <span className="px-2.5 py-1 rounded-lg bg-secondary text-xs font-bold text-muted-foreground font-mono shrink-0">
                    Chương {c.num < 10 ? `0${c.num}` : c.num}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{c.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.lessons} bài học • Thời lượng: {c.duration}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Tab 3 Content: Bình luận (NO "Thảo luận & Hỏi đáp cộng đồng", "Viết bình luận") */}
      {activeTab === 'comments' && (
        <section aria-label="Bình luận khóa học" className="space-y-6">
          {/* New comment input box */}
          <form
            onSubmit={handleSubmitComment}
            className="rounded-xl border border-border/60 bg-card p-5 space-y-3 dark:bg-[#151622] shadow-sm"
          >
            <p className="text-sm font-bold text-foreground">Viết bình luận</p>
            <textarea
              rows={3}
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="Chia sẻ ý kiến hoặc đóng góp thắc mắc của bạn..."
              className="w-full rounded-xl border border-border/70 bg-background p-3.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#f97316]/50 resize-none transition-all"
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                size="pill"
                className="bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold px-6 text-xs sm:text-sm shadow-md"
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                <span>Gửi bình luận</span>
              </Button>
            </div>
          </form>

          {/* Comments list */}
          <div className="space-y-3">
            {commentsList.map((cmt) => (
              <div
                key={cmt.id}
                className="rounded-xl border border-border/50 bg-card p-4 space-y-2 dark:bg-[#151622]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-primary/20 text-primary font-bold text-[10px] flex items-center justify-center">
                    {cmt.avatarText}
                  </div>
                  <span className="text-xs font-semibold text-foreground">{cmt.authorName}</span>
                  <span className="text-[10px] text-muted-foreground">• {cmt.timeText}</span>
                </div>
                <p className="text-xs sm:text-sm text-foreground/90 pl-9 leading-relaxed">
                  {cmt.content}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. Tab 4 Content: Đánh giá chi tiết (With interactive rating form) */}
      {activeTab === 'reviews' && (
        <section aria-labelledby="all-reviews-heading" className="space-y-6">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div>
              <h2 id="all-reviews-heading" className="font-serif text-xl font-bold text-foreground">
                Tất cả {reviewsList.length + 317} đánh giá
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Điểm trung bình 4,8 / 5.0 từ người học thực tế
              </p>
            </div>
          </div>

          {/* Form đánh giá trong Tab Đánh giá */}
          <form
            onSubmit={handleSubmitReview}
            className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-sm dark:bg-[#151622] space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
              <span className="text-sm font-bold text-foreground">Gửi đánh giá của bạn:</span>
              <StarRatingInput
                value={reviewRating}
                onChange={setReviewRating}
                hoverValue={reviewHover}
                onHoverChange={setReviewHover}
              />
            </div>

            <textarea
              rows={3}
              value={reviewContent}
              onChange={(e) => setReviewContent(e.target.value)}
              placeholder="Chia sẻ cảm nhận, chất lượng giảng dạy và trải nghiệm học tập của bạn về khóa học này..."
              className="w-full rounded-xl border border-border/70 bg-background p-3.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#f97316]/50 resize-none transition-all"
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                size="pill"
                className="bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold px-6 text-xs sm:text-sm shadow-md"
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                <span>Gửi đánh giá</span>
              </Button>
            </div>
          </form>

          {/* List of reviews */}
          <div className="space-y-4">
            {reviewsList.map((rev) => (
              <div
                key={rev.id}
                className="rounded-xl border border-border/50 bg-card p-5 space-y-3 dark:bg-[#151622]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center">
                      {rev.avatarText}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{rev.authorName}</p>
                      <p className="text-[11px] text-muted-foreground">{rev.roleText}</p>
                    </div>
                  </div>
                  <RatingStarsDisplay rating={rev.rating} />
                </div>
                <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                  {rev.content}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Confirmation Dialog for Leaving Course */}
      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận rời khỏi khóa học?</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn rời khỏi khóa học &ldquo;{courseTitle}&rdquo;? Tiến độ học tập cá nhân của bạn sẽ được bảo lưu, nhưng bạn sẽ không thể tiếp tục truy cập các nội dung giới hạn nếu đây là khóa học riêng tư.
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
