
import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { useLocation } from "react-router-dom";
import { FloqNavigation } from "./FloqNavigation";
import { TimeSyncProvider } from "./TimeSyncProvider";
import { CommandPaletteSheet } from "./CommandPaletteSheet";
import { AppRoutes } from "@/router/AppRoutes";
import { useFullscreenMap } from "@/store/useFullscreenMap";
import { FloqUIProvider } from "@/contexts/FloqUIContext";
import { ErrorBoundary } from "./ErrorBoundary";
import { AppHeader } from "@/components/layout/AppHeader";
// import { useNotifications } from "@/hooks/useNotifications"; // Removed: handled by EventNotificationsProvider
import { NotificationPermissionRequest } from "@/components/notifications/NotificationPermissionRequest";
import { useAmbientBackground } from "@/hooks/useAmbientBackground";
import { cn } from "@/lib/utils";

import { Button } from "./ui/button";

export const FloqApp = () => {
  // Notification system handled by EventNotificationsProvider in App.tsx
  
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { pathname } = useLocation();
  const onField = pathname.startsWith('/field');

  // Manage ambient background per route
  const ambient = pathname.startsWith('/afterglow') || pathname.startsWith('/ripple')
    ? 'linear-gradient(180deg, hsl(262 83% 58%) 0%, hsl(240 10% 10%) 100%)'
    : 'hsl(var(--background))'; // default neutral

  useAmbientBackground(ambient);

  // Global keyboard listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Deep-link support for full-screen mode
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('full') === '1') {
      useFullscreenMap.getState().setMode('full')
    }
  }, [])

  // Debug logging
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[FloqApp] Component mounted, current route:', window.location.pathname);
    }
  }, []);

  return (
    <ErrorBoundary>
      <TimeSyncProvider>
        <FloqUIProvider>
          <div className="min-h-screen flex flex-col">
            <AppHeader />
            {/* On Field: no top padding so map sits under fixed header.
                Elsewhere: add safe-area + ~64px to avoid content underlap. */}
            <div className={cn(
              'flex-1 min-h-0',
              onField ? '' : 'pt-[calc(env(safe-area-inset-top)+4rem)]'
            )}>
              <AppRoutes />
            </div>
            
            <FloqNavigation />
            
            {/* Command Palette */}
            <CommandPaletteSheet 
              open={commandPaletteOpen} 
              onOpenChange={setCommandPaletteOpen}
            />
            

          </div>
        </FloqUIProvider>
      </TimeSyncProvider>
    </ErrorBoundary>
  );
};
