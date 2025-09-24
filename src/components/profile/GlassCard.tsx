import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  center?: boolean;
}

export const GlassCard = ({ children, className, center = false }: GlassCardProps) => {
  return (
    <div
      className={cn(
        'rounded-3xl border border-white/5 bg-white/5 backdrop-blur-xl shadow-lg p-5',
        center && 'text-center',
        className
      )}
    >
      {children}
    </div>
  );
};