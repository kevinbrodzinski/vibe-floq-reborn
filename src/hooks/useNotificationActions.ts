import { useNavigate } from 'react-router-dom';
import { useEventNotifications } from '@/providers/EventNotificationsProvider';
import { useToast } from '@/hooks/use-toast';

export const useNotificationActions = () => {
  const navigate = useNavigate();
  const { markAsSeen } = useEventNotifications();
  const { toast } = useToast();

  const handleNotificationTap = (notification: any) => {
    // Mark as seen first
    markAsSeen([notification.id]);

    // Show feedback toast for better UX
    const showNavigationFeedback = (message: string) => {
      toast({
        title: "Opening...",
        description: message,
        duration: 2000,
      });
    };

    // Navigate based on notification type
    switch (notification.kind) {
      // Core social notifications
      case 'dm':
        if (notification.payload?.thread_id) {
          showNavigationFeedback("Opening message thread");
          navigate(`/messages/${notification.payload.thread_id}`);
        } else if (notification.payload?.sender_id) {
          showNavigationFeedback("Opening conversation");
          navigate(`/messages/new?user=${notification.payload.sender_id}`);
        } else {
          navigate('/messages');
        }
        break;
      
      case 'friend_request':
        showNavigationFeedback("Opening friend requests");
        navigate('/friends/requests');
        break;
      
      case 'friend_request_accepted':
      case 'friend_request_declined':
        if (notification.payload?.sender_id) {
          showNavigationFeedback("Opening profile");
          navigate(`/profile/${notification.payload.sender_id}`);
        } else {
          navigate('/friends');
        }
        break;
      
      // Plan notifications
      case 'plan_invite':
        if (notification.payload?.plan_id) {
          showNavigationFeedback("Opening plan invitation");
          navigate(`/plans/${notification.payload.plan_id}/invite`);
        }
        break;
      
      case 'plan_invite_accepted':
      case 'plan_invite_declined':
      case 'plan_comment_new':
      case 'plan_checkin':
      case 'plan_updated':
      case 'plan_reminder':
        if (notification.payload?.plan_id) {
          showNavigationFeedback("Opening plan");
          navigate(`/plans/${notification.payload.plan_id}`);
        } else {
          navigate('/plans');
        }
        break;
      
      case 'plan_cancelled':
        if (notification.payload?.plan_id) {
          showNavigationFeedback("Opening cancelled plan");
          navigate(`/plans/${notification.payload.plan_id}`);
        } else {
          navigate('/plans');
        }
        break;
      
      // Floq notifications
      case 'floq_invite':
        if (notification.payload?.floq_id) {
          showNavigationFeedback("Opening floq invitation");
          navigate(`/floqs/${notification.payload.floq_id}/invite`);
        }
        break;
      
      case 'floq_invite_accepted':
      case 'floq_invite_declined':
      case 'floq_reaction':
      case 'floq_reply':
      case 'floq_mention':
      case 'floq_joined':
      case 'floq_left':
        if (notification.payload?.floq_id) {
          showNavigationFeedback("Opening floq");
          // Navigate to specific message if available
          const messageParam = notification.payload?.message_id 
            ? `?message=${notification.payload.message_id}` 
            : '';
          navigate(`/floqs/${notification.payload.floq_id}${messageParam}`);
        } else {
          navigate('/floqs');
        }
        break;
      
      // Achievement & social notifications
      case 'achievement_unlocked':
        showNavigationFeedback("Opening achievements");
        navigate('/profile/achievements');
        break;
      
      case 'streak_milestone':
        showNavigationFeedback("Opening your stats");
        navigate('/profile/stats');
        break;
      
      case 'weekly_recap':
        showNavigationFeedback("Opening weekly recap");
        navigate('/recap/weekly');
        break;
      
      case 'afterglow_ready':
        if (notification.payload?.afterglow_id) {
          showNavigationFeedback("Opening afterglow");
          navigate(`/afterglow/${notification.payload.afterglow_id}`);
        } else if (notification.payload?.plan_id) {
          showNavigationFeedback("Opening plan afterglow");
          navigate(`/plans/${notification.payload.plan_id}/afterglow`);
        } else {
          navigate('/afterglows');
        }
        break;
      
      // Venue & location notifications
      case 'venue_suggestion':
      case 'popular_venue_alert':
        if (notification.payload?.venue_id) {
          showNavigationFeedback("Opening venue");
          navigate(`/venues/${notification.payload.venue_id}`);
        } else if (notification.payload?.coordinates) {
          showNavigationFeedback("Opening map");
          navigate(`/map?lat=${notification.payload.coordinates.lat}&lng=${notification.payload.coordinates.lng}`);
        } else {
          navigate('/venues');
        }
        break;
      
      case 'friend_nearby':
        if (notification.payload?.friend_id) {
          showNavigationFeedback("Opening friend's location");
          navigate(`/friends/${notification.payload.friend_id}/location`);
        } else {
          navigate('/map');
        }
        break;
      
      // System notifications
      case 'system_announcement':
        showNavigationFeedback("Opening announcement");
        navigate('/announcements');
        break;
      
      case 'feature_update':
        showNavigationFeedback("Opening updates");
        navigate('/updates');
        break;
      
      default:
        // For unknown notification types, try to navigate based on available payload data
        if (notification.payload?.plan_id) {
          navigate(`/plans/${notification.payload.plan_id}`);
        } else if (notification.payload?.floq_id) {
          navigate(`/floqs/${notification.payload.floq_id}`);
        } else if (notification.payload?.thread_id) {
          navigate(`/messages/${notification.payload.thread_id}`);
        } else {
          console.log('No specific action for notification type:', notification.kind);
          // Show a generic feedback message
          toast({
            title: "Notification opened",
            description: "This notification has been marked as read",
            duration: 3000,
          });
        }
        break;
    }
  };

  return {
    handleNotificationTap
  };
};