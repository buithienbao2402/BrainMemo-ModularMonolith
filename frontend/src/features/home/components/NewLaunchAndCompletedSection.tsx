import { ChevronRight, Cpu, Palette, Shield, Server, FlaskConical, Atom, Sparkles, Calculator, BookOpen, Database } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MiniCourseRow {
  id: string;
  title: string;
  authorName: string;
  metaInfo: string;
  subMeta: string;
  iconType: 'esp32' | 'uiux' | 'security' | 'devops' | 'chemistry' | 'physics' | 'ai' | 'algebra' | 'study' | 'database';
  isCompleted?: boolean;
}

const MOCK_NEW_LAUNCH: MiniCourseRow[] = [
  {
    id: 'crs-esp-01',
    title: 'Lập Trình Vi Điều Khiển & IoT với ESP32',
    authorName: 'Vũ Khắc Nam',
    metaInfo: '1 chương',
    subMeta: '45 học viên',
    iconType: 'esp32',
  },
  {
    id: 'crs-ux-02',
    title: 'Thiết Kế Trải Nghiệm Người Dùng (UI/UX) Thực Chiến',
    authorName: 'Đặng Thảo Linh',
    metaInfo: '4 chương',
    subMeta: '210 học viên',
    iconType: 'uiux',
  },
  {
    id: 'crs-sec-03',
    title: 'An Ninh Mạng & Phòng Thủ Hệ Thống Cơ Bản',
    authorName: 'Vương Quốc Toàn',
    metaInfo: '2 chương',
    subMeta: '85 học viên',
    iconType: 'security',
  },
  {
    id: 'crs-dops-04',
    title: 'DevOps Toàn Diện: Docker & Kubernetes',
    authorName: 'Nguyễn Hoàng Long',
    metaInfo: '6 chương',
    subMeta: '312 học viên',
    iconType: 'devops',
  },
  {
    id: 'crs-chem-05',
    title: 'Hóa Học Đại Cương & Ứng Dụng Vật Liệu Mới',
    authorName: 'TS. Lê Quang Dũng',
    metaInfo: '1 chương',
    subMeta: '35 học viên',
    iconType: 'chemistry',
  },
];

const MOCK_COMPLETED: MiniCourseRow[] = [
  {
    id: 'crs-phy-06',
    title: 'Vật Lý Đại Cương: Cơ Học & Nhiệt Học',
    authorName: 'PGS. TS. Trần Văn Hùng',
    metaInfo: '16 bài học',
    subMeta: '1.4k học viên',
    iconType: 'physics',
    isCompleted: true,
  },
  {
    id: 'crs-02',
    title: 'Trí Tuệ Nhân Tạo & Prompt Engineering',
    authorName: 'Lê Quang Minh',
    metaInfo: '24 bài học',
    subMeta: '2.8k học viên',
    iconType: 'ai',
    isCompleted: true,
  },
  {
    id: 'crs-alg-09',
    title: 'Đại Số Tuyến Tính Ứng Dụng',
    authorName: 'ThS. Phan Đình Trí',
    metaInfo: '18 bài học',
    subMeta: '920 học viên',
    iconType: 'algebra',
    isCompleted: true,
  },
  {
    id: 'crs-stu-10',
    title: 'Phương Pháp Tự Học Siêu Đẳng & Ghi Nhớ',
    authorName: 'Hoàng Yến',
    metaInfo: '12 bài học',
    subMeta: '1.1k học viên',
    iconType: 'study',
    isCompleted: true,
  },
  {
    id: 'crs-db-05',
    title: 'Cơ Sở Dữ Liệu Quan Hệ SQL Nâng Cao',
    authorName: 'Vũ Quốc Cường',
    metaInfo: '30 bài học',
    subMeta: '1.7k học viên',
    iconType: 'database',
    isCompleted: true,
  },
];

