// Shared onboarding constants to prevent drift between components

export type StepId =
  | 'welcome'
  | 'profile'
  | 'vibe'
  | 'permissions'
  | 'privacy'
  | 'nudges'
  | 'complete';

export const CURRENT_ONBOARDING_VERSION = 'v3' as const;

export const STEP_SEQUENCE: StepId[] = [
  'welcome',
  'profile',
  'vibe',
  'permissions',
  'privacy',
  'nudges',
  'complete',
];

export const FINAL_STEP_INDEX = STEP_SEQUENCE.length - 1;

export const ONBOARDING_CONFLICT_COLUMNS = 'profile_id';
