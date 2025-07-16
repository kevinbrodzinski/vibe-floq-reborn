import { Routes, Route } from 'react-router-dom';
import { FieldScreen } from '@/components/screens/FieldScreen';
import { FlocksHome } from '@/components/FlocksHome';
import FloqDetail from '@/pages/FloqDetail';
import FloqManage from '@/pages/FloqManage';
import { PulseScreen } from '@/components/screens/PulseScreen';
import { VibeScreen } from '@/components/screens/VibeScreen';
import { AfterglowScreen } from '@/components/screens/AfterglowScreen';
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
import AfterglowDetailPage from '@/pages/AfterglowDetailPage';
import { RoleGuard } from '@/components/RoleGuard';
import Invites from '@/pages/Invites';

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<FieldScreen />} />
    <Route path="/field" element={<LegacyRedirect />} />
    <Route path="/floqs" element={<FlocksHome />} />
    <Route path="/floqs/:floqId" element={<FloqDetail />} />
    <Route path="/floqs/:floqId/manage" element={
      <RoleGuard roles={['creator', 'co-admin']}>
        <FloqManage />
      </RoleGuard>
    } />
    <Route path="/floqs/:floqId/plans/new" element={<NewPlan />} />
    <Route path="/floqs/:floqId/plans/:planId/execute" element={<FloqPlanExecutionScreen />} />
    <Route path="/pulse" element={<PulseScreen />} />
    <Route path="/vibe" element={<VibeScreen />} />
    <Route path="/afterglow" element={<AfterglowScreen />} />
    <Route path="/afterglow/:afterglowId" element={<AfterglowDetailPage />} />
    <Route path="/archive" element={<Archive />} />
    <Route path="/plan" element={<CollaborativePlanningScreen />} />
    <Route path="/plan/:planId" element={<CollaborativePlanningScreen />} />
    <Route path="/invites" element={<Invites />} />
    <Route path="/u/:username" element={<UserProfileByUsername />} />
    <Route path="/profile/:userId" element={<UserProfile />} />
    <Route path="/profile" element={<Profile />} />
    <Route path="/profile-settings" element={<Profile />} />
    <Route path="/settings" element={<Settings />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);