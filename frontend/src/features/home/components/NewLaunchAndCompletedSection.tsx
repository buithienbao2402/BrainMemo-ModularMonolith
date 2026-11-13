import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import defaultCourseCover from '@/assets/courses';

interface MiniCourseRow {
  id: string;
  title: string;
  authorName: string;
  categoryTag: string;
  coverUrl?: string;
}

const MOCK_NEW_LAUNCH: MiniCourseRow[] = [
  { id: 'nl-1', title: 'Generative AI & Agentic Workflows', authorName: 'TS. Đỗ Hoàng Nam', categoryTag: 'AI' },
  { id: 'nl-2', title: 'Kubernetes & Cloud Architecture', authorName: 'Kỹ sư Vũ Thành Đạt', categoryTag: 'DevOps' },
  { id: 'nl-3', title: 'TypeScript 5.9 Deep Dive', authorName: 'ThS. Nguyễn Lan Anh', categoryTag: 'Frontend' },
  { id: 'nl-4', title: 'Viết Vi Dịch Vụ với .NET 9', authorName: 'TS. Trần Minh Khoa', categoryTag: 'Backend' },
  { id: 'nl-5', title: 'Phân Tích Dữ Liệu Lớn với Spark', authorName: 'PGS. Lê Quốc Huy', categoryTag: 'Data' },
];

const MOCK_COMPLETED: MiniCourseRow[] = [
  { id: 'comp-1', title: 'Nhập Môn Khoa Học Máy Tính Toàn Diện', authorName: 'TS. Phạm Hùng', categoryTag: 'CS' },
  { id: 'comp-2', title: 'Lập Trình Web Fullstack Từ Zero', authorName: 'Kỹ sư Vũ Thành Đạt', categoryTag: 'Fullstack' },
  { id: 'comp-3', title: 'Giải Thuật Lập Trình Cơ Bản', authorName: 'TS. Đỗ Hoàng Nam', categoryTag: 'Thuật toán' },
  { id: 'comp-4', title: 'Cơ Sở Dữ Liệu Quan Hệ SQL', authorName: 'PGS. Lê Quốc Huy', categoryTag: 'Database' },
  { id: 'comp-5', title: 'Thiết Kế UI/UX Cho Kỹ Sư Phần Mềm', authorName: 'ThS. Nguyễn Lan Anh', categoryTag: 'Design' },
];

export function NewLaunchAndCompletedSection() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Column Left: MỚI RA MẮT */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 text-brand-orange">
            <Sparkles className="h-5 w-5" />
            <h3 className="font-serif text-lg font-bold text-foreground">MỚI RA MẮT</h3>
          </div>
          <Link
            to="/courses?sort=NEWEST_LAUNCH"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-orange hover:underline"
          >
            <span>Xem tất cả</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="space-y-3">
          {MOCK_NEW_LAUNCH.map((c) => (
            <div key={c.id} className="flex items-center gap-3 group">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                <img
                  src={c.coverUrl || defaultCourseCover}
                  alt={c.title}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  to={`/courses/${c.id}`}
                  className="line-clamp-1 font-serif text-sm font-bold text-foreground group-hover:text-brand-orange transition-colors"
                >
                  {c.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-brand-orange">{c.categoryTag}</span> • {c.authorName}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Column Right: ĐÃ HOÀN THÀNH */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 text-emerald-500">
            <CheckCircle2 className="h-5 w-5" />
            <h3 className="font-serif text-lg font-bold text-foreground">ĐÃ HOÀN THÀNH</h3>
          </div>
          <Link
            to="/courses?status=COMPLETED"
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500 hover:underline"
          >
            <span>Xem tất cả</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="space-y-3">
          {MOCK_COMPLETED.map((c) => (
            <div key={c.id} className="flex items-center gap-3 group">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                <img
                  src={c.coverUrl || defaultCourseCover}
                  alt={c.title}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  to={`/courses/${c.id}`}
                  className="line-clamp-1 font-serif text-sm font-bold text-foreground group-hover:text-emerald-500 transition-colors"
                >
                  {c.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-emerald-500">{c.categoryTag}</span> • {c.authorName}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
