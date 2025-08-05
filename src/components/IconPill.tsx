import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface IconPillProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'destructive' | 'outline';
  className?: string;
}

export const IconPill: React.FC<IconPillProps> = ({
  icon,
  label,
  onClick,
  disabled = false,
  variant = 'outline',
  className
}) => {
  const isMobile = useIsMobile();
  
  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      className={cn(
        "text-xs font-medium flex items-center gap-1.5",
        isMobile ? "h-mobile-action px-4" : "h-8 px-3",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {icon}
      <span>{label}</span>
    </Button>
  );
};