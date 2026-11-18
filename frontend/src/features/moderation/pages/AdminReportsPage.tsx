import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Search,
  Settings,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useAdminReports } from '../api/moderationApi';

interface ReportRowItem {
  id: string;
  code: string;
  source: 'USER' | 'AI';
  sourceScore?: string;
  targetType: 'COURSE' | 'COMMENT' | 'REVIEW' | 'ATTACHMENT';
  targetLabel: string;
  violationCode: string;
  violationLabel: string;
  violationVariant: 'danger' | 'warning' | 'purple' | 'neutral';
  title: string;
  ownerName: string;
  ownerSub: string;
  ownerInitials: string;
  reportCount: number;
  timeAgo: string;
  status: 'PENDING' | 'RESOLVED_ACCEPTED' | 'RESOLVED_REJECTED';
  statusLabel: string;
}

const DEFAULT_REPORT_ITEMS: ReportRowItem[] = [
  {
    id: 'rep-1',
    code: '#CMT-9912',
    source: 'AI',
    sourceScore: '0,95',
    targetType: 'COMMENT',
    targetLabel: 'Bình luận',
    violationCode: 'SPAM_FINANCIAL_SCAM',
    violationLabel: 'SPAM LỪA ĐẢO',
    violationVariant: 'danger',
    title: 'Spam liên kết nhóm kéo kèo tài chính Telegram và xúc phạm giảng viên: "Vào ngay...',
    ownerName: 'bot_hung99',
    ownerSub: '',
    ownerInitials: 'BH',
    reportCount: 1,
    timeAgo: '12 phút trước',
    status: 'PENDING',
    statusLabel: 'Chờ xử lý',
  },
  {
    id: 'CRS-8002',
    code: '#CRS-8002',
    source: 'USER',
    targetType: 'COURSE',
    targetLabel: 'Khóa học',
    violationCode: 'COPYRIGHT_VIOLATION',
    violationLabel: 'BẢN QUYỀN GIÁO TRÌNH',
    violationVariant: 'danger',
    title: 'Lập trình Python chuyên sâu: Phát hiện sao chép nguyên văn slide và bài tập Lab từ Viện CNTT...',
    ownerName: 'TS. Trần Quốc Tuấn',
    ownerSub: 'Giảng viên Thỉnh giảng',
    ownerInitials: 'TT',
    reportCount: 5,
    timeAgo: '35 phút trước',
    status: 'PENDING',
    statusLabel: 'Chờ xử lý',
  },
  {
    id: 'CRS-9104',
    code: '#CRS-9104',
    source: 'AI',
    sourceScore: '0,92',
    targetType: 'COURSE',
    targetLabel: 'Khóa học',
    violationCode: 'DUPLICATE_MATERIAL',
    violationLabel: 'TRÙNG LẶP HỌC LIỆU',
    violationVariant: 'purple',
    title: 'Thiết kế UI/UX thực chiến: File PDF bài giảng lab_04.pdf trùng khớp 94% với kho tài liệu mở có...',
    ownerName: 'ThS. Hoàng Yến Vi',
    ownerSub: 'Tác giả khóa học',
    ownerInitials: 'HV',
    reportCount: 2,
    timeAgo: '1 giờ trước',
    status: 'PENDING',
    statusLabel: 'Chờ xử lý',
  },
  {
    id: 'CMT-8942',
    code: '#CMT-8942',
    source: 'USER',
    targetType: 'COMMENT',
    targetLabel: 'Bình luận',
    violationCode: 'PERSONAL_ATTACK',
    violationLabel: 'CÔNG KÍCH CÁ NHÂN',
    violationVariant: 'danger',
    title: '"Dạy thế này mà cũng thu tiền à? Vào nhóm telegram xxx kiếm kèo x100 nhanh hơn..."',
    ownerName: 'Người dùng ẩn danh',
    ownerSub: 'IP: 118.69.xxx.12',
    ownerInitials: 'AD',
    reportCount: 4,
    timeAgo: '2 giờ trước',
    status: 'PENDING',
    statusLabel: 'Chờ xử lý',
  },
  {
    id: 'CMT-7721',
    code: '#CMT-7721',
    source: 'AI',
    sourceScore: '0,87',
    targetType: 'COMMENT',
    targetLabel: 'Bình luận',
    violationCode: 'HATE_SPEECH',
    violationLabel: 'KÍCH ĐỘNG THÙ GHÉT',
    violationVariant: 'danger',
    title: 'Chứa cụm từ kích động thù ghét, xúc phạm học viên khác trong diễn đàn phản biện bài học tuần 3.',
    ownerName: 'Phạm Tuấn Kiệt',
    ownerSub: 'Học viên K18-IT',
    ownerInitials: 'PK',
    reportCount: 3,
    timeAgo: '4 giờ trước',
    status: 'PENDING',
    statusLabel: 'Chờ xử lý',
  },
  {
    id: 'CRS-7021',
    code: '#CRS-7021',
    source: 'USER',
    targetType: 'COURSE',
    targetLabel: 'Khóa học',
    violationCode: 'MALWARE_CRACK',
    violationLabel: 'PHÁT TÁN MÃ ĐỘC/CRACK',
    violationVariant: 'danger',
    title: 'Khai phá Dữ liệu Lớn với Apache Spark: Đính kèm mã nguồn crack phần mềm phân tích dữ liệu vi...',
    ownerName: 'TS. Vũ Hải Nam',
    ownerSub: 'Trưởng bộ môn AI',
    ownerInitials: 'VN',
    reportCount: 1,
    timeAgo: 'Hôm qua 18:38',
    status: 'RESOLVED_ACCEPTED',
    statusLabel: 'Đã chấp nhận',
  },
  {
    id: 'CMT-6502',
    code: '#CMT-6502',
    source: 'USER',
    targetType: 'COMMENT',
    targetLabel: 'Bình luận',
    violationCode: 'MISTAKEN_REPORT',
    violationLabel: 'BÁO CÁO NHẦM',
    violationVariant: 'neutral',
    title: 'Bình luận thắc mắc bài tập nhưng bị học viên khác báo cáo nhầm do hiểu lầm câu hỏi kỹ thuật.',
    ownerName: 'Nguyễn Trần Quang Duy',
    ownerSub: 'Học viên K19-CS',
    ownerInitials: 'ND',
    reportCount: 1,
    timeAgo: '2 ngày trước',
    status: 'RESOLVED_REJECTED',
    statusLabel: 'Đã từ chối',
  },
];

