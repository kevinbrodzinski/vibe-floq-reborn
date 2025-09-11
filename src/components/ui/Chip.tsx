import * as React from 'react';
import { cn } from '@/lib/utils'
import { CHIP_COLOR_PALETTE } from '@/constants/moments'

interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: string
  icon?: React.ReactNode
  pressed?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export const Chip = ({ 
  color = 'slate', 
  icon, 
  className, 
  children, 
  pressed, 
  disabled, 
  onClick, 
  ...rest 
}: ChipProps) => (
  <span
    {...rest}
    onClick={onClick}
    className={cn(
      'inline-flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors cursor-pointer',
      pressed 
        ? 'bg-white/20 text-white' 
        : 'bg-white/10 text-white/80 hover:bg-white/15',
      disabled && 'opacity-60 cursor-not-allowed',
      color !== 'slate' && (CHIP_COLOR_PALETTE[color] || CHIP_COLOR_PALETTE.slate),
      className
    )}
    role={onClick ? "button" : undefined}
    aria-pressed={onClick ? !!pressed : undefined}
    tabIndex={onClick ? 0 : undefined}
  >
    {icon}
    {children}
  </span>
)

// Legacy Chip component for backward compatibility
export function ChipLegacy({ color = 'slate', icon, className, children, ...rest }: Omit<ChipProps, 'pressed' | 'disabled' | 'onClick'>) {
  return (
    <span
      {...rest}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition-colors hover:opacity-80',
        CHIP_COLOR_PALETTE[color] || CHIP_COLOR_PALETTE.slate,
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}