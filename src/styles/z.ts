/**
 * Z-Index hierarchy for FLOQ overlay elements
 * 
 * Top to bottom layering:
 * - critical (9999): NetworkStatusBanner - critical system alerts
 * - lens (700): LensSwitcher - primary navigation control
 * - chips (660): FlowExploreChips - contextual filter controls
 * - controls (640): Field controls (right side)
 * - bottom (620): EnhancedFlowHUD - bottom status display
 * - topNotification (610): FlowRetraceHUD, ConvergenceNotificationSystem
 * - cards (610): Field cards (bottom cards)
 * - over (600): General overlay content
 * - statusHud (560): LensStatusHUD, SocialWeatherStatus - status info
 * - learning (50): PatternLearningIndicator - background info
 */
export const z = {
  // Critical alerts (network status, errors)
  critical: 9999,
  
  // Top navigation & primary controls
  lens: 700,
  chips: 660,
  controls: 640,
  
  // Status & HUDs
  bottom: 620,
  topNotification: 610,
  statusHud: 560,
  
  // Content layers
  cards: 610,
  over: 600,
  
  // Background info
  learning: 50,
} as const;