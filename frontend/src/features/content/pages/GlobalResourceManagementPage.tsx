import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  Globe,
  Lock,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import { Input, Button } from '@/shared/ui';
import { useMyCoursesQuery } from '@/features/course/api/courseApi';

interface CourseStorageItem {
  id: string;
  title: string;
  updatedAtText: string;
  chaptersCount: number;
  accessMode: 'PUBLIC' | 'PRIVATE' | 'ONLY_ME';
  filesCount: number;
  usedGb: number;
  usedPercent: number;
  thumbnail?: string;
}

const DEFAULT_COURSES_STORAGE: CourseStorageItem[] = [
  {
    id: 'my-course-1',
    title: 'Python cơ bản cho người mới',
    updatedAtText: 'Cập nhật 2 ngày trước',
    chaptersCount: 8,
    accessMode: 'PUBLIC',
    filesCount: 42,
    usedGb: 1.2,
    usedPercent: 50,
  },
  {
    id: 'course-web-02',
    title: 'Lập trình Web Django & FastAPI',
    updatedAtText: 'Cập nhật 5 ngày trước',
    chaptersCount: 14,
    accessMode: 'PRIVATE',
    filesCount: 28,
    usedGb: 0.7,
    usedPercent: 29,
  },
  {
    id: 'course-dsa-03',
    title: 'Cấu trúc dữ liệu & Giải thuật',
    updatedAtText: 'Cập nhật 1 tuần trước',
    chaptersCount: 12,
    accessMode: 'PUBLIC',
    filesCount: 19,
    usedGb: 0.4,
    usedPercent: 17,
  },
  {
    id: 'course-ml-04',
    title: 'Học máy & Xử lý dữ liệu Pandas',
    updatedAtText: 'Cập nhật 2 tuần trước',
    chaptersCount: 4,
    accessMode: 'ONLY_ME',
    filesCount: 6,
    usedGb: 0.1,
    usedPercent: 4,
  },
];

