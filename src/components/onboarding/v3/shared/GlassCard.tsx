import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type GlassCardProps = {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'subtle';
  animate?: boolean;
  style?: React.CSSProperties;
};

export function GlassCard({ 
  children, 
  className, 
  variant = 'default',
  animate = true,
  style
}: GlassCardProps) {
  const variants = {
    default: 'bg-background/40 backdrop-blur-xl border border-white/10',
    elevated: 'bg-background/60 backdrop-blur-2xl border border-white/20 shadow-2xl',
    subtle: 'bg-background/20 backdrop-blur-md border border-white/5',
  };

  return (
    <div 
      className={cn(
        'rounded-2xl p-6',
        variants[variant],
        animate && 'animate-fade-in',
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}
