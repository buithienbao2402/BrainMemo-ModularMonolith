import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  Eye,
  FileText,
  Flag,
  MessageSquare,
  Search,
  User,
} from 'lucide-react';
import {
  Button,
  EmptyState,
  ErrorState,
  Input,
  Pagination,
  Skeleton,
} from '@/shared/ui';
import { useAdminReports } from '../api/moderationApi';

export function AdminReportsPage() {
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [status, setStatus] = useState<string>('PENDING');
  const [source, setSource] = useState<string>('ALL');
  const [targetType, setTargetType] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const { data, isLoading, isError, refetch } = useAdminReports({
    status: status === 'ALL' ? undefined : status,
    source: source === 'ALL' ? undefined : source,
    targetType: targetType === 'ALL' ? undefined : targetType,
    page,
    pageSize,
  });

  const reports = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  const filteredReports = search.trim()
    ? reports.filter(
        (r) =>
          r.reportNumber?.toLowerCase().includes(search.toLowerCase()) ||
          r.reason?.toLowerCase().includes(search.toLowerCase()) ||
          r.reporterName?.toLowerCase().includes(search.toLowerCase()) ||
          r.targetId?.toLowerCase().includes(search.toLowerCase())
      )
    : reports;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6" data-testid="admin-reports-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Flag className="h-6 w-6 text-brand-orange" />
            Hàng đợi kiểm duyệt báo cáo vi phạm
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Xem xét các nội dung bị báo cáo bởi người học hoặc phát hiện bởi hệ thống AI PhoBERT.
          </p>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
            Trạng thái:
          </span>
          {[
            { value: 'PENDING', label: 'Chờ xử lý' },
            { value: 'RESOLVED_ACCEPTED', label: 'Đã chấp nhận' },
            { value: 'RESOLVED_REJECTED', label: 'Đã từ chối' },
            { value: 'ALL', label: 'Tất cả' },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setStatus(item.value);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                status === item.value
                  ? 'bg-brand-orange text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Second row filters: Source, Target Type, Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Nguồn:</span>
              <select
                value={source}
                onChange={(e) => {
                  setSource(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-input bg-background px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="ALL">Tất cả nguồn</option>
                <option value="USER">Người dùng báo cáo</option>
                <option value="AI_FINDING">PhoBERT AI phát hiện</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Đối tượng:</span>
              <select
                value={targetType}
                onChange={(e) => {
                  setTargetType(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-input bg-background px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="ALL">Tất cả đối tượng</option>
                <option value="COURSE">Khóa học</option>
                <option value="COMMENT">Bình luận</option>
              </select>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Tìm theo mã, lý do, người gửi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-8"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : filteredReports.length === 0 ? (
        <EmptyState
          title="Không có báo cáo vi phạm nào"
          description="Hiện tại hàng đợi không có báo cáo nào khớp với tiêu chí lọc của bạn."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3.5 px-4">MÃ BÁO CÁO</th>
                <th className="py-3.5 px-4">NGUỒN PHÁT HIỆN</th>
                <th className="py-3.5 px-4">ĐỐI TƯỢNG</th>
                <th className="py-3.5 px-4">LÝ DO VI PHẠM</th>
                <th className="py-3.5 px-4">NGƯỜI BÁO CÁO</th>
                <th className="py-3.5 px-4">THỜI GIAN</th>
                <th className="py-3.5 px-4">TRẠNG THÁI</th>
                <th className="py-3.5 px-4 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredReports.map((rep) => (
                <tr key={rep.id} className="hover:bg-muted/10 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                    #{rep.reportNumber || rep.id.substring(0, 8)}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {rep.source === 'AI_FINDING' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-violet-400 border border-violet-500/30">
                        <Bot className="h-3 w-3" />
                        PhoBERT AI
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-blue-400">
                        <User className="h-3 w-3" />
                        Người dùng
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium ${
                        rep.targetType === 'COURSE'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {rep.targetType === 'COURSE' ? (
                        <FileText className="h-3 w-3" />
                      ) : (
                        <MessageSquare className="h-3 w-3" />
                      )}
                      {rep.targetType === 'COURSE' ? 'Khóa học' : 'Bình luận'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-foreground max-w-xs">
                    <p className="truncate" title={rep.reason}>
                      {rep.reason}
                    </p>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground">
                    {rep.reporterName || rep.reporterEmail || (rep.source === 'AI_FINDING' ? 'Hệ thống AI' : 'Ẩn danh')}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-muted-foreground whitespace-nowrap">
                    {new Date(rep.createdAt).toLocaleString('vi-VN')}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        rep.status === 'PENDING'
                          ? 'bg-amber-500/20 text-amber-400'
                          : rep.status === 'RESOLVED_ACCEPTED'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {rep.status === 'PENDING'
                        ? 'Chờ xử lý'
                        : rep.status === 'RESOLVED_ACCEPTED'
                        ? 'Đã duyệt vi phạm'
                        : 'Đã từ chối'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <Button asChild size="sm" variant={rep.status === 'PENDING' ? 'primary' : 'outline'} className="h-7 text-xs">
                      <Link to={`/admin/reports/${rep.id}`}>
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        {rep.status === 'PENDING' ? 'Xử lý' : 'Xem'}
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 ? (
        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={data?.totalCount ?? 0}
          onPageChange={(p) => setPage(p)}
        />
      ) : null}
    </div>
  );
}
