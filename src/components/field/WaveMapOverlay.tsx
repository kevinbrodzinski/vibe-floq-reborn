import React from 'react';

// Temporary stub component to prevent runtime errors
// This component was removed but is still being referenced somewhere
// TODO: Remove all references to this component and delete this file

interface WaveMapOverlayProps {
  // Add any props that might be passed to this component
  [key: string]: any;
}

export const WaveMapOverlay: React.FC<WaveMapOverlayProps> = (props) => {
  // Define the missing function to prevent runtime errors
  const handleCreateFromWave = React.useCallback(() => {
    console.warn('WaveMapOverlay: handleCreateFromWave called on deprecated component');
    // No-op implementation
  }, []);

  // Make the function available for any potential external calls
  React.useEffect(() => {
    // Attach to window or component ref if needed
    if (typeof window !== 'undefined') {
      (window as any).handleCreateFromWave = handleCreateFromWave;
    }
  }, [handleCreateFromWave]);

  // Log that this deprecated component is being used
  React.useEffect(() => {
    console.warn('WaveMapOverlay: This component is deprecated and should be removed. Check for remaining imports or references.');
  }, []);

  // Return null to render nothing but keep the function available
  return (
    <div style={{ display: 'none' }}>
      {/* Hidden stub to prevent crashes */}
    </div>
  );
};

export default WaveMapOverlay;