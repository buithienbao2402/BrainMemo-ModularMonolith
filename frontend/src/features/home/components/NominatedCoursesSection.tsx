import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import defaultCourseCover from '@/assets/courses';

interface NominatedCourseItem {
  id: string;
  title: string;
  authorName: string;
  nominationCount: number;
  coverUrl?: string;
  tag: string;
}

const MOCK_NOMINATED_COURSES: NominatedCourseItem[] = [
  { id: 'nom-1', title: 'Python Nâng Cao & Tối Ưu', authorName: 'TS. Đỗ Hoàng Nam', nominationCount: 342, tag: 'Python' },
  { id: 'nom-2', title: 'Trí Tuệ Nhân Tạo & LLM', authorName: 'ThS. Nguyễn Lan Anh', nominationCount: 289, tag: 'AI' },
  { id: 'nom-3', title: 'React 19 & Fullstack Architecture', authorName: 'Kỹ sư Vũ Đạt', nominationCount: 215, tag: 'Frontend' },
  { id: 'nom-4', title: 'Cấu Trúc Dữ Liệu Nâng Cao', authorName: 'TS. Trần Khoa', nominationCount: 198, tag: 'Thuật toán' },
  { id: 'nom-5', title: 'Toán Rời Rạc Ứng Dụng', authorName: 'PGS. Lê Huy', nominationCount: 156, tag: 'Toán' },
  { id: 'nom-6', title: 'Thiết Kế Hệ Thống Lớn', authorName: 'TS. Phạm Hùng', nominationCount: 142, tag: 'System' },
  { id: 'nom-7', title: 'An Toàn Thông Tin Ứng Dụng', authorName: 'ThS. Đặng Tuấn', nominationCount: 128, tag: 'Security' },
];

export function NominatedCoursesSection({
  courses = MOCK_NOMINATED_COURSES,
}: {
  courses?: NominatedCourseItem[];
}) {
  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/60 pb-3">
        <span className="h-6 w-1 rounded-full bg-brand-orange" aria-hidden="true" />
        <h2 className="font-serif text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          MỚI ĐƯỢC ĐỀ CỬ
        </h2>
      </div>

      {/* Horizontal smooth scroll */}
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1">
        {courses.map((item) => (
          <div
            key={item.id}
            className="group w-[220px] shrink-0 overflow-hidden rounded-2xl border border-border bg-card shadow-xs transition-all hover:border-brand-orange/40 hover:shadow-md"
          >
            <div className="relative aspect-video w-full overflow-hidden bg-muted">
              <img
                src={item.coverUrl || defaultCourseCover}
                alt={item.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <span className="absolute top-2 left-2 rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-white">
                {item.tag}
              </span>
              <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-brand-orange/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                <Heart className="h-3 w-3 fill-white" />
                <span>{item.nominationCount}</span>
              </div>
            </div>

            <div className="p-3.5 space-y-1.5">
              <h3 className="line-clamp-2 font-serif text-xs font-bold text-foreground group-hover:text-brand-orange transition-colors">
                <Link to={`/courses/${item.id}`}>{item.title}</Link>
              </h3>
              <p className="text-[11px] text-muted-foreground truncate">
                {item.authorName}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
