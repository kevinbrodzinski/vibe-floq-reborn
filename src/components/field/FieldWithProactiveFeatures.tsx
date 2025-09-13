import React from 'react';
import { ConvergenceNotificationSystem } from '@/components/convergence/ConvergenceNotificationSystem';
// import { BreadcrumbTrailOverlay } from '@/components/map/BreadcrumbTrailOverlay';
import { useConvergenceNotifications } from '@/hooks/useConvergenceNotifications';

interface FieldWithProactiveFeaturesProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that adds proactive rally points and breadcrumb trail features
 * to the field/map experience. Handles both trajectory predictions and path tracking.
 */
export function FieldWithProactiveFeatures({ children }: FieldWithProactiveFeaturesProps) {
  // Initialize convergence prediction system
  useConvergenceNotifications();

  return (
    <>
      {children}
      
      {/* Map overlays will be integrated via LayerManager */}
      
      {/* Notification system */}
      <ConvergenceNotificationSystem />
    </>
  );
}