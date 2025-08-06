export const QK = {
  Spark: (id: string) => ['spark', 'v_friend_sparkline', 'v1', id] as const,
  VenueInsights: (ver = 'v1') => ['venue-insights', ver] as const,
  ProfileStats: (profileId: string, ver = 'v1') => ['profile-stats', profileId, ver] as const,
  AnnualRecap: (ver = 'v1') => ['annual-recap', ver] as const,
  
  // People Discovery Stack
  VibeBreakdown: (me: string, other: string) => ['vibe-breakdown', me, other] as const,
  CommonVenues: (me: string, other: string) => ['common-venues', me, other] as const,
  PlanSuggestions: (me: string, other: string, limit: number) => ['plan-suggestions', me, other, limit] as const,
  CrossedPathsStats: (me: string, other: string) => ['crossed-paths-stats', me, other] as const,
} as const;