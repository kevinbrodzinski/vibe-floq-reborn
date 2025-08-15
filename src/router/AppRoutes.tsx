
import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { FullScreenSpinner } from '@/components/ui/FullScreenSpinner';

// Lazy load large components to reduce initial bundle size
const FieldScreen = lazy(() => import('@/components/screens/FieldScreen').then(m => ({ default: m.FieldScreen })));
const FlocksHome = lazy(() => import('@/components/FlocksHome').then(m => ({ default: m.FlocksHome })));
const FloqDetail = lazy(() => import('@/pages/FloqDetail'));
const FloqManage = lazy(() => import('@/pages/FloqManage'));
const PulseScreen = lazy(() => import('@/components/screens/pulse/PulseScreenRedesigned').then(m => ({ default: m.PulseScreenRedesigned })));
const VibeScreen = lazy(() => import('@/screens/VibeScreen').then(m => ({ default: m.VibeScreen })));
const AfterglowRoutes = lazy(() => import('@/routes/AfterglowRoutes'));
const CollaborativePlanningScreenWrapper = lazy(() => import('@/components/screens/CollaborativePlanningScreenWrapper').then(m => ({ default: m.CollaborativePlanningScreenWrapper })));
const FloqPlanExecutionScreen = lazy(() => import('@/pages/FloqPlanExecutionScreen'));
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
      <Route path="/home" element={
        <Suspense fallback={<FullScreenSpinner />}>
          <FieldScreen />
        </Suspense>
      } />
      <Route path="/recap-actions" element={<RecapActionSheet />} />
      <Route path="/field" element={<LegacyRedirect />} />
      <Route path="/floqs" element={
        <Suspense fallback={<FullScreenSpinner />}>
          <FlocksHome />
        </Suspense>
      } />
      <Route path="/floqs/:floqId" element={
        <Suspense fallback={<FullScreenSpinner />}>
          <FloqDetail />
        </Suspense>
      } />
      <Route path="/floqs/:floqId/manage" element={
        <RoleGuard roles={['creator', 'co-admin']}>
          <Suspense fallback={<FullScreenSpinner />}>
            <FloqManage />
          </Suspense>
        </RoleGuard>
      } />
      <Route path="/floqs/:floqId/plans/new" element={<NewPlan />} />
      <Route path="/floqs/:floqId/plan" element={<FloqPlan />} />
      <Route path="/floqs/:floqId/plans/:planId/execute" element={
        <Suspense fallback={<FullScreenSpinner />}>
          <FloqPlanExecutionScreen />
        </Suspense>
      } />
      <Route path="/pulse" element={
        <Suspense fallback={<FullScreenSpinner />}>
          <PulseScreen />
        </Suspense>
      } />
      <Route path="/vibe" element={
        <Suspense fallback={<FullScreenSpinner />}>
          <VibeScreen />
        </Suspense>
      } />
      <Route path="/recommendations-demo" element={<RecommendationsDemo />} />
      {exploreBeta && (
        <Route path="/explore" element={<div className="p-4 text-center"><h2 className="text-lg font-semibold">Map Explorer</h2><p className="text-muted-foreground">Coming soon - interactive map exploration</p></div>} />
      )}
      <Route path="/afterglow" element={
        <Suspense fallback={<FullScreenSpinner />}>
          <AfterglowRoutes />
        </Suspense>
      } />
      <Route path="/afterglow/:afterglowId/insights" element={<AfterglowInsightsPage />} />
      <Route path="/phase34-demo" element={
        <Suspense fallback={<FullScreenSpinner />}>
          <Phase34DemoRoutes />
        </Suspense>
      } />
      <Route path="/archive" element={<Archive />} />
      <Route path="/plans" element={<PlansHub />} />
      <Route path="/plans/:planId" element={<PlanDetailsView />} />
      <Route path="/plan/new" element={<NewPlanWizard />} />
      <Route path="/plan/:planId" element={
        <Suspense fallback={<FullScreenSpinner />}>
          <CollaborativePlanningScreenWrapper />
        </Suspense>
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
