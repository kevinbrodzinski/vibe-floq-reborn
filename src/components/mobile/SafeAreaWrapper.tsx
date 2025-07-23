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
  const isMobile = useIsMobile();
  
  // On web, use CSS safe area insets
  // On native, this would use React Native SafeAreaView
  
  const safeAreaClasses = isMobile ? `${topPadding} ${bottomPadding}` : '';
  const keyboardClasses = keyboardAware && isMobile ? 'keyboard-aware' : '';
  
  // For web, just use a regular div - no platform-specific components needed
  return (
    <div className={`${safeAreaClasses} ${keyboardClasses} ${className}`}>
      {children}
    </div>
  );
}