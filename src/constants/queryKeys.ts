export const QK = {
  Spark: (id: string) => ['spark', 'v_friend_sparkline', 'v1', id] as const,
  VenueInsights: ['venue-insights'] as const,
  ProfileStats: (userId: string) => ['profile-stats', userId] as const,
  AnnualRecap: ['annual-recap'] as const,
} as const;