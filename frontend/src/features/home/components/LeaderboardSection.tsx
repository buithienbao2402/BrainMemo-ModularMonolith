import { useState } from 'react';
import { Heart, Star, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LeaderboardItem {
  rank: number;
  id: string;
  title: string;
  authorName: string;
  metricValue: string;
}

const MOCK_LEADERBOARDS: Record<
  'WEEK' | 'MONTH' | 'ALL_TIME',
  {
    topNominations: LeaderboardItem[];
    topRatings: LeaderboardItem[];
    topLearners: LeaderboardItem[];
  }
> = {
  WEEK: {
    topNominations: [
      { rank: 1, id: 'c-1', title: 'Python Nâng Cao & Tối Ưu', authorName: 'TS. Đỗ Hoàng Nam', metricValue: '342 đề cử' },
      { rank: 2, id: 'c-2', title: 'Trí Tuệ Nhân Tạo & LLM', authorName: 'ThS. Nguyễn Lan Anh', metricValue: '289 đề cử' },
      { rank: 3, id: 'c-3', title: 'React 19 & Fullstack Architecture', authorName: 'Kỹ sư Vũ Đạt', metricValue: '215 đề cử' },
      { rank: 4, id: 'c-4', title: 'Cấu Trúc Dữ Liệu Nâng Cao', authorName: 'TS. Trần Khoa', metricValue: '198 đề cử' },
      { rank: 5, id: 'c-5', title: 'Toán Rời Rạc Ứng Dụng', authorName: 'PGS. Lê Huy', metricValue: '156 đề cử' },
    ],
    topRatings: [
      { rank: 1, id: 'c-2', title: 'Trí Tuệ Nhân Tạo & LLM', authorName: 'ThS. Nguyễn Lan Anh', metricValue: '4.98 ⭐' },
      { rank: 2, id: 'c-1', title: 'Python Nâng Cao & Tối Ưu', authorName: 'TS. Đỗ Hoàng Nam', metricValue: '4.95 ⭐' },
      { rank: 3, id: 'c-6', title: 'Machine Learning Cơ Bản', authorName: 'TS. Hoàng Hà', metricValue: '4.92 ⭐' },
      { rank: 4, id: 'c-3', title: 'React 19 & Fullstack Architecture', authorName: 'Kỹ sư Vũ Đạt', metricValue: '4.89 ⭐' },
      { rank: 5, id: 'c-7', title: 'Thiết Kế Hệ Thống Lớn', authorName: 'TS. Phạm Hùng', metricValue: '4.85 ⭐' },
    ],
    topLearners: [
      { rank: 1, id: 'c-1', title: 'Python Nâng Cao & Tối Ưu', authorName: 'TS. Đỗ Hoàng Nam', metricValue: '1,420 học viên' },
      { rank: 2, id: 'c-3', title: 'React 19 & Fullstack Architecture', authorName: 'Kỹ sư Vũ Đạt', metricValue: '1,280 học viên' },
      { rank: 3, id: 'c-2', title: 'Trí Tuệ Nhân Tạo & LLM', authorName: 'ThS. Nguyễn Lan Anh', metricValue: '990 học viên' },
      { rank: 4, id: 'c-4', title: 'Cấu Trúc Dữ Liệu Nâng Cao', authorName: 'TS. Trần Khoa', metricValue: '850 học viên' },
      { rank: 5, id: 'c-8', title: 'An Toàn Thông Tin Ứng Dụng', authorName: 'ThS. Đặng Tuấn', metricValue: '720 học viên' },
    ],
  },
  MONTH: {
    topNominations: [
      { rank: 1, id: 'c-2', title: 'Trí Tuệ Nhân Tạo & LLM', authorName: 'ThS. Nguyễn Lan Anh', metricValue: '1,240 đề cử' },
      { rank: 2, id: 'c-1', title: 'Python Nâng Cao & Tối Ưu', authorName: 'TS. Đỗ Hoàng Nam', metricValue: '1,120 đề cử' },
      { rank: 3, id: 'c-3', title: 'React 19 & Fullstack Architecture', authorName: 'Kỹ sư Vũ Đạt', metricValue: '980 đề cử' },
      { rank: 4, id: 'c-7', title: 'Thiết Kế Hệ Thống Lớn', authorName: 'TS. Phạm Hùng', metricValue: '850 đề cử' },
      { rank: 5, id: 'c-4', title: 'Cấu Trúc Dữ Liệu Nâng Cao', authorName: 'TS. Trần Khoa', metricValue: '710 đề cử' },
    ],
    topRatings: [
      { rank: 1, id: 'c-1', title: 'Python Nâng Cao & Tối Ưu', authorName: 'TS. Đỗ Hoàng Nam', metricValue: '4.97 ⭐' },
      { rank: 2, id: 'c-2', title: 'Trí Tuệ Nhân Tạo & LLM', authorName: 'ThS. Nguyễn Lan Anh', metricValue: '4.96 ⭐' },
      { rank: 3, id: 'c-6', title: 'Machine Learning Cơ Bản', authorName: 'TS. Hoàng Hà', metricValue: '4.91 ⭐' },
      { rank: 4, id: 'c-8', title: 'An Toàn Thông Tin Ứng Dụng', authorName: 'ThS. Đặng Tuấn', metricValue: '4.88 ⭐' },
      { rank: 5, id: 'c-3', title: 'React 19 & Fullstack Architecture', authorName: 'Kỹ sư Vũ Đạt', metricValue: '4.86 ⭐' },
    ],
    topLearners: [
      { rank: 1, id: 'c-1', title: 'Python Nâng Cao & Tối Ưu', authorName: 'TS. Đỗ Hoàng Nam', metricValue: '4,520 học viên' },
      { rank: 2, id: 'c-2', title: 'Trí Tuệ Nhân Tạo & LLM', authorName: 'ThS. Nguyễn Lan Anh', metricValue: '3,890 học viên' },
      { rank: 3, id: 'c-3', title: 'React 19 & Fullstack Architecture', authorName: 'Kỹ sư Vũ Đạt', metricValue: '3,210 học viên' },
      { rank: 4, id: 'c-4', title: 'Cấu Trúc Dữ Liệu Nâng Cao', authorName: 'TS. Trần Khoa', metricValue: '2,400 học viên' },
      { rank: 5, id: 'c-7', title: 'Thiết Kế Hệ Thống Lớn', authorName: 'TS. Phạm Hùng', metricValue: '1,980 học viên' },
    ],
  },
  ALL_TIME: {
    topNominations: [
      { rank: 1, id: 'c-1', title: 'Python Nâng Cao & Tối Ưu', authorName: 'TS. Đỗ Hoàng Nam', metricValue: '5,800 đề cử' },
      { rank: 2, id: 'c-2', title: 'Trí Tuệ Nhân Tạo & LLM', authorName: 'ThS. Nguyễn Lan Anh', metricValue: '4,900 đề cử' },
      { rank: 3, id: 'c-4', title: 'Cấu Trúc Dữ Liệu Nâng Cao', authorName: 'TS. Trần Khoa', metricValue: '3,850 đề cử' },
      { rank: 4, id: 'c-3', title: 'React 19 & Fullstack Architecture', authorName: 'Kỹ sư Vũ Đạt', metricValue: '3,200 đề cử' },
      { rank: 5, id: 'c-5', title: 'Toán Rời Rạc Ứng Dụng', authorName: 'PGS. Lê Huy', metricValue: '2,900 đề cử' },
    ],
    topRatings: [
      { rank: 1, id: 'c-2', title: 'Trí Tuệ Nhân Tạo & LLM', authorName: 'ThS. Nguyễn Lan Anh', metricValue: '4.99 ⭐' },
      { rank: 2, id: 'c-1', title: 'Python Nâng Cao & Tối Ưu', authorName: 'TS. Đỗ Hoàng Nam', metricValue: '4.96 ⭐' },
      { rank: 3, id: 'c-6', title: 'Machine Learning Cơ Bản', authorName: 'TS. Hoàng Hà', metricValue: '4.93 ⭐' },
      { rank: 4, id: 'c-3', title: 'React 19 & Fullstack Architecture', authorName: 'Kỹ sư Vũ Đạt', metricValue: '4.90 ⭐' },
      { rank: 5, id: 'c-4', title: 'Cấu Trúc Dữ Liệu Nâng Cao', authorName: 'TS. Trần Khoa', metricValue: '4.88 ⭐' },
    ],
    topLearners: [
      { rank: 1, id: 'c-1', title: 'Python Nâng Cao & Tối Ưu', authorName: 'TS. Đỗ Hoàng Nam', metricValue: '18,400 học viên' },
      { rank: 2, id: 'c-4', title: 'Cấu Trúc Dữ Liệu Nâng Cao', authorName: 'TS. Trần Khoa', metricValue: '15,200 học viên' },
      { rank: 3, id: 'c-2', title: 'Trí Tuệ Nhân Tạo & LLM', authorName: 'ThS. Nguyễn Lan Anh', metricValue: '12,900 học viên' },
      { rank: 4, id: 'c-3', title: 'React 19 & Fullstack Architecture', authorName: 'Kỹ sư Vũ Đạt', metricValue: '9,800 học viên' },
      { rank: 5, id: 'c-5', title: 'Toán Rời Rạc Ứng Dụng', authorName: 'PGS. Lê Huy', metricValue: '8,400 học viên' },
    ],
  },
};

export function LeaderboardSection() {
  const [windowPeriod, setWindowPeriod] = useState<'WEEK' | 'MONTH' | 'ALL_TIME'>('WEEK');

  const currentData = MOCK_LEADERBOARDS[windowPeriod];

  return (
    <section className="space-y-4">
      {/* Header + Segmented Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-3">
          <span className="h-6 w-1 rounded-full bg-brand-orange" aria-hidden="true" />
          <h2 className="font-serif text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            BẢNG XẾP HẠNG
          </h2>
        </div>

        {/* Segmented tabs */}
        <div className="inline-flex items-center rounded-full border border-border bg-secondary/80 p-1 text-xs">
          {(
            [
              { id: 'WEEK', label: 'Tuần này' },
              { id: 'MONTH', label: 'Tháng này' },
              { id: 'ALL_TIME', label: 'Tất cả' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setWindowPeriod(tab.id)}
              className={`rounded-full px-3 py-1 font-semibold transition-all ${
                windowPeriod === tab.id
                  ? 'bg-card text-brand-orange shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3 Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: Top Đề cử */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3 text-brand-orange">
            <Heart className="h-4 w-4 fill-brand-orange" />
            <h3 className="font-serif text-base font-bold text-foreground">Top Đề cử</h3>
          </div>
          <div className="space-y-2.5">
            {currentData.topNominations.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-bold text-xs ${
                      item.rank === 1
                        ? 'bg-amber-400 text-black'
                        : item.rank === 2
                        ? 'bg-zinc-300 text-black'
                        : item.rank === 3
                        ? 'bg-amber-700 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {item.rank}
                  </span>
                  <div className="truncate">
                    <Link to={`/courses/${item.id}`} className="font-semibold text-foreground hover:text-brand-orange truncate block">
                      {item.title}
                    </Link>
                    <span className="text-muted-foreground text-[11px]">{item.authorName}</span>
                  </div>
                </div>
                <span className="font-semibold text-brand-orange shrink-0">{item.metricValue}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Top Đánh giá */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3 text-amber-500">
            <Star className="h-4 w-4 fill-amber-500" />
            <h3 className="font-serif text-base font-bold text-foreground">Top Đánh giá</h3>
          </div>
          <div className="space-y-2.5">
            {currentData.topRatings.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-bold text-xs ${
                      item.rank === 1
                        ? 'bg-amber-400 text-black'
                        : item.rank === 2
                        ? 'bg-zinc-300 text-black'
                        : item.rank === 3
                        ? 'bg-amber-700 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {item.rank}
                  </span>
                  <div className="truncate">
                    <Link to={`/courses/${item.id}`} className="font-semibold text-foreground hover:text-brand-orange truncate block">
                      {item.title}
                    </Link>
                    <span className="text-muted-foreground text-[11px]">{item.authorName}</span>
                  </div>
                </div>
                <span className="font-semibold text-amber-500 shrink-0">{item.metricValue}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Top Học viên */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3 text-blue-500">
            <Users className="h-4 w-4" />
            <h3 className="font-serif text-base font-bold text-foreground">Top Lượt học viên</h3>
          </div>
          <div className="space-y-2.5">
            {currentData.topLearners.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-bold text-xs ${
                      item.rank === 1
                        ? 'bg-amber-400 text-black'
                        : item.rank === 2
                        ? 'bg-zinc-300 text-black'
                        : item.rank === 3
                        ? 'bg-amber-700 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {item.rank}
                  </span>
                  <div className="truncate">
                    <Link to={`/courses/${item.id}`} className="font-semibold text-foreground hover:text-brand-orange truncate block">
                      {item.title}
                    </Link>
                    <span className="text-muted-foreground text-[11px]">{item.authorName}</span>
                  </div>
                </div>
                <span className="font-semibold text-foreground shrink-0">{item.metricValue}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