export function GlobalResourceManagementPage() {
  const navigate = useNavigate();
  const { data: myCourses } = useMyCoursesQuery({ relation: 'OWNED' });

  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');
  const [page, setPage] = useState(1);

  // Merge real courses from API if available
  const coursesList: CourseStorageItem[] = useMemo(() => {
    const items = myCourses?.items;
    if (!items || items.length === 0) {
      return DEFAULT_COURSES_STORAGE;
    }
    return DEFAULT_COURSES_STORAGE.map((def, idx) => {
      const real = items[idx];
      if (real) {
        return {
          ...def,
          id: real.id || def.id,
          title: (real as any)?.title || (real as any)?.name || def.title,
        };
      }
      return def;
    });
  }, [myCourses]);

  const filteredCourses = useMemo(() => {
    let result = coursesList.filter((c) =>
      c.title.toLowerCase().includes(search.trim().toLowerCase())
    );
    result.sort((a, b) =>
      sortOrder === 'DESC' ? b.usedGb - a.usedGb : a.usedGb - b.usedGb
    );
    return result;
  }, [coursesList, search, sortOrder]);

  const getAccessBadge = (mode: 'PUBLIC' | 'PRIVATE' | 'ONLY_ME') => {
    switch (mode) {
      case 'PUBLIC':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Globe className="h-3 w-3" />
            Public
          </span>
        );
      case 'PRIVATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted/60 text-muted-foreground border border-border/70">
            <Lock className="h-3 w-3" />
            Private
          </span>
        );
      case 'ONLY_ME':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <UserCheck className="h-3 w-3" />
            Chỉ mình tôi
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans px-4 sm:px-8 py-8 space-y-8 max-w-7xl mx-auto">
      {/* 1. PAGE HEADER */}
      <div className="space-y-1">
        <h1 className="text-3xl font-serif font-bold text-foreground tracking-tight">
          Quản lý tài nguyên
        </h1>
        <p className="text-sm text-muted-foreground">
          Quản lý ảnh, video, âm thanh và tệp của các khóa học bạn tạo trên BrainMemo.
        </p>
      </div>

      {/* 2. CARD: PHÂN BỐ THEO LOẠI TÀI NGUYÊN */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground mb-6">
          Phân bố theo loại tài nguyên
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Circular donut chart gauge */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center">
            <div className="relative w-44 h-44 flex items-center justify-center">
              {/* SVG circular progress */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-muted/40"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-[#ff7a1a]"
                  strokeWidth="8"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 * (1 - 0.48)}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>

              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold font-serif text-foreground">
                  2,4 GB
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  48% đã dùng
                </span>
                <span className="text-[11px] text-muted-foreground/60">
                  Tổng số: 5,0 GB
                </span>
              </div>
            </div>

            {/* Bottom green pill */}
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Còn trống 2,6 GB</span>
            </div>
          </div>

          {/* Segmented bar and legend */}
          <div className="lg:col-span-8 space-y-6">
            {/* Multi-segment progress bar */}
            <div className="h-4 w-full rounded-full bg-muted/40 flex overflow-hidden">
              <div style={{ width: '62.5%' }} className="bg-[#ff7a1a]" title="Video: 62.5%" />
              <div style={{ width: '16.7%' }} className="bg-[#3b82f6]" title="Hình ảnh: 16.7%" />
              <div style={{ width: '8.3%' }} className="bg-[#10b981]" title="Tệp âm thanh: 8.3%" />
              <div style={{ width: '8.3%' }} className="bg-[#8b5cf6]" title="PDF & Ebook: 8.3%" />
              <div style={{ width: '4.2%' }} className="bg-[#ec4899]" title="Tệp nén ZIP/RAR: 4.2%" />
            </div>

            {/* Category legends grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
              {/* Video */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff7a1a]" />
                  <span className="text-xs font-medium text-foreground">Video</span>
                </div>
                <div className="text-xs text-muted-foreground pl-4.5">
                  1,5 GB · 62,5%
                </div>
              </div>

              {/* Hình ảnh */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" />
                  <span className="text-xs font-medium text-foreground">Hình ảnh</span>
                </div>
                <div className="text-xs text-muted-foreground pl-4.5">
                  0,4 GB · 16,7%
                </div>
              </div>

              {/* Tệp âm thanh */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#10b981]" />
                  <span className="text-xs font-medium text-foreground">Tệp âm thanh</span>
                </div>
                <div className="text-xs text-muted-foreground pl-4.5">
                  0,2 GB · 8,3%
                </div>
              </div>

              {/* PDF & Ebook */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#8b5cf6]" />
                  <span className="text-xs font-medium text-foreground">PDF & Ebook</span>
                </div>
                <div className="text-xs text-muted-foreground pl-4.5">
                  0,2 GB · 8,3%
                </div>
              </div>

              {/* Tệp nén ZIP/RAR */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ec4899]" />
                  <span className="text-xs font-medium text-foreground">Tệp nén ZIP/RAR</span>
                </div>
                <div className="text-xs text-muted-foreground pl-4.5">
                  0,1 GB · 4,2%
                </div>
              </div>

              {/* Tệp định dạng khác */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#6b7280]" />
                  <span className="text-xs font-medium text-foreground">Tệp định dạng khác</span>
                </div>
                <div className="text-xs text-muted-foreground pl-4.5">
                  0,0 GB · 0%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SECTION: DUNG LƯỢNG THEO KHÓA HỌC */}
      <div className="space-y-4">
        {/* Title with left orange line */}
        <div className="flex items-center gap-2">
          <div className="h-5 w-1 bg-[#ff7a1a] rounded-full" />
          <h2 className="text-base font-serif font-bold text-foreground">
            Dung lượng theo khóa học
          </h2>
        </div>

        {/* Search & Sort Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm khóa học theo tiêu đề hoặc thẻ..."
              className="pl-10 h-10 rounded-xl bg-card border-border/80 text-xs text-foreground placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Sắp xếp:</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'DESC' | 'ASC')}
              className="h-10 px-3 rounded-xl bg-card border border-border/80 text-xs text-foreground outline-none cursor-pointer"
            >
              <option value="DESC">Dung lượng giảm dần</option>
              <option value="ASC">Dung lượng tăng dần</option>
            </select>
          </div>
        </div>

        {/* Course Storage Table */}
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border/70 text-muted-foreground font-semibold uppercase text-[11px] tracking-wider bg-muted/20">
                  <th className="py-3.5 px-6">KHÓA HỌC</th>
                  <th className="py-3.5 px-6">QUYỀN TRUY CẬP</th>
                  <th className="py-3.5 px-6">SỐ TỆP</th>
                  <th className="py-3.5 px-6">DUNG LƯỢNG SỬ DỤNG</th>
                  <th className="py-3.5 px-6 text-right">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredCourses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground text-xs">
                      Không tìm thấy khóa học nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredCourses.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/15 transition-colors">
                      {/* Course info */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#1e232e] to-[#2a303c] border border-border/80 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                            <span className="text-base font-bold text-[#ff7a1a]">
                              {c.title.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-foreground text-xs hover:text-[#ff7a1a] transition-colors cursor-pointer">
                              {c.title}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {c.updatedAtText} · {c.chaptersCount} chương
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Access Mode */}
                      <td className="py-4 px-6">
                        {getAccessBadge(c.accessMode)}
                      </td>

                      {/* Files Count */}
                      <td className="py-4 px-6 text-foreground font-medium">
                        {c.filesCount} tệp
                      </td>

                      {/* Storage used + progress bar */}
                      <td className="py-4 px-6">
                        <div className="space-y-1.5 min-w-[140px] max-w-[200px]">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#ff7a1a] text-xs">
                              {c.usedGb.toFixed(1).replace('.', ',')} GB
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {c.usedPercent}% tổng dùng
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${c.usedPercent}%` }}
                              className="h-full bg-[#ff7a1a] rounded-full"
                            />
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-4 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/courses/${c.id}/manage/resources`)}
                          className="inline-flex items-center gap-1 text-xs text-[#ff7a1a] hover:text-[#ff7a1a]/80 font-medium transition-colors cursor-pointer"
                        >
                          <span>Xem chi tiết</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-3 border-t border-border/70 flex items-center justify-between text-xs text-muted-foreground bg-muted/10">
            <span>
              Hiển thị 1 - {filteredCourses.length} trong tổng số {filteredCourses.length} khóa học (Tối đa 50 / trang)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 w-8 p-0"
              >
                &lt;
              </Button>
              <span className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#ff7a1a] text-white font-semibold text-xs">
                {page}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled
                className="h-8 w-8 p-0"
              >
                &gt;
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
