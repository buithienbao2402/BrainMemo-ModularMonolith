import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Calendar,
  BookOpen,
  Edit,
  Lock,
  GraduationCap,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/shared/hooks';
import {
  Button,
  EmptyState,
  ErrorState,
  Pagination,
  Skeleton,
} from '@/shared/ui';
import {
  usePublicProfileQuery,
  useProfileCoursesQuery,
  type ProfileCourseRelation,
} from '../api/profileApi';

export function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();

  const [relation, setRelation] = useState<ProfileCourseRelation>('OWNED');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const isOwnProfile = Boolean(currentUser && currentUser.id === userId);

  const {
    data: profile,
    isLoading: isProfileLoading,
    isError: isProfileError,
    error: profileError,
    refetch: refetchProfile,
  } = usePublicProfileQuery(userId || '');

  const {
    data: coursesData,
    isLoading: isCoursesLoading,
    isError: isCoursesError,
    error: coursesError,
    refetch: refetchCourses,
  } = useProfileCoursesQuery(userId || '', {
    relation,
    page,
    pageSize,
  });

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return (
      name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('') || 'U'
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('vi-VN', {
        month: 'long',
        year: 'numeric',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  // State 1: Profile Loading
  if (isProfileLoading) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // State 2: Profile Error
  if (isProfileError || !profile) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6">
        <ErrorState
          title="Không tìm thấy người dùng"
          error={profileError}
          onRetry={() => refetchProfile()}
        />
      </div>
    );
  }

  const items = coursesData?.items || [];
  const total = coursesData?.meta?.totalItems ?? items.length;
  const canViewCourses = profile.showCourseList || isOwnProfile;

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
      {/* Profile Header Card */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-6">
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center shrink-0 shadow-sm">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName || 'Avatar'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl sm:text-3xl font-bold text-brand-orange">
                  {getInitials(profile.displayName)}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">
                  {profile.displayName || 'Người dùng BrainMemo'}
                </h1>
                {isOwnProfile && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    Hồ sơ của bạn
                  </span>
                )}
              </div>

              {profile.bio && (
                <p className="text-sm text-muted-foreground max-w-2xl whitespace-pre-line">
                  {profile.bio}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                {profile.joinedAt && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                    Tham gia từ {formatDate(profile.joinedAt)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {isOwnProfile && (
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link to="/settings/profile">
                <Edit className="h-4 w-4 mr-1.5" />
                Chỉnh sửa hồ sơ
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Courses Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => {
                setRelation('OWNED');
                setPage(1);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                relation === 'OWNED'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Khóa học đã tạo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRelation('ENROLLED');
                setPage(1);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                relation === 'ENROLLED'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              <span>Đang tham gia</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRelation('COMPLETED');
                setPage(1);
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                relation === 'COMPLETED'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Đã hoàn thành</span>
            </button>
          </div>

          {canViewCourses && total > 0 && (
            <span className="text-xs text-muted-foreground shrink-0">
              Tổng số {total} khóa học
            </span>
          )}
        </div>

        {/* Visibility Check */}
        {!canViewCourses ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <Lock className="mx-auto h-10 w-10 text-muted-foreground/60 mb-3" />
            <h3 className="text-base font-semibold text-foreground">
              Danh sách khóa học ở chế độ riêng tư
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Người dùng này đã tắt hiển thị danh sách khóa học trên trang cá nhân công khai.
            </p>
          </div>
        ) : isCoursesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : isCoursesError ? (
          <ErrorState
            title="Không thể tải danh sách khóa học"
            error={coursesError}
            onRetry={() => refetchCourses()}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="Chưa có khóa học nào"
            description={
              relation === 'OWNED'
                ? isOwnProfile
                  ? 'Bạn chưa tạo khóa học nào trên BrainMemo.'
                  : 'Người dùng này chưa xuất bản khóa học nào.'
                : relation === 'ENROLLED'
                  ? isOwnProfile
                    ? 'Bạn chưa đăng ký tham gia khóa học nào.'
                    : 'Người dùng chưa tham gia khóa học nào.'
                  : isOwnProfile
                    ? 'Bạn chưa hoàn thành khóa học nào.'
                    : 'Người dùng chưa có khóa học hoàn thành.'
            }
            action={
              isOwnProfile && relation === 'OWNED' ? (
                <Link to="/courses/new">
                  <Button size="sm">Tạo khóa học đầu tiên</Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {items.map((course) => (
                <div
                  key={course.id}
                  className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow"
                >
                  <Link
                    to={`/courses/${course.id}`}
                    className="relative aspect-video w-full overflow-hidden bg-muted"
                  >
                    {course.coverUrl ? (
                      <img
                        src={course.coverUrl}
                        alt={course.name || 'Cover'}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-brand-orange/20 to-primary/20 text-brand-orange font-bold text-lg">
                        BrainMemo
                      </div>
                    )}
                    {course.accessMode && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-semibold uppercase rounded-md bg-black/60 text-white backdrop-blur-sm">
                        {course.accessMode}
                      </span>
                    )}
                  </Link>

                  <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                    <div className="space-y-1.5">
                      <h3 className="font-semibold text-foreground line-clamp-2 hover:text-primary transition-colors">
                        <Link to={`/courses/${course.id}`}>{course.name}</Link>
                      </h3>
                      {course.tags && course.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {course.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/60">
                      <span>{course.learnerCount ?? 0} học viên</span>
                      {course.ratingAvg ? (
                        <span className="font-medium text-amber-500">
                          ★ {course.ratingAvg.toFixed(1)}
                        </span>
                      ) : (
                        <span>Chưa có đánh giá</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {total > pageSize && (
              <Pagination
                page={page}
                pageSize={pageSize}
                totalItems={total}
                onPageChange={setPage}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
