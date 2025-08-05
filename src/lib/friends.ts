
import { supabase } from '@/integrations/supabase/client';

interface FriendRequestResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function sendFriendRequest(profileId: string): Promise<FriendRequestResponse> {
  try {
    const { data, error } = await supabase.rpc('send_friend_request', {
      _target: profileId
    });

    if (error) {
      console.error('Error sending friend request:', error);
      return { success: false, error: error.message };
    }

    // Type guard for the response
    const response = data as unknown;
    if (typeof response === 'object' && response !== null) {
      const result = response as Record<string, any>;
      if ('success' in result && typeof result.success === 'boolean') {
        return {
          success: result.success,
          message: result.message || 'Friend request sent successfully',
          error: result.error
        };
      }
    }

    // Fallback for successful response
    return { success: true, message: 'Friend request sent successfully' };
  } catch (error: any) {
    console.error('Network error sending friend request:', error);
    return { success: false, error: error.message || 'Network error occurred' };
  }
}

export async function acceptFriendRequest(requestId: string): Promise<FriendRequestResponse> {
  try {
    const { data, error } = await supabase.rpc('accept_friend_request', {
      _friend: requestId
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Type guard for the response
    const response = data as unknown;
    if (typeof response === 'object' && response !== null) {
      const result = response as Record<string, any>;
      if ('success' in result && typeof result.success === 'boolean') {
        return {
          success: result.success,
          message: result.message || 'Friend request accepted',
          error: result.error
        };
      }
    }

    return { success: true, message: 'Friend request accepted' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
