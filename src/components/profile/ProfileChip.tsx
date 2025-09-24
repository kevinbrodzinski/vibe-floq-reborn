import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface ProfileChipProps {
  icon?: LucideIcon;
  text: string;
  className?: string;
}

export const ProfileChip = ({ icon: Icon, text, className }: ProfileChipProps) => {
  return (
    <div className={cn(
      'inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 text-xs font-medium text-gray-200',
      className
    )}>
      {Icon && <Icon className="h-3 w-3" />}
      <span>{text}</span>
    </div>
  );
};