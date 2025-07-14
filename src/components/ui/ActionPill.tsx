import React from 'react';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const actionPillVariants = cva(
  'rounded-full px-4 py-2 font-semibold text-sm transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
  {
    variants: {
      variant: {
        primary: 'text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 backdrop-blur-sm border border-white/20',
        ghost: 'bg-white/10 text-white/90 hover:bg-white/20 hover:text-white active:scale-95 ring-1 ring-white/20 hover:ring-white/40 backdrop-blur-sm hover:shadow-lg',
        danger: 'bg-destructive/20 text-destructive hover:bg-destructive/30 active:scale-95 ring-1 ring-destructive/30 hover:shadow-lg backdrop-blur-sm'
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