import { Link } from 'react-router-dom';
import { Users, Star, BookOpen } from 'lucide-react';
import type { CourseCard } from '../api/courseApi';
import { CourseAccessBadge, CourseStatusBadge } from './CourseBadges';

interface CourseCardItemProps {
  course: CourseCard;
  showProgress?: boolean;
}

export function CourseCardItem({ course, showProgress = false }: CourseCardItemProps) {
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

  const hasProgress =
    showProgress &&
    course.progressPercent !== undefined &&
    course.progressPercent !== null;

  return (
    <div className="group flex flex-col rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg transition-all duration-300">
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
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-brand-orange/20 via-primary/10 to-brand-orange/30 text-brand-orange font-bold text-xl">
            BrainMemo
          </div>
        )}

        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
          {course.accessMode && <CourseAccessBadge mode={course.accessMode} />}
          {course.status && <CourseStatusBadge status={course.status} />}
        </div>
      </Link>

      <div className="p-5 flex flex-col flex-1 justify-between gap-4">
        <div className="space-y-2">
          {course.owner && (
            <Link
              to={`/users/${course.owner.id}`}
              className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <div className="h-5 w-5 rounded-full overflow-hidden bg-muted flex items-center justify-center text-[10px] font-bold text-brand-orange">
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
              <span className="font-medium truncate max-w-[180px]">
                {course.owner.displayName || 'Tác giả'}
              </span>
            </Link>
          )}

          <h3 className="font-bold text-base text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            <Link to={`/courses/${course.id}`}>{course.name}</Link>
          </h3>

          {course.tags && course.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {course.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground"
                >
                  #{tag}
                </span>
              ))}
              {course.tags.length > 3 && (
                <span className="text-[11px] px-1.5 py-0.5 text-muted-foreground">
                  +{course.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3 pt-3 border-t border-border/70">
          {hasProgress && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Tiến độ học</span>
                <span className="font-semibold text-foreground">
                  {Math.round(course.progressPercent!)}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, course.progressPercent!))}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span>{course.learnerCount ?? 0} học viên</span>
            </span>

            {course.ratingAvg ? (
              <span className="flex items-center gap-1 font-semibold text-amber-500">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span>{course.ratingAvg.toFixed(1)}</span>
                <span className="text-muted-foreground font-normal">
                  ({course.ratingCount ?? 0})
                </span>
              </span>
            ) : (
              <span>Chưa có đánh giá</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
