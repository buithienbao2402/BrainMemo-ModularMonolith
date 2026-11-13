import { Globe, Laptop, LogOut, Shield, Smartphone, Trash2 } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks';
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
  useToast,
} from '@/shared/ui';
import {
  useLogoutAllMutation,
  useRevokeSessionMutation,
  useSessionsQuery,
  type SessionDto,
} from '../api';

function getDeviceIcon(userAgent: string) {
  const ua = userAgent.toLowerCase();
  if (
    ua.includes('mobile') ||
    ua.includes('android') ||
    ua.includes('iphone') ||
    ua.includes('ipad')
  ) {
    return <Smartphone className="h-5 w-5" aria-hidden="true" />;
  }
  if (ua.includes('windows') || ua.includes('macintosh') || ua.includes('linux')) {
    return <Laptop className="h-5 w-5" aria-hidden="true" />;
  }
  return <Globe className="h-5 w-5" aria-hidden="true" />;
}

function formatSessionDate(dateString?: string): string {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function SessionListCard() {
  const { t } = useTranslation();
  const { pushToast } = useToast();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const sessionsQuery = useSessionsQuery();
  const revokeSessionMutation = useRevokeSessionMutation();
  const logoutAllMutation = useLogoutAllMutation();

  const [sessionToRevoke, setSessionToRevoke] = React.useState<SessionDto | null>(null);
  const [showLogoutAllConfirm, setShowLogoutAllConfirm] = React.useState(false);

  const handleRevoke = async () => {
    if (!sessionToRevoke?.id) return;
    try {
      await revokeSessionMutation.mutateAsync(sessionToRevoke.id);
      pushToast({
        id: 'revoke-session-success',
        title: t('auth.sessionsHeading'),
        description: t('auth.revokeSessionSuccess'),
        tone: 'success',
      });
      setSessionToRevoke(null);
    } catch {
      pushToast({
        id: 'revoke-session-error',
        title: t('states.errorTitle'),
        description: t('errors.genericRetry'),
        tone: 'error',
      });
    }
  };

  const handleLogoutAll = async () => {
    try {
      await logoutAllMutation.mutateAsync();
      pushToast({
        id: 'logout-all-success',
        title: t('auth.sessionsHeading'),
        description: t('auth.logoutAllSuccess'),
        tone: 'success',
      });
      setShowLogoutAllConfirm(false);
      await logout();
      navigate('/login');
    } catch {
      pushToast({
        id: 'logout-all-error',
        title: t('states.errorTitle'),
        description: t('errors.genericRetry'),
        tone: 'error',
      });
    }
  };

  const sessions = sessionsQuery.data ?? [];
  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm dark:bg-[#131319] sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
            <Shield className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-foreground">
              {t('auth.sessionsHeading')}
            </h2>
            <p className="text-sm text-muted-foreground">{t('auth.sessionsDesc')}</p>
          </div>
        </div>

        {otherSessions.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowLogoutAllConfirm(true)}
            disabled={logoutAllMutation.isPending}
            className="self-start rounded-xl text-xs text-destructive hover:border-destructive hover:bg-destructive/10 dark:text-[#ffb4ab] sm:self-auto"
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {t('auth.logoutAllBtn')}
          </Button>
        ) : null}
      </div>

      <div className="mt-6">
        {sessionsQuery.isLoading ? (
          <div className="space-y-3" data-testid="sessions-loading-skeleton">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : sessionsQuery.isError ? (
          <ErrorState
            title={t('states.errorTitle')}
            error={sessionsQuery.error}
            onRetry={() => void sessionsQuery.refetch()}
          />
        ) : sessions.length === 0 ? (
          <EmptyState title={t('auth.emptySessions')} description={t('auth.sessionsDesc')} />
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {sessions.map((session) => (
              <li
                key={session.id || session.createdAt}
                className="flex flex-col gap-3 p-4 transition sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-muted-foreground">
                    {getDeviceIcon(session.userAgent || '')}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {session.userAgent || t('auth.browserDevice')}
                      </span>
                      {session.isCurrent ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                          {t('auth.currentDeviceBadge')}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {t('auth.ipAddress')}: {session.ipAddress || '—'}
                      </span>
                      <span>
                        {t('auth.lastActive')}:{' '}
                        {formatSessionDate(session.lastUsedAt || session.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {!session.isCurrent && session.id ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSessionToRevoke(session)}
                    disabled={revokeSessionMutation.isPending}
                    className="self-end rounded-lg text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive dark:hover:text-[#ffb4ab] sm:self-auto"
                    aria-label={`${t('auth.revokeSessionBtn')} ${session.userAgent || session.ipAddress}`}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    {t('auth.revokeSessionBtn')}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Revoke single session confirmation */}
      <Dialog
        open={sessionToRevoke !== null}
        onOpenChange={(open) => {
          if (!open) setSessionToRevoke(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('auth.revokeSessionConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('auth.revokeSessionConfirmDesc')}
              {sessionToRevoke ? (
                <span className="mt-2 block font-medium text-foreground">
                  {sessionToRevoke.userAgent} ({sessionToRevoke.ipAddress})
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setSessionToRevoke(null)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => void handleRevoke()}
              disabled={revokeSessionMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokeSessionMutation.isPending ? t('auth.submitting') : t('auth.revokeSessionBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout all sessions confirmation */}
      <Dialog open={showLogoutAllConfirm} onOpenChange={setShowLogoutAllConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('auth.logoutAllConfirmTitle')}</DialogTitle>
            <DialogDescription>{t('auth.logoutAllConfirmDesc')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setShowLogoutAllConfirm(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => void handleLogoutAll()}
              disabled={logoutAllMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {logoutAllMutation.isPending ? t('auth.submitting') : t('auth.logoutAllBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
