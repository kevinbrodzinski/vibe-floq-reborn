import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export const FloqSettingsSkeleton: React.FC = () => {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="space-y-4">
          <Skeleton className="w-32 h-6" />
          
          <div className="space-y-4">
            {/* Notifications */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="w-24 h-4" />
                <Skeleton className="w-48 h-3" />
              </div>
              <Skeleton className="w-12 h-6 rounded-full" />
            </div>

            {/* Join Approval */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="w-32 h-4" />
                <Skeleton className="w-56 h-3" />
              </div>
              <Skeleton className="w-12 h-6 rounded-full" />
            </div>

            {/* Mention Permissions */}
            <div className="space-y-2">
              <Skeleton className="w-28 h-4" />
              <Skeleton className="w-full h-10" />
            </div>

            {/* Activity Visibility */}
            <div className="space-y-2">
              <Skeleton className="w-24 h-4" />
              <Skeleton className="w-full h-10" />
            </div>

            {/* Welcome Message */}
            <div className="space-y-2">
              <Skeleton className="w-28 h-4" />
              <Skeleton className="w-full h-20" />
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Skeleton className="w-20 h-10" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};