import { useState } from 'react';
import { Heart, Star, Flame, Crown, Code2, Sparkles, Binary, Layout, Atom, Database, Shield, Cpu, BookOpen, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LeaderboardItem {
  rank: number;
  id: string;
  title: string;
  authorName: string;
  metricValue: string;
  iconType: 'python' | 'ai' | 'math' | 'frontend' | 'database' | 'physics' | 'ml' | 'os' | 'algebra' | 'study';
}

const TOP_NOMINATIONS: LeaderboardItem[] = [
  { rank: 1, id: 'crs-01', title: 'Python Nâng Cao & Tối Ưu Thuật Toán', authorName: 'TS. Đỗ Hoàng Nam', metricValue: '1,250 đề cử', iconType: 'python' },
  { rank: 2, id: 'crs-02', title: 'Trí Tuệ Nhân Tạo & Kỹ Thuật Prompting', authorName: 'Lê Quang Minh', metricValue: '980 đề cử', iconType: 'ai' },
  { rank: 3, id: 'crs-03', title: 'Toán Rời Rạc & Thiết Kế Logic Thuật Toán', authorName: 'ThS. Nguyễn Lan Anh', metricValue: '840 đề cử', iconType: 'math' },
  { rank: 4, id: 'crs-04', title: 'Kiến Trúc Frontend Chuyên Nghiệp', authorName: 'Trần Đức Toàn', metricValue: '710 đề cử', iconType: 'frontend' },
  { rank: 5, id: 'crs-db-05', title: 'Cơ Sở Dữ Liệu Phân Tán SQL & NoSQL', authorName: 'Vũ Quốc Cường', metricValue: '650 đề cử', iconType: 'database' },
  { rank: 6, id: 'crs-phy-06', title: 'Vật Lý Đại Cương: Cơ Học & Nhiệt', authorName: 'PGS. TS. Trần Văn Hùng', metricValue: '580 đề cử', iconType: 'physics' },
  { rank: 7, id: 'crs-ml-07', title: 'Học Máy & Nhận Dạng Mẫu Toàn Diện', authorName: 'Nguyễn Thu Trâm', metricValue: '520 đề cử', iconType: 'ml' },
  { rank: 8, id: 'crs-os-08', title: 'Hệ Điều Hành Linux & Lập Trình Hệ Thống', authorName: 'Phạm Thức Huy', metricValue: '480 đề cử', iconType: 'os' },
  { rank: 9, id: 'crs-alg-09', title: 'Đại Số Tuyến Tính Cho Kỹ Sư AI', authorName: 'ThS. Phan Đình Trí', metricValue: '410 đề cử', iconType: 'algebra' },
  { rank: 10, id: 'crs-stu-10', title: 'Kỹ Năng Đọc Sách & Ghi Chép Thông Minh', authorName: 'Hoàng Yến', metricValue: '370 đề cử', iconType: 'study' },
];

const TOP_TRENDING: LeaderboardItem[] = [
  { rank: 1, id: 'crs-02', title: 'Trí Tuệ Nhân Tạo & Prompt Engineering', authorName: 'Lê Quang Minh', metricValue: '5,420 học viên', iconType: 'ai' },
  { rank: 2, id: 'crs-04', title: 'Lập Trình Giao Diện Web Hiện Đại', authorName: 'Trần Đức Toàn', metricValue: '5,100 học viên', iconType: 'frontend' },
  { rank: 3, id: 'crs-01', title: 'Python Nâng Cao & Tối Ưu Thuật Toán', authorName: 'TS. Đỗ Hoàng Nam', metricValue: '4,850 học viên', iconType: 'python' },
  { rank: 4, id: 'crs-03', title: 'Toán Rời Rạc & Logic Ứng Dụng', authorName: 'ThS. Nguyễn Lan Anh', metricValue: '3,120 học viên', iconType: 'math' },
  { rank: 5, id: 'crs-ml-07', title: 'Machine Learning Từ Cơ Bản Đến Nâng Cao', authorName: 'Nguyễn Thu Trâm', metricValue: '2,890 học viên', iconType: 'ml' },
  { rank: 6, id: 'crs-stu-10', title: 'Phương Pháp Tự Học Siêu Đẳng', authorName: 'Hoàng Yến', metricValue: '2,410 học viên', iconType: 'study' },
  { rank: 7, id: 'crs-db-05', title: 'Cấu Trúc Dữ Liệu Phân Tán', authorName: 'Vũ Quốc Cường', metricValue: '2,150 học viên', iconType: 'database' },
  { rank: 8, id: 'crs-os-08', title: 'Hệ Thống Linux Căn Bản', authorName: 'Phạm Thức Huy', metricValue: '1,940 học viên', iconType: 'os' },
  { rank: 9, id: 'crs-alg-09', title: 'Đại Số Tuyến Tính Ứng Dụng', authorName: 'ThS. Phan Đình Trí', metricValue: '1,820 học viên', iconType: 'algebra' },
  { rank: 10, id: 'crs-stu-11', title: 'Kỹ Năng Đọc Nhanh & Ghi Nhớ', authorName: 'Hoàng Yến', metricValue: '1,540 học viên', iconType: 'study' },
];

const TOP_RATINGS: LeaderboardItem[] = [
  { rank: 1, id: 'crs-02', title: 'Trí Tuệ Nhân Tạo & Prompt Engineering', authorName: 'Lê Quang Minh', metricValue: '⭐ 5.0 (350)', iconType: 'ai' },
  { rank: 2, id: 'crs-01', title: 'Python Nâng Cao & Tối Ưu Thuật Toán', authorName: 'TS. Đỗ Hoàng Nam', metricValue: '⭐ 4.9 (440)', iconType: 'python' },
  { rank: 3, id: 'crs-03', title: 'Toán Rời Rạc & Thiết Kế Logic', authorName: 'ThS. Nguyễn Lan Anh', metricValue: '⭐ 4.9 (320)', iconType: 'math' },
  { rank: 4, id: 'crs-04', title: 'Lập Trình Giao Diện Web Hiện Đại', authorName: 'Trần Đức Toàn', metricValue: '⭐ 4.8 (185)', iconType: 'frontend' },
  { rank: 5, id: 'crs-phy-06', title: 'Vật Lý Đại Cương: Cơ Học', authorName: 'PGS. TS. Trần Văn Hùng', metricValue: '⭐ 4.8 (210)', iconType: 'physics' },
  { rank: 6, id: 'crs-db-05', title: 'Cơ Sở Dữ Liệu Phân Tán', authorName: 'Vũ Quốc Cường', metricValue: '⭐ 4.7 (140)', iconType: 'database' },
  { rank: 7, id: 'crs-ml-07', title: 'Học Máy: Từ Cơ Bản Đến Ứng Dụng', authorName: 'Nguyễn Thu Trâm', metricValue: '⭐ 4.7 (120)', iconType: 'ml' },
  { rank: 8, id: 'crs-os-08', title: 'Hệ Thống Linux Căn Bản', authorName: 'Phạm Thức Huy', metricValue: '⭐ 4.6 (155)', iconType: 'os' },
  { rank: 9, id: 'crs-alg-09', title: 'Đại Số Tuyến Tính Cơ Bản', authorName: 'ThS. Phan Đình Trí', metricValue: '⭐ 4.6 (130)', iconType: 'algebra' },
  { rank: 10, id: 'crs-stu-11', title: 'Kỹ Năng Đọc Nhanh & Ghi Nhớ', authorName: 'Hoàng Yến', metricValue: '⭐ 4.5 (110)', iconType: 'study' },
];

function renderMiniIcon(type: LeaderboardItem['iconType']) {
  switch (type) {
    case 'python':
      return <Code2 className="h-3.5 w-3.5 text-amber-400" />;
    case 'ai':
      return <Sparkles className="h-3.5 w-3.5 text-emerald-400" />;
    case 'math':
      return <Binary className="h-3.5 w-3.5 text-blue-400" />;
    case 'frontend':
      return <Layout className="h-3.5 w-3.5 text-cyan-400" />;
    case 'database':
      return <Database className="h-3.5 w-3.5 text-indigo-400" />;
    case 'physics':
      return <Atom className="h-3.5 w-3.5 text-purple-400" />;
    case 'ml':
      return <Cpu className="h-3.5 w-3.5 text-pink-400" />;
    case 'os':
      return <Shield className="h-3.5 w-3.5 text-teal-400" />;
    case 'algebra':
      return <Layers className="h-3.5 w-3.5 text-amber-500" />;
    case 'study':
      return <BookOpen className="h-3.5 w-3.5 text-yellow-400" />;
    default:
      return <Code2 className="h-3.5 w-3.5 text-brand-orange" />;
  }
}

export function LeaderboardSection() {
  const [windowPeriod, setWindowPeriod] = useState<'WEEK' | 'MONTH' | 'ALL_TIME'>('WEEK');

  return (
    <section className="space-y-4">
      {/* Header + Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="h-5 w-1 rounded-full bg-brand-orange" aria-hidden="true" />
          <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-foreground">
            BẢNG XẾP HẠNG <span className="sr-only">Bảng xếp hạng Top 10</span>
          </h2>
          <span className="text-xs text-muted-foreground hidden sm:inline ml-2 font-normal">
            Theo lượt đề cử, lượt xem và đánh giá
          </span>
        </div>

        {/* Tab pills */}
        <div className="inline-flex items-center rounded-full border border-border bg-secondary/80 dark:bg-[#181820] p-1 text-xs gap-1">
          <button
            type="button"
            onClick={() => setWindowPeriod('WEEK')}
            className={`rounded-full px-3 py-1 font-semibold transition-all ${
              windowPeriod === 'WEEK'
                ? 'bg-brand-orange text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tuần này
          </button>
          <button
            type="button"
            aria-label="Tháng"
            onClick={() => setWindowPeriod('MONTH')}
            className={`rounded-full px-3 py-1 font-semibold transition-all ${
              windowPeriod === 'MONTH'
                ? 'bg-brand-orange text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tháng này
          </button>
          <button
            type="button"
            onClick={() => setWindowPeriod('ALL_TIME')}
            className={`rounded-full px-3 py-1 font-semibold transition-all ${
              windowPeriod === 'ALL_TIME'
                ? 'bg-brand-orange text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Toàn thời gian
          </button>
        </div>
      </div>

      {/* 3 Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: Top Đề cử */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
              <Heart className="h-4 w-4 fill-red-500 text-red-500" />
              <span>TOP ĐỀ CỬ</span>
              <button type="button" aria-label="Đề cử" className="sr-only">Đề cử</button>
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              LƯỢT ĐỀ CỬ
            </span>
          </div>

          <div className="space-y-1">
            {TOP_NOMINATIONS.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2.5 py-1.5 px-2 rounded-xl hover:bg-muted/40 transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {item.rank === 1 ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-bold text-xs bg-amber-500/20 text-amber-500 border border-amber-500/40">
                      <Crown className="h-3 w-3 fill-amber-400 text-amber-400" />
                    </span>
                  ) : item.rank === 2 ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-bold text-xs bg-slate-400/20 text-slate-300 border border-slate-400/40">
                      2
                    </span>
                  ) : item.rank === 3 ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-bold text-xs bg-amber-700/20 text-amber-600 border border-amber-700/40">
                      3
                    </span>
                  ) : (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center font-semibold text-xs text-muted-foreground">
                      {item.rank}
                    </span>
                  )}

                  <div className="h-7 w-7 shrink-0 rounded-md bg-[#1c1c24] dark:bg-[#181820] border border-border/60 flex items-center justify-center">
                    {renderMiniIcon(item.iconType)}
                  </div>

                  <div className="truncate min-w-0">
                    <Link
                      to={`/courses/${item.id}`}
                      className="font-bold text-xs text-foreground group-hover:text-brand-orange transition-colors truncate block"
                    >
                      {item.title}
                    </Link>
                    <p className="text-[11px] text-muted-foreground truncate">{item.authorName}</p>
                  </div>
                </div>

                <span className="text-xs font-bold text-brand-orange shrink-0">
                  {item.metricValue}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Top Thịnh hành */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
              <Flame className="h-4 w-4 fill-amber-500 text-amber-500" />
              <span>TOP THỊNH HÀNH</span>
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              HỌC VIÊN
            </span>
          </div>

          <div className="space-y-1">
            {TOP_TRENDING.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2.5 py-1.5 px-2 rounded-xl hover:bg-muted/40 transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {item.rank === 1 ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-bold text-xs bg-amber-500/20 text-amber-500 border border-amber-500/40">
                      <Crown className="h-3 w-3 fill-amber-400 text-amber-400" />
                    </span>
                  ) : item.rank === 2 ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-bold text-xs bg-slate-400/20 text-slate-300 border border-slate-400/40">
                      2
                    </span>
                  ) : item.rank === 3 ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-bold text-xs bg-amber-700/20 text-amber-600 border border-amber-700/40">
                      3
                    </span>
                  ) : (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center font-semibold text-xs text-muted-foreground">
                      {item.rank}
                    </span>
                  )}

                  <div className="h-7 w-7 shrink-0 rounded-md bg-[#1c1c24] dark:bg-[#181820] border border-border/60 flex items-center justify-center">
                    {renderMiniIcon(item.iconType)}
                  </div>

                  <div className="truncate min-w-0">
                    <Link
                      to={`/courses/${item.id}`}
                      className="font-bold text-xs text-foreground group-hover:text-brand-orange transition-colors truncate block"
                    >
                      {item.title}
                    </Link>
                    <p className="text-[11px] text-muted-foreground truncate">{item.authorName}</p>
                  </div>
                </div>

                <span className="text-xs font-bold text-brand-orange shrink-0">
                  {item.metricValue}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Top Đánh giá */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span>TOP ĐÁNH GIÁ</span>
            </div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              ĐIỂM ĐÁNH GIÁ
            </span>
          </div>

          <div className="space-y-1">
            {TOP_RATINGS.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2.5 py-1.5 px-2 rounded-xl hover:bg-muted/40 transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {item.rank === 1 ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-bold text-xs bg-amber-500/20 text-amber-500 border border-amber-500/40">
                      <Crown className="h-3 w-3 fill-amber-400 text-amber-400" />
                    </span>
                  ) : item.rank === 2 ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-bold text-xs bg-slate-400/20 text-slate-300 border border-slate-400/40">
                      2
                    </span>
                  ) : item.rank === 3 ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-bold text-xs bg-amber-700/20 text-amber-600 border border-amber-700/40">
                      3
                    </span>
                  ) : (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center font-semibold text-xs text-muted-foreground">
                      {item.rank}
                    </span>
                  )}

                  <div className="h-7 w-7 shrink-0 rounded-md bg-[#1c1c24] dark:bg-[#181820] border border-border/60 flex items-center justify-center">
                    {renderMiniIcon(item.iconType)}
                  </div>

                  <div className="truncate min-w-0">
                    <Link
                      to={`/courses/${item.id}`}
                      className="font-bold text-xs text-foreground group-hover:text-brand-orange transition-colors truncate block"
                    >
                      {item.title}
                    </Link>
                    <p className="text-[11px] text-muted-foreground truncate">{item.authorName}</p>
                  </div>
                </div>

                <span className="text-xs font-bold text-brand-orange shrink-0">
                  {item.metricValue}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
