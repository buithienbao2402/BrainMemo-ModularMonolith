import { useState } from 'react';
import { RefreshCw, Users, BookOpen, Globe, Lock, BarChart3, Languages, GitFork, Code2, Boxes, Waves, Scan, Server, TrendingUp, BookmarkCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RandomCourseCardItem {
  id: string;
  title: string;
  authorName: string;
  tag: string;
  tagColor: 'amber' | 'emerald' | 'orange' | 'blue' | 'purple' | 'teal' | 'pink';
  accessMode: 'PUBLIC' | 'PRIVATE';
  learnerCountText: string;
  lessonCountText: string;
  iconType: 'barchart' | 'languages' | 'gitfork' | 'code' | 'boxes' | 'waves' | 'scan' | 'server' | 'trend' | 'bookmark';
}

const POOL_OF_COURSES: RandomCourseCardItem[] = [
  {
    id: 'exp-01',
    title: 'Python Cho Nhà Phân Tích Dữ Liệu',
    authorName: 'TS. Đỗ Hoàng Nam',
    tag: 'Khoa học dữ liệu',
    tagColor: 'amber',
    accessMode: 'PUBLIC',
    learnerCountText: '2.1k',
    lessonCountText: '15 bài',
    iconType: 'barchart',
  },
  {
    id: 'exp-02',
    title: 'Xử Lý Ngôn Ngữ Tự Nhiên Với Transformers',
    authorName: 'Lê Quang Minh',
    tag: 'Toán học',
    tagColor: 'emerald',
    accessMode: 'PUBLIC',
    learnerCountText: '3.5k',
    lessonCountText: '22 bài',
    iconType: 'languages',
  },
  {
    id: 'exp-03',
    title: 'Giải Thuật Nâng Cao & Quy Hoạch Động',
    authorName: 'ThS. Nguyễn Lan Anh',
    tag: 'Đang cập nhật',
    tagColor: 'orange',
    accessMode: 'PRIVATE',
    learnerCountText: '1.8k',
    lessonCountText: '18 bài',
    iconType: 'gitfork',
  },
  {
    id: 'exp-04',
    title: 'TypeScript & Clean Code Tiêu Chuẩn Doanh Nghiệp',
    authorName: 'Trần Đức Toàn',
    tag: 'Frontend',
    tagColor: 'blue',
    accessMode: 'PUBLIC',
    learnerCountText: '910',
    lessonCountText: '14 bài',
    iconType: 'code',
  },
  {
    id: 'exp-05',
    title: 'Hệ Thống Phân Tán Microservices',
    authorName: 'Vũ Quốc Cường',
    tag: 'Bảo mật',
    tagColor: 'purple',
    accessMode: 'PUBLIC',
    learnerCountText: '1.4k',
    lessonCountText: '12 bài',
    iconType: 'boxes',
  },
  {
    id: 'exp-06',
    title: 'Vật Lý Sóng & Quang Học Hiện Đại',
    authorName: 'PGS. TS. Trần Văn Hùng',
    tag: 'Khoa học',
    tagColor: 'teal',
    accessMode: 'PUBLIC',
    learnerCountText: '1.6k',
    lessonCountText: '16 bài',
    iconType: 'waves',
  },
  {
    id: 'exp-07',
    title: 'Thị Giác Máy Tính (Computer Vision) với PyTorch',
    authorName: 'Nguyễn Thu Trâm',
    tag: 'Chuyên sâu',
    tagColor: 'orange',
    accessMode: 'PUBLIC',
    learnerCountText: '2.7k',
    lessonCountText: '14 bài',
    iconType: 'scan',
  },
  {
    id: 'exp-08',
    title: 'Quản Trị Hệ Thống Linux Chuyên Sâu',
    authorName: 'Phạm Thức Huy',
    tag: 'Hệ thống',
    tagColor: 'amber',
    accessMode: 'PRIVATE',
    learnerCountText: '1.2k',
    lessonCountText: '20 bài',
    iconType: 'server',
  },
  {
    id: 'exp-09',
    title: 'Xác Suất Thống Kê Dành Cho Data Science',
    authorName: 'TS. Phạm Đình Trí',
    tag: 'Toán ứng dụng',
    tagColor: 'emerald',
    accessMode: 'PUBLIC',
    learnerCountText: '2.2k',
    lessonCountText: '16 bài',
    iconType: 'trend',
  },
  {
    id: 'exp-10',
    title: 'Ghi Chép Thông Minh Cornell & Spaced Repetition',
    authorName: 'Hoàng Yến',
    tag: 'Kỹ năng mềm',
    tagColor: 'amber',
    accessMode: 'PUBLIC',
    learnerCountText: '4.5k',
    lessonCountText: '8 bài',
    iconType: 'bookmark',
  },
];

function renderCardIcon(type: RandomCourseCardItem['iconType']) {
  switch (type) {
    case 'barchart':
      return <BarChart3 className="h-7 w-7 text-amber-400" />;
    case 'languages':
      return <Languages className="h-7 w-7 text-emerald-400" />;
    case 'gitfork':
      return <GitFork className="h-7 w-7 text-sky-400" />;
    case 'code':
      return <Code2 className="h-7 w-7 text-cyan-400" />;
    case 'boxes':
      return <Boxes className="h-7 w-7 text-purple-400" />;
    case 'waves':
      return <Waves className="h-7 w-7 text-teal-400" />;
    case 'scan':
      return <Scan className="h-7 w-7 text-cyan-400" />;
    case 'server':
      return <Server className="h-7 w-7 text-blue-400" />;
    case 'trend':
      return <TrendingUp className="h-7 w-7 text-pink-400" />;
    case 'bookmark':
      return <BookmarkCheck className="h-7 w-7 text-amber-400" />;
    default:
      return <Code2 className="h-7 w-7 text-brand-orange" />;
  }
}

function getTagClass(color: RandomCourseCardItem['tagColor']) {
  switch (color) {
    case 'amber':
      return 'bg-amber-500/15 text-amber-500 border border-amber-500/30';
    case 'emerald':
      return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
    case 'orange':
      return 'bg-brand-orange/15 text-brand-orange border border-brand-orange/30';
    case 'blue':
      return 'bg-blue-500/15 text-blue-400 border border-blue-500/30';
    case 'purple':
      return 'bg-purple-500/15 text-purple-400 border border-purple-500/30';
    case 'teal':
      return 'bg-teal-500/15 text-teal-400 border border-teal-500/30';
    case 'pink':
      return 'bg-pink-500/15 text-pink-400 border border-pink-500/30';
    default:
      return 'bg-secondary text-muted-foreground';
  }
}

export function RandomExploreSection() {
  const [courses, setCourses] = useState(POOL_OF_COURSES);
  const [isRotating, setIsRotating] = useState(false);

  const handleShuffle = () => {
    setIsRotating(true);
    const shuffled = [...POOL_OF_COURSES].sort(() => 0.5 - Math.random());
    setCourses(shuffled);
    setTimeout(() => setIsRotating(false), 400);
  };

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="h-5 w-1 rounded-full bg-brand-orange" aria-hidden="true" />
          <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-foreground">
            KHÁM PHÁ NGẪU NHIÊN <span className="sr-only">Đề xuất cho bạn</span>
          </h2>
        </div>

        <button
          type="button"
          onClick={handleShuffle}
          className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/80 hover:bg-secondary px-3 py-1 text-xs font-semibold text-foreground transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRotating ? 'animate-spin text-brand-orange' : ''}`} />
          <span>Làm mới danh sách</span>
        </button>
      </div>

      {/* Grid 2 rows x 5 columns = 10 vertical cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {courses.map((item) => (
          <div
            key={item.id}
            className="group flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-xs transition-all hover:border-brand-orange/40 hover:shadow-md"
          >
            <div>
              {/* Top Row: Tag badge + Access badge */}
              <div className="flex items-center justify-between gap-1 text-[10px]">
                <span className={`rounded-md px-1.5 py-0.5 font-semibold ${getTagClass(item.tagColor)}`}>
                  {item.tag}
                </span>

                <span className="inline-flex items-center gap-1 rounded-md bg-secondary/60 px-1 py-0.5 text-muted-foreground">
                  {item.accessMode === 'PUBLIC' ? (
                    <>
                      <Globe className="h-2.5 w-2.5" />
                      <span>Public</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-2.5 w-2.5" />
                      <span>Riêng tư</span>
                    </>
                  )}
                </span>
              </div>

              {/* Center colorful icon illustration */}
              <div className="my-3 flex h-14 items-center justify-center">
                {renderCardIcon(item.iconType)}
              </div>

              {/* Title & Author */}
              <h3 className="line-clamp-2 font-serif text-xs sm:text-sm font-bold text-foreground group-hover:text-brand-orange transition-colors min-h-[2.5rem] leading-snug">
                <Link to={`/courses/${item.id}`}>{item.title}</Link>
              </h3>

              <p className="mt-1 text-[11px] text-muted-foreground truncate">
                {item.authorName}
              </p>
            </div>

            {/* Bottom Row: Learners & Lessons */}
            <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{item.learnerCountText}</span>
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                <span>{item.lessonCountText}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
