interface FriendRowSkeletonProps {
  showDistance?: boolean;
}

export const FriendRowSkeleton = ({ showDistance = false }: FriendRowSkeletonProps) => {
  return (
    <div className="flex items-center gap-3 p-2 animate-pulse">
      {/* Avatar */}
      <div className="relative">
        <div className="h-8 w-8 bg-muted rounded-full" />
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="h-3 bg-muted rounded w-24" />
        <div className="h-2 bg-muted/70 rounded w-16" />
      </div>

      {/* Distance (if nearby) */}
      {showDistance && (
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 bg-muted rounded" />
          <div className="h-2 bg-muted rounded w-8" />
        </div>
      )}
    </div>
  );
};