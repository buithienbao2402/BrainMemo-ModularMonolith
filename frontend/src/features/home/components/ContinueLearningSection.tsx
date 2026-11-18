import { ChevronRight, PlayCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface InProgressCourseItem {
  id: string;
  title: string;
  coverUrl?: string;
  progressPercent: number;
  currentLessonTitle?: string;
  totalChapters?: number;
}

const DEFAULT_IN_PROGRESS_COURSES: InProgressCourseItem[] = [
  {
    id: 'crs-01',
    title: 'Python Nâng Cao & Tối Ưu Thuật Toán',
    progressPercent: 75,
    currentLessonTitle: 'Chương 4: Tối ưu bộ nhớ với Generator',
    totalChapters: 12,
  },
  {
    id: 'crs-02',
    title: 'Trí Tuệ Nhân Tạo & Kỹ Thuật Prompting Thực Chiến',
    progressPercent: 25,
    currentLessonTitle: 'Chương 2: Xây dựng Chain với LangChain',
    totalChapters: 12,
  },
  {
    id: 'crs-03',
    title: 'Cấu Trúc Dữ Liệu & Giải Thuật Thực Chiến',
    progressPercent: 60,
    currentLessonTitle: 'Chương 7: Đồ thị và thuật toán Dijkstra',
    totalChapters: 15,
  },
  {
    id: 'crs-04',
    title: 'Lập Trình Vi Điều Khiển & IoT với ESP32',
    progressPercent: 15,
    currentLessonTitle: 'Chương 1: Giới thiệu kiến trúc ESP32',
    totalChapters: 10,
  },
];

export function ContinueLearningSection({
  courses = DEFAULT_IN_PROGRESS_COURSES,
}: {
  courses?: InProgressCourseItem[];
}) {
  if (!courses || courses.length === 0) return null;

  return (
    <section className="space-y-4">
      {/* Heading with orange indicator */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="h-5 w-1 rounded-full bg-brand-orange" aria-hidden="true" />
          <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-foreground">
            TIẾP TỤC HỌC <span className="sr-only">Đang học dở</span>
          </h2>
        </div>
        <Link
          to="/courses"
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-brand-orange"
        >
          <span>Lần học gần đây</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Horizontal Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {courses.slice(0, 4).map((course) => (
          <div
            key={course.id}
            className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-3.5 shadow-xs transition-all hover:border-brand-orange/40 hover:shadow-md"
          >
            <div>
              {/* Thumbnail Header */}
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-gradient-to-br from-[#1c1c24] via-[#232330] to-[#16161e] border border-border/50 mb-3 flex items-center justify-center">
                {course.coverUrl ? (
                  <img
                    src={course.coverUrl}
                    alt={course.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="relative flex flex-col items-center justify-center p-3 text-center">
                    <div className="absolute inset-0 bg-[radial-gradient(#ff7a1a_1px,transparent_1px)] [background-size:12px_12px] opacity-20" />
                    <PlayCircle className="h-10 w-10 text-brand-orange/80 group-hover:scale-110 group-hover:text-brand-orange transition-all" />
                  </div>
                )}
              </div>

              {/* Course Title */}
              <h3 className="line-clamp-2 font-serif text-sm font-bold text-foreground group-hover:text-brand-orange transition-colors leading-snug">
                <Link to={`/courses/${course.id}`}>{course.title}</Link>
              </h3>

              {/* Lesson subtitle */}
              {course.currentLessonTitle && (
                <p className="line-clamp-1 text-xs text-muted-foreground mt-1 mb-2">
                  {course.currentLessonTitle}
                </p>
              )}
            </div>

            {/* Progress Bar & Percentage */}
            <div className="mt-auto pt-2 flex items-center gap-2.5">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-brand-orange transition-all duration-500"
                  style={{ width: `${course.progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-foreground/80 shrink-0">
                {course.progressPercent}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
