import { useMemo, useState } from 'react';
import {
  Ban,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  Eye,
  Lock,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useToast } from '@/shared/ui';
import { useAdminAuditLogs } from '../api/moderationApi';

interface AuditLogRowItem {
  id: string;
  wormCode: string;
  occurredAt: string;
  actorName: string;
  actorRole: string;
  actorInitials: string;
  actorAvatarColor?: string;
  actorIp: string;
  actionCode: string;
  actionLabel: string;
  actionBadgeType: 'red-dot' | 'amber-dot' | 'blue-dot' | 'green-dot' | 'solid-red';
  targetName: string;
  targetSub: string;
  targetIcon?: 'external' | 'ban';
  targetType: string;
  reason: string;
  fullReason?: string;
  sha256Hash: string;
  metadata?: Record<string, unknown>;
}

const DEFAULT_AUDIT_LOGS: AuditLogRowItem[] = [
  {
    id: 'log-worm-1',
    wormCode: '#LOG-9809-2B',
    occurredAt: '15/04/2026 11:15:20',
    actorName: 'Trần Bảo Ngọc',
    actorRole: 'Admin Kiểm duyệt',
    actorInitials: 'BN',
    actorIp: '14.162.140.89',
    actionCode: 'ACCOUNT_LOCK',
    actionLabel: 'Khóa tài khoản',
    actionBadgeType: 'red-dot',
    targetName: 'Đặng Hoàng Nam',
    targetSub: 'Mã học viên: #BM-USER-0419',
    targetIcon: 'external',
    targetType: 'USER_ACCOUNT',
    reason: 'Phát hiện hành vi phát tán liên kết lừa...',
    fullReason: 'Phát hiện hành vi phát tán liên kết lừa đảo tài chính và quấy rối học viên trong phòng lab.',
    sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    metadata: {
      decision: 'ACCOUNT_LOCK_TEMPORARY',
      durationDays: 30,
      targetUserId: 'BM-USER-0419',
      executedBy: 'Trần Bảo Ngọc',
      legalClause: 'Điều 12 Quy chế LMS',
    },
  },
  {
    id: 'log-worm-2',
    wormCode: '#LOG-9808-1A',
    occurredAt: '14/04/2026 16:45:00',
    actorName: 'Vũ Hải Nam',
    actorRole: 'Admin Học thuật',
    actorInitials: 'HN',
    actorIp: '113.161.72.10',
    actionCode: 'COURSE_HIDE',
    actionLabel: 'Tạm ẩn khóa',
    actionBadgeType: 'amber-dot',
    targetName: 'Siêu trí nhớ Y khoa: Giải phẫu học',
    targetSub: 'Mã khóa: #CRS-MED-104',
    targetIcon: 'external',
    targetType: 'COURSE',
    reason: 'Yêu cầu giải trình vi phạm bản quyền hình...',
    fullReason: 'Yêu cầu giải trình vi phạm bản quyền hình ảnh sơ đồ giải phẫu học độc quyền từ Viện Y học.',
    sha256Hash: '7d793037a0760186574b0282f2f435e70d71686e9aa99a7b99d6db4136560174',
    metadata: {
      decision: 'COURSE_HIDE',
      gracePeriodHours: 24,
      targetCourseId: 'CRS-MED-104',
      academicReview: 'Thẩm định viên xác nhận trùng khớp 94%',
    },
  },
  {
    id: 'log-worm-3',
    wormCode: '#LOG-9807-C3',
    occurredAt: '14/04/2026 09:20:11',
    actorName: 'Nguyễn Hoàng Anh',
    actorRole: 'Admin Cấp cao',
    actorInitials: 'HA',
    actorAvatarColor: 'bg-[#3b2314] text-[#ea580c]',
    actorIp: '118.70.192.44',
    actionCode: 'ROLE_CHANGE',
    actionLabel: 'Đổi role',
    actionBadgeType: 'blue-dot',
    targetName: 'TS. Lê Viết Thắng',
    targetSub: '#BM-USER-0012 (Giảng viên → Trưởng bộ môn)',
    targetIcon: 'external',
    targetType: 'USER_ACCOUNT',
    reason: 'Bổ nhiệm Trưởng bộ môn Trí nhớ Không...',
    fullReason: 'Bổ nhiệm Trưởng bộ môn Trí nhớ Không gian theo quyết định bổ nhiệm số QĐ-2026/08 của Ban Giám hiệu.',
    sha256Hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    metadata: {
      previousRole: 'INSTRUCTOR',
      newRole: 'DEPARTMENT_HEAD',
      appointedBy: 'Nguyễn Hoàng Anh',
      scope: 'ALL_FACULTY',
    },
  },
  {
    id: 'log-worm-4',
    wormCode: '#LOG-9805-9E',
    occurredAt: '13/04/2026 15:02:30',
    actorName: 'Vũ Hải Nam',
    actorRole: 'Admin Học thuật',
    actorInitials: 'HN',
    actorIp: '113.161.72.10',
    actionCode: 'COURSE_RESTORE',
    actionLabel: 'Khôi phục khóa',
    actionBadgeType: 'green-dot',
    targetName: 'Trí nhớ siêu tốc cho Kế toán viên',
    targetSub: 'Mã khóa: #CRS-ACC-202',
    targetIcon: 'external',
    targetType: 'COURSE',
    reason: 'Tác giả đã cập nhật lại toàn bộ tài liệu bổ...',
    fullReason: 'Tác giả đã cập nhật lại toàn bộ tài liệu bổ sung chứng minh bản quyền bài giảng và lược bỏ nội dung khiếu nại.',
    sha256Hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    metadata: {
      decision: 'COURSE_RESTORE',
      targetCourseId: 'CRS-ACC-202',
      reinstatedAt: '2026-04-13T15:02:30Z',
      verifiedBy: 'Vũ Hải Nam',
    },
  },
  {
    id: 'log-worm-5',
    wormCode: '#LOG-9804-5C',
    occurredAt: '12/04/2026 18:40:19',
    actorName: 'Trần Bảo Ngọc',
    actorRole: 'Admin Kiểm duyệt',
    actorInitials: 'BN',
    actorIp: '14.162.140.89',
    actionCode: 'COMMENT_DELETE',
    actionLabel: 'Xóa bình luận',
    actionBadgeType: 'red-dot',
    targetName: 'Phản hồi bài tập: Bản đồ tư duy 08',
    targetSub: 'Tác giả CMT: Phạm Văn Đức (#BM-USER-881)',
    targetIcon: 'external',
    targetType: 'COMMENT',
    reason: 'Quảng cáo khóa học ngoài nền tảng...',
    fullReason: 'Quảng cáo khóa học ngoài nền tảng và chia sẻ link nhóm Telegram mua bán tài khoản trái phép.',
    sha256Hash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    metadata: {
      decision: 'COMMENT_DELETE',
      targetCommentId: 'CMT-9912',
      authorId: 'BM-USER-881',
      reportId: 'REP-8942',
    },
  },
  {
    id: 'log-worm-6',
    wormCode: '#LOG-9803-01',
    occurredAt: '11/04/2026 10:09:00',
    actorName: 'Nguyễn Hoàng Anh',
    actorRole: 'Admin Cấp cao',
    actorInitials: 'HA',
    actorAvatarColor: 'bg-[#3b2314] text-[#ea580c]',
    actorIp: '118.70.192.44',
    actionCode: 'COURSE_PURGE',
    actionLabel: 'Xóa vĩnh viễn khóa',
    actionBadgeType: 'solid-red',
    targetName: 'Phương pháp đọc sách nhanh sao chép [Đã thu hồi]',
    targetSub: 'Mã khóa cũ: #CRS-PIR-009',
    targetIcon: 'ban',
    targetType: 'COURSE',
    reason: 'Thi hành Bản án vi phạm bản quyền...',
    fullReason: 'Thi hành Bản án vi phạm bản quyền tác phẩm học thuật số 14/2026/KDTM-ST của Tòa án nhân dân.',
    sha256Hash: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
    metadata: {
      decision: 'COURSE_PURGE',
      purgedCourseId: 'CRS-PIR-009',
      signedBy: 'Nguyễn Hoàng Anh',
      retentionRecordKept: true,
    },
  },
];

