import { useState } from 'react';
import { Star, Users, Lock, UserCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import defaultCourseCover from '@/assets/courses';
import type { DiscoveryCourseItem } from './discoveryMockData';

interface DiscoveryCourseCardProps {
  course: DiscoveryCourseItem;
  variant?: 'grid' | 'list';
}

export function DiscoveryCourseCard({
  course,
  variant = 'grid',
}: DiscoveryCourseCardProps) {
  const [imgSrc, setImgSrc] = useState(course.coverUrl || defaultCourseCover);
  const isPrivate = course.accessMode === 'PRIVATE';

  // Format learner count (e.g. 3420 -> 3.420)
  const formattedLearners = course.learnerCount.toLocaleString('vi-VN');

  // Badges element (shared between grid and list)
  const renderBadges = () => (
    <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none">
      {/* Access Mode */}
      {isPrivate ? (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-950/85 text-zinc-300 border border-zinc-700/50 backdrop-blur-xs flex items-center gap-1">
          <Lock className="w-2.5 h-2.5" />
          <span>Private</span>
        </span>
      ) : (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/85 text-emerald-400 border border-emerald-500/40 backdrop-blur-xs flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Public</span>
        </span>
      )}

      {/* Status Badge */}
      {course.status === 'UPDATING' && (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950/85 text-amber-400 border border-amber-500/40 backdrop-blur-xs">
          Đang cập nhật
        </span>
      )}
      {course.status === 'COMPLETED' && (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/85 text-emerald-400 border border-emerald-500/40 backdrop-blur-xs">
          Đã hoàn thành
        </span>
      )}
      {course.status === 'PAUSED' && (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-800/85 text-zinc-400 border border-zinc-600/40 backdrop-blur-xs">
          Tạm dừng
        </span>
      )}
    </div>
  );

  if (variant === 'list') {
    return (
      <div
        data-testid="course-card"
        className="group flex flex-col sm:flex-row overflow-hidden rounded-xl border border-zinc-200 dark:border-[#22242b] bg-white dark:bg-[#141519] hover:border-zinc-300 dark:hover:border-zinc-700/80 transition-all duration-200 shadow-xs hover:shadow-md"
      >
        {/* Cover Image & Badges */}
        <Link
          to={`/courses/${course.id}`}
          className="relative block w-full sm:w-64 sm:min-w-[240px] aspect-[16/10] sm:aspect-auto overflow-hidden bg-zinc-900 shrink-0"
        >
          <img
            src={imgSrc}
            alt={course.name}
            onError={() => setImgSrc(defaultCourseCover)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          {renderBadges()}
        </Link>

        {/* Content */}
        <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  {course.category}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors leading-snug mt-0.5">
                  <Link to={`/courses/${course.id}`}>{course.name}</Link>
                </h3>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1 font-bold text-sm text-zinc-700 dark:text-zinc-200 shrink-0 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800/40">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{course.ratingAvg.toFixed(1)}</span>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
              <UserCircle className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{course.instructor}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {course.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/50"
                >
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-zinc-400" />
                <span>{formattedLearners} học viên</span>
              </div>
              <Link
                to={`/courses/${course.id}`}
                className="px-3.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs transition-colors inline-flex items-center gap-1"
              >
                <span>Xem chi tiết</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view (compact default)
  return (
    <div
      data-testid="course-card"
      className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 dark:border-[#22242b] bg-white dark:bg-[#141519] hover:border-zinc-300 dark:hover:border-zinc-700/80 transition-all duration-200 shadow-xs hover:shadow-md"
    >
      {/* Cover Image & Badges */}
      <Link
        to={`/courses/${course.id}`}
        className="relative block aspect-[16/10] w-full overflow-hidden bg-zinc-900"
      >
        <img
          src={imgSrc}
          alt={course.name}
          onError={() => setImgSrc(defaultCourseCover)}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {renderBadges()}
      </Link>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-3 sm:p-3.5">
        {/* Title */}
        <h3 className="line-clamp-2 text-xs sm:text-[13px] font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors leading-snug min-h-[2.4rem]">
          <Link to={`/courses/${course.id}`}>{course.name}</Link>
        </h3>

        {/* Instructor */}
        <div className="mt-1 flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
          <UserCircle className="w-3.5 h-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
          <span className="truncate">{course.instructor}</span>
        </div>

        {/* Stats Row */}
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
          {/* Learners */}
          <div className="flex items-center gap-1" title="Số học viên">
            <Users className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            <span>{formattedLearners}</span>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-200">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{course.ratingAvg.toFixed(1)}</span>
          </div>
        </div>

        {/* Tags Row */}
        {course.tags && course.tags.length > 0 && (
          <div className="mt-2 flex items-center flex-wrap gap-1">
            {course.tags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/50"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
