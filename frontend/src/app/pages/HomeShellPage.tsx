import { ArrowRight, BookOpen, CheckCircle2, Compass, Layers } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { setMockPersonaCookie } from '@mocks/handlers';
import brandLogoLg from '@/assets/figma/brand-logo-lg.svg';
import { useAuth } from '@/shared/hooks';
import { cn } from '@/shared/lib/utils';
import { Button, EmptyState, ErrorState, PageSkeleton, Pagination } from '@/shared/ui';

type DemoState = 'success' | 'loading' | 'empty' | 'error';

const MOCK_PERSONAS = [
  { id: 'guest', label: 'Khách (Guest)' },
  { id: 'user', label: 'Học viên (Quang Trần)' },
  { id: 'unverified', label: 'Chưa xác minh email' },
  { id: 'admin', label: 'Quản trị viên (Admin)' },
] as const;

export function HomeShellPage() {
  const { t } = useTranslation();
  const { status, user, profile, unreadCount, refreshAuthSession, logout } = useAuth();
  const [demoState, setDemoState] = React.useState<DemoState>('success');
  const [page, setPage] = React.useState(1);

  const isMockEnabled = import.meta.env.VITE_USE_MOCK === 'true';

  const handleSelectPersona = async (persona: (typeof MOCK_PERSONAS)[number]['id']) => {
    setMockPersonaCookie(persona);
    if (persona === 'guest') {
      await logout();
      return;
    }
    await refreshAuthSession();
  };

  return (
    <div className="mx-auto max-w-[1280px] space-y-10 px-4 py-8 sm:px-6 sm:py-12">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-orange/30 bg-brand-orange/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wide text-brand-orange">
              <img src={brandLogoLg} alt="" width={24} height={24} className="h-5 w-5" />
              <span>{t('homeShell.heroBadge')}</span>
            </span>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
              {t('homeShell.heroTitle')}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t('homeShell.heroDescription')}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button asChild size="pill">
                <Link to="/courses">
                  <Compass className="h-4 w-4" aria-hidden="true" />
                  <span>{t('homeShell.exploreAction')}</span>
                </Link>
              </Button>
              <Button asChild variant="outline" size="pill">
                <Link to="/duong-dan-khong-ton-tai">
                  <span>{t('homeShell.test404Action')}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="w-full rounded-xl border border-border bg-secondary/60 p-5 lg:max-w-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Trạng thái phiên hiện tại
            </p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Phiên đăng nhập</span>
                <span className="font-semibold text-foreground">
                  {status === 'authenticated'
                    ? (profile?.displayName ?? user?.email ?? 'Đã đăng nhập')
                    : status === 'booting'
                      ? t('states.loading')
                      : 'Khách'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Quyền</span>
                <span className="font-medium text-foreground">
                  {user?.isAdmin
                    ? 'Admin'
                    : status === 'authenticated'
                      ? 'Learner / Author'
                      : 'Guest'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{t('notifications.label')}</span>
                <span className="font-medium text-foreground">{unreadCount}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isMockEnabled ? (
        <section
          aria-label="Chọn vai trò giả lập MSW"
          className="rounded-xl border border-border bg-card p-5"
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-foreground">
                Chế độ giả lập MSW (VITE_USE_MOCK=true)
              </h2>
              <p className="text-xs text-muted-foreground">
                Chuyển nhanh ngữ cảnh phiên trên header và điều hướng mà không lưu token vào
                localStorage.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {MOCK_PERSONAS.map((persona) => (
                <Button
                  key={persona.id}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void handleSelectPersona(persona.id);
                  }}
                >
                  {persona.label}
                </Button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-brand-orange" aria-hidden="true" />
            <h2 className="text-base font-semibold text-foreground">
              {t('homeShell.stateDemoHeading')}
            </h2>
          </div>
          <div
            role="tablist"
            aria-label="Chọn trạng thái hiển thị"
            className="flex flex-wrap gap-1.5"
          >
            {(
              [
                { id: 'success', label: 'Success' },
                { id: 'loading', label: 'Loading' },
                { id: 'empty', label: 'Empty' },
                { id: 'error', label: 'Error' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={demoState === tab.id}
                onClick={() => setDemoState(tab.id)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  demoState === tab.id
                    ? 'border-brand-orange/40 bg-brand-orange/15 text-brand-orange'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {demoState === 'loading' ? <PageSkeleton lines={3} /> : null}
        {demoState === 'empty' ? (
          <EmptyState
            action={
              <Button type="button" size="sm" onClick={() => setDemoState('success')}>
                {t('states.backHome')}
              </Button>
            }
          />
        ) : null}
        {demoState === 'error' ? (
          <ErrorState
            error={new Error(t('states.errorFallback'))}
            onRetry={() => setDemoState('success')}
          />
        ) : null}
        {demoState === 'success' ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: 'SCR-COM-01 Header & SubNav',
                  desc: 'Responsive guest, user, admin header và menu tài khoản.',
                },
                {
                  title: 'SCR-COM-02 Trang 404',
                  desc: 'Định tuyến catch-all * thân thiện với token giao diện Sáng/Tối.',
                },
                {
                  title: 'OpenAPI + Single-Flight Auth',
                  desc: 'Tự động refresh 1 lần khi 401, polling thông báo 30s theo tab.',
                },
              ].map((card) => (
                <article
                  key={card.title}
                  className="rounded-xl border border-border bg-secondary/40 p-4 transition-colors hover:border-brand-orange/40"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <CheckCircle2
                      className="h-4 w-4 shrink-0 text-brand-orange"
                      aria-hidden="true"
                    />
                    <span>{card.title}</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{card.desc}</p>
                </article>
              ))}
            </div>
            <Pagination page={page} pageSize={12} totalItems={36} onPageChange={setPage} />
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/courses"
          className="flex items-center justify-between rounded-xl border border-border bg-card p-5 transition-colors hover:border-brand-orange/40"
        >
          <div>
            <p className="text-sm font-semibold text-foreground">{t('nav.explore')}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Khung đường dẫn /courses sẵn sàng cho Sprint 1–2.
            </p>
          </div>
          <BookOpen className="h-5 w-5 text-brand-orange" aria-hidden="true" />
        </Link>
        <Link
          to="/admin"
          className="flex items-center justify-between rounded-xl border border-border bg-card p-5 transition-colors hover:border-brand-orange/40"
        >
          <div>
            <p className="text-sm font-semibold text-foreground">
              {t('auth.profileMenu.adminPanel')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Bảo vệ bởi RequireAdmin + AdminLayout từ Figma.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-brand-orange" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
