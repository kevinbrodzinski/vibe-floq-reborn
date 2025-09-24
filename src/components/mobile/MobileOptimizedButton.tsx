import { ButtonHTMLAttributes, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useAdvancedHaptics } from '@/hooks/useAdvancedHaptics';
import { cn } from '@/lib/utils';

interface MobileOptimizedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  hapticType?: 'light' | 'medium' | 'heavy';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Minimum touch target size for accessibility */
  touchTarget?: boolean;
}

export function MobileOptimizedButton({
  children,
  hapticType = 'light',
  touchTarget = true,
  className,
  onClick,
  ...props
}: MobileOptimizedButtonProps) {
  const { triggerHaptic } = useAdvancedHaptics();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Trigger haptic feedback on mobile
    triggerHaptic(hapticType);
    
    // Call original onClick
    onClick?.(e);
  };

  const touchTargetClasses = touchTarget 
    ? 'min-h-[44px] min-w-[44px] touch-manipulation' 
    : '';

  return (
    <Button
      {...props}
      className={cn(touchTargetClasses, className)}
      onClick={handleClick}
    >
      {children}
    </Button>
  );
}