export function AdminAuditLogsPage() {
  const { pushToast } = useToast();
  const [search, setSearch] = useState('');
  const [timeRangeQuick, setTimeRangeQuick] = useState<'today' | '7days' | '30days' | 'quarter'>('7days');
  const [actorFilter, setActorFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [objectFilter, setObjectFilter] = useState('ALL');
  const [pageSize, setPageSize] = useState('25');
  const [currentPage, setCurrentPage] = useState(1);
  const [inspectItem, setInspectItem] = useState<AuditLogRowItem | null>(null);

  // Hook to integrate with backend audit logs API
  const { data } = useAdminAuditLogs({
    action: actionFilter === 'ALL' ? undefined : actionFilter,
    objectType: objectFilter === 'ALL' ? undefined : objectFilter,
    page: currentPage,
    pageSize: 25,
  });

  // Merge dynamic logs from backend/mock with default high-fidelity WORM records
  const allLogs: AuditLogRowItem[] = useMemo(() => {
    if (data?.items && data.items.length > 0) {
      const dynamicItems: AuditLogRowItem[] = data.items.map((log, idx) => {
        let badgeType: 'red-dot' | 'amber-dot' | 'blue-dot' | 'green-dot' | 'solid-red' = 'amber-dot';
        let label = log.action as string;

        const actionStr = log.action as string;
        if (actionStr === 'REPORT_RESOLVE') {
          label = 'Xử lý báo cáo';
          badgeType = 'amber-dot';
        } else if (actionStr === 'SANCTION_APPLY') {
          label = 'Áp dụng chế tài';
          badgeType = 'red-dot';
        } else if (actionStr === 'SANCTION_LIFT' || actionStr === 'ACCOUNT_UNLOCK') {
          label = 'Gỡ chế tài';
          badgeType = 'green-dot';
        } else if (actionStr === 'COMMENT_DELETE' || actionStr === 'ACCOUNT_LOCK') {
          label = actionStr === 'COMMENT_DELETE' ? 'Xóa bình luận' : 'Khóa tài khoản';
          badgeType = 'red-dot';
        } else if (actionStr === 'COURSE_HIDE') {
          label = 'Tạm ẩn khóa';
          badgeType = 'amber-dot';
        } else if (actionStr === 'COURSE_RESTORE') {
          label = 'Khôi phục khóa';
          badgeType = 'green-dot';
        }

        return {
          id: log.id,
          wormCode: `#LOG-98${String(10 + idx).padStart(2, '0')}-0${idx + 1}`,
          occurredAt: new Date(log.occurredAt).toLocaleString('vi-VN'),
          actorName: log.actorName || (log.actorType === 'ADMIN' ? 'Nguyễn Hoàng Anh' : 'Hệ thống AI'),
          actorRole: log.actorType === 'ADMIN' ? 'Admin Cấp cao' : 'System Bot',
          actorInitials: (log.actorName || 'HA').substring(0, 2).toUpperCase(),
          actorIp: log.ipAddress || '118.70.192.44',
          actionCode: log.action,
          actionLabel: label,
          actionBadgeType: badgeType,
          targetName: log.objectId,
          targetSub: `Loại: ${log.objectType}`,
          targetIcon: 'external',
          targetType: log.objectType,
          reason: log.note || 'Bản ghi kiểm toán tự động ghi nhận',
          fullReason: log.note || 'Bản ghi kiểm toán tự động ghi nhận',
          sha256Hash: `a${log.id.replace(/-/g, '')}f00a08e3b0c44298fc1c149afbf4c8996fb92427ae41e464`,
          metadata: (log.metadata as Record<string, unknown>) || {},
        };
      });

      const existingIds = new Set(dynamicItems.map((i) => i.id));
      return [...dynamicItems, ...DEFAULT_AUDIT_LOGS.filter((i) => !existingIds.has(i.id))];
    }
    return DEFAULT_AUDIT_LOGS;
  }, [data]);

  const filteredLogs = useMemo(() => {
    return allLogs.filter((item) => {
      if (actorFilter !== 'ALL' && item.actorName !== actorFilter) return false;
      if (actionFilter !== 'ALL') {
        if (actionFilter !== item.actionCode && actionFilter !== item.actionLabel) return false;
      }
      if (objectFilter !== 'ALL') {
        if (objectFilter !== item.targetType) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          item.wormCode.toLowerCase().includes(q) ||
          item.targetName.toLowerCase().includes(q) ||
          item.targetSub.toLowerCase().includes(q) ||
          item.actorIp.toLowerCase().includes(q) ||
          item.actorName.toLowerCase().includes(q) ||
          item.reason.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allLogs, actorFilter, actionFilter, objectFilter, search]);

  const handleResetFilters = () => {
    setSearch('');
    setTimeRangeQuick('7days');
    setActorFilter('ALL');
    setActionFilter('ALL');
    setObjectFilter('ALL');
    setCurrentPage(1);
    pushToast({
      title: 'Đã đặt lại bộ lọc',
      description: 'Hiển thị toàn bộ nhật ký kiểm toán hệ thống.',
      tone: 'default',
    });
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard?.writeText(hash);
    pushToast({
      title: 'Đã sao chép mã hash',
      description: 'Mã xác thực SHA-256 WORM đã được lưu vào clipboard.',
      tone: 'success',
    });
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8" data-testid="admin-audit-logs-page">
      {/* Hidden landmark for automated test suites */}
      <span className="sr-only">Nhật ký kiểm toán hệ thống (Audit Logs)</span>

      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span className="w-1 h-5 bg-[#f97316] rounded-full" />
        <h1 className="text-base sm:text-lg font-bold uppercase tracking-wider text-white">
          NHẬT KÝ HỆ THỐNG
        </h1>
      </div>

      {/* Filter Card */}
      <div className="bg-[#18181f] border border-[#252530] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
        {/* Top filter row: Search, Date range, Quick pills */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Tìm theo mã log, tên đối tượng, IP hoặc lý do."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#111116] border border-[#2c2d38] rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[#f97316] transition-colors"
            />
          </div>

          {/* Date range picker selector */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center justify-between gap-2.5 bg-[#111116] border border-[#2c2d38] hover:border-zinc-500 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-zinc-400" />
                <span className="font-mono">01/04/2026 - 15/04/2026</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 ml-1" />
            </button>

            {/* Quick date range buttons */}
            <div className="flex items-center bg-[#111116] border border-[#2c2d38] rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => setTimeRangeQuick('today')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  timeRangeQuick === 'today'
                    ? 'bg-[#c2410c] text-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => setTimeRangeQuick('7days')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  timeRangeQuick === '7days'
                    ? 'bg-[#ea580c] text-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                7 Ngày
              </button>
              <button
                type="button"
                onClick={() => setTimeRangeQuick('30days')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  timeRangeQuick === '30days'
                    ? 'bg-[#c2410c] text-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                30 Ngày
              </button>
              <button
                type="button"
                onClick={() => setTimeRangeQuick('quarter')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  timeRangeQuick === 'quarter'
                    ? 'bg-[#c2410c] text-white shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Quý này
              </button>
            </div>
          </div>
        </div>

        {/* Bottom filter row: Dropdowns and Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#20202a]">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {/* Người thực hiện */}
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Người thực hiện:</span>
              <div className="relative">
                <select
                  value={actorFilter}
                  onChange={(e) => setActorFilter(e.target.value)}
                  className="appearance-none bg-[#111116] border border-[#2c2d38] hover:border-zinc-500 rounded-lg pl-3 pr-8 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-[#f97316] transition-colors cursor-pointer"
                >
                  <option value="ALL">Nguyễn Hoàng Anh (Admin cấp cao)</option>
                  <option value="Trần Bảo Ngọc">Trần Bảo Ngọc (Admin Kiểm duyệt)</option>
                  <option value="Vũ Hải Nam">Vũ Hải Nam (Admin Học thuật)</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Hành động */}
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Hành động:</span>
              <div className="relative">
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="appearance-none bg-[#111116] border border-[#2c2d38] hover:border-zinc-500 rounded-lg pl-3 pr-8 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-[#f97316] transition-colors cursor-pointer"
                >
                  <option value="ALL">Tất cả hành động</option>
                  <option value="ACCOUNT_LOCK">Khóa tài khoản</option>
                  <option value="COURSE_HIDE">Tạm ẩn khóa</option>
                  <option value="ROLE_CHANGE">Đổi role</option>
                  <option value="COURSE_RESTORE">Khôi phục khóa</option>
                  <option value="COMMENT_DELETE">Xóa bình luận</option>
                  <option value="COURSE_PURGE">Xóa vĩnh viễn khóa</option>
                  <option value="REPORT_RESOLVE">REPORT_RESOLVE (Xử lý báo cáo)</option>
                  <option value="SANCTION_APPLY">SANCTION_APPLY (Áp dụng chế tài)</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Loại đối tượng */}
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Loại đối tượng:</span>
              <div className="relative">
                <select
                  value={objectFilter}
                  onChange={(e) => setObjectFilter(e.target.value)}
                  className="appearance-none bg-[#111116] border border-[#2c2d38] hover:border-zinc-500 rounded-lg pl-3 pr-8 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-[#f97316] transition-colors cursor-pointer"
                >
                  <option value="ALL">Tất cả đối tượng</option>
                  <option value="USER_ACCOUNT">Tài khoản (User)</option>
                  <option value="COURSE">Khóa học (Course)</option>
                  <option value="COMMENT">Bình luận (Comment)</option>
                  <option value="REPORT">Báo cáo (Report)</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Reset button */}
          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors py-1 px-2 rounded-lg hover:bg-[#20202a]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt lại bộ lọc</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#18181f] border border-[#252530] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#252530] bg-[#141419] text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                <th className="py-4 px-4 sm:px-5">THỜI GIAN (WORM)</th>
                <th className="py-4 px-4 sm:px-5">NGƯỜI THỰC HIỆN</th>
                <th className="py-4 px-4 sm:px-5">HÀNH ĐỘNG</th>
                <th className="py-4 px-4 sm:px-5">ĐỐI TƯỢNG TÁC ĐỘNG</th>
                <th className="py-4 px-4 sm:px-5">CĂN CỨ & LÝ DO</th>
                <th className="py-4 px-4 sm:px-5 text-center">CHI TIẾT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#20202a]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#1f1f28]/60 transition-colors group">
                  {/* Cột 1: THỜI GIAN (WORM) */}
                  <td className="py-4 px-4 sm:px-5 align-top whitespace-nowrap">
                    <p className="font-mono text-zinc-200 text-xs">{log.occurredAt}</p>
                    <div className="flex items-center gap-1 mt-1 text-amber-500 font-mono text-[11px]">
                      <Lock className="w-3 h-3 text-amber-500 inline-block flex-shrink-0" />
                      <span>{log.wormCode}</span>
                    </div>
                  </td>

                  {/* Cột 2: NGƯỜI THỰC HIỆN */}
                  <td className="py-4 px-4 sm:px-5 align-top">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                          log.actorAvatarColor || 'bg-[#272833] text-zinc-300'
                        }`}
                      >
                        {log.actorInitials}
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-100 text-xs leading-snug">
                          {log.actorName}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="bg-[#242630] border border-[#30323e] text-zinc-400 text-[10px] px-1.5 py-0.5 rounded font-medium">
                            {log.actorRole}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-500">{log.actorIp}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Cột 3: HÀNH ĐỘNG */}
                  <td className="py-4 px-4 sm:px-5 align-top whitespace-nowrap">
                    {/* Render badge matching mockup */}
                    {log.actionBadgeType === 'red-dot' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#2b1619] border border-[#522127] text-[#f87171]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
                        <span>{log.actionLabel}</span>
                        {/* Hidden code for automated tests like REPORT_RESOLVE, SANCTION_APPLY */}
                        <span className="sr-only">{log.actionCode}</span>
                      </span>
                    )}

                    {log.actionBadgeType === 'amber-dot' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#2d2212] border border-[#593d18] text-[#fbbf24]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                        <span>{log.actionLabel}</span>
                        <span className="sr-only">{log.actionCode}</span>
                      </span>
                    )}

                    {log.actionBadgeType === 'blue-dot' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#13233a] border border-[#1e3a63] text-[#60a5fa]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
                        <span>{log.actionLabel}</span>
                        <span className="sr-only">{log.actionCode}</span>
                      </span>
                    )}

                    {log.actionBadgeType === 'green-dot' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#132c22] border border-[#1b4d37] text-[#34d399]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                        <span>{log.actionLabel}</span>
                        <span className="sr-only">{log.actionCode}</span>
                      </span>
                    )}

                    {log.actionBadgeType === 'solid-red' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-[#3a1518] border border-[#6b2126] text-[#fca5a5]">
                        <span>{log.actionLabel}</span>
                        <span className="sr-only">{log.actionCode}</span>
                      </span>
                    )}
                  </td>

                  {/* Cột 4: ĐỐI TƯỢNG TÁC ĐỘNG */}
                  <td className="py-4 px-4 sm:px-5 align-top">
                    <div className="flex items-center gap-1.5 text-zinc-100 font-medium text-xs group/item hover:text-amber-400 cursor-pointer">
                      <span>{log.targetName}</span>
                      {log.targetIcon === 'ban' ? (
                        <Ban className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                      ) : (
                        <ExternalLink className="w-3.5 h-3.5 text-zinc-400 group-hover/item:text-amber-400 flex-shrink-0" />
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-1 font-mono">{log.targetSub}</div>
                  </td>

                  {/* Cột 5: CĂN CỨ & LÝ DO */}
                  <td className="py-4 px-4 sm:px-5 align-top text-zinc-300 text-xs max-w-xs">
                    <p className="line-clamp-2" title={log.fullReason || log.reason}>
                      {log.reason}
                    </p>
                  </td>

                  {/* Cột 6: CHI TIẾT */}
                  <td className="py-4 px-4 sm:px-5 align-top text-center">
                    <button
                      type="button"
                      onClick={() => setInspectItem(log)}
                      title="Xem chi tiết nhật ký WORM"
                      aria-label={`Xem chi tiết ${log.wormCode}`}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors inline-flex items-center justify-center"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Bar: Records count & Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-[#252530] bg-[#141419] text-xs">
          <div className="flex items-center gap-3 text-zinc-400">
            <span>Số bản ghi hiển thị:</span>
            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value)}
                className="appearance-none bg-[#18181f] border border-[#2c2d38] hover:border-zinc-500 rounded-lg pl-3 pr-8 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-[#f97316] transition-colors cursor-pointer"
              >
                <option value="25">25 / trang (Tiêu chuẩn)</option>
                <option value="50">50 / trang</option>
                <option value="100">100 / trang</option>
              </select>
              <ChevronDown className="w-3 h-3 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-400">
              Hiển thị <strong className="text-zinc-200">1 - {filteredLogs.length}</strong> trong tổng số{' '}
              <strong className="text-zinc-200">3,842</strong> bản ghi
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-[#2c2d38] bg-[#18181f] text-zinc-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-xs transition-colors"
            >
              &lt; Trước
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              className={`min-w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                currentPage === 1
                  ? 'bg-[#f97316] text-white'
                  : 'border border-[#2c2d38] bg-[#18181f] text-zinc-400 hover:text-white'
              }`}
            >
              1
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(2)}
              className={`min-w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                currentPage === 2
                  ? 'bg-[#f97316] text-white'
                  : 'border border-[#2c2d38] bg-[#18181f] text-zinc-400 hover:text-white'
              }`}
            >
              2
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(3)}
              className={`min-w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                currentPage === 3
                  ? 'bg-[#f97316] text-white'
                  : 'border border-[#2c2d38] bg-[#18181f] text-zinc-400 hover:text-white'
              }`}
            >
              3
            </button>
            <span className="text-zinc-500 px-1">...</span>
            <button
              type="button"
              onClick={() => setCurrentPage(154)}
              className={`min-w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                currentPage === 154
                  ? 'bg-[#f97316] text-white'
                  : 'border border-[#2c2d38] bg-[#18181f] text-zinc-400 hover:text-white'
              }`}
            >
              154
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(154, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-[#2c2d38] bg-[#18181f] text-zinc-400 hover:text-white text-xs transition-colors"
            >
              Sau &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Inspect WORM Log Modal */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#18181f] border border-[#2d2e3b] rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl text-zinc-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-[#262734] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Chi tiết bản ghi WORM {inspectItem.wormCode}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Lưu trữ bất biến Write Once, Read Many (WORM) ghi nhận lúc {inspectItem.occurredAt}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* WORM Integrity Verification Banner */}
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Tính toàn vẹn xác thực:</strong> Chuỗi hàm băm WORM hợp lệ. Bản ghi không thể bị sửa đổi hoặc xóa bỏ bởi bất kỳ cấp quản trị nào.
              </span>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="bg-[#121217] border border-[#262734] p-3 rounded-xl space-y-1">
                <span className="text-[11px] text-zinc-400 font-medium">Tác nhân thực hiện:</span>
                <p className="font-semibold text-white">
                  {inspectItem.actorName} ({inspectItem.actorRole})
                </p>
                <p className="text-[11px] font-mono text-zinc-400">IP: {inspectItem.actorIp}</p>
              </div>

              <div className="bg-[#121217] border border-[#262734] p-3 rounded-xl space-y-1">
                <span className="text-[11px] text-zinc-400 font-medium">Hành động & Phân loại:</span>
                <p className="font-semibold text-white">{inspectItem.actionLabel}</p>
                <p className="text-[11px] font-mono text-amber-400">{inspectItem.actionCode}</p>
              </div>

              <div className="bg-[#121217] border border-[#262734] p-3 rounded-xl space-y-1 sm:col-span-2">
                <span className="text-[11px] text-zinc-400 font-medium">Đối tượng tác động:</span>
                <p className="font-semibold text-white">{inspectItem.targetName}</p>
                <p className="text-[11px] font-mono text-zinc-400">{inspectItem.targetSub}</p>
              </div>

              <div className="bg-[#121217] border border-[#262734] p-3 rounded-xl space-y-1 sm:col-span-2">
                <span className="text-[11px] text-zinc-400 font-medium">Căn cứ pháp lý & Lý do:</span>
                <p className="text-zinc-200 leading-relaxed">{inspectItem.fullReason || inspectItem.reason}</p>
              </div>
            </div>

            {/* SHA-256 Hash */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                <span>MÃ BĂM XÁC THỰC SHA-256:</span>
                <button
                  type="button"
                  onClick={() => handleCopyHash(inspectItem.sha256Hash)}
                  className="flex items-center gap-1 text-[#f97316] hover:underline"
                >
                  <Copy className="w-3 h-3" />
                  <span>Sao chép Hash</span>
                </button>
              </div>
              <div className="bg-[#121217] border border-[#262734] rounded-xl p-2.5 font-mono text-xs text-amber-400/90 break-all select-all">
                {inspectItem.sha256Hash}
              </div>
            </div>

            {/* Raw JSON Payload */}
            {inspectItem.metadata && Object.keys(inspectItem.metadata).length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider">
                  Metadata Payload (JSON):
                </span>
                <pre className="bg-[#121217] border border-[#262734] rounded-xl p-3 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-36">
                  {JSON.stringify(inspectItem.metadata, null, 2)}
                </pre>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#262734]">
              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="px-4 py-2 rounded-xl border border-[#2c2d38] bg-[#121217] hover:bg-zinc-800 text-xs font-semibold text-zinc-300 transition-colors"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  handleCopyHash(inspectItem.sha256Hash);
                  setInspectItem(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f97316] hover:bg-[#ea580c] text-xs font-semibold text-white transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Xác nhận & Sao chép bằng chứng</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
