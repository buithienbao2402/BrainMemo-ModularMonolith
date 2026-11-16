import { useState } from 'react';
import {
  Eye,
  Filter,
  ScrollText,
  Search,
  Terminal,
  User,
} from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  ErrorState,
  Input,
  Pagination,
  Skeleton,
} from '@/shared/ui';
import { useAdminAuditLogs } from '../api/moderationApi';
import type { AuditLogDto } from '../types';

export function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [action, setAction] = useState<string>('ALL');
  const [objectType, setObjectType] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const { data, isLoading, isError, refetch } = useAdminAuditLogs({
    action: action === 'ALL' ? undefined : action,
    objectType: objectType === 'ALL' ? undefined : objectType,
    page,
    pageSize,
  });

  const logs = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  const [inspectLog, setInspectLog] = useState<AuditLogDto | null>(null);

  const filteredLogs = search.trim()
    ? logs.filter(
        (l) =>
          l.objectId?.toLowerCase().includes(search.toLowerCase()) ||
          l.actorUserId?.toLowerCase().includes(search.toLowerCase()) ||
          l.actorName?.toLowerCase().includes(search.toLowerCase()) ||
          l.note?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6" data-testid="admin-audit-logs-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <ScrollText className="h-6 w-6 text-brand-orange" />
            Nhật ký kiểm toán hệ thống (Audit Logs)
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Lịch sử bất biến (Append-only) ghi nhận toàn bộ thao tác quản trị, xử lý vi phạm và chế tài kỷ luật.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Hành động:</span>
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-input bg-background px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">Tất cả hành động</option>
              <option value="REPORT_RESOLVE">REPORT_RESOLVE (Xử lý báo cáo)</option>
              <option value="SANCTION_APPLY">SANCTION_APPLY (Áp dụng chế tài)</option>
              <option value="SANCTION_LIFT">SANCTION_LIFT (Gỡ chế tài)</option>
              <option value="COURSE_HIDE">COURSE_HIDE (Ẩn khóa học)</option>
              <option value="COMMENT_DELETE">COMMENT_DELETE (Xóa bình luận)</option>
              <option value="ACCOUNT_LOCK">ACCOUNT_LOCK (Khóa tài khoản)</option>
              <option value="ACCOUNT_UNLOCK">ACCOUNT_UNLOCK (Mở khóa tài khoản)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Đối tượng:</span>
            <select
              value={objectType}
              onChange={(e) => {
                setObjectType(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-input bg-background px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="ALL">Tất cả đối tượng</option>
              <option value="REPORT">REPORT (Báo cáo)</option>
              <option value="SANCTION">SANCTION (Chế tài)</option>
              <option value="COURSE">COURSE (Khóa học)</option>
              <option value="COMMENT">COMMENT (Bình luận)</option>
              <option value="USER_ACCOUNT">USER_ACCOUNT (Tài khoản)</option>
            </select>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Tìm theo ID đối tượng, ghi chú..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-8"
          />
        </div>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          title="Không có nhật ký nào"
          description="Hiện chưa có bản ghi kiểm toán nào khớp với bộ lọc của bạn."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3.5 px-4">THỜI GIAN</th>
                <th className="py-3.5 px-4">TÁC NHÂN</th>
                <th className="py-3.5 px-4">HÀNH ĐỘNG</th>
                <th className="py-3.5 px-4">ĐỐI TƯỢNG TÁC ĐỘNG</th>
                <th className="py-3.5 px-4">ĐỊA CHỈ IP</th>
                <th className="py-3.5 px-4">GHI CHÚ / CĂN CỨ</th>
                <th className="py-3.5 px-4 text-right">CHI TIẾT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-muted-foreground whitespace-nowrap">
                    {new Date(log.occurredAt).toLocaleString('vi-VN')}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        log.actorType === 'ADMIN'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-zinc-500/20 text-zinc-400'
                      }`}
                    >
                      {log.actorType === 'ADMIN' ? <User className="h-3 w-3" /> : <Terminal className="h-3 w-3" />}
                      {log.actorName || log.actorType}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`font-mono font-bold text-[11px] ${
                        log.action.includes('LOCK') || log.action.includes('DELETE')
                          ? 'text-rose-400'
                          : log.action.includes('LIFT') || log.action.includes('UNLOCK')
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-foreground whitespace-nowrap">
                    <span className="font-semibold text-muted-foreground">[{log.objectType}]</span>{' '}
                    <span className="truncate max-w-[120px] inline-block align-bottom">{log.objectId}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-muted-foreground whitespace-nowrap">
                    {log.ipAddress || '–'}
                  </td>
                  <td className="py-3.5 px-4 text-foreground max-w-xs truncate" title={log.note || ''}>
                    {log.note || <span className="text-muted-foreground italic">Không có ghi chú</span>}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setInspectLog(log)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Xem JSON
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

      {/* Inspect JSON Modal */}
      {inspectLog ? (
        <Dialog open={Boolean(inspectLog)} onOpenChange={() => setInspectLog(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-primary" />
                Chi tiết bản ghi kiểm toán #{inspectLog.id.substring(0, 8)}
              </DialogTitle>
              <DialogDescription>
                Bản ghi nhật ký bất biến ghi nhận tại thời điểm {new Date(inspectLog.occurredAt).toLocaleString('vi-VN')}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2 text-xs">
              <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-1.5">
                <p><strong>Hành động:</strong> {inspectLog.action}</p>
                <p><strong>Tác nhân:</strong> {inspectLog.actorType} ({inspectLog.actorUserId || 'N/A'})</p>
                <p><strong>Đối tượng tác động:</strong> {inspectLog.objectType} - {inspectLog.objectId}</p>
                <p><strong>Địa chỉ IP:</strong> {inspectLog.ipAddress || 'N/A'}</p>
                <p><strong>Ghi chú:</strong> {inspectLog.note || 'Không có'}</p>
              </div>

              <div>
                <p className="font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Metadata Snapshot (JSON):
                </p>
                <div className="rounded-xl border border-border bg-[#1b1b21] p-3 text-[11px] font-mono text-[#ffdad6] overflow-x-auto max-h-60">
                  <pre>{JSON.stringify(inspectLog.metadata || {}, null, 2)}</pre>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setInspectLog(null)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
