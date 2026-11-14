import { Clock, PlayCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/ui';

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
    id: 'crs-py-01',
    title: 'Python Nâng Cao & Tối Ưu Thuật Toán',
    progressPercent: 68,
    currentLessonTitle: 'Chương 4: Tối ưu bộ nhớ với Generator',
    totalChapters: 12,
  },
  {
    id: 'crs-ai-02',
    title: 'Trí Tuệ Nhân Tạo & Prompt Engineering',
    progressPercent: 42,
    currentLessonTitle: 'Chương 2: Xây dựng Chain với LangChain',
    totalChapters: 8,
  },
  {
    id: 'crs-ds-03',
    title: 'Cấu Trúc Dữ Liệu & Giải Thuật',
    progressPercent: 85,
    currentLessonTitle: 'Chương 7: Đồ thị và thuật toán Dijkstra',
    totalChapters: 15,
  },
  {
    id: 'crs-web-04',
    title: 'Lập trình Giao diện Web với Next.js',
    progressPercent: 30,
    currentLessonTitle: 'Chương 3: Server Components & Actions',
    totalChapters: 10,
  },
  {
    id: 'crs-math-05',
    title: 'Toán Rời Rạc & Lý Thuyết Đồ Thị',
    progressPercent: 55,
    currentLessonTitle: 'Chương 5: Chu trình Hamilton & Euler',
    totalChapters: 9,
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
      <div className="flex items-center gap-3">
        <span className="h-6 w-1 rounded-full bg-brand-orange" aria-hidden="true" />
        <h2 className="font-serif text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          TIẾP TỤC HỌC
        </h2>
      </div>

      {/* 5 in-progress courses horizontal cards list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {courses.slice(0, 5).map((course) => (
          <div
            key={course.id}
            className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-brand-orange/40 hover:shadow-md"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-brand-orange">
                  {course.progressPercent}% hoàn thành
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Đang học</span>
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-brand-orange transition-all duration-500"
                  style={{ width: `${course.progressPercent}%` }}
                />
              </div>

              <h3 className="line-clamp-2 font-serif text-sm font-bold text-foreground group-hover:text-brand-orange transition-colors">
                <Link to={`/courses/${course.id}`}>{course.title}</Link>
              </h3>

              {course.currentLessonTitle && (
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {course.currentLessonTitle}
                </p>
              )}
            </div>

            <div className="pt-4 mt-auto">
              <Button asChild size="sm" className="w-full justify-center gap-1.5 text-xs font-semibold">
                <Link to={`/courses/${course.id}`}>
                  <PlayCircle className="h-3.5 w-3.5" />
                  <span>Tiếp tục học</span>
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
