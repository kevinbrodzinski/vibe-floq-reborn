import { cn } from '@/lib/utils';
import { Loader2, Sparkles, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader } from './card';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  };

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <Loader2 className={cn('animate-spin', sizeClasses[size])} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-4 bg-muted rounded w-3/4"></div>
        <div className="h-3 bg-muted rounded w-1/2"></div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded w-full"></div>
          <div className="h-3 bg-muted rounded w-2/3"></div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse flex items-center space-x-4">
          <div className="rounded-full bg-muted h-10 w-10"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FloqLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="relative">
        <Circle className="w-8 h-8 animate-spin text-primary" />
        <Sparkles className="w-4 h-4 absolute top-2 left-2 text-primary/60" />
      </div>
      <div className="text-center space-y-1">
        <p className="font-medium">Loading Floq...</p>
        <p className="text-sm text-muted-foreground">Gathering your connections</p>
      </div>
    </div>
  );
}

export function VenueLoadingState() {
  return (
    <div className="space-y-4">
      <div className="animate-pulse">
        <div className="h-48 bg-muted rounded-lg mb-4"></div>
        <div className="space-y-2">
          <div className="h-6 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="flex gap-2">
            <div className="h-6 bg-muted rounded-full w-16"></div>
            <div className="h-6 bg-muted rounded-full w-20"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MessageLoadingState() {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={cn(
          'flex animate-pulse',
          i % 2 === 0 ? 'justify-start' : 'justify-end'
        )}>
          <div className={cn(
            'max-w-[70%] space-y-2',
            i % 2 === 0 ? 'items-start' : 'items-end'
          )}>
            <div className="flex items-center gap-2">
              {i % 2 === 0 && <div className="w-6 h-6 bg-muted rounded-full"></div>}
              <div className="h-3 bg-muted rounded w-20"></div>
            </div>
            <div className={cn(
              'h-10 bg-muted rounded-lg',
              i % 2 === 0 ? 'w-32' : 'w-40'
            )}></div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center space-y-4', className)}>
      {icon && (
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground">
          {icon}
        </div>
      )}
      <div className="space-y-1 max-w-sm">
        <h3 className="font-medium text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}