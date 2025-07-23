import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface SafeAreaWrapperProps {
  children: ReactNode;
  className?: string;
  /** Enable keyboard avoidance for forms */
  keyboardAware?: boolean;
  /** Custom padding for top safe area */
  topPadding?: string;
  /** Custom padding for bottom safe area */
  bottomPadding?: string;
}

export function SafeAreaWrapper({ 
  children, 
  className = '',
  keyboardAware = false,
  topPadding = 'pt-safe-top',
  bottomPadding = 'pb-safe-bottom'
}: SafeAreaWrapperProps) {
  const isMobile = typeof window === 'undefined' || 'ontouchstart' in window;
  
  // On web, use CSS safe area insets
  // On native, this would use React Native SafeAreaView
  
  const safeAreaClasses = isMobile ? `${topPadding} ${bottomPadding}` : '';
  // Remove keyboardAware until RN port - no CSS definition yet
  
  // For web, just use a regular div - no platform-specific components needed
  return (
    <div className={`${safeAreaClasses} ${className}`}>
      {children}
    </div>
  );
}