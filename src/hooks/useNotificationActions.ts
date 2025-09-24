import { useNavigate } from 'react-router-dom';
import { useEventNotifications } from '@/providers/EventNotificationsProvider';

export const useNotificationActions = () => {
  const navigate = useNavigate();
  const { markAsSeen } = useEventNotifications();

  const handleNotificationTap = (notification: any) => {
    // Mark as seen first
    markAsSeen([notification.id]);

    // Navigate based on notification type
    switch (notification.kind) {
      case 'dm':
        // Navigate to DM thread
        if (notification.payload?.thread_id) {
          navigate(`/messages/${notification.payload.thread_id}`);
        }
        break;
      
      case 'friend_request':
        // Navigate to friend requests page
        navigate('/friends/requests');
        break;
      
      case 'plan_invite':
      case 'plan_comment_new':
      case 'plan_checkin':
        // Navigate to plan
        if (notification.payload?.plan_id) {
          navigate(`/plan/${notification.payload.plan_id}`);
        }
        break;
      
      case 'floq_invite':
      case 'floq_reaction':
      case 'floq_reply':
        // Navigate to floq
        if (notification.payload?.floq_id) {
          navigate(`/floqs/${notification.payload.floq_id}`);
        }
        break;

      // Momentary Floq notifications
      case 'momentary_floq_created':
      case 'friend_started_floq_nearby':
      case 'momentary_floq_friend_joined':
      case 'momentary_floq_nearby':
        // Navigate to momentary floq
        if (notification.payload?.floq_id) {
          navigate(`/floqs/${notification.payload.floq_id}`);
        }
        break;

      case 'wave_activity_friend':
        // Navigate to discover page to see wave activity
        navigate('/discover');
        break;
      
      default:
        // For other notifications, just mark as seen (already done above)
        console.log('No specific action for notification type:', notification.kind);
        break;
    }
  };

  return {
    handleNotificationTap
  };
};