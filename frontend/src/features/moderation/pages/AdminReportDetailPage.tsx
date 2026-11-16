import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileText,
  Flag,
  Lock,
  MessageSquare,
  Shield,
  ShieldAlert,
  User,
  XCircle,
} from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ErrorState,
  Input,
  Skeleton,
  useToast,
} from '@/shared/ui';
import {
  useAdminReport,
  useReportTargetContent,
  useResolveReport,
} from '../api/moderationApi';
import type { SanctionRequestItem } from '../types';

export function AdminReportDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { pushToast } = useToast();

  const { data: report, isLoading, isError, refetch } = useAdminReport(id);
  const {
    data: targetContent,
    isLoading: isLoadingContent,
    isError: isErrorContent,
    error: contentError,
  } = useReportTargetContent(id);

  const { mutateAsync: resolveReport, isPending: isResolving } = useResolveReport(id);

  // Resolution form state
  const [decision, setDecision] = useState<'ACCEPTED' | 'REJECTED'>('ACCEPTED');
  const [resolutionNote, setResolutionNote] = useState('');
  const [applyCourseHide, setApplyCourseHide] = useState(false);
  const [courseHideDurationDays, setCourseHideDurationDays] = useState(7);
  const [applyCommentDelete, setApplyCommentDelete] = useState(false);
  const [applyAccountLock, setApplyAccountLock] = useState(false);
  const [accountLockType, setAccountLockType] = useState<'TEMPORARY' | 'PERMANENT'>('TEMPORARY');
  const [accountLockDays, setAccountLockDays] = useState(7);
  const [applyCourseDelete, setApplyCourseDelete] = useState(false);

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  const isPending = report.status === 'PENDING';

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setConfirmDialogOpen(true);
  };

  const handleExecuteResolution = async () => {
    setErrorMessage(null);
    const sanctions: SanctionRequestItem[] = [];

    if (decision === 'ACCEPTED') {
      if (applyCourseHide) {
        sanctions.push({
          type: 'COURSE_HIDE',
          targetType: 'COURSE',
          targetId: report.targetId,
          reason: resolutionNote.trim() || report.reason,
          durationDays: courseHideDurationDays,
        });
      }
      if (applyCommentDelete) {
        sanctions.push({
          type: 'COMMENT_DELETE',
          targetType: 'COMMENT',
          targetId: report.targetId,
          reason: resolutionNote.trim() || report.reason,
        });
      }
      if (applyAccountLock) {
        sanctions.push({
          type: accountLockType === 'PERMANENT' ? 'ACCOUNT_LOCK_PERMANENT' : 'ACCOUNT_LOCK_TEMPORARY',
          targetType: 'ACCOUNT',
          targetId: report.reporterUserId || report.targetId, // Target account to sanction
          reason: resolutionNote.trim() || report.reason,
          durationDays: accountLockType === 'TEMPORARY' ? accountLockDays : undefined,
        });
      }
      if (applyCourseDelete) {
        sanctions.push({
          type: 'COURSE_PERMANENT_DELETE',
          targetType: 'COURSE',
          targetId: report.targetId,
          reason: resolutionNote.trim() || report.reason,
        });
      }
    }

    try {
      await resolveReport({
        resolution: decision,
        note: resolutionNote.trim() || undefined,
        sanctions: sanctions.length > 0 ? sanctions : undefined,
      });

      setConfirmDialogOpen(false);
      pushToast({
        title: 'Đã xử lý báo cáo thành công',
        description: `Báo cáo đã chuyển sang trạng thái: ${
          decision === 'ACCEPTED' ? 'Đã duyệt vi phạm' : 'Đã từ chối'
        }.`,
        tone: 'success',
      });
      refetch();
    } catch (err: any) {
      setConfirmDialogOpen(false);
      setErrorMessage(err?.message || 'Có lỗi xảy ra khi xử lý báo cáo. Vui lòng thử lại.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6" data-testid="admin-report-detail-page">
      {/* Back button & Page title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
            <Link to="/admin/reports">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Quay lại danh sách báo cáo
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <ShieldAlert className="h-6 w-6 text-brand-orange" />
            Chi tiết & Xử lý báo cáo #{report.reportNumber || report.id.substring(0, 8)}
          </h1>
        </div>

        <div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
              report.status === 'PENDING'
                ? 'bg-amber-500/20 text-amber-400'
                : report.status === 'RESOLVED_ACCEPTED'
                ? 'bg-rose-500/20 text-rose-400'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            {report.status === 'PENDING'
              ? 'Chờ xử lý'
              : report.status === 'RESOLVED_ACCEPTED'
              ? 'Đã duyệt vi phạm (ACCEPTED)'
              : 'Đã từ chối báo cáo (REJECTED)'}
          </span>
        </div>
      </div>

      {errorMessage ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Report Details & Snapshot */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Card */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Flag className="h-4 w-4 text-primary" />
              Thông tin báo cáo vi phạm
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl bg-muted/40 p-3">
                <span className="text-muted-foreground block font-medium">Nguồn báo cáo</span>
                <span className="font-bold text-foreground mt-1 flex items-center gap-1.5">
                  {report.source === 'AI_FINDING' ? (
                    <>
                      <Bot className="h-3.5 w-3.5 text-violet-400" />
                      PhoBERT AI Flag
                    </>
                  ) : (
                    <>
                      <User className="h-3.5 w-3.5 text-blue-400" />
                      Người dùng phản ánh
                    </>
                  )}
                </span>
              </div>

              <div className="rounded-xl bg-muted/40 p-3">
                <span className="text-muted-foreground block font-medium">Đối tượng vi phạm</span>
                <span className="font-bold text-foreground mt-1 flex items-center gap-1.5">
                  {report.targetType === 'COURSE' ? (
                    <>
                      <FileText className="h-3.5 w-3.5 text-amber-400" />
                      Khóa học
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                      Bình luận
                    </>
                  )}
                </span>
              </div>

              <div className="rounded-xl bg-muted/40 p-3 col-span-2 sm:col-span-1">
                <span className="text-muted-foreground block font-medium">Thời gian gửi</span>
                <span className="font-bold text-foreground mt-1 font-mono">
                  {new Date(report.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              <div>
                <span className="font-semibold text-muted-foreground uppercase tracking-wider">
                  Mã đối tượng (Target ID):
                </span>
                <p className="font-mono text-sm font-bold text-foreground mt-0.5 break-all">
                  {report.targetId}
                </p>
              </div>

              <div>
                <span className="font-semibold text-muted-foreground uppercase tracking-wider">
                  Lý do vi phạm:
                </span>
                <p className="text-sm font-semibold text-foreground mt-0.5">{report.reason}</p>
              </div>

              {report.description ? (
                <div>
                  <span className="font-semibold text-muted-foreground uppercase tracking-wider">
                    Mô tả bổ sung:
                  </span>
                  <div className="mt-1 rounded-xl border border-border bg-muted/20 p-3 italic text-foreground text-sm">
                    {report.description}
                  </div>
                </div>
              ) : null}

              {report.reporterName || report.reporterEmail ? (
                <div className="pt-1">
                  <span className="font-semibold text-muted-foreground uppercase tracking-wider">
                    Người gửi báo cáo:
                  </span>
                  <p className="text-xs text-foreground mt-0.5">
                    {report.reporterName} ({report.reporterEmail})
                  </p>
                </div>
              ) : null}
            </div>

            {/* Evidences */}
            {report.evidences && report.evidences.length > 0 ? (
              <div className="pt-2 border-t border-border/60 space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Chứng cứ liên kết ({report.evidences.length})
                </span>
                <div className="space-y-1.5">
                  {report.evidences.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-2 text-xs"
                    >
                      <a
                        href={ev.content}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-primary hover:underline truncate max-w-[420px]"
                      >
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{ev.content}</span>
                      </a>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {ev.kind}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Target Content Preview (DEC-02) */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Nội dung đối tượng tại thời điểm xem xét (Preview DEC-02)
            </h2>

            {isLoadingContent ? (
              <Skeleton className="h-24 w-full rounded-xl" />
            ) : isErrorContent || (contentError as any)?.status === 404 ? (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-amber-200">Không thể xem trước nội dung (DEC-02)</p>
                  <p className="text-muted-foreground">
                    Khóa học mục tiêu hiện đang ở chế độ hiển thị riêng tư (Only Me). Theo quy định kiến trúc bảo mật DEC-02, ban quản trị không được truy cập nội dung riêng tư của tác giả trước khi khóa học được công khai.
                  </p>
                </div>
              </div>
            ) : targetContent ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-border bg-muted/20 p-4 text-xs font-mono text-foreground whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {targetContent.contentSnapshot || 'Không có snapshot văn bản.'}
                </div>
                {targetContent.metadata ? (
                  <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground font-mono">
                    <pre>{JSON.stringify(targetContent.metadata, null, 2)}</pre>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* Right Column: Resolution Panel */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm sticky top-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Quyết định xử lý
            </h2>

            {!isPending ? (
              /* Already Resolved info */
              <div className="space-y-3 pt-1 text-xs">
                <div className="rounded-xl bg-muted/50 p-3.5 space-y-2">
                  <div className="flex items-center gap-2">
                    {report.status === 'RESOLVED_ACCEPTED' ? (
                      <CheckCircle2 className="h-4 w-4 text-rose-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-emerald-500" />
                    )}
                    <span className="font-bold text-foreground">
                      {report.status === 'RESOLVED_ACCEPTED' ? 'Đã duyệt vi phạm' : 'Đã từ chối báo cáo'}
                    </span>
                  </div>
                  {report.resolvedAt ? (
                    <p className="text-muted-foreground">
                      Xử lý lúc: {new Date(report.resolvedAt).toLocaleString('vi-VN')}
                    </p>
                  ) : null}
                  {report.resolutionNote ? (
                    <div className="border-t border-border/50 pt-2 text-foreground italic">
                      "{report.resolutionNote}"
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              /* Pending Form */
              <form onSubmit={handleOpenConfirm} className="space-y-4 pt-1">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Kết luận kiểm duyệt
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDecision('ACCEPTED')}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-xs font-semibold transition-colors ${
                        decision === 'ACCEPTED'
                          ? 'border-destructive bg-destructive/15 text-destructive'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Xác nhận vi phạm
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecision('REJECTED')}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-xs font-semibold transition-colors ${
                        decision === 'REJECTED'
                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <XCircle className="h-4 w-4" />
                      Bác bỏ báo cáo
                    </button>
                  </div>
                </div>

                {/* Resolution Note */}
                <div className="space-y-1.5">
                  <label htmlFor="res-note" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Ghi chú phán quyết
                  </label>
                  <textarea
                    id="res-note"
                    rows={3}
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Nhập lý do chấp nhận hoặc bác bỏ phán quyết..."
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                {/* Sanction Builder (if ACCEPTED) */}
                {decision === 'ACCEPTED' ? (
                  <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5">
                    <p className="text-xs font-bold uppercase tracking-wider text-destructive flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5" />
                      Áp dụng chế tài xử phạt (Atomic Transaction)
                    </p>

                    {report.targetType === 'COURSE' ? (
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={applyCourseHide}
                            onChange={(e) => setApplyCourseHide(e.target.checked)}
                            className="rounded border-input text-brand-orange"
                          />
                          <span className="font-semibold">Ẩn khóa học khỏi danh mục tìm kiếm</span>
                        </label>
                        {applyCourseHide ? (
                          <div className="pl-6 flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">Thời hạn ẩn (ngày):</span>
                            <Input
                              type="number"
                              min={1}
                              max={365}
                              value={courseHideDurationDays}
                              onChange={(e) => setCourseHideDurationDays(Number(e.target.value))}
                              className="w-20 h-7 text-xs"
                            />
                          </div>
                        ) : null}

                        <label className="flex items-center gap-2 text-xs text-destructive cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={applyCourseDelete}
                            onChange={(e) => setApplyCourseDelete(e.target.checked)}
                            className="rounded border-input text-destructive"
                          />
                          <span>Xóa vĩnh viễn khóa học này</span>
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={applyCommentDelete}
                            onChange={(e) => setApplyCommentDelete(e.target.checked)}
                            className="rounded border-input text-destructive"
                          />
                          <span className="font-semibold">Xóa mềm bình luận vi phạm</span>
                        </label>
                      </div>
                    )}

                    {/* Account Lock option */}
                    <div className="border-t border-border/50 pt-2 space-y-2">
                      <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={applyAccountLock}
                          onChange={(e) => setApplyAccountLock(e.target.checked)}
                          className="rounded border-input text-destructive"
                        />
                        <span className="font-semibold">Khóa tài khoản vi phạm</span>
                      </label>

                      {applyAccountLock ? (
                        <div className="pl-6 space-y-2 text-xs">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setAccountLockType('TEMPORARY')}
                              className={`px-2 py-1 rounded text-xs ${
                                accountLockType === 'TEMPORARY'
                                  ? 'bg-destructive text-white'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              Tạm thời
                            </button>
                            <button
                              type="button"
                              onClick={() => setAccountLockType('PERMANENT')}
                              className={`px-2 py-1 rounded text-xs ${
                                accountLockType === 'PERMANENT'
                                  ? 'bg-destructive text-white'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              Vĩnh viễn
                            </button>
                          </div>
                          {accountLockType === 'TEMPORARY' ? (
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">Số ngày khóa:</span>
                              <Input
                                type="number"
                                min={1}
                                max={365}
                                value={accountLockDays}
                                onChange={(e) => setAccountLockDays(Number(e.target.value))}
                                className="w-20 h-7 text-xs"
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <Button
                  type="submit"
                  variant={decision === 'ACCEPTED' ? 'destructive' : 'primary'}
                  className="w-full text-xs font-semibold"
                >
                  Xác nhận xử lý báo cáo
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Xác nhận phán quyết kiểm duyệt</DialogTitle>
            <DialogDescription>
              {decision === 'ACCEPTED'
                ? 'Bạn chuẩn bị xác nhận nội dung vi phạm tiêu chuẩn và áp dụng các chế tài đã chọn. Giao dịch này sẽ được ghi nhận vào nhật ký kiểm toán không thể xóa.'
                : 'Bạn chuẩn bị từ chối báo cáo vi phạm này và đóng hồ sơ xử lý.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={isResolving}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant={decision === 'ACCEPTED' ? 'destructive' : 'primary'}
              onClick={handleExecuteResolution}
              disabled={isResolving}
            >
              {isResolving ? 'Đang thực thi...' : 'Xác nhận thi hành'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
