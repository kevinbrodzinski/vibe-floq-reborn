import React from 'react';
import { cn } from '@/lib/utils';

type Variants = 'primary' | 'ghost' | 'destructive' | 'success';

interface ActionPillProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variants;
  startIcon?: React.ReactNode;
  children?: React.ReactNode;
  label?: string;
}

const styles: Record<Variants, string> = {
  primary:
    'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm hover:brightness-110 active:scale-95',
  ghost:
    'bg-white/5 text-muted-foreground ring-1 ring-white/10 hover:bg-white/8 active:scale-95',
  destructive:
    'bg-red-500/20 text-red-300 ring-1 ring-red-500/40 hover:bg-red-500/30 active:scale-95',
  success:
    'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40 hover:bg-emerald-500/30 active:scale-95',
};

export const ActionPill = React.forwardRef<HTMLButtonElement, ActionPillProps>(
  ({ className, children, label, startIcon, variant = 'ghost', disabled, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200',
        styles[variant],
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        className,
      )}
      aria-disabled={disabled}
      {...rest}
    >
      {startIcon}
      {children || label}
    </button>
  ),
);

ActionPill.displayName = 'ActionPill';