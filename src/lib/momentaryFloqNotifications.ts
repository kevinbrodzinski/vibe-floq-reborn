import { supabase } from '@/integrations/supabase/client';

export interface NotificationPayload {
  friend_id?: string;
  friend_name?: string;
  floq_id?: string;
  floq_title?: string;
  venue_id?: string;
  venue_name?: string;
  lat?: number;
  lng?: number;
  distance_m?: number;
}

export async function notifyFriendStartedFloq(params: {
  creatorId: string;
  creatorName: string;
  floqId: string;
  floqTitle: string;
  venueId?: string;
  venueName?: string;
  lat: number;
  lng: number;
  friendIds: string[];
}) {
  const { creatorId, creatorName, floqId, floqTitle, venueId, venueName, lat, lng, friendIds } = params;

  try {
    // Send notification to all friends
    const notifications = friendIds.map(friendId => ({
      profile_id: friendId,
      kind: 'friend_started_floq_nearby',
      payload: {
        friend_id: creatorId,
        friend_name: creatorName,
        floq_id: floqId,
        floq_title: floqTitle,
        venue_id: venueId,
        venue_name: venueName,
        lat,
        lng,
      } as NotificationPayload
    }));

    const { error } = await supabase
      .from('event_notifications')
      .insert(notifications);

    if (error) {
      console.error('Failed to send friend started floq notifications:', error);
    } else {
      console.log(`✅ Sent ${notifications.length} friend started floq notifications`);
    }
  } catch (error) {
    console.error('Exception sending friend started floq notifications:', error);
  }
}

export async function notifyFriendJoinedFloq(params: {
  joinerId: string;
  joinerName: string;
  floqId: string;
  floqTitle: string;
  creatorId: string;
}) {
  const { joinerId, joinerName, floqId, floqTitle, creatorId } = params;

  try {
    const { error } = await supabase
      .from('event_notifications')
      .insert({
        profile_id: creatorId,
        kind: 'momentary_floq_friend_joined',
        payload: {
          friend_id: joinerId,
          friend_name: joinerName,
          floq_id: floqId,
          floq_title: floqTitle,
        } as NotificationPayload
      });

    if (error) {
      console.error('Failed to send friend joined floq notification:', error);
    } else {
      console.log('✅ Sent friend joined floq notification');
    }
  } catch (error) {
    console.error('Exception sending friend joined floq notification:', error);
  }
}

export async function notifyWaveActivityToFriends(params: {
  waveId: string;
  lat: number;
  lng: number;
  size: number;
  friendIds: string[];
  venueId?: string;
  venueName?: string;
}) {
  const { waveId, lat, lng, size, friendIds, venueId, venueName } = params;

  try {
    const notifications = friendIds.map(friendId => ({
      profile_id: friendId,
      kind: 'wave_activity_friend',
      payload: {
        wave_id: waveId,
        lat,
        lng,
        size,
        venue_id: venueId,
        venue_name: venueName,
      } as NotificationPayload
    }));

    const { error } = await supabase
      .from('event_notifications')
      .insert(notifications);

    if (error) {
      console.error('Failed to send wave activity notifications:', error);
    } else {
      console.log(`✅ Sent ${notifications.length} wave activity notifications`);
    }
  } catch (error) {
    console.error('Exception sending wave activity notifications:', error);
  }
}

export async function notifyNearbyMomentaryFloq(params: {
  floqId: string;
  floqTitle: string;
  venueId?: string;
  venueName?: string;
  lat: number;
  lng: number;
  distance: number;
  recipientId: string;
}) {
  const { floqId, floqTitle, venueId, venueName, lat, lng, distance, recipientId } = params;

  try {
    const { error } = await supabase
      .from('event_notifications')
      .insert({
        profile_id: recipientId,
        kind: 'momentary_floq_nearby',
        payload: {
          floq_id: floqId,
          floq_title: floqTitle,
          venue_id: venueId,
          venue_name: venueName,
          lat,
          lng,
          distance_m: distance,
        } as NotificationPayload
      });

    if (error) {
      console.error('Failed to send nearby momentary floq notification:', error);
    } else {
      console.log('✅ Sent nearby momentary floq notification');
    }
  } catch (error) {
    console.error('Exception sending nearby momentary floq notification:', error);
  }
}