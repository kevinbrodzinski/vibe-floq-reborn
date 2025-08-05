import { useUnreadBadgeRealtime } from "@/hooks/useUnreadBadgeRealtime";
import { useAuth } from "@/hooks/useAuth";

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  
  // Enable global realtime subscription for unread badges
  // Hook already guards against undefined userId internally
  useUnreadBadgeRealtime(user?.id);

  return <>{children}</>;
};