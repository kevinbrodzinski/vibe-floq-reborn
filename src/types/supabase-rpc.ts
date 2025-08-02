// Type extensions for Supabase RPC functions used in push notifications

export interface StorePushTokenArgs {
  p_device_id: string;
  p_token: string;
  p_platform: string;
}

export interface ResetBadgeArgs {
  // No arguments for reset_badge
}