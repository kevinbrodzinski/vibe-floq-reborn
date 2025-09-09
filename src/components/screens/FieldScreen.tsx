import { DevControls } from "@/components/dev/DevControls";
import { FieldDataProvider } from "./field/FieldDataProvider";
import { FieldLayout } from "./field/FieldLayout";
import { FieldGestureProvider } from "./field/FieldGestureProvider";
import { FieldUIProvider } from "@/components/field/contexts/FieldUIContext";
import { FieldLocationProvider } from "@/components/field/contexts/FieldLocationContext";
import { FieldSocialProvider } from "@/components/field/contexts/FieldSocialContext";
import { SocialWeatherProvider } from "@/components/field/contexts/SocialWeatherContext";
import { FieldLensProvider } from "@/components/field/FieldLensProvider";
import { useSyncedVisibility } from "@/hooks/useSyncedVisibility";
import { useUnifiedFriends } from "@/hooks/useUnifiedFriends";
import { useAutoDiscoveryNotifications } from "@/hooks/useAutoDiscoveryNotifications";
import { useFieldLocation } from "@/components/field/contexts/FieldLocationContext";

export const FieldScreen = () => {
  useSyncedVisibility(); // Sync visibility across app and devices
  const { rows: friends } = useUnifiedFriends();
  
  // Extract friend IDs for the location provider
  const friendIds = friends.map(friend => friend.id);
  
  // Convert friends to profiles format for the social provider
  const profiles = friends.map(friend => ({
    id: friend.id,
    username: friend.username || '',
    display_name: friend.display_name || friend.username || 'Unknown',
    avatar_url: friend.avatar_url,
    bio: null // UnifiedRow doesn't have bio property
  }));

  return (
    <FieldLensProvider>
      <SocialWeatherProvider>
        <FieldDataProvider>
          <FieldUIProvider>
            <FieldLocationProvider friendIds={friendIds}>
              <FieldSocialProvider profiles={profiles}>
                <FieldGestureProvider>
                  <FieldLayout />
                  <DevControls />
                </FieldGestureProvider>
              </FieldSocialProvider>
            </FieldLocationProvider>
          </FieldUIProvider>
        </FieldDataProvider>
      </SocialWeatherProvider>
    </FieldLensProvider>
  );
};