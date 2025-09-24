import type { FloqKind, LivingFloqData } from "@/components/Floqs/LivingFloqCard";

/**
 * Infer floq kind from database row data
 */
export function inferFloqKind(item: any): FloqKind {
  // Check for explicit type field first
  if (item.floq_type || item.kind || item.type) {
    const type = (item.floq_type || item.kind || item.type).toLowerCase();
    if (['friend', 'club', 'business', 'momentary'].includes(type)) {
      return type as FloqKind;
    }
  }
  
  // Infer from other properties
  if (item.ttl_seconds || item.expires_at) {
    return "momentary";
  }
  
  if (item.org_id || item.business_id || item.is_business) {
    return "business";
  }
  
  if (item.is_public === false || item.privacy === "invite" || item.member_count > 50) {
    return "club";
  }
  
  // Default to friend for small, private groups
  return "friend";
}

/**
 * Transform database row to LivingFloqData
 */
export function transformToLivingFloqData(item: any): LivingFloqData {
  const kind = inferFloqKind(item);
  
  return {
    id: item.id,
    name: item.name || item.title || "Untitled Floq",
    description: item.description,
    kind,
    vibe: item.primary_vibe || item.vibe || "social",
    privacy: item.privacy,
    
    // Basic metrics
    members: item.member_count || 0,
    activeNow: item.active_now || item.live_count || 0,
    convergenceNearby: item.converging_nearby || 0,
    
    // Energy & engagement
    energy: Math.max(0, Math.min(1, item.energy || item.activity_score / 100 || 0.5)),
    activityScore: item.activity_score || 0,
    
    // Contextual data
    next: item.next_label ? {
      label: item.next_label,
      when: item.next_when || "TBA"
    } : undefined,
    ttlSeconds: item.ttl_seconds,
    distanceLabel: item.distance_label,
    
    // Type-specific
    matchPct: item.match_pct,
    following: item.following || item.is_following,
    streakWeeks: item.streak_weeks,
    
    // Real-time indicators
    lastActivity: item.last_activity_at,
    trendingUp: item.trending_up || item.growth_rate > 0,
    recentMessages: item.recent_messages || item.unread_count || 0,
    
    created_at: item.created_at
  };
}

/**
 * Generate mock enhanced data for development
 */
export function enhanceFloqWithMockData(item: any): LivingFloqData {
  const base = transformToLivingFloqData(item);
  const kind = base.kind;
  
  // Add some realistic mock data based on kind
  switch (kind) {
    case "friend":
      return {
        ...base,
        energy: 0.3 + Math.random() * 0.4, // 0.3-0.7
        activeNow: Math.floor(Math.random() * 3) + (base.members > 0 ? 1 : 0),
        convergenceNearby: Math.random() > 0.7 ? Math.floor(Math.random() * 2) + 1 : 0,
        streakWeeks: Math.random() > 0.6 ? Math.floor(Math.random() * 12) + 1 : undefined,
        next: Math.random() > 0.5 ? {
          label: ["Coffee @ Blue Bottle", "Dinner @ Nobu", "Beach volleyball"][Math.floor(Math.random() * 3)],
          when: ["Tonight 7:30", "Tomorrow 6pm", "This weekend"][Math.floor(Math.random() * 3)]
        } : undefined,
        recentMessages: Math.floor(Math.random() * 5),
        trendingUp: Math.random() > 0.7
      };
      
    case "club":
      return {
        ...base,
        energy: 0.6 + Math.random() * 0.3, // 0.6-0.9
        activeNow: Math.floor(Math.random() * 8) + 2,
        matchPct: 0.6 + Math.random() * 0.35, // 60-95%
        next: {
          label: ["Weekly meetup", "Special event", "Guest speaker"][Math.floor(Math.random() * 3)],
          when: ["Thursday 7pm", "Next week", "Tomorrow"][Math.floor(Math.random() * 3)]
        },
        distanceLabel: `${(Math.random() * 2 + 0.1).toFixed(1)} mi`,
        trendingUp: Math.random() > 0.5
      };
      
    case "business":
      return {
        ...base,
        energy: 0.4 + Math.random() * 0.4, // 0.4-0.8
        following: Math.random() > 0.3,
        next: Math.random() > 0.4 ? {
          label: ["Happy hour", "New menu", "Live music"][Math.floor(Math.random() * 3)],
          when: ["Today 5-7pm", "Starting Monday", "Tonight 8pm"][Math.floor(Math.random() * 3)]
        } : undefined,
        distanceLabel: `${(Math.random() * 5 + 0.1).toFixed(1)} mi`
      };
      
    case "momentary":
      return {
        ...base,
        energy: 0.8 + Math.random() * 0.2, // 0.8-1.0
        ttlSeconds: Math.floor(Math.random() * 1800) + 300, // 5-35 minutes
        activeNow: Math.floor(Math.random() * 15) + 3,
        convergenceNearby: Math.floor(Math.random() * 5) + 1,
        distanceLabel: `${(Math.random() * 0.5 + 0.05).toFixed(1)} mi`,
        trendingUp: true
      };
      
    default:
      return base;
  }
}