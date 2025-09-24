import { cn } from '@/lib/utils';

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

export const FilterChip = ({ active, onClick, children, className }: FilterChipProps) => (
  <button
    onClick={onClick}
    className={cn(
      'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
      active
        ? 'bg-white text-gray-900 shadow-md'
        : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white',
      className
    )}
  >
    {children}
  </button>
); 