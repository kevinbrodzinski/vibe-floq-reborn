import type { Vibe } from '@/types/vibes'

// Floq-specific analytics event types
export type PosthogEvent =
  | { name: 'Recap Seen'; props: { date: string } }

  // Planning
  | { name: 'Plan Created'; props: { stopCount: number; invitedCount: number; floqId?: string } }
  | { name: 'Stop Added'; props: { venueId: string; timeSlot: string } }
  | { name: 'Stop Removed'; props: { venueId: string; reason?: string } }
  | { name: 'Stop Reordered'; props: { fromIndex: number; toIndex: number } }
  | { name: 'Vote Cast'; props: { stopId: string; vote: number } }

  // Invites & RSVP
  | { name: 'Invite Sent'; props: { toUserId: string; planId: string } }
  | { name: 'Invite Accepted'; props: { userId: string; planId: string } }
  | { name: 'Invite Declined'; props: { userId: string; planId: string } }

  // Execution
  | { name: 'Check-In'; props: { venueId: string; planId: string; auto?: boolean } }
  | { name: 'Plan Finalized'; props: { stopCount: number; finalizedBy: string } }
  | { name: 'Execution Started'; props: { planId: string } }
  | { name: 'Execution Completed'; props: { planId: string; durationMin: number } }

  // Vibes
  | { name: 'Vibe Selected'; props: { vibe: Vibe; auto: boolean } }
  | { name: 'Vibe Changed'; props: { from: Vibe; to: Vibe } }

  // Afterglow
  | { name: 'Afterglow Submitted'; props: { planId: string; moodScore: number; shared: boolean } }
  | { name: 'Afterglow Viewed'; props: { planId: string } }

  // Social
  | { name: 'Friend Added'; props: { friendId: string } }
  | { name: 'Floq Joined'; props: { floqId: string } }
  | { name: 'Floq Left'; props: { floqId: string; reason?: string } }

  // Nova
  | { name: 'Nova Opened'; props: { context: 'feed' | 'plan' | 'afterglow' } }
  | { name: 'Nova Suggestion Used'; props: { type: 'stop' | 'time'; source: string } }

  // Error or edge
  | { name: 'Error Encountered'; props: { message: string; stack?: string; screen?: string } };