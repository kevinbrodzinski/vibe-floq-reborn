import React from 'react';

interface SafeAreaWrapperProps {
  children: React.ReactNode;
  className?: string;
  keyboardAware?: boolean;  // Keep for backward compatibility
  topPadding?: string;
  bottomPadding?: string;
}

export function SafeAreaWrapper({
  children,
  className = '',
  keyboardAware = false,  // Accept but ignore for now
  topPadding = 'pt-safe-top',
  bottomPadding = 'pb-safe-bottom'
}: SafeAreaWrapperProps) {
  const hasTouch = typeof window !== 'undefined' && 'ontouchstart' in window;
  const isMobileUA =
    typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const isMobile = hasTouch && isMobileUA;
  const safeClass = isMobile ? `${topPadding} ${bottomPadding}` : '';

  return (
    <div className={`${safeClass} ${className}`}>
      {children}
    </div>
  );
}