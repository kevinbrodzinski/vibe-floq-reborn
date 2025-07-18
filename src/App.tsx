
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/providers/AuthProvider";
import { BannerProvider } from "@/providers/BannerProvider";
import { VibeRealtime } from "@/providers/VibeRealtime";
import { usePresenceChannel } from "@/hooks/usePresenceChannel";
import { PlanInviteProvider } from "@/components/providers/PlanInviteProvider";
import { supabase } from "@/integrations/supabase/client";

import { EnvironmentDebugPanel } from "@/components/EnvironmentDebugPanel";
import { useEnvironmentDebug } from "@/hooks/useEnvironmentDebug";
import Index from "./pages/Index";
import Settings from "./pages/Settings";
import SharedAfterglow from "./pages/SharedAfterglow";

const queryClient = new QueryClient();

const App = () => {
  const { isDebugPanelOpen, setIsDebugPanelOpen } = useEnvironmentDebug();
  
  // Auto-join presence channels for all users
  usePresenceChannel();

  // Realtime subscription for floq messages
  useEffect(() => {
    const channel = supabase
      .channel('floq_messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'floq_messages' },
        (payload) => {
          // Only handle INSERT events to avoid crashes on DELETE where payload.new is null
          if (payload.eventType !== 'INSERT') return
          
          queryClient.setQueryData(['floq-msgs', payload.new.floq_id], (d: any) => {
            if (!d) return d
            // avoid dupes
            if (d.pages[0].some((m: any) => m.id === payload.new.id)) return d
            d.pages[0].unshift(payload.new)
            return { ...d }
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel);
    }
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <VibeRealtime />
        <BannerProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <PlanInviteProvider />
              <Routes>
                {/* Public shared afterglow route */}
                <Route path="/a/:slug" element={<SharedAfterglow />} />
                {/* Settings route */}
                <Route path="/settings/profile" element={<Settings />} />
                {/* Main app routes (field, floqs, etc.) are handled inside Index */}
                <Route path="/*" element={<Index />} />
              </Routes>
              {/* Environment Debug Panel - Ctrl+Shift+E to toggle */}
              <EnvironmentDebugPanel 
                isOpen={isDebugPanelOpen} 
                onClose={() => setIsDebugPanelOpen(false)} 
              />
            </BrowserRouter>
          </TooltipProvider>
        </BannerProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
