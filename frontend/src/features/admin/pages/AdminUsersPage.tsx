import { useState } from 'react';
import {
  AlertCircle,
  Clock,
  Lock,
  Search,
  ShieldCheck,
  ShieldX,
  Unlock,
  UserCheck,
  Users,
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
  useAdminUsers,
  useGrantAdmin,
  useLockUser,
  useRevokeAdmin,
  useUnlockUser,
} from '../api/adminApi';
import type { AdminUserSummary } from '../types';

export function AdminUsersPage() {
  const { pushToast } = useToast();
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('ALL');

  const { data, isLoading, isError, refetch } = useAdminUsers({
    search: search.trim() || undefined,
    status: status === 'ALL' ? undefined : status,
    page,
    pageSize,
  });

  const users = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  // Selected User for Actions
  const [selectedUser, setSelectedUser] = useState<AdminUserSummary | null>(null);
  const [actionType, setActionType] = useState<
    'GRANT_ADMIN' | 'REVOKE_ADMIN' | 'LOCK_USER' | 'UNLOCK_USER' | null
  >(null);

  // Lock Form State
  const [lockType, setLockType] = useState<'TEMPORARY' | 'PERMANENT'>('TEMPORARY');
  const [lockDays, setLockDays] = useState(7);
  const [lockReason, setLockReason] = useState('');

  // Unlock Form State
  const [unlockReason, setUnlockReason] = useState('');

  // Error message
  const [actionError, setActionError] = useState<string | null>(null);

  const { mutateAsync: grantAdmin, isPending: isGranting } = useGrantAdmin();
  const { mutateAsync: revokeAdmin, isPending: isRevoking } = useRevokeAdmin();
  const { mutateAsync: lockUser, isPending: isLocking } = useLockUser(selectedUser?.id || '');
  const { mutateAsync: unlockUser, isPending: isUnlocking } = useUnlockUser(
    selectedUser?.id || ''
  );

  const handleOpenAction = (
    user: AdminUserSummary,
    action: 'GRANT_ADMIN' | 'REVOKE_ADMIN' | 'LOCK_USER' | 'UNLOCK_USER'
  ) => {
    setSelectedUser(user);
    setActionType(action);
    setActionError(null);
    setLockType('TEMPORARY');
    setLockDays(7);
    setLockReason('');
    setUnlockReason('');
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
    setActionType(null);
    setActionError(null);
  };

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !actionType) return;
    setActionError(null);

    try {
      if (actionType === 'GRANT_ADMIN') {
        await grantAdmin(selectedUser.id);
        pushToast({
          title: 'Đã cấp quyền Quản trị viên',
          description: `Tài khoản ${selectedUser.email} hiện đã có quyền ADMIN.`,
          tone: 'success',
        });
      } else if (actionType === 'REVOKE_ADMIN') {
        await revokeAdmin(selectedUser.id);
        pushToast({
          title: 'Đã thu hồi quyền Quản trị viên',
          description: `Tài khoản ${selectedUser.email} đã trở về vai trò người dùng chuẩn.`,
          tone: 'success',
        });
      } else if (actionType === 'LOCK_USER') {
        if (!lockReason.trim()) {
          setActionError('Vui lòng cung cấp lý do khóa tài khoản.');
          return;
        }
        const until =
          lockType === 'TEMPORARY'
            ? new Date(Date.now() + lockDays * 24 * 60 * 60 * 1000).toISOString()
            : undefined;

        await lockUser({
          type: lockType,
          reason: lockReason.trim(),
          until,
        });
        pushToast({
          title: 'Đã khóa tài khoản thành công',
          description: `Tài khoản ${selectedUser.email} đã bị tạm ngưng quyền truy cập.`,
          tone: 'success',
        });
      } else if (actionType === 'UNLOCK_USER') {
        if (!unlockReason.trim()) {
          setActionError('Vui lòng cung cấp lý do mở khóa tài khoản.');
          return;
        }
        await unlockUser({ reason: unlockReason.trim() });
        pushToast({
          title: 'Đã mở khóa tài khoản thành công',
          description: `Tài khoản ${selectedUser.email} đã được phục hồi quyền đăng nhập.`,
          tone: 'success',
        });
      }

      handleCloseModal();
      refetch();
    } catch (err: any) {
      if (err?.code === 'LAST_ADMIN') {
        setActionError('Không thể thu hồi quyền Admin duy nhất còn lại trong hệ thống.');
      } else {
        setActionError(err?.message || 'Có lỗi xảy ra khi thực hiện thao tác.');
      }
    }
  };

  const isSubmitting = isGranting || isRevoking || isLocking || isUnlocking;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6" data-testid="admin-users-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Users className="h-6 w-6 text-brand-orange" />
            Quản trị tài khoản & phân quyền người dùng
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Quản lý vai trò quản trị viên, kiểm soát trạng thái khóa và mở khóa tài khoản người dùng toàn hệ thống.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
            Trạng thái:
          </span>
          {[
            { value: 'ALL', label: 'Tất cả' },
            { value: 'ACTIVE', label: 'Hoạt động' },
            { value: 'LOCKED', label: 'Đang bị khóa' },
          ].map((st) => (
            <button
              key={st.value}
              type="button"
              onClick={() => {
                setStatus(st.value);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                status === st.value
                  ? 'bg-brand-orange text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Tìm theo email, tên người dùng..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
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
      ) : users.length === 0 ? (
        <EmptyState
          title="Không tìm thấy người dùng"
          description="Không có tài khoản nào phù hợp với bộ lọc tìm kiếm của bạn."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-3.5 px-4">NGƯỜI DÙNG</th>
                <th className="py-3.5 px-4">EMAIL</th>
                <th className="py-3.5 px-4">VAI TRÒ</th>
                <th className="py-3.5 px-4">TRẠNG THÁI</th>
                <th className="py-3.5 px-4">THỜI HẠN KHÓA</th>
                <th className="py-3.5 px-4">NGÀY ĐĂNG KÝ</th>
                <th className="py-3.5 px-4 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {users.map((u) => {
                const isAdmin = u.roles?.includes('ADMIN');
                return (
                  <tr key={u.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        {u.avatarUrl ? (
                          <img
                            src={u.avatarUrl}
                            alt=""
                            className="h-7 w-7 rounded-full object-cover shadow-sm"
                          />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-xs">
                            {((u.displayName || u.email || 'U')[0] || 'U').toUpperCase()}
                          </div>
                        )}
                        <span className="font-semibold text-foreground">
                          {u.displayName || 'Chưa đặt tên'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground whitespace-nowrap">
                      {u.email}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent/30 border border-accent px-2.5 py-0.5 text-[11px] font-bold text-accent-foreground">
                          <ShieldCheck className="h-3 w-3 text-brand-orange" />
                          ADMIN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                          USER
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {u.isLocked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-rose-400">
                          <Lock className="h-3 w-3" />
                          {u.lockType === 'PERMANENT' ? 'Khóa vĩnh viễn' : 'Khóa tạm thời'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                          <UserCheck className="h-3 w-3" />
                          Hoạt động
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground whitespace-nowrap">
                      {u.isLocked ? (
                        u.lockedUntil ? (
                          <span className="flex items-center gap-1 text-amber-400">
                            <Clock className="h-3 w-3" />
                            {new Date(u.lockedUntil).toLocaleDateString('vi-VN')}
                          </span>
                        ) : (
                          'Vĩnh viễn'
                        )
                      ) : (
                        '–'
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {/* Grant / Revoke Admin */}
                        {isAdmin ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => handleOpenAction(u, 'REVOKE_ADMIN')}
                            title="Thu hồi quyền Admin"
                          >
                            <ShieldX className="h-3.5 w-3.5 mr-1" />
                            Thu hồi
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-muted-foreground hover:text-primary"
                            onClick={() => handleOpenAction(u, 'GRANT_ADMIN')}
                            title="Cấp quyền Admin"
                          >
                            <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                            Cấp Admin
                          </Button>
                        )}

                        {/* Lock / Unlock Account */}
                        {u.isLocked ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-emerald-400 hover:text-emerald-300 hover:border-emerald-500"
                            onClick={() => handleOpenAction(u, 'UNLOCK_USER')}
                          >
                            <Unlock className="h-3.5 w-3.5 mr-1" />
                            Mở khóa
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-destructive hover:border-destructive"
                            onClick={() => handleOpenAction(u, 'LOCK_USER')}
                          >
                            <Lock className="h-3.5 w-3.5 mr-1" />
                            Khóa
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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

      {/* Action Dialog (Grant, Revoke, Lock, Unlock) */}
      {selectedUser && actionType ? (
        <Dialog open={Boolean(selectedUser && actionType)} onOpenChange={handleCloseModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {actionType === 'GRANT_ADMIN' ? (
                  <>
                    <ShieldCheck className="h-5 w-5 text-brand-orange" />
                    Cấp quyền Quản trị viên
                  </>
                ) : actionType === 'REVOKE_ADMIN' ? (
                  <>
                    <ShieldX className="h-5 w-5 text-destructive" />
                    Thu hồi quyền Quản trị viên
                  </>
                ) : actionType === 'LOCK_USER' ? (
                  <>
                    <Lock className="h-5 w-5 text-destructive" />
                    Khóa tài khoản người dùng
                  </>
                ) : (
                  <>
                    <Unlock className="h-5 w-5 text-emerald-400" />
                    Mở khóa tài khoản
                  </>
                )}
              </DialogTitle>
              <DialogDescription>
                Tài khoản thao tác: <strong>{selectedUser.email}</strong>
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleExecuteAction} className="space-y-4 pt-2">
              {actionError ? (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/15 p-3 text-sm text-destructive border border-destructive/30">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{actionError}</span>
                </div>
              ) : null}

              {actionType === 'GRANT_ADMIN' ? (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Bạn chuẩn bị cấp quyền Quản trị viên (ADMIN) cho tài khoản này. Người dùng sẽ có toàn quyền truy cập khu vực quản trị, phê duyệt kiểm duyệt, áp dụng chế tài và quản lý hệ thống.
                </p>
              ) : actionType === 'REVOKE_ADMIN' ? (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Bạn chuẩn bị thu hồi quyền ADMIN của tài khoản này. Lưu ý hệ thống luôn bắt buộc duy trì ít nhất một Quản trị viên hoạt động.
                </p>
              ) : actionType === 'LOCK_USER' ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Hình thức khóa
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setLockType('TEMPORARY')}
                        className={`rounded-lg border p-2.5 text-xs font-semibold ${
                          lockType === 'TEMPORARY'
                            ? 'border-destructive bg-destructive/15 text-destructive'
                            : 'border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        Khóa tạm thời
                      </button>
                      <button
                        type="button"
                        onClick={() => setLockType('PERMANENT')}
                        className={`rounded-lg border p-2.5 text-xs font-semibold ${
                          lockType === 'PERMANENT'
                            ? 'border-destructive bg-destructive/15 text-destructive'
                            : 'border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        Khóa vĩnh viễn
                      </button>
                    </div>
                  </div>

                  {lockType === 'TEMPORARY' ? (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Thời hạn khóa (ngày)
                      </label>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        value={lockDays}
                        onChange={(e) => setLockDays(Number(e.target.value))}
                        className="w-32 text-xs"
                      />
                    </div>
                  ) : null}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Lý do khóa tài khoản <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      rows={3}
                      value={lockReason}
                      onChange={(e) => setLockReason(e.target.value)}
                      placeholder="Nhập lý do chi tiết để ghi nhận vào nhật ký kiểm toán..."
                      className="w-full rounded-xl border border-input bg-background p-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Lý do mở khóa <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={unlockReason}
                    onChange={(e) => setUnlockReason(e.target.value)}
                    placeholder="Nhập căn cứ mở khóa tài khoản người dùng..."
                    className="w-full rounded-xl border border-input bg-background p-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant={
                    actionType === 'LOCK_USER' || actionType === 'REVOKE_ADMIN'
                      ? 'destructive'
                      : 'primary'
                  }
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Đang thực hiện...' : 'Xác nhận'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
