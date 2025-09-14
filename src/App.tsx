
import { useEffect, useRef, useMemo, useState } from "react";

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
import { useLedgerReactRouter } from "@/lib/ledger/router/useLedgerReactRouter";
import { EnhancedAuthProvider } from "@/components/auth/EnhancedAuthProvider";
import { BannerProvider } from "@/providers/BannerProvider";
import { VibeRealtime } from "@/providers/VibeRealtime";
import { EventNotificationsProvider } from "@/providers/EventNotificationsProvider";
import { PlanNotificationProvider } from "@/providers/PlanNotificationProvider";
import { usePresenceChannel } from "@/hooks/usePresenceChannel";
import { usePresenceTracker } from "@/hooks/usePresenceTracker";

import { ProductionModeGuard } from "@/components/ProductionModeGuard";
import { PlanInviteProvider } from "@/components/providers/PlanInviteProvider";
import { AppProviders } from "@/components/AppProviders";
import { NetworkStatusBanner } from "@/components/ui/NetworkStatusBanner";
import { BootScreen } from "@/components/ui/BootScreen";
import { supabase } from "@/integrations/supabase/client";
import { clusterWorker } from "@/lib/clusterWorker";
import { waitForAuthReady } from "@/lib/auth/authBootstrap";

import Index from "./pages/Index";
import Settings from "./pages/Settings";
import SharedAfterglow from "./pages/SharedAfterglow";
import SharedPlan from "./pages/SharedPlan";
import ShareRipplePage from "./pages/ShareRipplePage";
import { PlanInvite } from "./pages/PlanInvite";
import { PublicShortlistPage } from "./pages/PublicShortlistPage";
import NotificationsPage from "./pages/NotificationsPage";
import FlowReflectionPage from "./pages/FlowReflectionPage";
import VibeEngineTestPage from "./pages/VibeEngineTestPage";
import { VibeDevTools } from "./components/vibe/VibeDevTools";
import { DevGate } from "./components/vibe/DevGate";


const App = () => {
  // Create a stable QueryClient instance using useMemo
  const queryClient = useMemo(() => new QueryClient(), []);
  
  // Non-blocking auth initialization with timeout
  const [authReady, setAuthReady] = useState(false);
  
  // Auto-join presence channels for all users
  usePresenceChannel();
  
  // Track online status
  usePresenceTracker();
  
  // Track route changes for context ledger
  useLedgerReactRouter();

  // Wait for auth ready with fail-open timeout
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    waitForAuthReady(setAuthReady).then(cleanupFn => {
      cleanup = cleanupFn;
    });
    return () => cleanup?.();
  }, []);

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

  // Show boot screen until auth is ready
  if (!authReady) {
    return <BootScreen text="Authenticating…" timeoutText="Continue as guest" onContinue={() => setAuthReady(true)} />;
  }
  
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
                    <Toaster />
                    <NetworkStatusBanner />
                    <BrowserRouter>
                      <PlanInviteProvider />
                      <Routes>
                        <Route path="/a/:slug" element={<SharedAfterglow />} />
                        <Route path="/s/:token" element={<PublicShortlistPage />} />
                        <Route path="/share/:slug" element={<SharedPlan />} />
                        <Route path="/invite/:slug" element={<PlanInvite />} />
                        <Route path="/ripple/share/:id" element={<ShareRipplePage />} />
                        <Route path="/settings/profile" element={<Settings />} />
                        <Route path="/notifications" element={<NotificationsPage />} />
                        <Route path="/flow/:flowId/reflection" element={<FlowReflectionPage />} />
                        <Route path="/vibe-engine-test" element={<VibeEngineTestPage />} />

                        <Route path="/*" element={<Index />} />
                      </Routes>
                      {import.meta.env.DEV && (
                        <DevGate>
                          <VibeDevTools />
                        </DevGate>
                      )}
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
