import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Flag,
  Info,
  MessageSquare,
  ShieldAlert,
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
  Skeleton,
} from '@/shared/ui';
import { useCourseReports } from '../api/moderationApi';
import type { ReportDto } from '../types';

export function CourseReportsPage() {
  const { courseId = '' } = useParams<{ courseId: string }>();
  const { data: reports, isLoading, isError, refetch } = useCourseReports(courseId);

  const [selectedReport, setSelectedReport] = useState<ReportDto | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED_ACCEPTED' | 'RESOLVED_REJECTED'>('ALL');
  const [targetTypeFilter, setTargetTypeFilter] = useState<'ALL' | 'COURSE' | 'COMMENT'>('ALL');

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !reports) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  const filteredReports = reports.filter((rep) => {
    if (statusFilter !== 'ALL' && rep.status !== statusFilter) return false;
    if (targetTypeFilter !== 'ALL' && rep.targetType !== targetTypeFilter) return false;
    return true;
  });

  const pendingCount = reports.filter((r) => r.status === 'PENDING').length;
  const acceptedCount = reports.filter((r) => r.status === 'RESOLVED_ACCEPTED').length;
  const rejectedCount = reports.filter((r) => r.status === 'RESOLVED_REJECTED').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6" data-testid="course-reports-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
              <Link to={`/courses/${courseId}/manage`}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Về tổng quan khóa học
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Flag className="h-6 w-6 text-amber-500" />
            Báo cáo vi phạm khóa học
          </h1>
          <p className="text-sm text-muted-foreground">
            Theo dõi và giải trình các báo cáo vi phạm liên quan đến khóa học và bình luận của học viên.
          </p>
        </div>
      </div>

      {/* Info Notice */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-xs text-blue-300">
        <Info className="h-5 w-5 shrink-0 text-blue-400 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-200">Chính sách bảo vệ quyền riêng tư</p>
          <p className="text-muted-foreground">
            Danh tính của người gửi báo cáo được bảo mật ẩn danh theo tiêu chuẩn bảo mật BrainMemo LMS. Quyết định xử lý cuối cùng được điều phối bởi Ban quản trị nền tảng.
          </p>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tổng báo cáo</p>
          <p className="text-2xl font-bold text-foreground mt-1">{reports.length}</p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">Đang chờ xử lý</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
          <p className="text-xs font-medium text-rose-400 uppercase tracking-wider">Đã chấp thuận</p>
          <p className="text-2xl font-bold text-rose-400 mt-1">{acceptedCount}</p>
        </div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Đã từ chối</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{rejectedCount}</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground mr-1" />
          <span className="text-xs font-semibold text-muted-foreground uppercase">Trạng thái:</span>
          {(['ALL', 'PENDING', 'RESOLVED_ACCEPTED', 'RESOLVED_REJECTED'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {st === 'ALL'
                ? 'Tất cả'
                : st === 'PENDING'
                ? 'Chờ xử lý'
                : st === 'RESOLVED_ACCEPTED'
                ? 'Đã duyệt'
                : 'Đã từ chối'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Đối tượng:</span>
          <select
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value as any)}
            className="rounded-lg border border-input bg-background px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="ALL">Tất cả đối tượng</option>
            <option value="COURSE">Khóa học</option>
            <option value="COMMENT">Bình luận</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      {filteredReports.length === 0 ? (
        <EmptyState
          title="Không có báo cáo vi phạm"
          description="Khóa học của bạn tuân thủ tốt các tiêu chuẩn cộng đồng, không có báo cáo nào trong bộ lọc này."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3 px-4">MÃ BÁO CÁO</th>
                <th className="py-3 px-4">ĐỐI TƯỢNG</th>
                <th className="py-3 px-4">LÝ DO</th>
                <th className="py-3 px-4">MÔ TẢ CHI TIẾT</th>
                <th className="py-3 px-4">NGÀY BÁO CÁO</th>
                <th className="py-3 px-4">TRẠNG THÁI</th>
                <th className="py-3 px-4 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredReports.map((rep) => (
                <tr key={rep.id} className="hover:bg-muted/10 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-foreground">
                    #{rep.reportNumber || rep.id.substring(0, 8)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-medium ${
                        rep.targetType === 'COURSE'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}
                    >
                      {rep.targetType === 'COURSE' ? <FileText className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                      {rep.targetType === 'COURSE' ? 'Khóa học' : 'Bình luận'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-foreground">{rep.reason}</td>
                  <td className="py-3 px-4 text-muted-foreground max-w-xs">
                    <p className="truncate italic">{rep.description || 'Không có mô tả'}</p>
                  </td>
                  <td className="py-3 px-4 font-mono text-muted-foreground whitespace-nowrap">
                    {new Date(rep.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
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
                        ? 'Đã duyệt'
                        : 'Đã từ chối'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedReport(rep)}
                      className="h-7 text-xs"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Chi tiết
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Dialog */}
      {selectedReport ? (
        <Dialog open={Boolean(selectedReport)} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                Chi tiết báo cáo #{selectedReport.reportNumber || selectedReport.id.substring(0, 8)}
              </DialogTitle>
              <DialogDescription>
                Thông tin phản ánh từ cộng đồng người học về nội dung thuộc khóa học.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-sm">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-muted/40 p-2.5">
                  <p className="text-muted-foreground uppercase font-semibold">Đối tượng</p>
                  <p className="font-bold text-foreground mt-0.5">
                    {selectedReport.targetType === 'COURSE' ? 'Toàn bộ Khóa học' : 'Bình luận trao đổi'}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2.5">
                  <p className="text-muted-foreground uppercase font-semibold">Trạng thái</p>
                  <p className="font-bold text-foreground mt-0.5">
                    {selectedReport.status === 'PENDING'
                      ? 'Đang chờ Admin xử lý'
                      : selectedReport.status === 'RESOLVED_ACCEPTED'
                      ? 'Admin đã xác nhận vi phạm'
                      : 'Admin đã bác bỏ báo cáo'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lý do phản ánh</p>
                <p className="mt-1 font-medium text-foreground">{selectedReport.reason}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mô tả từ người học</p>
                <div className="mt-1 rounded-lg border border-border bg-muted/20 p-3 italic text-foreground">
                  {selectedReport.description || 'Không có mô tả bổ sung.'}
                </div>
              </div>

              {selectedReport.evidences && selectedReport.evidences.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chứng cứ liên kết</p>
                  <div className="mt-1 space-y-1">
                    {selectedReport.evidences.map((ev) => (
                      <a
                        key={ev.id}
                        href={ev.content}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span className="truncate">{ev.content}</span>
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}

              {selectedReport.resolutionNote ? (
                <div className="rounded-lg border border-border bg-muted/50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ghi chú từ Quản trị viên</p>
                  <p className="mt-1 text-xs text-foreground">{selectedReport.resolutionNote}</p>
                </div>
              ) : null}
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setSelectedReport(null)}>
                Đóng
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
