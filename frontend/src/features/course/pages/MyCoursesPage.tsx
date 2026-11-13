import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, GraduationCap, MailQuestion, Plus, CheckCircle2 } from 'lucide-react';
import {
  Button,
  EmptyState,
  ErrorState,
  Pagination,
  Skeleton,
  useToast,
} from '@/shared/ui';
import {
  useMyCoursesQuery,
  useMyInvitationsQuery,
  useAcceptInvitationMutation,
  type MyCoursesRelation,
  type CourseCard,
} from '../api/courseApi';
import { CourseCardItem } from '../components/CourseCardItem';

export function MyCoursesPage() {
  const { t } = useTranslation();
  const { pushToast } = useToast();

  const [activeTab, setActiveTab] = useState<'owned' | 'enrolled' | 'invitations'>('owned');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const currentRelation: MyCoursesRelation = activeTab === 'owned' ? 'OWNED' : 'ENROLLED_ACTIVE';

  const {
    data: coursesData,
    isLoading: isCoursesLoading,
    isError: isCoursesError,
    refetch: refetchCourses,
  } = useMyCoursesQuery({
    relation: currentRelation,
    page,
    pageSize,
  });

  const {
    data: invitationsData,
    isLoading: isInvitationsLoading,
    isError: isInvitationsError,
    refetch: refetchInvitations,
  } = useMyInvitationsQuery();

  const acceptInvitationMutation = useAcceptInvitationMutation();

  const handleAcceptInvitation = async (courseId?: string) => {
    if (!courseId) return;
    try {
      await acceptInvitationMutation.mutateAsync(courseId);
      pushToast({
        title: 'Chấp nhận thành công!',
        description: 'Bạn đã tham gia khóa học.',
        tone: 'success',
      });
      refetchInvitations();
    } catch (err: any) {
      pushToast({
        title: 'Không thể chấp nhận lời mời',
        description: err?.detail || err?.message || 'Có lỗi xảy ra.',
        tone: 'error',
      });
    }
  };

  const items = coursesData?.items || [];
  const total = coursesData?.meta?.totalCount ?? items.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const invitations = invitationsData || [];

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
      {/* Page Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Khóa học của tôi
          </h1>
          <p className="text-sm text-muted-foreground">
            Theo dõi tiến trình học tập cá nhân và quản lý các khóa học do bạn biên soạn.
          </p>
        </div>

        <Button asChild size="default" className="self-start sm:self-auto shadow-sm">
          <Link to="/courses/new">
            <Plus className="h-4 w-4 mr-1.5" />
            <span>Tạo khóa học mới</span>
          </Link>
        </Button>
      </div>

      {/* Tabs Row */}
      <div className="mb-8 border-b border-border">
        <div className="flex items-center gap-2 sm:gap-6 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('owned');
              setPage(1);
            }}
            className={`flex items-center gap-2 pb-3.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'owned'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Khóa học đã tạo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('enrolled');
              setPage(1);
            }}
            className={`flex items-center gap-2 pb-3.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'enrolled'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            <span>Đang tham gia</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('invitations');
              setPage(1);
            }}
            className={`flex items-center gap-2 pb-3.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'invitations'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <MailQuestion className="h-4 w-4" />
            <span>Lời mời tham gia</span>
            {invitations.length > 0 && (
              <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                {invitations.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content depending on active tab */}
      {activeTab === 'invitations' ? (
        <div>
          {isInvitationsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-48 rounded-2xl" />
              ))}
            </div>
          ) : isInvitationsError ? (
            <ErrorState
              title="Không thể tải danh sách lời mời"
              description="Đã xảy ra lỗi khi kiểm tra lời mời tham gia khóa học."
              actionLabel="Thử lại"
              onAction={() => refetchInvitations()}
            />
          ) : invitations.length === 0 ? (
            <EmptyState
              title="Không có lời mời nào"
              description="Khi giảng viên hoặc chủ khóa học gửi lời mời tham gia, các khóa học sẽ xuất hiện tại đây."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      Lời mời học tập
                    </span>
                    <h3 className="font-bold text-base text-foreground line-clamp-2">
                      {inv.name}
                    </h3>
                    {inv.owner && (
                      <p className="text-xs text-muted-foreground">
                        Từ giảng viên: <strong>{inv.owner.displayName || 'Tác giả'}</strong>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border/70">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link to={`/courses/${inv.id}`}>Xem chi tiết</Link>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAcceptInvitation(inv.id)}
                      disabled={acceptInvitationMutation.isPending}
                      className="flex-1"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      Chấp nhận
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {isCoursesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-2xl" />
              ))}
            </div>
          ) : isCoursesError ? (
            <ErrorState
              title="Không thể tải danh sách khóa học"
              description="Đã có lỗi xảy ra khi kết nối máy chủ. Vui lòng kiểm tra lại."
              actionLabel="Thử lại"
              onAction={() => refetchCourses()}
            />
          ) : items.length === 0 ? (
            <EmptyState
              title={
                activeTab === 'owned'
                  ? 'Bạn chưa tạo khóa học nào'
                  : 'Bạn chưa tham gia khóa học nào'
              }
              description={
                activeTab === 'owned'
                  ? 'Hãy bắt đầu chia sẻ kiến thức bằng cách tạo khóa học trực tuyến đầu tiên của bạn.'
                  : 'Khám phá hàng trăm khóa học hấp dẫn trên BrainMemo và bắt đầu hành trình học tập ngay hôm nay.'
              }
              actionLabel={
                activeTab === 'owned' ? 'Tạo khóa học ngay' : 'Khám phá danh mục khóa học'
              }
              actionTo={activeTab === 'owned' ? '/courses/new' : '/courses'}
            />
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {items.map((course) => (
                  <CourseCardItem
                    key={course.id}
                    course={course}
                    showProgress={activeTab === 'enrolled'}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  totalCount={total}
                  onPageChange={setPage}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
