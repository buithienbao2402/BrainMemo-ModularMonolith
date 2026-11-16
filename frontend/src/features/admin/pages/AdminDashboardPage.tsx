import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  EyeOff,
  Flag,
  Lock,
  Megaphone,
  ScrollText,
  Shield,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { Button, ErrorState, Skeleton } from '@/shared/ui';
import { useModerationDashboard } from '@/features/moderation/api/moderationApi';

export function AdminDashboardPage() {
  const { data, isLoading, isError, refetch } = useModerationDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  const kpis = [
    {
      title: 'Báo cáo chờ xử lý',
      count: data.pendingReportsCount,
      icon: Flag,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10 border-amber-500/30',
      to: '/admin/reports?status=PENDING',
    },
    {
      title: 'Cờ cảnh báo PhoBERT AI',
      count: data.pendingAiFlagsCount,
      icon: Bot,
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/10 border-violet-500/30',
      to: '/admin/reports?source=AI_FINDING',
    },
    {
      title: 'Chế tài đang hiệu lực',
      count: data.activeSanctionsCount,
      icon: ShieldAlert,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10 border-rose-500/30',
      to: '/admin/sanctions',
    },
    {
      title: 'Tài khoản bị khóa',
      count: data.lockedUsersCount,
      icon: Lock,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10 border-red-500/30',
      to: '/admin/users?status=LOCKED',
    },
    {
      title: 'Khóa học bị ẩn',
      count: data.hiddenCoursesCount,
      icon: EyeOff,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/30',
      to: '/admin/sanctions?targetType=COURSE',
    },
  ];

  const quickNav = [
    {
      title: 'Kiểm duyệt báo cáo vi phạm',
      description: 'Hàng đợi xem xét phản ánh từ học viên và cờ cảnh báo an toàn nội dung từ AI.',
      icon: Flag,
      to: '/admin/reports',
      badge: `${data.pendingReportsCount} chờ`,
    },
    {
      title: 'Quản lý chế tài & kỷ luật',
      description: 'Theo dõi các lệnh ẩn khóa học, khóa tài khoản và quy trình gỡ bỏ chế tài.',
      icon: ShieldAlert,
      to: '/admin/sanctions',
      badge: `${data.activeSanctionsCount} hiệu lực`,
    },
    {
      title: 'Quản lý tài khoản & phân quyền',
      description: 'Quản lý người dùng, cấp/thu hồi vai trò Quản trị viên và khóa tài khoản.',
      icon: Users,
      to: '/admin/users',
      badge: 'Bảo mật',
    },
    {
      title: 'Phát thông báo toàn hệ thống',
      description: 'Soạn thảo và phát thanh thông báo tức thì đến toàn bộ người dùng đang hoạt động.',
      icon: Megaphone,
      to: '/admin/announcements',
      badge: 'Broadcast',
    },
    {
      title: 'Nhật ký kiểm toán hệ thống',
      description: 'Truy vấn lịch sử bất biến ghi nhận mọi thao tác quản trị và thay đổi trạng thái.',
      icon: ScrollText,
      to: '/admin/audit-logs',
      badge: 'Audit Trail',
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-6" data-testid="admin-dashboard-page">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Shield className="h-6 w-6 text-brand-orange" />
          Tổng quan trung tâm quản trị BrainMemo
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Hệ thống điều phối kiểm duyệt, chế tài kỷ luật, quản lý tài khoản và giám sát kiểm toán an toàn.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.title}
              to={kpi.to}
              className={`rounded-2xl border p-4.5 flex flex-col justify-between transition-all duration-200 hover:scale-[1.02] shadow-sm ${kpi.bgColor}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {kpi.title}
                </span>
                <Icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className={`text-3xl font-extrabold ${kpi.color}`}>{kpi.count}</span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 hover:underline">
                  Xem <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Navigation Hub */}
      <div className="space-y-4">
        <h2 className="text-base font-bold uppercase tracking-wider text-foreground">
          Chức năng quản trị chính
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickNav.map((nav) => {
            const Icon = nav.icon;
            return (
              <Link
                key={nav.to}
                to={nav.to}
                className="group rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-primary/50 hover:bg-muted/20 shadow-sm flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                      {nav.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                    {nav.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{nav.description}</p>
                </div>
                <div className="pt-4 flex items-center text-xs font-semibold text-primary group-hover:underline">
                  Truy cập phân hệ <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Audit Logs Feed */}
      {data.recentAuditLogs && data.recentAuditLogs.length > 0 ? (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-primary" />
              Hoạt động kiểm toán gần đây
            </h2>
            <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
              <Link to="/admin/audit-logs">
                Xem toàn bộ <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>

          <div className="divide-y divide-border/60">
            {data.recentAuditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-muted-foreground">
                    {new Date(log.occurredAt).toLocaleTimeString('vi-VN')}
                  </span>
                  <span className="font-bold font-mono text-primary">{log.action}</span>
                  <span className="text-muted-foreground truncate max-w-sm">
                    [{log.objectType}] {log.note || log.objectId}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">{log.actorName || log.actorType}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
