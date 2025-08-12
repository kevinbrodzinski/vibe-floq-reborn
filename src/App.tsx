
import { useEffect, useRef, useMemo } from "react";

// Import debug helpers in development only
if (import.meta.env.DEV) {
  import('@/lib/debug/environmentHelper');
  import('@/lib/debug/immediateLocationFix');
  import('@/lib/debug/mapDiagnostics');
  import('@/lib/debug/quickMapFixes');
  import('@/lib/debug/mockGeolocation');
} else {
  // Initialize production optimizations
  import('@/lib/productionOptimizations');
}
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { EnhancedAuthProvider } from "@/components/auth/EnhancedAuthProvider";
import { BannerProvider } from "@/providers/BannerProvider";
import { VibeRealtime } from "@/providers/VibeRealtime";
import { EventNotificationsProvider } from "@/providers/EventNotificationsProvider";
import { PlanNotificationProvider } from "@/providers/PlanNotificationProvider";
import { usePresenceChannel } from "@/hooks/usePresenceChannel";
import { usePresenceTracker } from "@/hooks/usePresenceTracker";
import { LocationSystemHealthDashboard } from "@/components/debug/LocationSystemHealthDashboard";
import { ProductionModeGuard } from "@/components/ProductionModeGuard";
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
import AdminRecWeights from "./pages/AdminRecWeights";


const App = () => {
  // Create a stable QueryClient instance using useMemo
  const queryClient = useMemo(() => new QueryClient(), []);
  
  // Auto-join presence channels for all users
  usePresenceChannel();
  
  // Track online status
  usePresenceTracker();

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
          
          // Use a more stable approach to avoid getSnapshot warnings
          const floqId = payload.new.floq_id;
          queryClient.setQueryData(['floq-msgs', floqId], (d: any) => {
            if (!d || !Array.isArray(d.pages)) return d // Guard against missing pages
            // avoid dupes
            if (d.pages[0].some((m: any) => m.id === payload.new.id)) return d
            // Create a new object to ensure React Query detects the change
            return {
              ...d,
              pages: [
                [payload.new, ...d.pages[0]],
                ...d.pages.slice(1)
              ]
            }
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel);
    }
  }, [queryClient]);
  
  return (
    <ProductionModeGuard>
      <QueryClientProvider client={queryClient}>
        <EnhancedAuthProvider>
          <AppProviders>
            <EventNotificationsProvider>
              <PlanNotificationProvider>
                <VibeRealtime />
                <BannerProvider>
                  <TooltipProvider>
                    {/* Toaster removed to prevent infinite loops */}
                    <NetworkStatusBanner />
                    <BrowserRouter>
                      <PlanInviteProvider />
                      {import.meta.env.DEV && <LocationSystemHealthDashboard />}
                      <Routes>
                        <Route path="/a/:slug" element={<SharedAfterglow />} />
                        <Route path="/share/:slug" element={<SharedPlan />} />
                        <Route path="/invite/:slug" element={<PlanInvite />} />
                        <Route path="/ripple/share/:id" element={<ShareRipplePage />} />
                        <Route path="/settings/profile" element={<Settings />} />
                        <Route path="/admin/rec-weights" element={<AdminRecWeights />} />

                        <Route path="/*" element={<Index />} />
                      </Routes>
                    </BrowserRouter>
                  </TooltipProvider>
                </BannerProvider>
              </PlanNotificationProvider>
            </EventNotificationsProvider>
          </AppProviders>
        </EnhancedAuthProvider>
      </QueryClientProvider>
    </ProductionModeGuard>
  );
};

export default App;
