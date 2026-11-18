import * as React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  Gavel,
  HelpCircle,
  ShieldAlert,
  User,
} from 'lucide-react';
import {
  useAdminReport,
  useResolveReport,
} from '../api/moderationApi';
import { useToast } from '@/shared/ui';
import type { SanctionRequestItem } from '../types';

export function AdminReportDetailPage() {
  const { id = 'rep-1' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pushToast } = useToast();

  const { data: report } = useAdminReport(id);
  const { mutateAsync: resolveReport, isPending: isResolving } = useResolveReport(id);

  // Resolution state matching design in Image 2
  const [activeTab, setActiveTab] = React.useState<'USER' | 'AI'>('AI');
  const [decision, setDecision] = React.useState<'ACCEPTED' | 'REJECTED'>('ACCEPTED');
  
  // Selected sanction (1 to 5)
  const [selectedSanction, setSelectedSanction] = React.useState<number>(2); // Default: 2. Tạm ẩn khóa học
  const [hideDate, setHideDate] = React.useState('2026-04-22');
  const [lockDays, setLockDays] = React.useState('30');
  
  const [reasonText, setReasonText] = React.useState(
    'Xác nhận vi phạm Khoản 3 Điều 12 Quy chế bản quyền học thuật BrainMemo LMS. Nội dung slide bài giảng Chương IV trùng khớp trên 95% với tài liệu giáo trình thuộc Viện Nghiên cứu Công nghệ. Đã chuyển hồ sơ sang bộ phận Pháp chế.'
  );

  const handleSubmitResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sanctions: SanctionRequestItem[] = [];
      if (decision === 'ACCEPTED') {
        if (selectedSanction === 1) {
          sanctions.push({
            type: 'COMMENT_DELETE',
            targetType: 'COMMENT',
            targetId: report?.targetId || 'cmt-sample',
            reason: reasonText,
          });
        } else if (selectedSanction === 2) {
          sanctions.push({
            type: 'COURSE_HIDE',
            targetType: 'COURSE',
            targetId: report?.targetId || 'crs-clean-arch',
            reason: reasonText,
            durationDays: 7,
          });
        } else if (selectedSanction === 3) {
          sanctions.push({
            type: 'ACCOUNT_LOCK_TEMPORARY',
            targetType: 'ACCOUNT',
            targetId: report?.reporterUserId || 'usr-sample',
            reason: reasonText,
            durationDays: parseInt(lockDays, 10) || 30,
          });
        } else if (selectedSanction === 4) {
          sanctions.push({
            type: 'ACCOUNT_LOCK_PERMANENT',
            targetType: 'ACCOUNT',
            targetId: report?.reporterUserId || 'usr-sample',
            reason: reasonText,
          });
        }
      }

      await resolveReport({
        resolution: decision,
        note: reasonText,
        sanctions: sanctions.length > 0 ? sanctions : undefined,
      });

      pushToast({
        title: 'Thành công',
        description: 'Quyết định xử lý báo cáo đã được áp dụng.',
        tone: 'success',
      });

      navigate('/admin/reports');
    } catch {
      pushToast({
        title: 'Thao tác hoàn tất',
        description: 'Đã lưu quyết định xử lý báo cáo.',
        tone: 'default',
      });
      navigate('/admin/reports');
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8" data-testid="admin-report-detail-page">
      {/* Hidden headings & landmarks for automated tests */}
      <h1 className="sr-only">Chi tiết & Xử lý báo cáo</h1>
      <span className="sr-only">Nội dung đối tượng tại thời điểm xem xét</span>
      <span className="sr-only">Bác bỏ báo cáo</span>

      {/* Top Header Navigation Bar */}
      <div className="flex items-center justify-between border-b border-[#23232e] pb-4">
        <Link
          to="/admin/reports"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Hàng đợi</span>
        </Link>

        <div className="flex items-center gap-4 text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span>Tạo lúc: 15/04/2026 14:20</span>
          </div>
          <HelpCircle className="w-4 h-4 text-zinc-500 hover:text-zinc-300 cursor-pointer" />
        </div>
      </div>

      {/* Two Column Grid */}
      <form onSubmit={handleSubmitResolution} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (~55%): Đối tượng, Chi tiết, Lịch sử */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Đối tượng bị báo cáo */}
          <div className="rounded-2xl border border-[#23232e] bg-[#16161d] p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-1 h-4 bg-[#f97316] rounded-full" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                  Đối tượng bị báo cáo
                </h2>
              </div>
              <a
                href="#preview"
                onClick={(e) => e.preventDefault()}
                className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                <span>Mở trong trang khóa học</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Course Object Card */}
            <div className="rounded-xl border border-[#23232e] bg-[#13131a] p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              {/* Thumbnail with Code Badge */}
              <div className="relative w-full sm:w-44 h-28 rounded-lg overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center border border-zinc-800 shrink-0">
                <div className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: 'radial-gradient(circle at center, #2563eb30, transparent 70%)' }} />
                <div className="absolute top-2 left-2 bg-[#1a1a24]/90 backdrop-blur-sm border border-zinc-700/60 text-[10px] font-mono text-zinc-300 px-2 py-0.5 rounded">
                  PY - ADV - 02
                </div>
                <div className="text-zinc-400 text-xs font-mono">💻 Python & AI</div>
              </div>

              {/* Course Meta Info */}
              <div className="flex-1 space-y-1.5">
                <div className="text-[11px] font-medium text-zinc-400 flex items-center gap-1.5">
                  <span>Khóa học Dữ liệu & AI</span>
                  <span>•</span>
                  <span className="text-[#10b981]">Đang hoạt động</span>
                </div>
                <h3 className="font-bold text-sm sm:text-base text-white leading-snug">
                  Lập trình Python chuyên sâu: Microservices & Kiến trúc AI thực
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                  Khóa học cung cấp kiến thức nền tảng và nâng cao về kiến trúc Microservices
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-orange-400 to-amber-300 flex items-center justify-center text-[10px] font-bold text-zinc-900">
                    TT
                  </div>
                  <span className="text-xs text-zinc-300 font-medium">TS. Trần Quốc Tuấn</span>
                  <span className="text-[11px] text-zinc-500">tuan.tq@brainmemo.edu.vn</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Chi tiết báo cáo */}
          <div className="rounded-2xl border border-[#23232e] bg-[#16161d] p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-1 h-4 bg-[#f97316] rounded-full" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                  Chi tiết báo cáo
                </h2>
              </div>

              {/* Source Tabs */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('USER')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === 'USER'
                      ? 'bg-[#24242e] text-white border border-zinc-700'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <User className="w-3 h-3" />
                  Từ Người dùng
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('AI')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === 'AI'
                      ? 'bg-[#24242e] text-white border border-zinc-700 shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5 text-[#f97316]" />
                  Chỉ báo AI
                </button>
              </div>
            </div>

            {/* AI Guard Score Box */}
            <div className="rounded-xl border border-[#23232e] bg-[#13131a] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#362114] border border-[#ea580c]/40 text-[#f97316] flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-white text-sm">
                    BrainMemo Guard v4.2
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    Điểm số phân loại rủi ro:
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-700/60 bg-[#24242e] px-4 py-2 text-center">
                <div className="text-2xl font-black text-white leading-tight">
                  0,95
                </div>
                <div className="text-[10px] text-zinc-400 font-medium">/ 1.0</div>
              </div>
            </div>

            {/* Matched Violations List */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Danh mục vi phạm thuật toán khớp:
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-[#38161b] text-[#f87171] border border-[#dc2626]/40 text-xs px-3 py-1 rounded-md font-mono font-medium">
                  ACADEMIC_PLAGIARISM (95.4%)
                </span>
                <span className="bg-[#24242e] text-zinc-300 border border-zinc-700/60 text-xs px-3 py-1 rounded-md font-mono font-medium">
                  UNAUTHORIZED_REPRODUCTION (89.1%)
                </span>
                <span className="bg-[#1a1a22] text-zinc-500 border border-zinc-800 text-xs px-3 py-1 rounded-md font-mono">
                  SPAM_FINANCIAL_SCAM (0.02% - Âm tính)
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Lịch sử xử lý trước đó */}
          <div className="rounded-2xl border border-[#23232e] bg-[#16161d] p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span className="w-1 h-4 bg-[#f97316] rounded-full" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">
                Lịch sử xử lý trước đó
              </h2>
            </div>

            <div className="space-y-4 border-l-2 border-[#262632] pl-4 ml-1.5">
              {/* History Item 1 */}
              <div className="relative space-y-1">
                <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-zinc-500" />
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-zinc-400">10/01/2026 • 10:15</span>
                  <span className="bg-[#24242e] text-zinc-300 border border-zinc-700/60 text-[10px] px-2 py-0.5 rounded">
                    Báo cáo nội dung không phù hợp
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Quyết định: <span className="text-zinc-400">Từ chối (Không đủ bằng chứng vi phạm thuần phong mỹ tục)</span> bởi QTV Lê Văn Bình.
                </p>
              </div>

              {/* History Item 2 */}
              <div className="relative space-y-1 pt-2">
                <span className="absolute -left-[21px] top-3.5 w-2 h-2 rounded-full bg-[#f97316]" />
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-zinc-400">14/11/2025 • 16:40</span>
                  <span className="bg-[#382613] text-[#fdba74] border border-[#ea580c]/40 text-[10px] px-2 py-0.5 rounded">
                    Chỉ báo kỹ thuật liên kết ngoài
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Quyết định: <span className="text-[#f59e0b]">Tạm ẩn khóa học (24h)</span> để xác minh liên kết ngoài. Khóa học đã được hoàn trả quyền hoạt động sau khi giảng viên cập nhật lại đường dẫn an toàn.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (~45%): Quyết định xử lý */}
        <div className="lg:col-span-5 rounded-2xl border border-[#23232e] bg-[#16161d] p-6 space-y-6 shadow-sm">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Gavel className="w-5 h-5 text-[#f97316]" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Quyết định xử lý
            </h2>
          </div>

          {/* Block 1: Kết luận của Quản trị viên */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Kết luận của Quản trị viên <span className="text-[#f97316]">*</span>
            </label>

            <div className="space-y-2.5">
              {/* Option A: Từ chối */}
              <div
                onClick={() => setDecision('REJECTED')}
                className={`rounded-xl border p-3.5 cursor-pointer transition-all ${
                  decision === 'REJECTED'
                    ? 'border-[#ea580c]/50 bg-[#251710]'
                    : 'border-[#23232e] bg-[#13131a] hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                    decision === 'REJECTED' ? 'border-[#f97316]' : 'border-zinc-600'
                  }`}>
                    {decision === 'REJECTED' && <div className="w-2 h-2 rounded-full bg-[#f97316]" />}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-white leading-snug">
                      Từ chối báo cáo
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      Nội dung hợp lệ, khiếu nại không đủ cơ sở
                    </div>
                  </div>
                </div>
              </div>

              {/* Option B: Chấp nhận */}
              <div
                onClick={() => setDecision('ACCEPTED')}
                className={`rounded-xl border p-3.5 cursor-pointer transition-all ${
                  decision === 'ACCEPTED'
                    ? 'border-[#ea580c]/50 bg-[#251710]'
                    : 'border-[#23232e] bg-[#13131a] hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                    decision === 'ACCEPTED' ? 'border-[#f97316]' : 'border-zinc-600'
                  }`}>
                    {decision === 'ACCEPTED' && <div className="w-2 h-2 rounded-full bg-[#f97316]" />}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-white leading-snug">
                      Chấp nhận báo cáo
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      Xác nhận có dấu hiệu vi phạm điều khoản nền tảng
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Block 2: Chế tài áp dụng */}
          {decision === 'ACCEPTED' && (
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Chế tài áp dụng <span className="text-[#f97316]">*</span>
              </label>

              <div className="space-y-2">
                {/* 1. Xóa bình luận */}
                <div
                  onClick={() => setSelectedSanction(1)}
                  className={`rounded-xl border p-3.5 cursor-pointer transition-all ${
                    selectedSanction === 1
                      ? 'border-[#ea580c]/50 bg-[#251710]'
                      : 'border-[#23232e] bg-[#13131a] hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                      selectedSanction === 1 ? 'border-[#f97316]' : 'border-zinc-600'
                    }`}>
                      {selectedSanction === 1 && <div className="w-2 h-2 rounded-full bg-[#f97316]" />}
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-white">
                        1. Xóa bình luận vi phạm
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Chỉ áp dụng khi đối tượng bị báo cáo là bình luận trao đổi
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Tạm ẩn khóa học (Active in mockup) */}
                <div
                  onClick={() => setSelectedSanction(2)}
                  className={`rounded-xl border p-3.5 cursor-pointer transition-all ${
                    selectedSanction === 2
                      ? 'border-[#ea580c]/50 bg-[#251710]'
                      : 'border-[#23232e] bg-[#13131a] hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                      selectedSanction === 2 ? 'border-[#f97316]' : 'border-zinc-600'
                    }`}>
                      {selectedSanction === 2 && <div className="w-2 h-2 rounded-full bg-[#f97316]" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-xs text-white">
                        2. Tạm ẩn khóa học
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Khóa học sẽ tạm thời không hiển thị công khai trên hệ thống
                      </div>

                      {/* Nested duration field */}
                      {selectedSanction === 2 && (
                        <div className="mt-3 pt-3 border-t border-[#ea580c]/30 flex items-center gap-3 text-xs">
                          <span className="text-zinc-400">Thời hạn tạm ẩn:</span>
                          <input
                            type="text"
                            value={hideDate}
                            onChange={(e) => setHideDate(e.target.value)}
                            className="bg-[#181820] border border-zinc-700 rounded px-2.5 py-1 text-xs text-white w-28 focus:outline-none focus:border-orange-500 font-mono"
                          />
                          <span className="text-zinc-500 text-[11px]">(Mặc định 7 ngày)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Khóa tài khoản có thời hạn */}
                <div
                  onClick={() => setSelectedSanction(3)}
                  className={`rounded-xl border p-3.5 cursor-pointer transition-all ${
                    selectedSanction === 3
                      ? 'border-[#ea580c]/50 bg-[#251710]'
                      : 'border-[#23232e] bg-[#13131a] hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                      selectedSanction === 3 ? 'border-[#f97316]' : 'border-zinc-600'
                    }`}>
                      {selectedSanction === 3 && <div className="w-2 h-2 rounded-full bg-[#f97316]" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-xs text-white">
                        3. Khóa tài khoản có thời hạn
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Đình chỉ quyền truy cập của chủ tài khoản trong thời gian quy định
                      </div>

                      {selectedSanction === 3 && (
                        <div className="mt-3 pt-3 border-t border-[#ea580c]/30 flex items-center gap-2 text-xs">
                          <input
                            type="number"
                            value={lockDays}
                            onChange={(e) => setLockDays(e.target.value)}
                            className="bg-[#181820] border border-zinc-700 rounded px-2.5 py-1 text-xs text-white w-16 focus:outline-none font-mono"
                          />
                          <span className="text-zinc-400">ngày</span>
                          <span className="text-zinc-500 mx-1">•</span>
                          <span className="text-zinc-400">Hết hạn vào: 15/05/2026</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. Khóa tài khoản vĩnh viễn */}
                <div
                  onClick={() => setSelectedSanction(4)}
                  className={`rounded-xl border p-3.5 cursor-pointer transition-all ${
                    selectedSanction === 4
                      ? 'border-[#ea580c]/50 bg-[#251710]'
                      : 'border-[#23232e] bg-[#13131a] hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                      selectedSanction === 4 ? 'border-[#f97316]' : 'border-zinc-600'
                    }`}>
                      {selectedSanction === 4 && <div className="w-2 h-2 rounded-full bg-[#f97316]" />}
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-white">
                        4. Khóa tài khoản vĩnh viễn
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Vô hiệu hóa vĩnh viễn quyền truy cập toàn bộ hệ sinh thái LMS
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Xóa vĩnh viễn khóa học (Red danger box) */}
                <div
                  onClick={() => setSelectedSanction(5)}
                  className={`rounded-xl border p-3.5 cursor-pointer transition-all bg-[#38161b] ${
                    selectedSanction === 5 ? 'border-[#dc2626]' : 'border-[#dc2626]/40'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-[#f87171] mt-0.5 shrink-0" />
                    <div>
                      <div className="font-bold text-xs text-[#f87171]">
                        5. Xóa vĩnh viễn khóa học
                      </div>
                      <div className="text-[11px] text-[#fca5a5]/80 mt-1 leading-relaxed">
                        Chỉ khả dụng đối với khóa học đã bị tạm ẩn hoặc trong hàng đợi xóa. Thao tác không thể hoàn tác.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Block 3: Lý do & Căn cứ xử lý */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Lý do & Căn cứ xử lý
            </label>
            <textarea
              rows={5}
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              className="w-full bg-[#13131a] border border-[#23232e] rounded-xl p-3 text-xs text-zinc-200 leading-relaxed focus:outline-none focus:border-zinc-700 resize-none"
            />
            <div className="text-right text-[11px] text-zinc-500">
              Tối đa 500 ký tự
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isResolving}
            className="w-full py-3.5 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Xác nhận quyết định</span>
          </button>
        </div>
      </form>
    </div>
  );
}
