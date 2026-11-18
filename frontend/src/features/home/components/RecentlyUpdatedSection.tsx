import { ChevronRight, Globe, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import defaultCourseCover from '@/assets/courses';

export interface HorizontalCourseRowItem {
  id: string;
  title: string;
  authorName: string;
  categoryTag: string;
  topicTag: string;
  statusBadge: 'UPDATING' | 'COMPLETED';
  accessMode: 'PUBLIC' | 'PRIVATE';
  learnerCountText: string;
  lessonInfoText: string;
  iconType: 'python' | 'ai' | 'math' | 'frontend' | 'physics';
}

const DEFAULT_RECENTLY_UPDATED: HorizontalCourseRowItem[] = [
  {
    id: 'crs-01',
    title: 'Python Nâng Cao & Tối Ưu Thuật Toán',
    authorName: 'TS. Đỗ Hoàng Nam',
    categoryTag: 'Khoa học máy tính',
    topicTag: 'Python',
    statusBadge: 'UPDATING',
    accessMode: 'PUBLIC',
    learnerCountText: '4.8k học viên',
    lessonInfoText: 'Chương 4/12 bài học (4 giờ 15 phút) • Cập nhật 1 ngày trước',
    iconType: 'python',
  },
  {
    id: 'crs-02',
    title: 'Trí Tuệ Nhân Tạo & Kỹ Thuật Prompting Thực Chiến',
    authorName: 'Lê Quang Minh',
    categoryTag: 'Trí tuệ nhân tạo',
    topicTag: 'Prompt Engineering',
    statusBadge: 'COMPLETED',
    accessMode: 'PUBLIC',
    learnerCountText: '2.1k học viên',
    lessonInfoText: 'Chương 8/12 • Kỹ thuật Prompting Nâng Cao • 2 giờ trước',
    iconType: 'ai',
  },
  {
    id: 'crs-03',
    title: 'Toán Rời Rạc & Thiết Kế Logic Thuật Toán',
    authorName: 'ThS. Nguyễn Lan Anh',
    categoryTag: 'Toán học',
    topicTag: 'Logic',
    statusBadge: 'UPDATING',
    accessMode: 'PRIVATE',
    learnerCountText: '3.2k học viên',
    lessonInfoText: 'Chương 2/9 lý thuyết đồ thị (2 giờ 30 phút) • Cập nhật 1 ngày trước',
    iconType: 'math',
  },
  {
    id: 'crs-04',
    title: 'Kiến Trúc Frontend Chuyên Nghiệp với React & Next.js',
    authorName: 'Trần Đức Toàn',
    categoryTag: 'Frontend',
    topicTag: 'React/Next.js',
    statusBadge: 'UPDATING',
    accessMode: 'PUBLIC',
    learnerCountText: '1.5k học viên',
    lessonInfoText: 'Chương 5 • Server Actions & React Server Components • 2 ngày trước',
    iconType: 'frontend',
  },
  {
    id: 'crs-05',
    title: 'Vật Lý Đại Cương & Ứng Dụng Mô Phỏng Số',
    authorName: 'PGS. TS. Trần Văn Hùng',
    categoryTag: 'Vật lý',
    topicTag: 'Mô phỏng số',
    statusBadge: 'COMPLETED',
    accessMode: 'PUBLIC',
    learnerCountText: '2.4k học viên',
    lessonInfoText: 'Chương 12/12 bài học (tiếng Việt) • 3 ngày trước',
    iconType: 'physics',
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
        <div className="flex items-center gap-2.5">
          <span className="h-5 w-1 rounded-full bg-brand-orange" aria-hidden="true" />
          <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-foreground">
            MỚI CẬP NHẬT
          </h2>
        </div>
        <Link
          to="/courses?sort=RECENTLY_UPDATED"
          className="flex items-center gap-0.5 text-xs sm:text-sm font-semibold text-brand-orange hover:underline"
        >
          <span>Xem thêm</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* 5 Horizontal Course Rows */}
      <div className="space-y-3">
        {courses.slice(0, 5).map((course) => (
          <article
            key={course.id}
            className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-all hover:border-brand-orange/40 hover:shadow-md"
          >
            {/* Left: Icon Thumbnail + Information */}
            <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
              <div className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-xl overflow-hidden border border-border/60 bg-muted">
                <img
                  src={defaultCourseCover}
                  alt={course.title}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="space-y-1.5 min-w-0">
                {/* Badges line */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {course.categoryTag}
                  </span>
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {course.topicTag}
                  </span>

                  {course.statusBadge === 'UPDATING' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-orange/15 border border-brand-orange/30 px-2 py-0.5 text-[10px] font-semibold text-brand-orange">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-orange" />
                      <span>Đang cập nhật</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span>Đã hoàn thành</span>
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1 rounded-md bg-secondary/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {course.accessMode === 'PUBLIC' ? (
                      <>
                        <Globe className="h-3 w-3" />
                        <span>Public</span>
                      </>
                    ) : (
                      <>
                        <Lock className="h-3 w-3" />
                        <span>Riêng tư</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-serif text-sm sm:text-base font-bold text-foreground group-hover:text-brand-orange transition-colors truncate">
                  <Link to={`/courses/${course.id}`}>{course.title}</Link>
                </h3>

                {/* Author and lesson info */}
                <p className="text-xs text-muted-foreground truncate">
                  <span className="font-medium text-foreground/80">Chủ khóa: {course.authorName}</span>
                  <span className="mx-1.5">•</span>
                  <span>{course.lessonInfoText}</span>
                </p>
              </div>
            </div>

            {/* Right: Learners count and arrow link */}
            <div className="flex shrink-0 items-center justify-between sm:justify-end gap-1.5 text-xs sm:text-sm font-semibold text-muted-foreground group-hover:text-brand-orange transition-colors">
              <span>{course.learnerCountText}</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