function renderRowIcon(type: MiniCourseRow['iconType']) {
  switch (type) {
    case 'esp32':
      return <Cpu className="h-4 w-4 text-teal-400" />;
    case 'uiux':
      return <Palette className="h-4 w-4 text-pink-400" />;
    case 'security':
      return <Shield className="h-4 w-4 text-rose-400" />;
    case 'devops':
      return <Server className="h-4 w-4 text-sky-400" />;
    case 'chemistry':
      return <FlaskConical className="h-4 w-4 text-emerald-400" />;
    case 'physics':
      return <Atom className="h-4 w-4 text-amber-400" />;
    case 'ai':
      return <Sparkles className="h-4 w-4 text-emerald-400" />;
    case 'algebra':
      return <Calculator className="h-4 w-4 text-blue-400" />;
    case 'study':
      return <BookOpen className="h-4 w-4 text-purple-400" />;
    case 'database':
      return <Database className="h-4 w-4 text-indigo-400" />;
    default:
      return <Server className="h-4 w-4 text-brand-orange" />;
  }
}

export function NewLaunchAndCompletedSection() {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Column Left: MỚI RA MẮT */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="h-5 w-1 rounded-full bg-brand-orange" aria-hidden="true" />
            <h3 className="font-serif text-base sm:text-lg font-bold text-foreground">
              MỚI RA MẮT
            </h3>
          </div>
          <Link
            to="/courses?sort=NEWEST_LAUNCH"
            className="flex items-center gap-0.5 text-xs sm:text-sm font-semibold text-brand-orange hover:underline"
          >
            <span>Xem tất cả</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="space-y-1.5">
          {MOCK_NEW_LAUNCH.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-muted/40 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 shrink-0 rounded-xl bg-[#1c1c24] dark:bg-[#181820] border border-border/60 flex items-center justify-center">
                  {renderRowIcon(c.iconType)}
                </div>
                <div className="min-w-0 truncate">
                  <Link
                    to={`/courses/${c.id}`}
                    className="line-clamp-1 font-bold text-xs sm:text-sm text-foreground group-hover:text-brand-orange transition-colors"
                  >
                    {c.title}
                  </Link>
                  <p className="text-[11px] text-muted-foreground truncate">{c.authorName}</p>
                </div>
              </div>

              <div className="text-right text-[11px] text-muted-foreground shrink-0">
                <div className="font-medium text-foreground/80">{c.metaInfo}</div>
                <div>{c.subMeta}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Column Right: ĐÃ HOÀN THÀNH */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="h-5 w-1 rounded-full bg-brand-orange" aria-hidden="true" />
            <h3 className="font-serif text-base sm:text-lg font-bold text-foreground">
              ĐÃ HOÀN THÀNH
            </h3>
          </div>
          <Link
            to="/courses?status=COMPLETED"
            className="flex items-center gap-0.5 text-xs sm:text-sm font-semibold text-brand-orange hover:underline"
          >
            <span>Xem tất cả</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="space-y-1.5">
          {MOCK_COMPLETED.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-muted/40 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 shrink-0 rounded-xl bg-[#1c1c24] dark:bg-[#181820] border border-border/60 flex items-center justify-center">
                  {renderRowIcon(c.iconType)}
                </div>
                <div className="min-w-0 truncate">
                  <span className="inline-block rounded-md bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-400 mb-0.5">
                    Đã hoàn thành
                  </span>
                  <Link
                    to={`/courses/${c.id}`}
                    className="line-clamp-1 font-bold text-xs sm:text-sm text-foreground group-hover:text-emerald-400 transition-colors"
                  >
                    {c.title}
                  </Link>
                  <p className="text-[11px] text-muted-foreground truncate">{c.authorName}</p>
                </div>
              </div>

              <div className="text-right text-[11px] text-muted-foreground shrink-0">
                <div className="font-medium text-foreground/80">{c.metaInfo}</div>
                <div>{c.subMeta}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
