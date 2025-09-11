import * as React from 'react';
import { cn } from '@/lib/utils';

type Sizes = 'sm'|'md'|'lg';
type Variants = 'ghost'|'soft'|'solid';

export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;          // required a11y name
  size?: Sizes;
  variant?: Variants;
  pressed?: boolean;      // set only if toggle
};

const SIZE: Record<Sizes, string> = {
  sm: 'h-8 w-8 text-[13px]',
  md: 'h-10 w-10 text-[14px]',
  lg: 'h-12 w-12 text-[15px]',
};

const VARIANT: Record<Variants, string> = {
  ghost: 'bg-transparent hover:bg-foreground/5',
  soft:  'bg-foreground/5 hover:bg-foreground/8',
  solid: 'bg-primary text-primary-foreground hover:bg-primary/90',
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, size='md', variant='ghost', pressed, disabled, className, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed ?? undefined}
      disabled={disabled}
      className={cn(
        'inline-grid place-items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-foreground/60',
        SIZE[size],
        VARIANT[variant],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  )
);
IconButton.displayName = 'IconButton';