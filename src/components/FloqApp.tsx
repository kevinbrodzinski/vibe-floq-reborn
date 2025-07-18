import { useState, useEffect } from "react";
import { Search, Plus } from "lucide-react";
import { FloqNavigation } from "./FloqNavigation";
import { TimeSyncProvider } from "./TimeSyncProvider";
import { CommandPaletteSheet } from "./CommandPaletteSheet";
import { AppRoutes } from "@/router/AppRoutes";
import { useFullscreenMap } from "@/store/useFullscreenMap";
import { FloqUIProvider } from "@/contexts/FloqUIContext";
import { ErrorBoundary } from "./ErrorBoundary";
import { useFloqUI } from "@/contexts/FloqUIContext";

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
            
            {/* Create Floq FAB - Fixed positioned at top level */}
            <CreateFloqFAB />
            
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

// Create Floq FAB Component
const CreateFloqFAB = () => {
  const { setShowCreateSheet } = useFloqUI();
  
  return (
    <button
      onClick={() => setShowCreateSheet(true)}
      className="fixed bottom-24 right-4 z-50 px-6 py-3 rounded-full bg-gradient-to-r from-[hsl(279,100%,60%)] to-[hsl(320,100%,60%)] text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center gap-2 font-medium"
    >
      <Plus size={20} />
      Create Floq
    </button>
  );
};