import * as React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  ChevronDown,
  EyeOff,
  Globe,
  Lock,
  RotateCcw,
  Search,
  Settings,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/shared/ui';

interface CourseRowItem {
  id: string;
  title: string;
  instructorName: string;
  instructorEmail: string;
  instructorInitials: string;
  accessMode: 'PUBLIC' | 'PRIVATE';
  status: 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'HIDDEN' | 'DELETED';
  statusLabel: string;
  reportsCount: number;
  createdAt: string;
  isDeleted?: boolean;
}

const DEFAULT_COURSES: CourseRowItem[] = [
  {
    id: 'crs-1',
    title: 'Lập trình Python chuyên sâu & Thuật toán cấu trúc dữ liệu',
    instructorName: 'TS. Trần Quốc Tuấn',
    instructorEmail: 'tuan.tq@brainmemo.edu.vn',
    instructorInitials: 'TQT',
    accessMode: 'PUBLIC',
    status: 'IN_PROGRESS',
    statusLabel: 'Đang cập nhật',
    reportsCount: 5,
    createdAt: '15/03/2024',
  },
  {
    id: 'crs-2',
    title: 'Khai phá Dữ liệu Lớn với Apache Spark & Hadoop Eco',
    instructorName: 'ThS. Hoàng Yến Vi',
    instructorEmail: 'vi.hy@brainmemo.edu.vn',
    instructorInitials: 'HYV',
    accessMode: 'PRIVATE',
    status: 'HIDDEN',
    statusLabel: 'Tạm ẩn',
    reportsCount: 2,
    createdAt: '02/08/2023',
  },
  {
    id: 'crs-3',
    title: 'Kiến trúc Hệ điều hành Hiện đại & Lập trình Nhân Linux',
    instructorName: 'TS. Vũ Hải Nam',
    instructorEmail: 'nam.vn@brainmemo.edu.vn',
    instructorInitials: 'VHN',
    accessMode: 'PUBLIC',
    status: 'COMPLETED',
    statusLabel: 'Đã hoàn thành',
    reportsCount: 0,
    createdAt: '19/11/2023',
  },
  {
    id: 'crs-4',
    title: 'An ninh Mạng & Phòng thủ Mã độc Doanh nghiệp',
    instructorName: 'PGS. Đặng Minh Khởi',
    instructorEmail: 'khoi.dm@brainmemo.edu.vn',
    instructorInitials: 'ĐMK',
    accessMode: 'PRIVATE',
    status: 'PAUSED',
    statusLabel: 'Tạm dừng',
    reportsCount: 1,
    createdAt: '05/01/2024',
  },
  {
    id: 'crs-5',
    title: 'Thiết kế Giao diện Phản hồi với Next.js & Micro-frontend',
    instructorName: 'TS. Trần Quốc Tuấn',
    instructorEmail: 'tuan.tq@brainmemo.edu.vn',
    instructorInitials: 'TQT',
    accessMode: 'PUBLIC',
    status: 'DELETED',
    statusLabel: 'Đã xóa',
    reportsCount: 0,
    createdAt: '10/10/2023',
    isDeleted: true,
  },
];

