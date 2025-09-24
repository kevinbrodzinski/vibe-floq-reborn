import * as React from "react";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  className?: string;
  children?: React.ReactNode;
}

export function LoadingSkeleton({ className, children }: LoadingSkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/20 backdrop-blur-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CarouselSkeleton() {
  return (
    <div className="space-y-2">
      <div className="flex gap-4 overflow-hidden px-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-80">
            <LoadingSkeleton className="h-36 w-full rounded-lg" />
            <div className="space-y-2 mt-2">
              <LoadingSkeleton className="h-4 w-3/4" />
              <LoadingSkeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
      <div className="text-center">
        <LoadingSkeleton className="h-4 w-24 mx-auto" />
      </div>
    </div>
  );
}

export function FloqPeekSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <LoadingSkeleton className="h-6 w-32" />
        <LoadingSkeleton className="h-5 w-12 rounded-full" />
      </div>
      
      <div className="space-y-2">
        <LoadingSkeleton className="h-4 w-48" />
        <LoadingSkeleton className="h-4 w-36" />
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center space-y-1">
          <LoadingSkeleton className="h-8 w-12 mx-auto" />
          <LoadingSkeleton className="h-3 w-8 mx-auto" />
        </div>
        <div className="text-center space-y-1">
          <LoadingSkeleton className="h-8 w-12 mx-auto" />
          <LoadingSkeleton className="h-3 w-8 mx-auto" />
        </div>
        <div className="text-center space-y-1">
          <LoadingSkeleton className="h-8 w-12 mx-auto" />
          <LoadingSkeleton className="h-3 w-8 mx-auto" />
        </div>
      </div>
      
      <LoadingSkeleton className="h-20 w-full rounded-lg" />
      
      <div className="flex gap-2">
        <LoadingSkeleton className="h-9 flex-1 rounded-md" />
        <LoadingSkeleton className="h-9 flex-1 rounded-md" />
      </div>
    </div>
  );
}