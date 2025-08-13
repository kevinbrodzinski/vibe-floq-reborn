
import { useState, useEffect } from "react";
import { Search } from "lucide-react";
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


import { Button } from "./ui/button";
import { zIndex } from "@/constants/z";

export const FloqApp = () => {
  // Notification system handled by EventNotificationsProvider in App.tsx
  
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

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
          <div className="min-h-screen flex flex-col bg-black">
            <AppHeader />
            <div className="flex-1 min-h-0">
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
