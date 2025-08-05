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

interface SearchResultSkeletonProps {
  count?: number;
}

export const SearchResultSkeleton = ({ count = 3 }: SearchResultSkeletonProps) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
          <div className="h-10 w-10 bg-muted rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-muted rounded w-32" />
            <div className="h-2 bg-muted/70 rounded w-20" />
          </div>
          <div className="h-6 w-12 bg-muted rounded" />
        </div>
      ))}
    </>
  );
};

interface ChatListSkeletonProps {
  count?: number;
}

export const ChatListSkeleton = ({ count = 5 }: ChatListSkeletonProps) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
          <div className="h-12 w-12 bg-muted rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-center">
              <div className="h-3 bg-muted rounded w-24" />
              <div className="h-2 bg-muted/70 rounded w-12" />
            </div>
            <div className="h-2 bg-muted/70 rounded w-40" />
          </div>
        </div>
      ))}
    </>
  );
};