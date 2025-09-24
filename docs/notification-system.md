# Notification System Documentation

## Overview

The notification system provides real-time notifications for various events in the application, including direct messages, friend requests, plan invitations, and more. It consists of both in-app notifications (toasts) and browser push notifications.

## Architecture

### Database Schema

The notification system uses the `event_notifications` table with the following structure:

```sql
CREATE TABLE event_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES auth.users(id),
  kind TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  seen_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
);
```

### Notification Types

The system supports the following notification types:

- `dm` - Direct messages
- `friend_request` - New friend requests
- `friend_request_accepted` - Friend request accepted
- `friend_request_declined` - Friend request declined
- `plan_invite` - Plan invitations
- `plan_invite_accepted` - Plan invitation accepted
- `plan_invite_declined` - Plan invitation declined
- `floq_invite` - Floq invitations
- `floq_invite_accepted` - Floq invitation accepted
- `floq_invite_declined` - Floq invitation declined
- `plan_comment_new` - New plan comments
- `plan_checkin` - Plan check-ins
- `floq_reaction` - Floq message reactions
- `floq_reply` - Floq message replies

## Components

### 1. EventNotificationsProvider

The main provider that manages notification state and real-time subscriptions.

**Features:**
- Loads initial unseen notifications
- Subscribes to real-time notification updates
- Provides methods to mark notifications as seen
- Manages notification counts

**Usage:**
```tsx
import { useEventNotifications } from '@/providers/EventNotificationsProvider';

const { unseen, markAsSeen, markAllSeen } = useEventNotifications();
```

### 2. NotificationsSheet

A slide-out sheet that displays all notifications.

**Features:**
- Shows notification list with icons and timestamps
- Allows marking individual notifications as read
- Provides "Mark all read" functionality
- Handles notification navigation

### 3. NotificationBell

A bell icon component that shows the unread notification count.

**Features:**
- Real-time badge count updates
- Accessibility features
- Click handler for opening notifications

### 4. NotificationsList

The main component that renders the list of notifications.

**Features:**
- Visual notification icons based on type
- Color-coded notification categories
- Time stamps with relative formatting
- Click-to-navigate functionality

### 5. NotificationPermissionRequest

A component that requests browser notification permissions.

**Features:**
- Automatic permission detection
- User-friendly permission request UI
- Persistent dismissal state

## Hooks

### useNotifications

Central hook that manages real-time notification listening and toast display.

**Features:**
- Subscribes to new notifications
- Shows toast notifications
- Triggers push notifications
- Handles badge reset functionality

### useNotificationActions

Handles navigation actions when notifications are tapped.

**Features:**
- Routes to appropriate screens based on notification type
- Marks notifications as seen
- Handles different payload structures

### usePushToken

Manages push notification token registration.

**Features:**
- Requests notification permissions
- Stores device tokens
- Handles platform-specific logic

### useBadgeReset

Resets notification badges when the app becomes visible.

**Features:**
- Listens for visibility changes
- Resets server-side badge counts
- Handles focus events

## Push Notification Service

The `pushNotificationService` provides a unified interface for browser push notifications.

**Features:**
- Permission management
- Notification display
- Action handling
- Service worker integration

**Usage:**
```tsx
import { pushNotificationService } from '@/lib/pushNotifications';

// Request permission
const granted = await pushNotificationService.requestPermission();

// Show notification
await pushNotificationService.showNotification({
  title: 'New Message',
  body: 'You have a new message from John',
  tag: 'dm',
  data: { action: 'open_dm', thread_id: '123' }
});
```

## Database Triggers

### DM Notifications

Automatically creates notifications when new direct messages are sent:

```sql
CREATE TRIGGER trg_dm_notify
AFTER INSERT ON public.direct_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_dm();
```

### Friend Request Notifications

Triggers notifications for friend request status changes:

```sql
CREATE TRIGGER trg_friend_request_notify
AFTER INSERT OR UPDATE ON public.friend_requests
FOR EACH ROW EXECUTE FUNCTION public.fn_notify_friend_request();
```

## Setup Instructions

1. **Wrap your app with providers:**

```tsx
import { EventNotificationsProvider } from '@/providers/EventNotificationsProvider';

function App() {
  return (
    <EventNotificationsProvider>
      {/* Your app components */}
    </EventNotificationsProvider>
  );
}
```

2. **Initialize notification hooks:**

```tsx
import { useNotifications } from '@/hooks/useNotifications';

function YourComponent() {
  useNotifications(); // Initialize notification listening
  return <div>Your content</div>;
}
```

3. **Add notification UI components:**

```tsx
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { NotificationsSheet } from '@/components/notifications/NotificationsSheet';

function Header() {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header>
      <NotificationBell onClick={() => setShowNotifications(true)} />
      <NotificationsSheet 
        open={showNotifications} 
        onOpenChange={setShowNotifications} 
      />
    </header>
  );
}
```

## Best Practices

1. **Always mark notifications as seen** when users interact with them
2. **Use semantic notification types** for consistent handling
3. **Provide fallback UI** for when notifications fail to load
4. **Respect user preferences** for push notifications
5. **Handle offline scenarios** gracefully
6. **Test across different browsers** for push notification compatibility

## Troubleshooting

### Common Issues

1. **Notifications not appearing:**
   - Check if user is authenticated
   - Verify database triggers are active
   - Ensure EventNotificationsProvider is wrapping the app

2. **Push notifications not working:**
   - Verify browser support
   - Check if permission was granted
   - Ensure service worker is registered

3. **Badge counts incorrect:**
   - Check if badge reset hooks are active
   - Verify real-time subscriptions are working
   - Check for console errors in notification handling

### Debug Mode

Enable debug logging by setting the environment variable:
```bash
VITE_DEBUG_NOTIFICATIONS=true
```

This will provide additional console logging for notification events and state changes.