import { useFriendDrawer } from '@/contexts/FriendDrawerContext';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useNearbyPeople } from '@/hooks/useNearbyPeople';
import { FriendCard } from '@/components/social/FriendCard';
import { Loader2 } from 'lucide-react';
export const FriendDrawer = () => {
  const {
    open
  } = useFriendDrawer();
  const {
    pos
  } = useUserLocation();
  const {
    people,
    loading
  } = useNearbyPeople(pos?.lat, pos?.lng, 12);
  return null;
};