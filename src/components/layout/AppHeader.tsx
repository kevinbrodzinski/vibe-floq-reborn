import { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Z } from '@/constants/z';
import { useFullscreenMap } from '@/store/useFullscreenMap';
import { AvatarDropdown } from '@/components/AvatarDropdown';
import { NotificationsSheet } from '@/components/notifications/NotificationsSheet';

export function AppHeader() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const { mode, setMode } = useFullscreenMap();
  const [notifOpen, setNotifOpen] = useState(false);

  const title = useMemo(() => {
    if (pathname.startsWith('/pulse')) return 'pulse';
    if (pathname.startsWith('/vibe')) return 'vibe';
    if (pathname.startsWith('/afterglow')) return 'ripple';
    if (pathname.startsWith('/floqs')) return 'floqs';
    return 'floq';
  }, [pathname]);

  const isFieldPage = pathname === '/field' || pathname === '/';

  // Exit fullscreen when navigating away from field page
  useEffect(() => {
    if (mode === 'full' && !isFieldPage) {
      setMode('map');
    }
  }, [mode, isFieldPage, setMode]);

  // Only hide header when in fullscreen mode AND on field page
  if (mode === 'full' && isFieldPage) return null;

  return (
    <header
      className={cn(
        'sticky top-0 h-16 sm:h-[68px] w-full px-4',
        'bg-transparent',
        'flex items-center justify-between'
      )}
      style={{ zIndex: Z.navigation, paddingTop: 'env(safe-area-inset-top)' }}
    >
      <button
        onClick={() => nav('/field')}
        className="font-semibold text-lg text-white select-none"
        aria-label="Go to Field"
      >
        floq
      </button>

      <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
        <span className="text-sm text-muted-foreground">{title}</span>
      </div>

      <div className="flex items-center gap-3">
        <AvatarDropdown onOpenNotifications={() => setNotifOpen(true)} />
      </div>

      <NotificationsSheet open={notifOpen} onOpenChange={setNotifOpen} />
    </header>
  );
}