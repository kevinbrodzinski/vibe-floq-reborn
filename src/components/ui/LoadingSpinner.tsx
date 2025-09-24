import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  message?: string;
  showMessage?: boolean;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8', 
  lg: 'h-12 w-12'
};

export function LoadingSpinner({ 
  size = 'md', 
  className,
  message = 'Loading...',
  showMessage = true 
}: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div 
        className={cn(
          'animate-spin rounded-full border-b-2 border-primary',
          sizeClasses[size],
          className
        )}
      />
      {showMessage && (
        <p className="text-sm text-muted-foreground animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}