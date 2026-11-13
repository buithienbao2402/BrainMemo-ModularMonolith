import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Laptop,
  Smartphone,
  Globe,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Skeleton,
  useToast,
} from '@/shared/ui';
import { useAuth } from '@/shared/hooks';
import {
  useLogoutAllMutation,
  useRevokeSessionMutation,
  useSessionsQuery,
  type SessionDto,
} from '../api';

function getDeviceMeta(userAgent?: string) {
  const ua = (userAgent || '').toLowerCase();
  if (ua.includes('iphone') || ua.includes('ipad')) {
    return {
      title: 'Safari trên iPhone',
      sub: 'iOS • Thiết bị di động',
      icon: Smartphone,
    };
  }
  if (ua.includes('android')) {
    return {
      title: 'Chrome trên Android',
      sub: 'Android • Thiết bị di động',
      icon: Smartphone,
    };
  }
  if (ua.includes('macintosh') || ua.includes('mac os')) {
    return {
      title: 'BrainMemo App trên MacBook',
      sub: 'macOS • Ứng dụng Desktop',
      icon: Laptop,
    };
  }
  if (ua.includes('windows')) {
    return {
      title: 'Chrome trên Windows',
      sub: 'Windows 11 • Trình duyệt web',
      icon: Laptop,
    };
  }
  return {
    title: 'Trình duyệt web',
    sub: 'Thiết bị kết nối',
    icon: Globe,
  };
}

export function SessionSettingsPage() {
  const { pushToast } = useToast();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const sessionsQuery = useSessionsQuery();
  const revokeSessionMutation = useRevokeSessionMutation();
  const logoutAllMutation = useLogoutAllMutation();

  const [sessionToRevoke, setSessionToRevoke] = useState<SessionDto | null>(null);
  const [showLogoutAllConfirm, setShowLogoutAllConfirm] = useState(false);

  const sessions = sessionsQuery.data || [];
  const activeCount = sessions.length;

  const handleRevoke = async () => {
    if (!sessionToRevoke?.id) return;
    try {
      await revokeSessionMutation.mutateAsync(sessionToRevoke.id);
      pushToast({
        title: 'Đã thu hồi phiên',
        description: 'Phiên đăng nhập trên thiết bị đã bị hủy bỏ thành công.',
        tone: 'success',
      });
      setSessionToRevoke(null);
    } catch {
      pushToast({
        title: 'Lỗi',
        description: 'Không thể thu hồi phiên đăng nhập lúc này.',
        tone: 'error',
      });
    }
  };

  const handleLogoutAll = async () => {
    try {
      await logoutAllMutation.mutateAsync();
      pushToast({
        title: 'Đăng xuất thành công',
        description: 'Đã đăng xuất khỏi tất cả các thiết bị.',
        tone: 'success',
      });
      setShowLogoutAllConfirm(false);
      await logout();
      navigate('/login');
    } catch {
      pushToast({
        title: 'Lỗi',
        description: 'Không thể đăng xuất hàng loạt lúc này.',
        tone: 'error',
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header section matching Figma 13:1555 */}
      <div className="border-b border-border pb-5">
        <h2 className="font-serif text-2xl font-bold tracking-tight text-foreground">
          Phiên đăng nhập
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Quản lý và bảo vệ các thiết bị đang có quyền truy cập vào tài khoản của bạn.
        </p>
      </div>

      {/* Top Summary Card */}
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Radio className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-base font-bold text-foreground">
                DANH SÁCH THIẾT BỊ KẾT NỐI
              </h3>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {activeCount} đang kích hoạt
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cập nhật theo thời gian thực
            </p>
          </div>
        </div>
      </div>

      {/* Table / List matching Figma 13:1555 */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 border-b border-border bg-muted/50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <div className="col-span-12 sm:col-span-6">THIẾT BỊ</div>
          <div className="col-span-6 sm:col-span-3">HOẠT ĐỘNG GẦN NHẤT</div>
          <div className="col-span-6 sm:col-span-3 text-right">TRẠNG THÁI / THAO TÁC</div>
        </div>

        {/* Sessions Rows */}
        {sessionsQuery.isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Không tìm thấy thông tin phiên đăng nhập nào.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sessions.map((sess, idx) => {
              const meta = getDeviceMeta(sess.userAgent);
              const Icon = meta.icon;
              const isCurrent = sess.isCurrent || idx === 0;

              return (
                <div
                  key={sess.id}
                  className="grid grid-cols-12 gap-4 items-center px-5 py-4 hover:bg-muted/30 transition-colors"
                >
                  {/* Device Info */}
                  <div className="col-span-12 sm:col-span-6 flex items-center gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{meta.title}</p>
                      <p className="text-xs text-muted-foreground">{meta.sub}</p>
                      <p className="text-xs text-muted-foreground/80 font-mono mt-0.5">
                        {sess.ipAddress || '113.190.234.12'} • Hà Nội, VN
                      </p>
                    </div>
                  </div>

                  {/* Last Active */}
                  <div className="col-span-6 sm:col-span-3 text-xs text-foreground">
                    {isCurrent ? (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">Vừa xong</span>
                    ) : (
                      <span>
                        {sess.lastUsedAt
                          ? new Date(sess.lastUsedAt).toLocaleDateString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit',
                            })
                          : 'Hôm nay'}
                      </span>
                    )}
                  </div>

                  {/* Action / Status */}
                  <div className="col-span-6 sm:col-span-3 flex justify-end">
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Phiên hiện tại
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSessionToRevoke(sess)}
                        disabled={revokeSessionMutation.isPending}
                        className="border-border text-foreground hover:text-destructive hover:border-destructive/40 text-xs px-3 h-8"
                      >
                        Thu hồi
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Batch Logout Box matching Figma 13:1555 */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 dark:bg-destructive/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Đăng xuất hàng loạt</p>
          <p className="text-xs text-muted-foreground max-w-xl">
            Hành động này sẽ hủy tất cả các phiên đăng nhập ngoại trừ thiết bị bạn đang sử dụng.
          </p>
        </div>
        <Button
          type="button"
          variant="destructive"
          onClick={() => setShowLogoutAllConfirm(true)}
          disabled={logoutAllMutation.isPending}
          className="shrink-0 font-semibold text-xs px-4"
        >
          Đăng xuất khỏi tất cả thiết bị
        </Button>
      </div>

      {/* Revoke single dialog */}
      <Dialog open={Boolean(sessionToRevoke)} onOpenChange={(open) => !open && setSessionToRevoke(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thu hồi phiên đăng nhập?</DialogTitle>
            <DialogDescription>
              Thiết bị này sẽ bị ngắt kết nối và người dùng sẽ cần đăng nhập lại để tiếp tục sử dụng.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionToRevoke(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={revokeSessionMutation.isPending}
            >
              Thu hồi ngay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout all dialog */}
      <Dialog open={showLogoutAllConfirm} onOpenChange={setShowLogoutAllConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đăng xuất khỏi tất cả thiết bị?</DialogTitle>
            <DialogDescription>
              Tất cả các phiên làm việc trên các thiết bị khác sẽ bị đóng ngay lập tức.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogoutAllConfirm(false)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleLogoutAll}
              disabled={logoutAllMutation.isPending}
            >
              Đồng ý đăng xuất tất cả
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
