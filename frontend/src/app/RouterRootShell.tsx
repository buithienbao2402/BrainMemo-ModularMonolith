import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks';
import { useToast } from '@/shared/ui';

const PUBLIC_AUTH_PATHS = new Set(['/login', '/register', '/locked']);

export function RouterRootShell() {
  const { t } = useTranslation();
  const { lockedAccount, sessionExpiredVersion } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const handledExpiredVersionRef = React.useRef(0);

  React.useEffect(() => {
    if (lockedAccount && location.pathname !== '/locked') {
      navigate('/locked', { replace: true });
    }
  }, [lockedAccount, location.pathname, navigate]);

  React.useEffect(() => {
    if (sessionExpiredVersion > handledExpiredVersionRef.current) {
      handledExpiredVersionRef.current = sessionExpiredVersion;
      if (!PUBLIC_AUTH_PATHS.has(location.pathname)) {
        const nextTarget = `${location.pathname}${location.search}`;
        pushToast({
          id: 'session-expired',
          title: t('errors.unauthenticated'),
          tone: 'warning',
        });
        navigate(`/login?next=${encodeURIComponent(nextTarget)}`, { replace: true });
      }
    }
  }, [location.pathname, location.search, navigate, pushToast, sessionExpiredVersion, t]);

  return <Outlet />;
}

