
import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { FullScreenSpinner } from '@/components/ui/FullScreenSpinner';
import { FieldScreen } from '@/components/screens/FieldScreen';
import { FlocksHome } from '@/components/FlocksHome';
import FloqDetail from '@/pages/FloqDetail';
import FloqManage from '@/pages/FloqManage';
import { PulseScreen } from '@/components/screens/PulseScreen';
import { VibeScreen } from '@/components/screens/VibeScreen';
import AfterglowRoutes from '@/routes/AfterglowRoutes';
import { CollaborativePlanningScreen } from '@/components/screens/CollaborativePlanningScreen';
import FloqPlanExecutionScreen from '@/pages/FloqPlanExecutionScreen';
import { LegacyRedirect } from '@/components/LegacyRedirect';
import { UserProfileByUsername } from '@/components/UserProfileByUsername';
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

export const AppRoutes = () => {
  const exploreBeta = useFeatureFlag('EXPLORE');

  return (
    <Routes>
      <Route path="/" element={<DailyRecapGate />} />
      <Route path="/home" element={<FieldScreen />} />
      <Route path="/recap-actions" element={<RecapActionSheet />} />
      <Route path="/field" element={<LegacyRedirect />} />
      <Route path="/floqs" element={<FlocksHome />} />
      <Route path="/floqs/:floqId" element={<FloqDetail />} />
      <Route path="/floqs/:floqId/manage" element={
        <RoleGuard roles={['creator', 'co-admin']}>
          <FloqManage />
        </RoleGuard>
      } />
      <Route path="/floqs/:floqId/plans/new" element={<NewPlan />} />
      <Route path="/floqs/:floqId/plan" element={<FloqPlan />} />
      <Route path="/floqs/:floqId/plans/:planId/execute" element={<FloqPlanExecutionScreen />} />
      <Route path="/pulse" element={<PulseScreen />} />
      <Route path="/vibe" element={<VibeScreen />} />
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
      <Route path="/archive" element={<Archive />} />
      <Route path="/plans" element={<PlansHub />} />
      <Route path="/plans/:planId" element={<PlanDetailsView />} />
      <Route path="/plan/new" element={<NewPlanWizard />} />
      <Route path="/plan/:planId" element={<CollaborativePlanningScreen />} />
      {/* Redirect old new-plan path to new path */}
      <Route path="/new-plan" element={<Navigate to="/plan/new" replace />} />
      {/* New route for shared plans using /share/:slug */}
      <Route path="/share/:slug" element={<SharedPlan />} />
      <Route path="/invites" element={<Invites />} />
      <Route path="/u/:username" element={<UserProfileByUsername />} />
      <Route path="/profile/:profileId" element={<UserProfile />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/profile-settings" element={<Profile />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/location-sharing" element={<LocationSharingScreen />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
