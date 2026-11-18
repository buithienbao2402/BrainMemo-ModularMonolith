import { Heart, Cpu, Code2, GitFork, Layout, Atom } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NominatedCourseItem {
  id: string;
  title: string;
  authorName: string;
  nominationCount: string;
  iconType: 'cpu' | 'code' | 'gitfork' | 'layout' | 'atom';
}

const MOCK_NOMINATED_COURSES: NominatedCourseItem[] = [
  {
    id: 'nom-01',
    title: 'AI Prompting Cơ Bản & Thực Chiến',
    authorName: 'Lê Quang Minh',
    nominationCount: '1,250 đề cử',
    iconType: 'cpu',
  },
  {
    id: 'nom-02',
    title: 'Python Cho Lập Trình Viên Backend',
    authorName: 'TS. Đỗ Hoàng Nam',
    nominationCount: '980 đề cử',
    iconType: 'code',
  },
  {
    id: 'nom-03',
    title: 'Toán Rời Rạc & Lý Thuyết Đồ Thị',
    authorName: 'ThS. Nguyễn Lan Anh',
    nominationCount: '840 đề cử',
    iconType: 'gitfork',
  },
  {
    id: 'nom-04',
    title: 'React 19 & Tương Lai Phát Triển Web',
    authorName: 'Trần Đức Toàn',
    nominationCount: '710 đề cử',
    iconType: 'layout',
  },
  {
    id: 'nom-05',
    title: 'Vật Lý Lượng Tử & Ứng Dụng Trong Chíp',
    authorName: 'PGS. TS. Trần Văn Hùng',
    nominationCount: '580 đề cử',
    iconType: 'atom',
  },
];

function renderNominatedIcon(type: NominatedCourseItem['iconType']) {
  switch (type) {
    case 'cpu':
      return <Cpu className="h-6 w-6 text-amber-400" />;
    case 'code':
      return <Code2 className="h-6 w-6 text-emerald-400" />;
    case 'gitfork':
      return <GitFork className="h-6 w-6 text-blue-400" />;
    case 'layout':
      return <Layout className="h-6 w-6 text-cyan-400" />;
    case 'atom':
      return <Atom className="h-6 w-6 text-purple-400" />;
    default:
      return <Cpu className="h-6 w-6 text-brand-orange" />;
  }
}

export function NominatedCoursesSection({
  courses = MOCK_NOMINATED_COURSES,
}: {
  courses?: NominatedCourseItem[];
}) {
  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-border/60 pb-3">
        <span className="h-5 w-1 rounded-full bg-brand-orange" aria-hidden="true" />
        <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-foreground">
          MỚI ĐƯỢC ĐỀ CỬ
        </h2>
      </div>

      {/* Grid of 5 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {courses.map((item) => (
          <div
            key={item.id}
            className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-xs transition-all hover:border-brand-orange/40 hover:shadow-md"
          >
            <div>
              {/* Top Box containing colorful icon */}
              <div className="aspect-video w-full rounded-xl bg-[#1c1c24] dark:bg-[#181820] border border-border/60 flex items-center justify-center mb-3">
                {renderNominatedIcon(item.iconType)}
              </div>

              {/* Title & Author */}
              <h3 className="line-clamp-2 font-serif text-xs sm:text-sm font-bold text-foreground group-hover:text-brand-orange transition-colors min-h-[2.5rem] leading-snug">
                <Link to={`/courses/${item.id}`}>{item.title}</Link>
              </h3>

              <p className="mt-1 text-[11px] text-muted-foreground truncate">
                {item.authorName}
              </p>
            </div>

            {/* Bottom: Nomination count & Subtext */}
            <div className="mt-3 pt-2.5 border-t border-border/60">
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-500">
                <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" />
                <span>{item.nominationCount}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Chưa có đề cử nào từ bạn
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
