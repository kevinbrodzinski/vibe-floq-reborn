import { useAuth } from './useAuth';

export function useCurrentUserId(): string | undefined {
  const { user } = useAuth();
  return user?.id;
}

export const useCurrentProfileId = () => {
  const { user } = useAuth();
  return user?.id; // This is the profile_id in our database
};