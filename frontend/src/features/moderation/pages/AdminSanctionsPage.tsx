import { useState } from 'react';
import {
  AlertCircle,
  Clock,
  Filter,
  Lock,
  Plus,
  ShieldAlert,
  Unlock,
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
  useToast,
} from '@/shared/ui';
import {
  useAdminSanctions,
  useApplySanction,
  useLiftSanction,
} from '../api/moderationApi';
import type {
  SanctionDto,
  SanctionTargetType,
  SanctionType,
} from '../types';

export function AdminSanctionsPage() {
  const { pushToast } = useToast();
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [activeOnly, setActiveOnly] = useState(true);
  const [targetType, setTargetType] = useState<string>('ALL');

  const { data, isLoading, isError, refetch } = useAdminSanctions({
    activeOnly,
    targetType: targetType === 'ALL' ? undefined : targetType,
    page,
    pageSize,
  });

  const sanctions = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  // Modals state
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);
  const [sanctionToLift, setSanctionToLift] = useState<SanctionDto | null>(null);
  const [liftReason, setLiftReason] = useState('');
  const [liftError, setLiftError] = useState<string | null>(null);

  const { mutateAsync: applySanction, isPending: isApplying } = useApplySanction();
  const { mutateAsync: liftSanction, isPending: isLifting } = useLiftSanction(
    sanctionToLift?.id || ''
  );

  // Direct Sanction Form State
  const [directType, setDirectType] = useState<SanctionType>('COURSE_HIDE');
  const [directTargetType, setDirectTargetType] = useState<SanctionTargetType>('COURSE');
  const [directTargetId, setDirectTargetId] = useState('');
  const [directReason, setDirectReason] = useState('');
  const [directDays, setDirectDays] = useState(7);
  const [directError, setDirectError] = useState<string | null>(null);

  const handleOpenDirectModal = () => {
    setDirectType('COURSE_HIDE');
    setDirectTargetType('COURSE');
    setDirectTargetId('');
    setDirectReason('');
    setDirectDays(7);
    setDirectError(null);
    setIsDirectModalOpen(true);
  };

  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDirectError(null);

    if (!directTargetId.trim()) {
      setDirectError('Vui lòng nhập ID đối tượng cần áp dụng chế tài.');
      return;
    }
    if (!directReason.trim()) {
      setDirectError('Vui lòng nhập lý do áp dụng chế tài.');
      return;
    }

    try {
      await applySanction({
        type: directType,
        targetType: directTargetType,
        targetId: directTargetId.trim(),
        reason: directReason.trim(),
        durationDays:
          directType === 'COURSE_HIDE' || directType === 'ACCOUNT_LOCK_TEMPORARY'
            ? directDays
            : undefined,
      });

      setIsDirectModalOpen(false);
      pushToast({
        title: 'Áp dụng chế tài thành công',
        description: 'Chế tài kỷ luật đã được áp dụng ngay lập tức cho đối tượng.',
        tone: 'success',
      });
      refetch();
    } catch (err: any) {
      setDirectError(err?.message || 'Không thể áp dụng chế tài. Vui lòng kiểm tra lại ID đối tượng.');
    }
  };

  const handleLiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sanctionToLift) return;
    setLiftError(null);

    if (!liftReason.trim()) {
      setLiftError('Vui lòng cung cấp lý do gỡ bỏ chế tài kiểm toán.');
      return;
    }

    try {
      await liftSanction({ reason: liftReason.trim() });
      setSanctionToLift(null);
      setLiftReason('');
      pushToast({
        title: 'Đã gỡ bỏ chế tài kỷ luật',
        description: 'Trạng thái đối tượng đã được phục hồi theo yêu cầu.',
        tone: 'success',
      });
      refetch();
    } catch (err: any) {
      setLiftError(err?.message || 'Không thể gỡ chế tài.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6" data-testid="admin-sanctions-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <ShieldAlert className="h-6 w-6 text-brand-orange" />
            Quản lý chế tài kỷ luật & xử phạt
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Theo dõi danh sách các lệnh khóa tài khoản, ẩn khóa học và gỡ bỏ chế tài theo quy trình kiểm toán.
          </p>
        </div>

        <Button onClick={handleOpenDirectModal} className="shrink-0 gap-1.5 text-xs font-semibold">
          <Plus className="h-4 w-4" />
          Áp dụng chế tài trực tiếp
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
            Hiển thị:
          </span>
          <button
            type="button"
            onClick={() => {
              setActiveOnly(true);
              setPage(1);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeOnly
                ? 'bg-brand-orange text-white shadow-sm'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            Đang hiệu lực (Active)
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveOnly(false);
              setPage(1);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              !activeOnly
                ? 'bg-brand-orange text-white shadow-sm'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            Toàn bộ lịch sử
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
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
            <option value="ACCOUNT">Tài khoản người dùng</option>
            <option value="COMMENT">Bình luận</option>
          </select>
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
      ) : sanctions.length === 0 ? (
        <EmptyState
          title="Không có chế tài nào"
          description="Hiện không có bản ghi chế tài xử phạt nào phù hợp với bộ lọc."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3.5 px-4">MÃ CHẾ TÀI</th>
                <th className="py-3.5 px-4">LOẠI CHẾ TÀI</th>
                <th className="py-3.5 px-4">ĐỐI TƯỢNG KỶ LUẬT</th>
                <th className="py-3.5 px-4">LÝ DO</th>
                <th className="py-3.5 px-4">NGÀY ÁP DỤNG</th>
                <th className="py-3.5 px-4">HẠN HIỆU LỰC</th>
                <th className="py-3.5 px-4">TRẠNG THÁI</th>
                <th className="py-3.5 px-4 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sanctions.map((sanc) => (
                <tr key={sanc.id} className="hover:bg-muted/10 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                    #{sanc.id.substring(0, 8)}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        sanc.type === 'COURSE_HIDE'
                          ? 'bg-amber-500/20 text-amber-400'
                          : sanc.type === 'COMMENT_DELETE'
                          ? 'bg-purple-500/20 text-purple-400'
                          : sanc.type.includes('ACCOUNT_LOCK')
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-destructive/20 text-destructive'
                      }`}
                    >
                      <Lock className="h-3 w-3" />
                      {sanc.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-foreground whitespace-nowrap">
                    <span className="font-semibold text-muted-foreground">[{sanc.targetType}]</span>{' '}
                    <span className="truncate max-w-[140px] inline-block align-bottom">{sanc.targetId}</span>
                  </td>
                  <td className="py-3.5 px-4 text-foreground max-w-xs truncate" title={sanc.reason}>
                    {sanc.reason}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-muted-foreground whitespace-nowrap">
                    {new Date(sanc.appliedAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-muted-foreground whitespace-nowrap">
                    {sanc.expiresAt ? (
                      <span className="flex items-center gap-1 text-amber-400">
                        <Clock className="h-3 w-3" />
                        {new Date(sanc.expiresAt).toLocaleDateString('vi-VN')}
                      </span>
                    ) : (
                      'Vĩnh viễn'
                    )}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        sanc.status === 'ACTIVE'
                          ? 'bg-rose-500/20 text-rose-400'
                          : sanc.status === 'LIFTED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {sanc.status === 'ACTIVE'
                        ? 'Đang hiệu lực'
                        : sanc.status === 'LIFTED'
                        ? 'Đã gỡ'
                        : 'Hết hạn'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    {sanc.status === 'ACTIVE' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-emerald-400 hover:text-emerald-300 hover:border-emerald-500"
                        onClick={() => {
                          setSanctionToLift(sanc);
                          setLiftReason('');
                          setLiftError(null);
                        }}
                      >
                        <Unlock className="h-3.5 w-3.5 mr-1" />
                        Gỡ chế tài
                      </Button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">
                        {sanc.liftKind ? `(${sanc.liftKind})` : '–'}
                      </span>
                    )}
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

      {/* Direct Sanction Modal */}
      <Dialog open={isDirectModalOpen} onOpenChange={setIsDirectModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Áp dụng chế tài trực tiếp
            </DialogTitle>
            <DialogDescription>
              Áp dụng chế tài kỷ luật thủ công mà không cần thông qua báo cáo vi phạm. Thao tác này sẽ ghi nhật ký kiểm toán.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDirectSubmit} className="space-y-4 pt-2">
            {directError ? (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/15 p-3 text-sm text-destructive border border-destructive/30">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{directError}</span>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold uppercase tracking-wider text-muted-foreground">
                  Loại chế tài
                </label>
                <select
                  value={directType}
                  onChange={(e) => {
                    const t = e.target.value as SanctionType;
                    setDirectType(t);
                    if (t === 'COURSE_HIDE' || t === 'COURSE_PERMANENT_DELETE') {
                      setDirectTargetType('COURSE');
                    } else if (t === 'COMMENT_DELETE') {
                      setDirectTargetType('COMMENT');
                    } else {
                      setDirectTargetType('ACCOUNT');
                    }
                  }}
                  className="w-full rounded-lg border border-input bg-background p-2 text-xs text-foreground"
                >
                  <option value="COURSE_HIDE">Ẩn khóa học (COURSE_HIDE)</option>
                  <option value="COMMENT_DELETE">Xóa bình luận (COMMENT_DELETE)</option>
                  <option value="ACCOUNT_LOCK_TEMPORARY">Khóa tài khoản tạm thời</option>
                  <option value="ACCOUNT_LOCK_PERMANENT">Khóa tài khoản vĩnh viễn</option>
                  <option value="COURSE_PERMANENT_DELETE">Xóa vĩnh viễn khóa học</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold uppercase tracking-wider text-muted-foreground">
                  Loại đối tượng
                </label>
                <select
                  value={directTargetType}
                  onChange={(e) => setDirectTargetType(e.target.value as SanctionTargetType)}
                  className="w-full rounded-lg border border-input bg-background p-2 text-xs text-foreground"
                >
                  <option value="COURSE">COURSE (Khóa học)</option>
                  <option value="COMMENT">COMMENT (Bình luận)</option>
                  <option value="ACCOUNT">ACCOUNT (Tài khoản)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mã đối tượng (Target ID) <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                value={directTargetId}
                onChange={(e) => setDirectTargetId(e.target.value)}
                placeholder="Nhập ID khóa học, ID bình luận hoặc ID tài khoản..."
                className="text-xs"
              />
            </div>

            {(directType === 'COURSE_HIDE' || directType === 'ACCOUNT_LOCK_TEMPORARY') ? (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Thời hạn áp dụng (ngày)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={directDays}
                  onChange={(e) => setDirectDays(Number(e.target.value))}
                  className="w-32 text-xs"
                />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Lý do áp dụng <span className="text-destructive">*</span>
              </label>
              <textarea
                rows={3}
                value={directReason}
                onChange={(e) => setDirectReason(e.target.value)}
                placeholder="Nhập căn cứ, điều khoản vi phạm hoặc quyết định kỷ luật..."
                className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDirectModalOpen(false)}
                disabled={isApplying}
              >
                Hủy
              </Button>
              <Button type="submit" variant="destructive" disabled={isApplying}>
                {isApplying ? 'Đang thực thi...' : 'Áp dụng chế tài'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lift Sanction Modal */}
      {sanctionToLift ? (
        <Dialog open={Boolean(sanctionToLift)} onOpenChange={() => setSanctionToLift(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-400">
                <Unlock className="h-5 w-5" />
                Gỡ bỏ chế tài kỷ luật
              </DialogTitle>
              <DialogDescription>
                Bạn chuẩn bị gỡ bỏ chế tài <strong>{sanctionToLift.type}</strong> áp dụng cho đối tượng{' '}
                <strong>{sanctionToLift.targetId}</strong>.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleLiftSubmit} className="space-y-4 pt-2">
              {liftError ? (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/15 p-3 text-sm text-destructive border border-destructive/30">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{liftError}</span>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Lý do gỡ chế tài (Kiểm toán bắt buộc) <span className="text-destructive">*</span>
                </label>
                <textarea
                  rows={3}
                  value={liftReason}
                  onChange={(e) => setLiftReason(e.target.value)}
                  placeholder="Nhập căn cứ giải trình, khiếu nại thành công hoặc quyết định ân xá..."
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSanctionToLift(null)}
                  disabled={isLifting}
                >
                  Hủy
                </Button>
                <Button type="submit" variant="primary" disabled={isLifting}>
                  {isLifting ? 'Đang gỡ...' : 'Xác nhận gỡ chế tài'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
