import React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const actionPillVariants = cva(
  'rounded-full px-5 py-1.5 font-medium text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:brightness-110 active:scale-95 shadow-inner shadow-black/20',
        ghost: 'bg-white/15 text-white/90 hover:bg-white/25 hover:text-white active:scale-95 ring-1 ring-white/25',
        danger: 'bg-destructive/20 text-destructive hover:bg-destructive/30 active:scale-95 ring-1 ring-destructive/30'
      }
    },
    defaultVariants: {
      variant: 'ghost'
    }
  }
);

interface ActionPillProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof actionPillVariants> {
  label: string;
}

export const ActionPill = React.forwardRef<HTMLButtonElement, ActionPillProps>(
  ({ variant, label, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(actionPillVariants({ variant }), className)}
        {...props}
      >
        {label}
      </button>
    );
  }
);

ActionPill.displayName = 'ActionPill';