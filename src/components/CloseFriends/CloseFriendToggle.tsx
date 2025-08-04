import React from 'react';
import { Heart, HeartOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToggleCloseFriend, useIsCloseFriend } from '@/hooks/useCloseFriends';
import { cn } from '@/lib/utils';

interface CloseFriendToggleProps {
  friendId: string;
  friendName: string;
  variant?: 'default' | 'icon' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

export const CloseFriendToggle: React.FC<CloseFriendToggleProps> = ({
  friendId,
  friendName,
  variant = 'default',
  size = 'md',
  className,
  disabled = false,
}) => {
  const { data: isCloseFriend = false, isLoading: isCheckingStatus } = useIsCloseFriend(friendId);
  const toggleCloseFriend = useToggleCloseFriend();

  const handleToggle = async () => {
    if (disabled || toggleCloseFriend.isPending) return;

    toggleCloseFriend.mutate({
      friendId,
      isCloseFriend: !isCloseFriend,
    });
  };

  const isLoading = isCheckingStatus || toggleCloseFriend.isPending;

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-8 px-2 text-xs';
      case 'lg':
        return 'h-12 px-6 text-base';
      default:
        return 'h-10 px-4 text-sm';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-3 h-3';
      case 'lg':
        return 'w-6 h-6';
      default:
        return 'w-4 h-4';
    }
  };

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggle}
        disabled={disabled || isLoading}
        className={cn(
          'p-2 rounded-full transition-all duration-200',
          isCloseFriend 
            ? 'text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950' 
            : 'text-gray-400 hover:text-red-500 hover:bg-gray-50 dark:hover:bg-gray-800',
          className
        )}
        title={isCloseFriend ? `Remove ${friendName} from close friends` : `Add ${friendName} to close friends`}
      >
        {isLoading ? (
          <Loader2 className={cn(getIconSize(), 'animate-spin')} />
        ) : isCloseFriend ? (
          <Heart className={cn(getIconSize(), 'fill-current')} />
        ) : (
          <HeartOff className={getIconSize()} />
        )}
      </Button>
    );
  }

  if (variant === 'minimal') {
    return (
      <button
        onClick={handleToggle}
        disabled={disabled || isLoading}
        className={cn(
          'flex items-center gap-1 text-xs font-medium transition-colors duration-200',
          isCloseFriend 
            ? 'text-red-500 hover:text-red-600' 
            : 'text-gray-500 hover:text-red-500',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        title={isCloseFriend ? `Remove ${friendName} from close friends` : `Add ${friendName} to close friends`}
      >
        {isLoading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : isCloseFriend ? (
          <Heart className="w-3 h-3 fill-current" />
        ) : (
          <HeartOff className="w-3 h-3" />
        )}
        {isCloseFriend ? 'Close Friend' : 'Add to Close'}
      </button>
    );
  }

  return (
    <Button
      variant={isCloseFriend ? 'default' : 'outline'}
      onClick={handleToggle}
      disabled={disabled || isLoading}
      className={cn(
        getSizeClasses(),
        'transition-all duration-200',
        isCloseFriend 
          ? 'bg-red-500 hover:bg-red-600 text-white border-red-500' 
          : 'border-gray-300 hover:border-red-500 hover:text-red-500',
        className
      )}
    >
      {isLoading ? (
        <Loader2 className={cn(getIconSize(), 'animate-spin mr-2')} />
      ) : isCloseFriend ? (
        <Heart className={cn(getIconSize(), 'fill-current mr-2')} />
      ) : (
        <HeartOff className={cn(getIconSize(), 'mr-2')} />
      )}
      {isCloseFriend ? 'Close Friend' : 'Add to Close Friends'}
    </Button>
  );
};