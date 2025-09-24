import React from 'react';
import { Portal } from '@radix-ui/react-portal';

interface WizardPortalProps {
  children: React.ReactNode;
  onBackdropClick?: () => void;
}

export const WizardPortal: React.FC<WizardPortalProps> = ({ children, onBackdropClick }) => (
  <Portal>
    {/* Fixed overlay that sits above everything */}
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 80, // Above navigation (60) and Radix layers (70)
        pointerEvents: 'auto', // Intercept all clicks
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          cursor: 'pointer',
        }}
        onClick={onBackdropClick}
      />

      {/* Modal content container */}
      <div
        style={{
          position: 'relative',
          zIndex: 81,
          pointerEvents: 'auto',
          maxWidth: '90vw',
          maxHeight: '90vh',
          width: '100%',
          margin: '20px',
        }}
        onClick={(e) => e.stopPropagation()} // Prevent backdrop click when clicking content
      >
        {children}
      </div>
    </div>
  </Portal>
);