export function AdminCoursesPage() {
  const { pushToast } = useToast();
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL');
  const [accessFilter, setAccessFilter] = React.useState<'ALL' | 'PUBLIC' | 'PRIVATE'>('ALL');

  // Simulation Form states for the 3 control cards below
  const [hideReason, setHideReason] = React.useState('');
  const [hideDuration, setHideDuration] = React.useState<'7' | '14' | '30' | 'FOREVER'>('7');

  const [restoreReason, setRestoreReason] = React.useState(
    'Đã hoàn thành việc chỉnh sửa giáo trình và thẩm định bản quyền hợp lệ theo yêu cầu của Hội đồng.'
  );

  const [deleteConfirmTitle, setDeleteConfirmTitle] = React.useState('');
  const [deleteReason, setDeleteReason] = React.useState(
    'Theo quyết định kỷ luật học thuật số QĐ-2026/04 của Hội đồng Thẩm định.'
  );

  const handleExecuteHide = (e: React.FormEvent) => {
    e.preventDefault();
    pushToast({
      title: 'Tạm ẩn khóa học',
      description: 'Khóa học đã được tạm thời ẩn khỏi hệ thống công khai.',
      tone: 'default',
    });
  };

  const handleExecuteRestore = (e: React.FormEvent) => {
    e.preventDefault();
    pushToast({
      title: 'Khôi phục khóa học',
      description: 'Khóa học đã được hoàn trả trạng thái hoạt động bình thường.',
      tone: 'success',
    });
  };

  const handleExecuteDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmTitle.trim() !== 'Khai phá Dữ liệu Lớn với Apache Spark') {
      pushToast({
        title: 'Chưa thể xóa',
        description: 'Vui lòng gõ chính xác tiêu đề khóa học để xác nhận.',
        tone: 'error',
      });
      return;
    }
    pushToast({
      title: 'Đã xóa vĩnh viễn',
      description: 'Khóa học và học liệu liên quan đã bị hủy vĩnh viễn.',
      tone: 'error',
    });
    setDeleteConfirmTitle('');
  };

  const filteredCourses = DEFAULT_COURSES.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (accessFilter !== 'ALL' && c.accessMode !== accessFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.instructorName.toLowerCase().includes(q) ||
        c.instructorEmail.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8" data-testid="admin-courses-page">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-1 h-5 bg-[#f97316] rounded-full" />
          <h1 className="text-base sm:text-lg font-bold uppercase tracking-wider text-white">
            Quản lý khóa học
          </h1>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full bg-[#f97316] hover:bg-[#ea580c] px-4 py-1.5 text-xs font-semibold text-white transition-colors shadow-sm"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Kiểm duyệt hàng loạt</span>
        </button>
      </div>

      {/* Filter and Search Panel */}
      <div className="rounded-2xl border border-[#23232e] bg-[#16161d] p-5 space-y-4">
        {/* Row 1: Search and Sort */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[320px]">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên khóa học, mã môn học hoặc tên giảng viên..."
              className="w-full bg-[#181820] border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Sắp xếp:
            </span>
            <div className="relative">
              <select className="appearance-none bg-[#181820] text-zinc-300 border border-zinc-800 rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium focus:outline-none">
                <option>Mới nhất</option>
                <option>Cũ nhất</option>
                <option>Nhiều báo cáo nhất</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Row 2: Trạng thái filters */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#23232e]">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 mr-1">
            Trạng thái:
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-[#382613] text-[#fdba74] border border-[#ea580c]/50'
                : 'bg-[#181820] text-zinc-400 border border-zinc-800 hover:text-zinc-200'
            }`}
          >
            Tất cả <span className="ml-1 text-[11px] text-zinc-400">418</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('IN_PROGRESS')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === 'IN_PROGRESS'
                ? 'bg-[#182338] text-[#60a5fa] border border-[#2563eb]/50'
                : 'bg-[#181820] text-zinc-400 border border-zinc-800 hover:text-zinc-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
            Đang cập nhật <span className="text-[11px]">142</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('COMPLETED')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === 'COMPLETED'
                ? 'bg-[#14261d] text-[#6ee7b7] border border-[#10b981]/50'
                : 'bg-[#181820] text-zinc-400 border border-zinc-800 hover:text-zinc-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
            Đã hoàn thành <span className="text-[11px]">186</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('PAUSED')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === 'PAUSED'
                ? 'bg-[#292215] text-[#fbbf24] border border-[#d97706]/50'
                : 'bg-[#181820] text-zinc-400 border border-zinc-800 hover:text-zinc-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
            Tạm dừng <span className="text-[11px]">38</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('HIDDEN')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === 'HIDDEN'
                ? 'bg-[#382613] text-[#fdba74] border border-[#ea580c]/50'
                : 'bg-[#181820] text-zinc-400 border border-zinc-800 hover:text-zinc-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
            Tạm ẩn <span className="text-[11px]">36</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('DELETED')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === 'DELETED'
                ? 'bg-[#38161b] text-[#f87171] border border-[#dc2626]/50'
                : 'bg-[#181820] text-zinc-400 border border-zinc-800 hover:text-zinc-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
            Đã xóa <span className="text-[11px]">16</span>
          </button>
        </div>

        {/* Row 3: Truy cập filters */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#23232e]">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 mr-1">
            Truy cập:
          </span>
          <button
            type="button"
            onClick={() => setAccessFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              accessFilter === 'ALL'
                ? 'bg-[#24242e] text-white border border-zinc-700 shadow-sm'
                : 'bg-[#181820] text-zinc-400 border border-zinc-800 hover:text-zinc-200'
            }`}
          >
            Tất cả truy cập
          </button>
          <button
            type="button"
            onClick={() => setAccessFilter('PUBLIC')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              accessFilter === 'PUBLIC'
                ? 'bg-[#14261d] text-[#34d399] border border-[#10b981]/50'
                : 'bg-[#181820] text-zinc-400 border border-zinc-800 hover:text-zinc-200'
            }`}
          >
            <Globe className="w-3 h-3 text-[#10b981]" />
            Public (Công khai)
          </button>
          <button
            type="button"
            onClick={() => setAccessFilter('PRIVATE')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              accessFilter === 'PRIVATE'
                ? 'bg-[#1e1b2e] text-[#a78bfa] border border-[#8b5cf6]/50'
                : 'bg-[#181820] text-zinc-400 border border-zinc-800 hover:text-zinc-200'
            }`}
          >
            <Lock className="w-3 h-3 text-[#8b5cf6]" />
            Private (Nội bộ/Riêng tư)
          </button>
        </div>
      </div>

      {/* Courses Data Table */}
      <div className="rounded-2xl border border-[#23232e] bg-[#16161d] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-[#23232e] text-[11px] font-bold uppercase tracking-wider text-zinc-400 bg-[#14141a]">
                <th className="py-3 px-4">Khóa học</th>
                <th className="py-3 px-4">Giảng viên phụ trách</th>
                <th className="py-3 px-4 whitespace-nowrap">Quyền truy cập</th>
                <th className="py-3 px-4 whitespace-nowrap">Trạng thái</th>
                <th className="py-3 px-4 whitespace-nowrap">Báo cáo</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#23232e] text-xs">
              {filteredCourses.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-800/20 transition-colors">
                  {/* Khóa học */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-7 rounded bg-gradient-to-br from-amber-600/30 to-orange-900/40 border border-orange-500/30 flex items-center justify-center shrink-0">
                        <BookOpen className="w-3.5 h-3.5 text-orange-400" />
                      </div>
                      <span className={`font-semibold text-xs leading-snug ${
                        c.isDeleted ? 'text-zinc-500 line-through' : 'text-zinc-100'
                      }`}>
                        {c.title}
                      </span>
                    </div>
                  </td>

                  {/* Giảng viên */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-[#272733] text-zinc-300 text-[10px] flex items-center justify-center font-bold">
                        {c.instructorInitials}
                      </div>
                      <div>
                        <div className="font-medium text-white text-xs">{c.instructorName}</div>
                        <div className="text-[10px] text-zinc-500">{c.instructorEmail}</div>
                      </div>
                    </div>
                  </td>

                  {/* Quyền truy cập */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {c.accessMode === 'PUBLIC' ? (
                      <span className="inline-flex items-center gap-1.5 bg-[#14261d] text-[#34d399] border border-[#10b981]/40 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                        <Globe className="w-3 h-3 text-[#10b981]" />
                        Public
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 bg-[#1e1b2e] text-[#a78bfa] border border-[#8b5cf6]/40 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                        <Lock className="w-3 h-3 text-[#8b5cf6]" />
                        Private
                      </span>
                    )}
                  </td>

                  {/* Trạng thái */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {c.status === 'IN_PROGRESS' && (
                      <span className="inline-flex items-center gap-1.5 bg-[#182338] text-[#60a5fa] border border-[#2563eb]/40 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
                        Đang cập nhật
                      </span>
                    )}
                    {c.status === 'COMPLETED' && (
                      <span className="inline-flex items-center gap-1.5 bg-[#14261d] text-[#6ee7b7] border border-[#10b981]/40 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                        Đã hoàn thành
                      </span>
                    )}
                    {c.status === 'PAUSED' && (
                      <span className="inline-flex items-center gap-1.5 bg-[#292215] text-[#fbbf24] border border-[#d97706]/40 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                        Tạm dừng
                      </span>
                    )}
                    {c.status === 'HIDDEN' && (
                      <span className="inline-flex items-center gap-1.5 bg-[#382613] text-[#fdba74] border border-[#ea580c]/40 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
                        Tạm ẩn
                      </span>
                    )}
                    {c.status === 'DELETED' && (
                      <span className="inline-flex items-center gap-1.5 bg-[#38161b] text-[#f87171] border border-[#dc2626]/40 rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                        Đã xóa
                      </span>
                    )}
                  </td>

                  {/* Báo cáo */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {c.reportsCount > 0 ? (
                      <span className="text-[#f87171] font-semibold text-xs flex items-center gap-1">
                        🚩 {c.reportsCount} báo cáo
                      </span>
                    ) : (
                      <span className="text-zinc-500 text-xs">0 báo cáo</span>
                    )}
                  </td>

                  {/* Ngày tạo */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap text-zinc-400 text-xs">
                    {c.createdAt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-t border-[#23232e] text-xs text-zinc-400">
          <div>
            Hiển thị <span className="font-semibold text-white">1 - 5</span> trong tổng số <span className="font-semibold text-white">418</span> khóa học
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="px-2.5 py-1 rounded border border-zinc-800 bg-[#181820] text-zinc-400 hover:text-white text-xs"
              disabled
            >
              &lt; Trước
            </button>
            <button
              type="button"
              className="w-6 h-6 rounded bg-[#f97316] text-white font-bold flex items-center justify-center text-xs"
            >
              1
            </button>
            <button
              type="button"
              className="w-6 h-6 rounded border border-zinc-800 bg-[#181820] flex items-center justify-center text-zinc-400 hover:text-white text-xs"
            >
              2
            </button>
            <button
              type="button"
              className="w-6 h-6 rounded border border-zinc-800 bg-[#181820] flex items-center justify-center text-zinc-400 hover:text-white text-xs"
            >
              3
            </button>
            <span className="text-zinc-600 px-1">...</span>
            <button
              type="button"
              className="w-6 h-6 rounded border border-zinc-800 bg-[#181820] flex items-center justify-center text-zinc-400 hover:text-white text-xs"
            >
              42
            </button>
            <button
              type="button"
              className="px-2.5 py-1 rounded border border-zinc-800 bg-[#181820] text-zinc-400 hover:text-white text-xs"
            >
              Sau &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Visual Simulation of 3 Administrative Dispatch Methods */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-2">
          <span className="w-1 h-4 bg-[#f97316] rounded-full" />
          <h2 className="text-xs font-semibold text-zinc-300">
            Giao diện trực quan mô phỏng 3 phương thức điều phối trạng thái bảo vệ học liệu của Ban Quản trị.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Tạm ẩn khóa học */}
          <form onSubmit={handleExecuteHide} className="rounded-2xl border border-orange-500/30 bg-[#181820] p-5 space-y-4 shadow-sm flex flex-col justify-between">
            <div className="space-y-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#382613] border border-[#ea580c]/40 text-[#f97316] flex items-center justify-center">
                  <EyeOff className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-white">Tạm ẩn khóa học</h3>
              </div>

              <div className="rounded-xl bg-[#13131a] border border-[#23232e] p-3 space-y-1">
                <div className="font-semibold text-xs text-white">Lập trình Python chuyên sâu</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Khóa học sẽ tạm thời bị ẩn khỏi danh mục tìm kiếm công cộng và trang chủ của học viên mới. Học viên đã đăng ký trước đó vẫn có thể tiếp tục học.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Lý do tạm ẩn (Bắt buộc) *
                </label>
                <textarea
                  rows={2}
                  value={hideReason}
                  onChange={(e) => setHideReason(e.target.value)}
                  placeholder="Nêu rõ vi phạm bản quyền hoặc căn cứ kiểm định..."
                  className="w-full bg-[#13131a] border border-zinc-800 rounded-lg p-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Thời hạn tạm ẩn (Tùy chọn)
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setHideDuration('7')}
                    className={`py-1.5 px-2 rounded-lg border text-center transition-colors ${
                      hideDuration === '7'
                        ? 'border-[#ea580c]/60 bg-[#251710] text-[#fdba74] font-semibold'
                        : 'border-zinc-800 bg-[#13131a] text-zinc-400 hover:text-white'
                    }`}
                  >
                    Mặc định 7 ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => setHideDuration('14')}
                    className={`py-1.5 px-2 rounded-lg border text-center transition-colors ${
                      hideDuration === '14'
                        ? 'border-[#ea580c]/60 bg-[#251710] text-[#fdba74] font-semibold'
                        : 'border-zinc-800 bg-[#13131a] text-zinc-400 hover:text-white'
                    }`}
                  >
                    14 ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => setHideDuration('30')}
                    className={`py-1.5 px-2 rounded-lg border text-center transition-colors ${
                      hideDuration === '30'
                        ? 'border-[#ea580c]/60 bg-[#251710] text-[#fdba74] font-semibold'
                        : 'border-zinc-800 bg-[#13131a] text-zinc-400 hover:text-white'
                    }`}
                  >
                    30 ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => setHideDuration('FOREVER')}
                    className={`py-1.5 px-2 rounded-lg border text-center transition-colors ${
                      hideDuration === 'FOREVER'
                        ? 'border-[#ea580c]/60 bg-[#251710] text-[#fdba74] font-semibold'
                        : 'border-zinc-800 bg-[#13131a] text-zinc-400 hover:text-white'
                    }`}
                  >
                    Vô thời hạn
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800/60">
              <button
                type="button"
                onClick={() => setHideReason('')}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="bg-[#f97316] hover:bg-[#ea580c] text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-colors shadow-sm"
              >
                Xác nhận tạm ẩn
              </button>
            </div>
          </form>

          {/* Card 2: Khôi phục khóa học */}
          <form onSubmit={handleExecuteRestore} className="rounded-2xl border border-emerald-500/30 bg-[#181820] p-5 space-y-4 shadow-sm flex flex-col justify-between">
            <div className="space-y-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#14261d] border border-[#10b981]/40 text-[#10b981] flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-white">Khôi phục khóa học</h3>
              </div>

              <div className="rounded-xl bg-[#13131a] border border-[#23232e] p-3 space-y-1">
                <div className="font-semibold text-xs text-white">Khai phá Dữ liệu Lớn với Apache Spark</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Khóa học sẽ được phục hồi lại trạng thái trước khi bị ẩn/xóa. Học liệu sẽ hiển thị trở lại bình thường trên toàn hệ thống LMS.
                </p>
                <div className="pt-1.5">
                  <span className="text-[10px] text-[#34d399] font-medium bg-[#14261d] border border-[#10b981]/40 px-2 py-0.5 rounded">
                    Trạng thái phục hồi: Đang cập nhật (Public)
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Lý do khôi phục (Tùy chọn)
                </label>
                <textarea
                  rows={4}
                  value={restoreReason}
                  onChange={(e) => setRestoreReason(e.target.value)}
                  className="w-full bg-[#13131a] border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800/60">
              <button
                type="button"
                className="text-xs text-zinc-400 hover:text-white"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="bg-[#10b981] hover:bg-[#059669] text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-colors shadow-sm"
              >
                Khôi phục khóa học
              </button>
            </div>
          </form>

          {/* Card 3: Xóa vĩnh viễn khóa học */}
          <form onSubmit={handleExecuteDelete} className="rounded-2xl border border-rose-500/30 bg-[#181820] p-5 space-y-4 shadow-sm flex flex-col justify-between">
            <div className="space-y-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#38161b] border border-[#dc2626]/40 text-[#f87171] flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-[#f87171]">Xóa vĩnh viễn khóa học</h3>
              </div>

              <div className="rounded-xl bg-[#281418] border border-[#dc2626]/30 p-3 space-y-1">
                <div className="font-bold text-xs text-[#f87171] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Dữ liệu và tệp sẽ bị xóa hoàn toàn, không thể khôi phục!</span>
                </div>
                <p className="text-[11px] text-[#fca5a5]/80 leading-relaxed">
                  Mọi bài giảng video, bài tập trắc nghiệm, thảo luận và tài liệu đính kèm sẽ bị hủy vĩnh viễn khỏi hạ tầng lưu trữ S3 & cơ sở dữ liệu.
                </p>
                <div className="pt-1 text-[10px] text-zinc-400">
                  ⓘ Chỉ áp dụng cho khóa học: Đã xóa hoặc Tạm ẩn
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Nhập chính xác tên khóa học để xác nhận an toàn:
                </label>
                <div className="text-[11px] text-[#f87171] font-mono bg-[#14141a] px-2 py-1 rounded border border-zinc-800">
                  Khai phá Dữ liệu Lớn với Apache Spark
                </div>
                <input
                  type="text"
                  value={deleteConfirmTitle}
                  onChange={(e) => setDeleteConfirmTitle(e.target.value)}
                  placeholder="Gõ lại chính xác tiêu đề trên..."
                  className="w-full bg-[#13131a] border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Lý do xóa vĩnh viễn (Bắt buộc) *
                </label>
                <textarea
                  rows={2}
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full bg-[#13131a] border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-red-500 resize-none leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800/60">
              <button
                type="button"
                onClick={() => setDeleteConfirmTitle('')}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa vĩnh viễn học liệu</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
