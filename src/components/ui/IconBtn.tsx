import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IconBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
}

export const IconBtn = React.forwardRef<HTMLButtonElement, IconBtnProps>(
  ({ icon: Icon, label, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'size-11 rounded-full bg-white/10 backdrop-blur-md',
          'flex items-center justify-center',
          'ring-1 ring-white/20 hover:ring-white/40',
          'hover:brightness-110 active:scale-95',
          'transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          'text-foreground/80 hover:text-foreground',
          className
        )}
        aria-label={label}
        title={label}
        {...props}
      >
        <Icon className="h-5 w-5" />
      </button>
    );
  }
);

IconBtn.displayName = 'IconBtn';