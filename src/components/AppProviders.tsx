import { useUnreadBadgeRealtime } from "@/hooks/useUnreadBadgeRealtime";
import { useCurrentProfileId } from "@/hooks/useCurrentUser";

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
  const currentProfileId = useCurrentProfileId();
  
  // Enable global realtime subscription for unread badges
  // Hook already guards against undefined profileId internally
  useUnreadBadgeRealtime(currentProfileId);

  return <>{children}</>;
};