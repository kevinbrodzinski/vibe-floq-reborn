import { Routes, Route, Navigate } from 'react-router-dom';
import { FieldScreen } from '@/components/screens/FieldScreen';
import { FloqsScreen } from '@/components/screens/FloqsScreen';
import { PulseScreen } from '@/components/screens/PulseScreen';
import { VibeScreen } from '@/components/screens/VibeScreen';
import { AfterglowScreen } from '@/components/screens/AfterglowScreen';
import { CollaborativePlanningScreen } from '@/components/screens/CollaborativePlanningScreen';

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/field" replace />} />
    <Route path="/field" element={<FieldScreen />} />
    <Route path="/floqs" element={<FloqsScreen />} />
    <Route path="/pulse" element={<PulseScreen />} />
    <Route path="/vibe" element={<VibeScreen />} />
    <Route path="/afterglow" element={<AfterglowScreen />} />
    <Route path="/plan" element={<CollaborativePlanningScreen />} />
  </Routes>
);