import { ArrowRight, Star, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import defaultCourseCover from '@/assets/courses';

export interface HorizontalCourseRowItem {
  id: string;
  title: string;
  coverUrl?: string;
  authorName: string;
  categoryTag?: string;
  levelTag?: string;
  statusBadge?: string;
  rating?: number;
  learnerCount: number;
  chapterCount?: number;
  updatedAtText?: string;
}

const DEFAULT_RECENTLY_UPDATED: HorizontalCourseRowItem[] = [
  {
    id: 'crs-01',
    title: 'Python Nâng Cao & Tối Ưu Thuật Toán',
    authorName: 'TS. Đỗ Hoàng Nam',
    categoryTag: 'Python',
    levelTag: 'Nâng cao',
    statusBadge: 'Đang cập nhật',
    rating: 4.8,
    learnerCount: 1240,
    chapterCount: 12,
    updatedAtText: 'Cập nhật hôm qua',
  },
  {
    id: 'crs-02',
    title: 'Trí Tuệ Nhân Tạo & Prompt Engineering',
    authorName: 'ThS. Nguyễn Lan Anh',
    categoryTag: 'AI & Data',
    levelTag: 'Trung cấp',
    statusBadge: 'Công khai',
    rating: 4.9,
    learnerCount: 2150,
    chapterCount: 8,
    updatedAtText: 'Cập nhật 2 ngày trước',
  },
  {
    id: 'crs-03',
    title: 'Cấu Trúc Dữ Liệu & Giải Thuật Thực Chiến',
    authorName: 'TS. Trần Minh Khoa',
    categoryTag: 'Thuật toán',
    levelTag: 'Nâng cao',
    statusBadge: 'Công khai',
    rating: 4.7,
    learnerCount: 980,
    chapterCount: 15,
    updatedAtText: 'Cập nhật 3 ngày trước',
  },
  {
    id: 'crs-04',
    title: 'Lập trình Giao diện Web Hiện đại với Next.js & Tailwind',
    authorName: 'Kỹ sư Vũ Thành Đạt',
    categoryTag: 'Frontend',
    levelTag: 'Cơ bản',
    statusBadge: 'Đang cập nhật',
    rating: 4.9,
    learnerCount: 1840,
    chapterCount: 10,
    updatedAtText: 'Cập nhật tuần này',
  },
  {
    id: 'crs-05',
    title: 'Hệ Quản Trị Cơ Sở Dữ Liệu Phân Tán & Tối Ưu SQL',
    authorName: 'PGS. TS. Lê Quốc Huy',
    categoryTag: 'Database',
    levelTag: 'Chuyên gia',
    statusBadge: 'Công khai',
    rating: 4.8,
    learnerCount: 750,
    chapterCount: 14,
    updatedAtText: 'Cập nhật tuần này',
  },
];

export function RecentlyUpdatedSection({
  courses = DEFAULT_RECENTLY_UPDATED,
}: {
  courses?: HorizontalCourseRowItem[];
}) {
  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-3">
          <span className="h-6 w-1 rounded-full bg-brand-orange" aria-hidden="true" />
          <h2 className="font-serif text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            MỚI CẬP NHẬT
          </h2>
        </div>
        <Link
          to="/courses?sort=RECENTLY_UPDATED"
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand-orange hover:underline"
        >
          <span>Xem tất cả</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* 5 Horizontal Course Rows */}
      <div className="space-y-3">
        {courses.slice(0, 5).map((course) => (
          <article
            key={course.id}
            className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-brand-orange/40 hover:shadow-md"
          >
            {/* Left: 80x80 Cover + Content Info */}
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                <img
                  src={course.coverUrl || defaultCourseCover}
                  alt={course.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>

              <div className="space-y-1.5">
                {/* Tags row */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {course.categoryTag && (
                    <span className="rounded-md bg-brand-orange/10 px-2 py-0.5 font-semibold text-brand-orange">
                      {course.categoryTag}
                    </span>
                  )}
                  {course.levelTag && (
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-muted-foreground">
                      {course.levelTag}
                    </span>
                  )}
                  {course.statusBadge && (
                    <span className="rounded-md border border-border px-2 py-0.5 text-muted-foreground">
                      {course.statusBadge}
                    </span>
                  )}
                  {course.rating && (
                    <span className="flex items-center gap-1 font-semibold text-amber-500">
                      <Star className="h-3 w-3 fill-current" />
                      <span>{course.rating.toFixed(1)}</span>
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-serif text-base font-bold text-foreground group-hover:text-brand-orange transition-colors">
                  <Link to={`/courses/${course.id}`}>{course.title}</Link>
                </h3>

                {/* Author and metadata */}
                <p className="text-xs text-muted-foreground">
                  <span>Chủ khóa: {course.authorName}</span>
                  {course.updatedAtText && (
                    <span> • {course.updatedAtText}</span>
                  )}
                </p>
              </div>
            </div>

            {/* Right: Learners count and arrow link */}
            <div className="flex shrink-0 items-center justify-between sm:flex-col sm:items-end gap-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                <span>{course.learnerCount.toLocaleString('vi-VN')} học viên</span>
              </span>
              <div className="hidden sm:flex items-center gap-1 text-brand-orange font-semibold group-hover:translate-x-1 transition-transform">
                <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
