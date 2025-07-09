import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { FieldScreen } from "./screens/FieldScreen";
import { FloqsScreen } from "./screens/FloqsScreen";
import { PulseScreen } from "./screens/PulseScreen";
import { VibeScreen } from "./screens/VibeScreen";
import { AfterglowScreen } from "./screens/AfterglowScreen";
import { CollaborativePlanningScreen } from "./screens/CollaborativePlanningScreen";
import { FloqNavigation } from "./FloqNavigation";
import { TimeSyncProvider } from "./TimeSyncProvider";
import { CommandPaletteSheet } from "./CommandPaletteSheet";
import { useFullscreenMap } from "@/store/useFullscreenMap";
import { useActiveTab, type FloqTab } from "@/store/useActiveTab";
import { Button } from "./ui/button";

export const FloqApp = () => {
  const { tab: activeTab, setTab: setActiveTab } = useActiveTab();
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

  // URL synchronization for tab state
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get('tab') as FloqTab;
    if (urlTab && ['field', 'floqs', 'pulse', 'vibe', 'afterglow', 'plan'].includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [setActiveTab]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', activeTab);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [activeTab]);

  // Deep-link support for full-screen mode
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('full') === '1') {
      useFullscreenMap.getState().set('full')
    }
  }, [])

  const renderScreen = () => {
    switch (activeTab) {
      case "field":
        return <FieldScreen />;
      case "floqs":
        return <FloqsScreen />;
      case "pulse":
        return <PulseScreen />;
      case "vibe":
        return <VibeScreen />;
      case "afterglow":
        return <AfterglowScreen />;
      case "plan":
        return <CollaborativePlanningScreen />;
      default:
        return <FieldScreen />;
    }
  };

  return (
    <TimeSyncProvider>
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
          {renderScreen()}
        </div>
        
        <FloqNavigation />
        
        {/* Command Palette */}
        <CommandPaletteSheet 
          open={commandPaletteOpen} 
          onOpenChange={setCommandPaletteOpen}
        />
      </div>
    </TimeSyncProvider>
  );
};