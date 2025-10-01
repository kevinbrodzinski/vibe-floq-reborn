/**
 * Z-Index hierarchy for FLOQ overlay elements
 * 
 * Vertical Layout (top to bottom):
 * - 16px: LensSwitcher (z-700) - primary navigation, always visible
 * - 72px: FlowExploreChips (z-660) - only in explore mode
 * - 72px: FlowRetraceHUD (z-610) - only during retrace
 * - 72px: SocialWeatherStatus (z-560) - conditional weather info
 * - 72px: ConvergenceNotificationSystem (z-610) - convergence alerts
 * - 120px: LensStatusHUD (z-560, left) - lens context info
 * - 120px: PatternLearningIndicator (z-50, right) - learning feedback
 * 
 * Z-Index layers (top to bottom):
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