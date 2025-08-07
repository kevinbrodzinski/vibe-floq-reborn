
import { useEffect, useRef, useMemo, useState } from "react";

// Conditional imports for development vs production
if (import.meta.env.DEV) {
  // Development-only imports
  import('@/lib/debug/environmentHelper');
  import('@/lib/debug/immediateLocationFix');
  import('@/lib/debug/mapDiagnostics');
  import('@/lib/debug/quickMapFixes');
  import('@/lib/debug/mockGeolocation');
} else {
  // Production optimizations
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
import { ProductionModeGuard } from "@/components/ProductionModeGuard";
import { PlanInviteProvider } from "@/components/providers/PlanInviteProvider";
import { AppProviders } from "@/components/AppProviders";
import { NetworkStatusBanner } from "@/components/ui/NetworkStatusBanner";
import { supabase } from "@/integrations/supabase/client";

import Index from "./pages/Index";
import Settings from "./pages/Settings";
import SharedAfterglow from "./pages/SharedAfterglow";
import SharedPlan from "./pages/SharedPlan";
import ShareRipplePage from "./pages/ShareRipplePage";
import { PlanInvite } from "./pages/PlanInvite";

const App = () => {
  // EMERGENCY DEBUG - Very first line
  console.log('🚨 APP.TSX CALLED - Main App component is mounting, pathname:', window.location.pathname);
  
  // Quick bypass for testing - go directly to /home
  if (import.meta.env.DEV && window.location.pathname === '/') {
    console.log('🔄 REDIRECTING from / to /home');
    window.location.href = '/home';
    return (
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        zIndex: 999999, 
        backgroundColor: '#0066ff', 
        color: 'white', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        fontSize: '18px'
      }}>
        Redirecting to /home...
      </div>
    );
  }

  // Create a stable QueryClient instance using useMemo
  const queryClient = useMemo(() => new QueryClient(), []);
  
  // Auto-join presence channels for all users
  usePresenceChannel();
  
  // Track online status
  usePresenceTracker();

  // Development-only dashboard component
  const [LocationSystemHealthDashboard, setLocationSystemHealthDashboard] = useState<React.ComponentType | null>(null);



  // Load debug dashboard in development
  useEffect(() => {
    if (import.meta.env.DEV) {
      import("@/components/debug/LocationSystemHealthDashboard")
        .then((module) => {
          setLocationSystemHealthDashboard(() => module.LocationSystemHealthDashboard);
        })
        .catch((error) => {
          console.warn('LocationSystemHealthDashboard not available:', error);
        });
    }
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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter future={{ v7_relativeSplatPath: true }}>
          <EnhancedAuthProvider>
            <AppProviders>
              <BannerProvider>
                <VibeRealtime>
                  <EventNotificationsProvider>
                    <PlanNotificationProvider>
                      <PlanInviteProvider>
                        <ProductionModeGuard>
                          <div className="min-h-screen bg-background">
                            <NetworkStatusBanner />
                            <Routes>
                              <Route path="/" element={<Index />} />
                              <Route path="/settings" element={<Settings />} />
                              <Route path="/afterglow/:id" element={<SharedAfterglow />} />
                              <Route path="/plan/:id" element={<SharedPlan />} />
                              <Route path="/ripple/:id" element={<ShareRipplePage />} />
                              <Route path="/invite/:id" element={<PlanInvite />} />
                              {/* Catch-all route for app routes handled by AppRoutes.tsx */}
                              <Route path="*" element={
                                <>
                                  {console.log('🎯 CATCH-ALL ROUTE MATCHED - Trying to render Index')}
                                  <Index />
                                </>
                              } />
                            </Routes>
                            
                            {/* Development-only health dashboard */}
                            {import.meta.env.DEV && LocationSystemHealthDashboard && (
                              <LocationSystemHealthDashboard />
                            )}
                          </div>
                        </ProductionModeGuard>
                      </PlanInviteProvider>
                    </PlanNotificationProvider>
                  </EventNotificationsProvider>
                </VibeRealtime>
              </BannerProvider>
            </AppProviders>
          </EnhancedAuthProvider>
        </BrowserRouter>
      </TooltipProvider>
      <Toaster />
    </QueryClientProvider>
  );
};

export default App;
