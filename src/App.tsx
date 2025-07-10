
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/providers/AuthProvider";
import { UsernameBanner } from "@/components/UsernameBanner";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import FloqDetails from "./pages/FloqDetails";
import UserProfile from "./pages/UserProfile";
import ProfileSettings from "./pages/ProfileSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <UsernameBanner />
          <Routes>
            {/* Main app routes (field, floqs, etc.) are handled inside Index */}
            <Route path="/*" element={<Index />} />
            <Route path="/floq/:floqId" element={<FloqDetails />} />
            <Route path="/u/:userId" element={<UserProfile />} />
            <Route path="/settings/profile" element={<ProfileSettings />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
