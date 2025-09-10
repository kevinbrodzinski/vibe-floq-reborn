import { useUnreadBadgeRealtime } from "@/hooks/useUnreadBadgeRealtime";
import { useCurrentProfileId } from "@/hooks/useCurrentUser";
import { usePresenceTracker } from '@/hooks/usePresenceTracker';
import { ToastProvider } from "@/components/system/toast/useToast";
import { useNotificationToasts } from "@/lib/notifications/useNotificationToasts";

function PresenceHeartbeatMount() {
  // Sends periodic heartbeats to user_online_status.
  // No props; safe to mount once at app root.
  usePresenceTracker();
  return null;
}

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
  const currentProfileId = useCurrentProfileId();
  
  // Enable global realtime subscription for unread badges
  // Hook already guards against undefined profileId internally
  useUnreadBadgeRealtime(currentProfileId);
  
  // Enable realtime notification toasts for friend pings
  useNotificationToasts(currentProfileId);

  return (
    <ToastProvider>
      {/* Global online presence heartbeat */}
      <PresenceHeartbeatMount />
      {children}
    </ToastProvider>
  );
};