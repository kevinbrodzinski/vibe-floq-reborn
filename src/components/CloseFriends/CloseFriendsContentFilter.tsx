import React from 'react';
import { Heart, Users, Filter, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useCloseFriendsFilter, useCloseFriendsCount } from '@/hooks/useCloseFriends';
import { cn } from '@/lib/utils';

interface CloseFriendsContentFilterProps {
  showCloseFriendsOnly: boolean;
  onToggleCloseFriendsOnly: (enabled: boolean) => void;
  className?: string;
  variant?: 'button' | 'switch' | 'badge';
  showCount?: boolean;
}

export const CloseFriendsContentFilter: React.FC<CloseFriendsContentFilterProps> = ({
  showCloseFriendsOnly,
  onToggleCloseFriendsOnly,
  className,
  variant = 'button',
  showCount = true,
}) => {
  const closeFriendsCount = useCloseFriendsCount();

  if (variant === 'switch') {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-red-500 fill-current" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Close Friends Only
          </span>
          {showCount && closeFriendsCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {closeFriendsCount}
            </Badge>
          )}
        </div>
        <Switch
          checked={showCloseFriendsOnly}
          onCheckedChange={onToggleCloseFriendsOnly}
          disabled={closeFriendsCount === 0}
        />
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <Badge
        variant={showCloseFriendsOnly ? 'default' : 'outline'}
        className={cn(
          'cursor-pointer transition-all duration-200 hover:scale-105',
          showCloseFriendsOnly 
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950',
          closeFriendsCount === 0 && 'opacity-50 cursor-not-allowed',
          className
        )}
        onClick={() => closeFriendsCount > 0 && onToggleCloseFriendsOnly(!showCloseFriendsOnly)}
      >
        <Heart className="w-3 h-3 mr-1 fill-current" />
        Close Friends
        {showCount && closeFriendsCount > 0 && (
          <span className="ml-1">({closeFriendsCount})</span>
        )}
      </Badge>
    );
  }

  return (
    <Button
      variant={showCloseFriendsOnly ? 'default' : 'outline'}
      size="sm"
      onClick={() => onToggleCloseFriendsOnly(!showCloseFriendsOnly)}
      disabled={closeFriendsCount === 0}
      className={cn(
        'transition-all duration-200',
        showCloseFriendsOnly 
          ? 'bg-red-500 hover:bg-red-600 text-white border-red-500' 
          : 'border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950',
        className
      )}
    >
      <Heart className="w-4 h-4 mr-2 fill-current" />
      {showCloseFriendsOnly ? 'Showing Close Friends' : 'Show Close Friends'}
      {showCount && closeFriendsCount > 0 && (
        <Badge 
          variant="secondary" 
          className="ml-2 bg-white/20 text-current border-0"
        >
          {closeFriendsCount}
        </Badge>
      )}
    </Button>
  );
};

// Higher-order component for content filtering
export const withCloseFriendsFilter = <T extends { author_id?: string; user_id?: string }>(
  Component: React.ComponentType<{ items: T[]; [key: string]: any }>
) => {
  return (props: { items: T[]; showCloseFriendsOnly?: boolean; [key: string]: any }) => {
    const { filterForCloseFriends } = useCloseFriendsFilter();
    const { items, showCloseFriendsOnly = false, ...otherProps } = props;
    
    const filteredItems = showCloseFriendsOnly ? filterForCloseFriends(items) : items;
    
    return <Component {...otherProps} items={filteredItems} />;
  };
};

// Content visibility indicator
export const CloseFriendsContentIndicator: React.FC<{
  isCloseFriendsOnly: boolean;
  className?: string;
}> = ({ isCloseFriendsOnly, className }) => {
  if (!isCloseFriendsOnly) return null;

  return (
    <div className={cn(
      'inline-flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-full text-xs font-medium text-red-600 dark:text-red-400',
      className
    )}>
      <Heart className="w-3 h-3 fill-current" />
      Close Friends
    </div>
  );
};

// Feed filter controls
export const FeedCloseFriendsControls: React.FC<{
  showCloseFriendsOnly: boolean;
  onToggleCloseFriendsOnly: (enabled: boolean) => void;
  className?: string;
}> = ({ showCloseFriendsOnly, onToggleCloseFriendsOnly, className }) => {
  const closeFriendsCount = useCloseFriendsCount();

  if (closeFriendsCount === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg', className)}>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
          <Heart className="w-5 h-5 text-red-500 fill-current" />
        </div>
        <div>
          <h4 className="font-medium text-gray-900 dark:text-gray-100">Close Friends Feed</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            See content from your {closeFriendsCount} close friends
          </p>
        </div>
      </div>
      <CloseFriendsContentFilter
        showCloseFriendsOnly={showCloseFriendsOnly}
        onToggleCloseFriendsOnly={onToggleCloseFriendsOnly}
        variant="switch"
        showCount={false}
      />
    </div>
  );
};