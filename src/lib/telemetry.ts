// Global telemetry functions for production monitoring
export const telemetry = {
  pingFriendsRequest: (profileId: string, recipientCount: number) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'ping_friends_request', {
        profile_id: profileId,
        recipient_count: recipientCount,
      });
    }
    console.log('[Telemetry] ping_friends_request', { profileId, recipientCount });
  },

  pushDeliverAttempt: (expo: number, fcm: number, apns: number, failures: number) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'push_deliver_attempt', {
        expo_count: expo,
        fcm_count: fcm,
        apns_count: apns,
        failure_count: failures,
      });
    }
    console.log('[Telemetry] push_deliver_attempt', { expo, fcm, apns, failures });
  },

  convergenceOpenFromNotification: (etaMin: number, prob: number, success: boolean) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'convergence_open_from_notification', {
        eta_min: etaMin,
        probability: prob,
        success: success,
      });
    }
    console.log('[Telemetry] convergence_open_from_notification', { etaMin, prob, success });
  },
};