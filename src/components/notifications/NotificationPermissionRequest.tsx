import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { pushNotificationService } from '@/lib/pushNotifications';

interface NotificationPermissionRequestProps {
  onDismiss?: () => void;
  className?: string;
}

export const NotificationPermissionRequest: React.FC<NotificationPermissionRequestProps> = ({
  onDismiss,
  className = ''
}) => {
  const [showRequest, setShowRequest] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    const shouldShow = !pushNotificationService.isPermissionGranted() && 
                      pushNotificationService.getSupported() &&
                      !localStorage.getItem('notification-permission-dismissed');
    
    setShowRequest(shouldShow);
  }, []);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    
    try {
      const granted = await pushNotificationService.requestPermission();
      
      if (granted) {
        setShowRequest(false);
        await pushNotificationService.showNotification({
          title: 'Notifications Enabled! 🎉',
          body: 'You\'ll now receive notifications for messages and friend requests.',
          tag: 'permission-granted'
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    setShowRequest(false);
    localStorage.setItem('notification-permission-dismissed', 'true');
    onDismiss?.();
  };

  if (!showRequest) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
          <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Enable Notifications
          </h3>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            Get notified about new messages, friend requests, and plan invitations.
          </p>
          
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleRequestPermission}
              disabled={isRequesting}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              {isRequesting ? 'Requesting...' : 'Enable'}
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-blue-600 hover:text-blue-700 text-xs"
            >
              Not now
            </Button>
          </div>
        </div>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          className="flex-shrink-0 text-blue-600 hover:text-blue-700"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};