
import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, startTransition } from 'react';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { FullScreenSpinner } from '@/components/ui/FullScreenSpinner';
import { ErrorBoundary } from 'react-error-boundary';

// Error fallback component for route-level errors
const RouteErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center space-y-4 max-w-md mx-auto p-6">
      <h2 className="text-xl font-semibold text-destructive">Something went wrong</h2>
      <p className="text-muted-foreground text-sm">
        {error.message || 'An unexpected error occurred while loading this page.'}
      </p>
      <button
        onClick={() => {
          startTransition(() => {
            resetErrorBoundary();
          });
        }}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        Try again
      </button>
    </div>
  </div>
);

// Enhanced Suspense wrapper with error boundary
const RouteSuspense = ({ children, fallback = <FullScreenSpinner /> }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
  <ErrorBoundary FallbackComponent={RouteErrorFallback} onReset={() => window.location.reload()}>
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

// Lazy load large components to reduce initial bundle size
const FieldScreen = lazy(() => import('@/components/screens/FieldScreen').then(m => ({ default: m.FieldScreen })));
const FloqsHome = lazy(() => import('@/components/FloqsHome').then(m => ({ default: m.FloqsHome })));
const FloqsMainHub = lazy(() => import('@/components/floqs/FloqsMainHub'));
const FloqRoute = lazy(() => import('@/pages/FloqRoute'));
const FloqManage = lazy(() => import('@/pages/FloqManage'));
const Discover = lazy(() => import('@/pages/Discover'));
const PulseScreen = lazy(() => import('@/components/screens/pulse/PulseScreenRedesigned').then(m => ({ default: m.PulseScreenRedesigned })));
const VibeScreen = lazy(() => import('@/screens/VibeScreen').then(m => ({ default: m.VibeScreen })));
const AfterglowRoutes = lazy(() => import('@/routes/AfterglowRoutes'));
const CollaborativePlanningScreen = lazy(() => import('@/components/screens/CollaborativePlanningScreen').then(m => ({ default: m.CollaborativePlanningScreen })));
const FloqPlanExecutionScreen = lazy(() => import('@/pages/FloqPlanExecutionScreen'));
const FloqHQ = lazy(() => import('@/pages/FloqHQ'));
import { LegacyRedirect } from '@/components/LegacyRedirect';
import UserProfileByUsernameWrapper from '@/components/UserProfileByUsernameWrapper';
import Profile from '@/pages/Profile';
import Settings from '@/pages/Settings';
import UserProfile from '@/pages/UserProfile';
import NotFound from '@/pages/NotFound';
import NewPlan from '@/pages/floqs/[id]/plans/NewPlan';
import Archive from '@/pages/Archive';
import AfterglowInsightsPage from '@/pages/AfterglowInsightsPage';
import { RoleGuard } from '@/components/RoleGuard';
import Invites from '@/pages/Invites';
import { PlansHub } from '@/components/plans/PlansHub';
import { NewPlanWizard } from '@/pages/NewPlanWizard';
import FloqPlan from '@/pages/FloqPlan';
import SharedPlan from '@/pages/SharedPlan';
import { PlanDetailsView } from '@/components/plans/PlanDetailsView';
import { LocationSharingScreen } from '@/components/screens/LocationSharingScreen';
import DailyRecapGate from '@/pages/DailyRecapGate';
import RecapActionSheet from '@/pages/RecapActionSheet';
import { RecommendationsDemo } from '@/components/ui/RecommendationsDemo';
import { AfterglowTestPage } from '@/pages/AfterglowTestPage';
import VenuePage from '@/pages/VenuePage';
import VenueTestPage from '@/pages/VenueTestPage';

import Phase34DemoRoutes from '@/routes/Phase34DemoRoutes';

export const AppRoutes = () => {
  const exploreBeta = useFeatureFlag('EXPLORE');

  return (
    <Routes>
      <Route path="/" element={<DailyRecapGate />} />
      <Route path="/floqs-legacy" element={
        <RouteSuspense>
          <FloqsHome />
        </RouteSuspense>
      } />
      <Route path="/home" element={
        <RouteSuspense>
          <FieldScreen />
        </RouteSuspense>
      } />
      <Route path="/recap-actions" element={<RecapActionSheet />} />
      <Route path="/field" element={<LegacyRedirect />} />
      <Route path="/floqs" element={
        <RouteSuspense>
          <FloqsMainHub />
        </RouteSuspense>
      } />
      <Route path="/floqs-hub" element={
        <RouteSuspense>
          <FloqsMainHub />
        </RouteSuspense>
      } />
      <Route path="/discover" element={
        <RouteSuspense>
          <Discover />
        </RouteSuspense>
      } />
      <Route path="/floqs/:floqId" element={
        <RouteSuspense>
          <FloqRoute />
        </RouteSuspense>
      } />
      <Route path="/floqs/:floqId/manage" element={
        <RoleGuard roles={['creator', 'co-admin']}>
          <RouteSuspense>
            <FloqManage />
          </RouteSuspense>
        </RoleGuard>
      } />
      <Route path="/floqs/:floqId/plans/new" element={<NewPlan />} />
      <Route path="/floqs/:floqId/plan" element={<FloqPlan />} />
      <Route path="/floqs/:floqId/plans/:planId/execute" element={
        <RouteSuspense>
          <FloqPlanExecutionScreen />
        </RouteSuspense>
      } />
      <Route path="/floqs/:floqId/hq" element={
        <RouteSuspense>
          <FloqHQ />
        </RouteSuspense>
      } />
      <Route path="/pulse" element={
        <RouteSuspense>
          <PulseScreen />
        </RouteSuspense>
      } />
      <Route path="/vibe" element={
        <RouteSuspense>
          <VibeScreen />
        </RouteSuspense>
      } />
      <Route path="/recommendations-demo" element={<RecommendationsDemo />} />
      {exploreBeta && (
        <Route path="/explore" element={<div className="p-4 text-center"><h2 className="text-lg font-semibold">Map Explorer</h2><p className="text-muted-foreground">Coming soon - interactive map exploration</p></div>} />
      )}
      <Route path="/afterglow" element={
        <RouteSuspense>
          <AfterglowRoutes />
        </RouteSuspense>
      } />
      <Route path="/afterglow/:afterglowId/insights" element={<AfterglowInsightsPage />} />
      <Route path="/phase34-demo" element={
        <RouteSuspense>
          <Phase34DemoRoutes />
        </RouteSuspense>
      } />
      <Route path="/archive" element={<Archive />} />
      <Route path="/plans" element={<PlansHub />} />
      <Route path="/plans/:planId" element={<PlanDetailsView />} />
      <Route path="/plan/new" element={<NewPlanWizard />} />
      <Route path="/plan/:planId" element={
        <RouteSuspense>
          <CollaborativePlanningScreen />
        </RouteSuspense>
      } />
      {/* Redirect old new-plan path to new path */}
      <Route path="/new-plan" element={<Navigate to="/plan/new" replace />} />
      {/* New route for shared plans using /share/:slug */}
      <Route path="/share/:slug" element={<SharedPlan />} />
      <Route path="/invites" element={<Invites />} />
      <Route path="/u/:username" element={<UserProfileByUsernameWrapper />} />
      <Route path="/profile/:profileId" element={<UserProfile />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile-settings" element={<Profile />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/venues/:id" element={<VenuePage />} />
      {/* Test/Debug Routes - only in development */}
      {process.env.NODE_ENV !== 'production' && (
        <>
          <Route path="/afterglow-test" element={<AfterglowTestPage />} />
          <Route path="/venue-test" element={<VenueTestPage />} />

        </>
      )}
      <Route path="/location-sharing" element={<LocationSharingScreen />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
