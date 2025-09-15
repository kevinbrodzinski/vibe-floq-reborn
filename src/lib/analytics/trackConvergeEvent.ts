/**
 * Analytics helper for converge events - properly typed for consistent tracking
 */
export function trackConvergeEvent(event: string, data: Record<string, any>) {
  window.dispatchEvent(new CustomEvent(`ui_${event}`, { detail: data }));
}

/**
 * Track banner interactions
 */
export function trackBannerAction(action: string, friendId: string, metadata?: Record<string, any>) {
  trackConvergeEvent('banner_action', { 
    action, 
    friendId, 
    timestamp: Date.now(),
    ...metadata 
  });
}

/**
 * Track converge prefill events
 */
export function trackConvergePrefill(friendId: string, venueId?: string) {
  trackConvergeEvent('converge_prefill', { 
    friendId, 
    venueId,
    reason: 'friend_current_venue',
    timestamp: Date.now()
  });
}