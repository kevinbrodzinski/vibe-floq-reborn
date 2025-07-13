import { Routes, Route } from 'react-router-dom';
import { FieldScreen } from '@/components/screens/FieldScreen';
import { FlocksHome } from '@/components/FlocksHome';
import FloqDetail from '@/pages/FloqDetail';
import { PulseScreen } from '@/components/screens/PulseScreen';
import { VibeScreen } from '@/components/screens/VibeScreen';
import { AfterglowScreen } from '@/components/screens/AfterglowScreen';
import { CollaborativePlanningScreen } from '@/components/screens/CollaborativePlanningScreen';
import { LegacyRedirect } from '@/components/LegacyRedirect';
import { UserProfileByUsername } from '@/components/UserProfileByUsername';
import ProfileSettings from '@/pages/ProfileSettings';
import UserProfile from '@/pages/UserProfile';
import NotFound from '@/pages/NotFound';

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<FieldScreen />} />
    <Route path="/field" element={<LegacyRedirect />} />
    <Route path="/floqs" element={<FlocksHome />} />
    <Route path="/floqs/:floqId" element={<FloqDetail />} />
    <Route path="/pulse" element={<PulseScreen />} />
    <Route path="/vibe" element={<VibeScreen />} />
    <Route path="/afterglow" element={<AfterglowScreen />} />
    <Route path="/plan" element={<CollaborativePlanningScreen />} />
    <Route path="/u/:username" element={<UserProfileByUsername />} />
    <Route path="/profile/:userId" element={<UserProfile />} />
    <Route path="/profile-settings" element={<ProfileSettings />} />
    <Route path="/settings" element={<ProfileSettings />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);