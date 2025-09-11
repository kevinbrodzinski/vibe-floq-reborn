import * as React from 'react';
import { cn } from '@/lib/utils';

type Sizes = 'sm'|'md'|'lg';
type Variants = 'ghost'|'soft'|'solid';

export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  size?: Sizes;
  variant?: Variants;
  pressed?: boolean; // supply only for toggle
};

const SIZE: Record<Sizes,string> = {
  sm: 'h-8 w-8 text-[13px]',
  md: 'h-10 w-10 text-[14px]',
  lg: 'h-12 w-12 text-[15px]',
};

const VARIANT: Record<Variants,string> = {
  ghost: 'bg-transparent hover:bg-foreground/5',
  soft:  'bg-foreground/5 hover:bg-foreground/8',
  solid: 'bg-primary text-primary-foreground hover:bg-primary/90',
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, size='md', variant='ghost', pressed, disabled, className, children, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        aria-pressed={pressed ?? undefined}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
          'transition-colors duration-150 select-none',
          SIZE[size], VARIANT[variant], className
        )}
        {...rest}
      >
        {children}
      </button>
    );
  }
);
IconButton.displayName = 'IconButton';