import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/EnhancedAuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { pushNotificationService } from '@/lib/pushNotifications';

export const NotificationTestPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const testDatabaseNotification = async () => {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in to test notifications' });
      return;
    }

    try {
      // Insert a test notification directly into the database
      const { error } = await supabase
        .from('event_notifications')
        .insert({
          profile_id: user.id,
          kind: 'dm',
          payload: {
            thread_id: 'test-thread-123',
            message_id: 'test-message-456',
            sender_id: 'test-sender-789',
            preview: 'This is a test notification!'
          }
        });

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Test notification created!' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const testPushNotification = async () => {
    try {
      await pushNotificationService.showNotification({
        title: 'Test Push Notification',
        body: 'This is a test push notification from FLOQ!',
        tag: 'test',
        data: { action: 'test' }
      });
      toast({ title: 'Push notification sent!' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const requestNotificationPermission = async () => {
    try {
      const granted = await pushNotificationService.requestPermission();
      toast({ 
        title: granted ? 'Permission granted!' : 'Permission denied',
        description: granted ? 'You can now receive push notifications' : 'Push notifications are disabled'
      });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="p-4 border rounded-lg space-y-3 bg-card">
      <h3 className="font-semibold text-sm">🧪 Notification Test Panel</h3>
      <div className="space-y-2">
        <Button 
          size="sm" 
          onClick={testDatabaseNotification}
          className="w-full"
        >
          Test Database Notification
        </Button>
        <Button 
          size="sm" 
          onClick={testPushNotification}
          className="w-full"
          variant="outline"
        >
          Test Push Notification
        </Button>
        <Button 
          size="sm" 
          onClick={requestNotificationPermission}
          className="w-full"
          variant="secondary"
        >
          Request Permission
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Current permission: <strong>{pushNotificationService.isPermissionGranted() ? 'Granted' : 'Not granted'}</strong>
      </p>
    </div>
  );
};