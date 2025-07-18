import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { FloqNavigation } from "./FloqNavigation";
import { TimeSyncProvider } from "./TimeSyncProvider";
import { CommandPaletteSheet } from "./CommandPaletteSheet";
import { AppRoutes } from "@/router/AppRoutes";
import { useFullscreenMap } from "@/store/useFullscreenMap";
import { FloqUIProvider } from "@/contexts/FloqUIContext";
import { ErrorBoundary } from "./ErrorBoundary";

import { Button } from "./ui/button";

export const FloqApp = () => {
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

  return (
    <ErrorBoundary>
      <TimeSyncProvider>
        <FloqUIProvider>
          <div className="min-h-screen bg-gradient-field text-foreground overflow-hidden">
            {/* Header with search button for mobile */}
            <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border/40 px-4 py-2">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold">Floq</h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCommandPaletteOpen(true)}
                  className="p-2 h-8 w-8"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
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
          </div>
        </FloqUIProvider>
      </TimeSyncProvider>
    </ErrorBoundary>
  );
};