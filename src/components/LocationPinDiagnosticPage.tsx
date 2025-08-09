import React from 'react';
import { FieldLocationProvider } from '@/components/field/contexts/FieldLocationContext';
import { LocationPinDiagnostic } from '@/components/LocationPinDiagnostic';

export const LocationPinDiagnosticPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <FieldLocationProvider friendIds={[]} debugMode={true}>
        <div className="container mx-auto max-w-4xl">
          <LocationPinDiagnostic />
        </div>
      </FieldLocationProvider>
    </div>
  );
};