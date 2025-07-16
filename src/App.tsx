
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/providers/AuthProvider";
import { BannerProvider } from "@/providers/BannerProvider";
import { VibeRealtime } from "@/providers/VibeRealtime";
import { usePresenceChannel } from "@/hooks/usePresenceChannel";

import { EnvironmentDebugPanel } from "@/components/EnvironmentDebugPanel";
import { useEnvironmentDebug } from "@/hooks/useEnvironmentDebug";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import FloqDetails from "./pages/FloqDetails";
import UserProfile from "./pages/UserProfile";
import Settings from "./pages/Settings";
import SharedAfterglow from "./pages/SharedAfterglow";

const queryClient = new QueryClient();

const App = () => {
  const { isDebugPanelOpen, setIsDebugPanelOpen } = useEnvironmentDebug();
  
  // Auto-join presence channels for all users
  usePresenceChannel();
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <VibeRealtime />
        <BannerProvider>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            
            <Routes>
              {/* Public shared afterglow route */}
              <Route path="/a/:slug" element={<SharedAfterglow />} />
              {/* Main app routes (field, floqs, etc.) are handled inside Index */}
              <Route path="/*" element={<Index />} />
              <Route path="/settings/profile" element={<Settings />} />
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
