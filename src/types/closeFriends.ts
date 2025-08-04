export interface CloseFriend {
  friend_id: string;
  friend_name: string;
  friend_avatar_url: string | null;
  friendship_created_at: string;
  close_since: string | null;
}

export interface CloseFriendsState {
  closeFriends: CloseFriend[];
  isLoading: boolean;
  error: string | null;
}

export interface FriendshipWithCloseStatus {
  user_low: string;
  user_high: string;
  friend_state: 'pending' | 'accepted' | 'blocked' | 'close';
  is_close: boolean;
  created_at: string;
  responded_at: string | null;
}

export interface CloseFriendsFilter {
  showCloseFriendsOnly: boolean;
  includeInCloseFriendsContent: boolean;
}

export interface CloseFriendsPrivacySettings {
  allowCloseFriendsToSeeMyLocation: boolean;
  allowCloseFriendsToSeeMyActivity: boolean;
  allowCloseFriendsToSeeMyPlans: boolean;
  notifyWhenAddedAsCloseFriend: boolean;
}

// API response types
export interface ToggleCloseFriendResponse {
  success: boolean;
  is_close: boolean;
  message?: string;
}

export interface CloseFriendsListResponse {
  data: CloseFriend[];
  count: number;
}

// UI Component Props
export interface CloseFriendToggleProps {
  friendId: string;
  friendName: string;
  isCloseFriend: boolean;
  onToggle: (friendId: string, isCloseFriend: boolean) => Promise<void>;
  disabled?: boolean;
}

export interface CloseFriendsListProps {
  onSelectFriend?: (friend: CloseFriend) => void;
  showActions?: boolean;
  maxDisplay?: number;
}

export interface CloseFriendsPrivacyControlProps {
  settings: CloseFriendsPrivacySettings;
  onSettingsChange: (settings: CloseFriendsPrivacySettings) => void;
}

// Content filtering types
export interface ContentVisibility {
  isPublic: boolean;
  isCloseFriendsOnly: boolean;
  allowedUserIds?: string[];
}

export interface CloseFriendsContent {
  id: string;
  content: string;
  author_id: string;
  visibility: ContentVisibility;
  created_at: string;
  close_friends_only: boolean;
}

// Validation functions
export const isCloseFriend = (friendship: FriendshipWithCloseStatus): boolean => {
  return friendship.friend_state === 'accepted' && friendship.is_close;
};

export const canViewCloseFriendsContent = (
  content: CloseFriendsContent,
  currentUserId: string,
  userCloseFriends: string[]
): boolean => {
  // Author can always see their own content
  if (content.author_id === currentUserId) {
    return true;
  }

  // Public content is visible to all
  if (content.visibility.isPublic && !content.close_friends_only) {
    return true;
  }

  // Close friends only content
  if (content.close_friends_only || content.visibility.isCloseFriendsOnly) {
    return userCloseFriends.includes(content.author_id);
  }

  // Specific user allowlist
  if (content.visibility.allowedUserIds) {
    return content.visibility.allowedUserIds.includes(currentUserId);
  }

  return false;
};