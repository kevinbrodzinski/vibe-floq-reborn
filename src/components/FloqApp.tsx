
import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { FloqNavigation } from "./FloqNavigation";
import { TimeSyncProvider } from "./TimeSyncProvider";
import { CommandPaletteSheet } from "./CommandPaletteSheet";
import { AppRoutes } from "@/router/AppRoutes";
import { useFullscreenMap } from "@/store/useFullscreenMap";
import { FloqUIProvider } from "@/contexts/FloqUIContext";
import { ErrorBoundary } from "./ErrorBoundary";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationPermissionRequest } from "@/components/notifications/NotificationPermissionRequest";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { NotificationsSheet } from "@/components/notifications/NotificationsSheet";


import { Button } from "./ui/button";
import { zIndex } from "@/constants/z";

export const FloqApp = () => {
  // Initialize notification system
  useNotifications();
  
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

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
          <div className="min-h-screen bg-gradient-field text-foreground overflow-hidden">
            {/* Header with search and notifications */}
            <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border/40 px-4 py-2" {...zIndex('uiHeader')}>
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold">Floq</h1>
              </div>
            </div>

            {/* Notification Permission Request */}
            <div className="px-4 py-2">
              <NotificationPermissionRequest />
            </div>


            <div className="pb-20">
              <ErrorBoundary>
                <AppRoutes />
              </ErrorBoundary>
            </div>
            
            <FloqNavigation />
            
            {/* Command Palette */}
            <CommandPaletteSheet 
              open={commandPaletteOpen} 
              onOpenChange={setCommandPaletteOpen}
            />
            
            {/* Notifications Sheet */}
            <NotificationsSheet 
              open={notificationsOpen}
              onOpenChange={setNotificationsOpen}
            />
          </div>
        </FloqUIProvider>
      </TimeSyncProvider>
    </ErrorBoundary>
  );
};