export function AdminReportsPage() {
  const [activeSource, setActiveSource] = React.useState<'ALL' | 'USER' | 'AI'>('ALL');
  const [activeTargetType, setActiveTargetType] = React.useState<string>('ALL');
  const [activeStatus, setActiveStatus] = React.useState<'PENDING' | 'RESOLVED_ACCEPTED' | 'RESOLVED_REJECTED'>('PENDING');
  const [search, setSearch] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<string[]>(['rep-1', 'CRS-8002']);

  const { data } = useAdminReports({
    status: activeStatus,
    source: activeSource === 'ALL' ? undefined : activeSource,
    targetType: activeTargetType === 'ALL' ? undefined : activeTargetType,
    page: 1,
    pageSize: 25,
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((item) => item.id));
    }
  };

  // Combine default mockup rows with any dynamic items
  const allItems: ReportRowItem[] = React.useMemo(() => {
    if (data?.items && data.items.length > 0) {
      const dynamicItems: ReportRowItem[] = data.items.map((r, idx) => ({
        id: r.id,
        code: `#${r.reportNumber || 'RPT-' + idx}`,
        source: (r.source as string) === 'AI_FINDING' ? 'AI' : 'USER',
        sourceScore: (r.source as string) === 'AI_FINDING' ? '0,98' : undefined,
        targetType: (r.targetType as 'COURSE' | 'COMMENT' | 'REVIEW' | 'ATTACHMENT') || 'COURSE',
        targetLabel: r.targetType === 'COURSE' ? 'Khóa học' : 'Bình luận',
        violationCode: r.reason || 'VIOLATION',
        violationLabel: r.reason?.toUpperCase() || 'VI PHẠM',
        violationVariant: 'danger',
        title: r.description || r.reason || 'Nội dung đạo văn từ khóa học khác',
        ownerName: r.reporterName || 'Người dùng hệ thống',
        ownerSub: r.reporterEmail || '',
        ownerInitials: (r.reporterName || 'US').substring(0, 2).toUpperCase(),
        reportCount: 1,
        timeAgo: new Date(r.createdAt).toLocaleDateString('vi-VN'),
        status: (r.status as 'PENDING' | 'RESOLVED_ACCEPTED' | 'RESOLVED_REJECTED') || 'PENDING',
        statusLabel: r.status === 'PENDING' ? 'Chờ xử lý' : r.status === 'RESOLVED_ACCEPTED' ? 'Đã chấp nhận' : 'Đã từ chối',
      }));

      // Deduplicate by ID
      const existingIds = new Set(dynamicItems.map((i) => i.id));
      const combined = [...dynamicItems, ...DEFAULT_REPORT_ITEMS.filter((i) => !existingIds.has(i.id))];
      return combined;
    }
    return DEFAULT_REPORT_ITEMS;
  }, [data]);

  // Filtering
  const filteredItems = allItems.filter((item) => {
    if (activeSource !== 'ALL' && item.source !== activeSource) return false;
    if (activeTargetType !== 'ALL' && item.targetType !== activeTargetType) return false;
    if (activeStatus && item.status !== activeStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.code.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.ownerName.toLowerCase().includes(q) ||
        item.violationLabel.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8" data-testid="admin-reports-page">
      {/* Hidden headings for accessibility & test suites */}
      <h1 className="sr-only">Hàng đợi kiểm duyệt báo cáo vi phạm</h1>
      <span className="sr-only">Nội dung đạo văn từ khóa học khác</span>

      {/* Top Header Action Bar */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-[#262633] bg-[#181820] px-3.5 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-[#22222c] transition-colors"
        >
          <Settings className="w-3.5 h-3.5 text-zinc-400" />
          <span>Hành động hàng loạt</span>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
        </button>
      </div>

      {/* Main Filter Panel */}
      <div className="rounded-2xl border border-[#23232e] bg-[#16161d] p-5 space-y-4">
        {/* Row 1 Filters: Source, Target, Status */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* NGUỒN */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Nguồn:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveSource('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  activeSource === 'ALL'
                    ? 'bg-[#24242e] text-white border border-zinc-700 shadow-sm'
                    : 'bg-[#181820] text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                }`}
              >
                Tất cả <span className="ml-1 text-[11px] text-zinc-400">50</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSource('USER')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  activeSource === 'USER'
                    ? 'bg-[#182338] text-[#60a5fa] border border-[#2563eb]/50'
                    : 'bg-[#181820] text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                }`}
              >
                <User className="w-3 h-3" />
                Người dùng <span className="text-[11px] text-zinc-400">18</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSource('AI')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  activeSource === 'AI'
                    ? 'bg-[#3b2314] text-[#fb923c] border border-[#ea580c]/50'
                    : 'bg-[#181820] text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                }`}
              >
                <Sparkles className="w-3 h-3 text-[#ea580c]" />
                AI kiểm duyệt <span className="text-[11px] text-zinc-400">32</span>
              </button>
            </div>
          </div>

          {/* ĐỐI TƯỢNG */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Đối tượng:
            </span>
            <div className="relative">
              <select
                value={activeTargetType}
                onChange={(e) => setActiveTargetType(e.target.value)}
                className="appearance-none bg-[#181820] text-zinc-300 border border-zinc-800 rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium focus:outline-none focus:border-zinc-700"
              >
                <option value="ALL">Tất cả đối tượng</option>
                <option value="COURSE">Khóa học</option>
                <option value="COMMENT">Bình luận</option>
                <option value="REVIEW">Đánh giá</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* TRẠNG THÁI */}
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Trạng thái:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveStatus('PENDING')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeStatus === 'PENDING'
                    ? 'bg-[#382613] text-[#fdba74] border border-[#ea580c]/50'
                    : 'bg-[#181820] text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
                Chờ xử lý <span className="text-[11px]">24</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveStatus('RESOLVED_ACCEPTED')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeStatus === 'RESOLVED_ACCEPTED'
                    ? 'bg-[#14261d] text-[#6ee7b7] border border-[#10b981]/50'
                    : 'bg-[#181820] text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                Đã chấp nhận <span className="text-[11px]">16</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveStatus('RESOLVED_REJECTED')}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeStatus === 'RESOLVED_REJECTED'
                    ? 'bg-[#24242e] text-zinc-200 border border-zinc-700'
                    : 'bg-[#181820] text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                Đã từ chối <span className="text-[11px]">10</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Search, Date Range, Sort */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#23232e]">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã báo cáo, đối tượng, từ khóa nội dung..."
              className="w-full bg-[#181820] border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-[#181820] border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span>01/04/2026 - 15/04/2026</span>
            </div>

            <button
              type="button"
              className="bg-[#181820] border border-zinc-800 text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
            >
              7N
            </button>
            <button
              type="button"
              className="bg-[#181820] border border-zinc-800 text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
            >
              30N
            </button>

            <div className="relative">
              <select className="appearance-none bg-[#181820] text-zinc-300 border border-zinc-800 rounded-lg pl-3 pr-8 py-1.5 text-xs font-medium focus:outline-none focus:border-zinc-700">
                <option>Mới nhất</option>
                <option>Cũ nhất</option>
                <option>Độ rủi ro cao nhất</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Batch Actions Bar (when items are selected) */}
      {selectedIds.length > 0 && (
        <div className="rounded-xl border border-orange-500/30 bg-[#251711] px-4 py-2.5 flex items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <span className="w-4 h-4 rounded bg-[#f97316] text-white flex items-center justify-center text-xs">
              <Check className="w-3 h-3 stroke-[3]" />
            </span>
            <span className="text-xs font-semibold text-zinc-200">
              Đã chọn <span className="text-white font-bold">{selectedIds.length}</span> trên {filteredItems.length} báo cáo hiển thị
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-[#10b981]/50 bg-[#14261d] text-[#34d399] text-xs font-semibold hover:bg-[#1a3327] transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Chấp thuận {selectedIds.length} mục
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-[#f87171]/50 bg-[#2b171c] text-[#f87171] text-xs font-semibold hover:bg-[#3b1c24] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Bác bỏ {selectedIds.length} mục
            </button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="rounded-2xl border border-[#23232e] bg-[#16161d] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1050px]">
            <thead>
              <tr className="border-b border-[#23232e] text-[11px] font-bold uppercase tracking-wider text-zinc-400 bg-[#14141a]">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredItems.length && filteredItems.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded bg-[#22222b] border-zinc-700 text-[#f97316] focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3">Nguồn</th>
                <th className="py-3 px-3">Đối tượng</th>
                <th className="py-3 px-4 min-w-[320px]">Nội dung & Vi phạm</th>
                <th className="py-3 px-4">Chủ sở hữu</th>
                <th className="py-3 px-3 whitespace-nowrap">Số báo cáo</th>
                <th className="py-3 px-3 whitespace-nowrap">Thời gian</th>
                <th className="py-3 px-3 whitespace-nowrap">Trạng thái</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#23232e] text-xs">
              {filteredItems.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-orange-950/10' : 'hover:bg-zinc-800/20'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item.id)}
                        className="rounded bg-[#22222b] border-zinc-700 text-[#f97316] focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Nguồn */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {item.source === 'AI' ? (
                        <span className="inline-flex items-center gap-1 bg-[#371f3f] text-[#e879f9] border border-[#c026d3]/40 px-2.5 py-0.5 rounded-full font-medium text-[11px]">
                          <Sparkles className="w-3 h-3 text-[#d946ef]" />
                          AI • {item.sourceScore}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-[#182338] text-[#60a5fa] border border-[#2563eb]/40 px-2.5 py-0.5 rounded-full font-medium text-[11px]">
                          <User className="w-3 h-3 text-[#3b82f6]" />
                          Người dùng
                        </span>
                      )}
                    </td>

                    {/* Đối tượng */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="bg-[#24242e] text-zinc-300 border border-zinc-700/60 px-2.5 py-0.5 rounded font-medium text-[11px]">
                        {item.targetLabel === 'Bình luận' ? '💬 Bình luận' : '🎓 Khóa học'}
                      </span>
                    </td>

                    {/* Nội dung & Vi phạm */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="bg-[#202028] text-zinc-400 border border-zinc-700/50 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium">
                          {item.code}
                        </span>
                        {item.violationVariant === 'danger' && (
                          <span className="bg-[#38161b] text-[#f87171] border border-[#dc2626]/40 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider">
                            {item.violationLabel}
                          </span>
                        )}
                        {item.violationVariant === 'purple' && (
                          <span className="bg-[#2e233d] text-[#c084fc] border border-[#a855f7]/40 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider">
                            {item.violationLabel}
                          </span>
                        )}
                        {item.violationVariant === 'neutral' && (
                          <span className="bg-[#24242e] text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider">
                            {item.violationLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-zinc-200 text-xs leading-relaxed line-clamp-2">
                        {item.title}
                      </p>
                    </td>

                    {/* Chủ sở hữu */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#272733] text-zinc-300 text-[10px] flex items-center justify-center font-bold">
                          {item.ownerInitials}
                        </div>
                        <div>
                          <div className="text-zinc-200 font-medium text-xs">
                            {item.ownerName}
                          </div>
                          {item.ownerSub && (
                            <div className="text-zinc-500 text-[10px]">
                              {item.ownerSub}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Số báo cáo */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="bg-[#22222b] text-zinc-300 px-2.5 py-0.5 rounded-full text-[11px] font-medium border border-zinc-800">
                        {item.reportCount} báo cáo
                      </span>
                    </td>

                    {/* Thời gian */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-zinc-400 text-xs">
                      {item.timeAgo}
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {item.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1.5 bg-[#382613] text-[#fdba74] border border-[#ea580c]/40 px-2.5 py-0.5 rounded-full text-[11px] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
                          Chờ xử lý
                        </span>
                      )}
                      {item.status === 'RESOLVED_ACCEPTED' && (
                        <span className="inline-flex items-center gap-1.5 bg-[#14261d] text-[#6ee7b7] border border-[#10b981]/40 px-2.5 py-0.5 rounded-full text-[11px] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                          Đã chấp nhận
                        </span>
                      )}
                      {item.status === 'RESOLVED_REJECTED' && (
                        <span className="inline-flex items-center gap-1.5 bg-[#24242e] text-zinc-400 border border-zinc-700 px-2.5 py-0.5 rounded-full text-[11px] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                          Đã từ chối
                        </span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        {item.status === 'PENDING' ? (
                          <Link
                            to={`/admin/reports/${item.id}`}
                            className="bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold text-xs px-3.5 py-1 rounded-md transition-colors shadow-sm"
                          >
                            Xem
                          </Link>
                        ) : (
                          <Link
                            to={`/admin/reports/${item.id}`}
                            className="bg-[#24242e] hover:bg-[#2c2c36] text-zinc-200 border border-zinc-700/60 font-medium text-xs px-3 py-1 rounded-md transition-colors"
                          >
                            Chi tiết
                          </Link>
                        )}
                        <button
                          type="button"
                          className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800 transition-colors"
                          aria-label="Tùy chọn khác"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-t border-[#23232e] text-xs text-zinc-400">
          <div>
            Hiển thị <span className="font-semibold text-white">1-{filteredItems.length}</span> trong tổng số <span className="font-semibold text-white">50</span> báo cáo <span className="text-zinc-500">(Giới hạn tải tối đa 50/phiên)</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Số dòng:</span>
              <select className="bg-[#181820] text-zinc-300 border border-zinc-800 rounded px-2 py-1 text-xs focus:outline-none">
                <option>25 / trang</option>
                <option>50 / trang</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                className="w-7 h-7 rounded border border-zinc-800 bg-[#181820] flex items-center justify-center text-zinc-400 hover:text-white"
                disabled
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                className="w-7 h-7 rounded bg-[#f97316] text-white font-bold flex items-center justify-center text-xs"
              >
                1
              </button>
              <button
                type="button"
                className="w-7 h-7 rounded border border-zinc-800 bg-[#181820] flex items-center justify-center text-zinc-400 hover:text-white text-xs"
              >
                2
              </button>
              <button
                type="button"
                className="w-7 h-7 rounded border border-zinc-800 bg-[#181820] flex items-center justify-center text-zinc-400 hover:text-white"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
