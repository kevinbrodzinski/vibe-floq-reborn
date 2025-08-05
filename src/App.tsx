
import { useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/providers/AuthProvider";
import { BannerProvider } from "@/providers/BannerProvider";
import { VibeRealtime } from "@/providers/VibeRealtime";
import { EventNotificationsProvider } from "@/providers/EventNotificationsProvider";
import { PlanNotificationProvider } from "@/providers/PlanNotificationProvider";
import { usePresenceChannel } from "@/hooks/usePresenceChannel";
import { LocationSystemHealthDashboard } from "@/components/debug/LocationSystemHealthDashboard";
import { PlanInviteProvider } from "@/components/providers/PlanInviteProvider";
import { AppProviders } from "@/components/AppProviders";
import { NetworkStatusBanner } from "@/components/ui/NetworkStatusBanner";
import { supabase } from "@/integrations/supabase/client";
import { clusterWorker } from "@/lib/clusterWorker";

import Index from "./pages/Index";
import Settings from "./pages/Settings";
import SharedAfterglow from "./pages/SharedAfterglow";
import SharedPlan from "./pages/SharedPlan";
import ShareRipplePage from "./pages/ShareRipplePage";
import { PlanInvite } from "./pages/PlanInvite";

const App = () => {
  // Stable QueryClient instance to prevent recreation on re-renders
  const queryClientRef = useRef<QueryClient>();
  if (!queryClientRef.current) {
    queryClientRef.current = new QueryClient();
  }
  const queryClient = queryClientRef.current;
  
  // Auto-join presence channels for all users
  usePresenceChannel();

  // Pre-warm the clustering worker
  useEffect(() => {
    // Empty call warms the Comlink proxy & spins the worker
    clusterWorker.cluster([], 11);
  }, []);

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
            if (!d || !Array.isArray(d.pages)) return d // Guard against missing pages
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
  }, [queryClient]);
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppProviders>
          <EventNotificationsProvider>
            <PlanNotificationProvider>
              <VibeRealtime />
              <BannerProvider>
                <TooltipProvider>
                  <Toaster />
                  <NetworkStatusBanner />
                  <PlanInviteProvider />
                  <BrowserRouter>
                    <LocationSystemHealthDashboard />
                    <Routes>
                      <Route path="/a/:slug" element={<SharedAfterglow />} />
                      <Route path="/share/:slug" element={<SharedPlan />} />
                      <Route path="/invite/:slug" element={<PlanInvite />} />
                      <Route path="/ripple/share/:id" element={<ShareRipplePage />} />
                      <Route path="/settings/profile" element={<Settings />} />
                      <Route path="/*" element={<Index />} />
                    </Routes>
                  </BrowserRouter>
                </TooltipProvider>
              </BannerProvider>
            </PlanNotificationProvider>
          </EventNotificationsProvider>
        </AppProviders>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
