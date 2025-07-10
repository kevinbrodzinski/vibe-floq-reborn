import { Routes, Route } from 'react-router-dom';
import { FieldScreen } from '@/components/screens/FieldScreen';
import { FloqsScreen } from '@/components/screens/FloqsScreen';
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
    <Route path="/" element={<LegacyRedirect />} />
    <Route path="/field" element={<FieldScreen />} />
    <Route path="/floqs" element={<FloqsScreen />} />
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