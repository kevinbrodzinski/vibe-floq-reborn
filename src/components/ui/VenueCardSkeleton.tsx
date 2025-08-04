import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface VenueCardSkeletonProps {
  count?: number;
  showBadges?: boolean;
  showContent?: boolean;
  className?: string;
}

const SkeletonLine = ({ 
  width = '100%', 
  height = '1rem', 
  className = '' 
}: { 
  width?: string; 
  height?: string; 
  className?: string; 
}) => (
  <div 
    className={`bg-gray-200 rounded animate-pulse ${className}`}
    style={{ width, height }}
  />
);

const VenueCardSkeleton: React.FC<VenueCardSkeletonProps> = ({
  count = 1,
  showBadges = true,
  showContent = true,
  className = ''
}) => {
  const skeletons = Array.from({ length: count }, (_, index) => (
    <Card key={index} className={`w-full ${className}`}>
      <CardHeader className="space-y-3">
        {/* Image placeholder */}
        <div className="w-full h-48 bg-gray-200 rounded-lg animate-pulse" />
        
        {/* Header badges */}
        {showBadges && (
          <div className="flex justify-between items-start">
            <div className="flex gap-2">
              <SkeletonLine width="60px" height="24px" className="rounded-full" />
              <SkeletonLine width="80px" height="24px" className="rounded-full" />
            </div>
            <SkeletonLine width="50px" height="24px" className="rounded-full" />
          </div>
        )}
        
        {/* Title and rating */}
        <div className="space-y-2">
          <SkeletonLine width="75%" height="24px" />
          <div className="flex items-center gap-2">
            <SkeletonLine width="80px" height="16px" />
            <SkeletonLine width="40px" height="16px" />
          </div>
        </div>
        
        {/* Distance and travel time */}
        <div className="flex gap-4">
          <SkeletonLine width="60px" height="14px" />
          <SkeletonLine width="70px" height="14px" />
        </div>
      </CardHeader>
      
      {showContent && (
        <CardContent className="space-y-4">
          {/* Vibe match section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <SkeletonLine width="100px" height="16px" />
              <SkeletonLine width="40px" height="16px" />
            </div>
            <SkeletonLine width="90%" height="14px" />
            <div className="flex gap-2">
              <SkeletonLine width="50px" height="20px" className="rounded-full" />
              <SkeletonLine width="60px" height="20px" className="rounded-full" />
              <SkeletonLine width="45px" height="20px" className="rounded-full" />
            </div>
          </div>
          
          {/* Crowd intelligence section */}
          <div className="space-y-2">
            <SkeletonLine width="120px" height="16px" />
            <div className="grid grid-cols-2 gap-2">
              <SkeletonLine width="100%" height="14px" />
              <SkeletonLine width="100%" height="14px" />
            </div>
          </div>
          
          {/* Social proof section */}
          <div className="space-y-2">
            <SkeletonLine width="90px" height="16px" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse" />
              <SkeletonLine width="150px" height="14px" />
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <SkeletonLine width="80px" height="36px" className="rounded-md" />
            <SkeletonLine width="60px" height="36px" className="rounded-md" />
            <SkeletonLine width="40px" height="36px" className="rounded-md" />
          </div>
        </CardContent>
      )}
    </Card>
  ));

  return count === 1 ? skeletons[0] : <>{skeletons}</>;
};

export default VenueCardSkeleton;

// Specialized skeleton variants
export const CompactVenueCardSkeleton: React.FC<{ count?: number }> = ({ count = 1 }) => (
  <VenueCardSkeleton 
    count={count} 
    showContent={false} 
    className="max-w-sm" 
  />
);

export const DetailedVenueCardSkeleton: React.FC<{ count?: number }> = ({ count = 1 }) => (
  <VenueCardSkeleton 
    count={count} 
    showBadges={true} 
    showContent={true} 
  />
);

// Grid layout skeleton
export const VenueCardGridSkeleton: React.FC<{ 
  count?: number; 
  columns?: number; 
}> = ({ count = 6, columns = 2 }) => (
  <div 
    className={`grid gap-4`}
    style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
  >
    <VenueCardSkeleton count={count} />
  </div>
);

// List layout skeleton with staggered loading effect
export const VenueCardListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, index) => (
        <div 
          key={index}
          style={{ 
            animationDelay: `${index * 100}ms`,
            opacity: 0,
            animation: 'fadeIn 0.5s ease-in-out forwards'
          }}
        >
          <VenueCardSkeleton count={1} />
        </div>
      ))}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};