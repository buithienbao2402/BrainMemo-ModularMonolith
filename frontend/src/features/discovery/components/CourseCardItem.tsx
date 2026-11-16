import { Star, Users, Award, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CourseCard } from '../api/discoveryApi';
import defaultCourseCover from '@/assets/courses';

interface CourseCardItemProps {
  course: CourseCard;
  showProgress?: boolean;
}

export function CourseCardItem({ course, showProgress = false }: CourseCardItemProps) {
  const coverUrl = course.coverUrl || defaultCourseCover;
  const isPrivate = course.accessMode === 'PRIVATE';
  const ratingText = course.ratingAvg ? course.ratingAvg.toFixed(1) : 'Chưa có';

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:border-primary/50 hover:shadow-md">
      {/* Cover Image & Badges */}
      <Link
        to={showProgress ? `/courses/${course.id}/learn` : `/courses/${course.id}`}
        className="relative block aspect-[16/9] w-full overflow-hidden bg-muted"
      >
        <img
          src={coverUrl}
          alt={course.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
          {/* Access Mode Badge */}
          <span
            className={`rounded-md px-2 py-0.5 text-[11px] font-bold shadow-sm ${
              isPrivate
                ? 'bg-amber-600/90 text-white'
                : 'bg-emerald-600/90 text-white'
            }`}
          >
            {isPrivate ? 'Riêng tư' : 'Công khai'}
          </span>

          {/* Status Badge */}
          {course.status === 'COMPLETED' && (
            <span className="rounded-md bg-sky-600/90 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
              Đã hoàn thành
            </span>
          )}
          {course.status === 'PAUSED' && (
            <span className="rounded-md bg-zinc-600/90 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
              Tạm dừng
            </span>
          )}
        </div>
      </Link>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Tags */}
        {course.tags && course.tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {course.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded bg-secondary/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h3 className="line-clamp-2 font-serif text-base font-bold text-foreground transition-colors group-hover:text-primary">
          <Link to={showProgress ? `/courses/${course.id}/learn` : `/courses/${course.id}`}>
            {course.name}
          </Link>
        </h3>

        {/* Owner Name */}
        <p className="mt-1 text-xs text-muted-foreground">
          {course.owner?.displayName || 'Tác giả'}
        </p>

        {/* Progress Bar (if in progress) */}
        {showProgress && course.progressPercent !== undefined && course.progressPercent !== null && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Tiến độ</span>
              <span className="font-semibold text-primary">{Math.round(course.progressPercent)}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, course.progressPercent))}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats Footer */}
        <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-3 text-xs text-muted-foreground">
          {/* Rating */}
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="font-semibold text-foreground">{ratingText}</span>
            {course.ratingCount !== undefined && course.ratingCount > 0 && (
              <span className="text-[11px]">({course.ratingCount})</span>
            )}
          </div>

          {/* Learners & Nominations */}
          <div className="flex items-center gap-3">
            {course.nominationCount !== undefined && course.nominationCount > 0 && (
              <div className="flex items-center gap-1 text-rose-500" title="Số lượt đề cử">
                <Award className="h-3.5 w-3.5" />
                <span>{course.nominationCount}</span>
              </div>
            )}

            <div className="flex items-center gap-1" title="Số học viên">
              <Users className="h-3.5 w-3.5" />
              <span>{course.learnerCount ?? 0}</span>
            </div>
          </div>
        </div>

        {/* CTA if in progress */}
        {showProgress && (
          <Link
            to={`/courses/${course.id}/learn`}
            className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Tiếp tục học</span>
          </Link>
        )}
      </div>
    </div>
  );
}
