import React from 'react';
import { useToast } from '@/hooks/use-toast';

interface VenueSyncErrorToastProps {
  error: string;
  onRetry?: () => void;
}

export const VenueSyncErrorToast: React.FC<VenueSyncErrorToastProps> = ({ error, onRetry }) => {
  const { toast } = useToast();

  React.useEffect(() => {
    toast({
      title: "Venue sync temporarily unavailable",
      description: onRetry ? "Retrying in 90 seconds..." : error,
      variant: "destructive",
      duration: 5000,
    });
  }, [error, onRetry, toast]);

  return null;
};

interface VenueSyncSuccessToastProps {
  count: number;
}

export const VenueSyncSuccessToast: React.FC<VenueSyncSuccessToastProps> = ({ count }) => {
  const { toast } = useToast();

  React.useEffect(() => {
    if (count > 0) {
      toast({
        title: "Venues synced successfully",
        description: `Found ${count} new venues in your area`,
        duration: 3000,
      });
    }
  }, [count, toast]);

  return null;
};