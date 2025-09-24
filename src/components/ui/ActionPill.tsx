import React from 'react';
import { cn } from '@/lib/utils';

type Variants = 'primary' | 'ghost' | 'destructive' | 'success';


const styles: Record<Variants, string> = {
  primary:
    'action-pill-primary text-white shadow-lg active:scale-95 transition-all duration-200',
  ghost:
    'bg-white/5 text-white/80 ring-1 ring-white/10 action-pill-ghost active:scale-95 transition-all duration-200',
  destructive:
    'border border-white/15 text-white/60 hover:text-red-400 hover:border-red-400/40 active:scale-95 transition-all duration-200',
  success:
    'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40 hover:bg-emerald-500/30 active:scale-95 transition-all duration-200',
};

interface ActionPillProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variants;
  size?: 'default' | 'xs';
  startIcon?: React.ReactNode;
  children?: React.ReactNode;
  label?: string;
}

export const ActionPill = React.forwardRef<HTMLButtonElement, ActionPillProps>(
  ({ className, children, label, startIcon, variant = 'ghost', size = 'default', disabled, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full font-semibold',
        size === 'xs' ? 'px-2 py-1 text-xs' : variant === 'primary' ? 'px-6 py-2 text-sm' : 'px-4 py-2 text-sm',
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