export const renderClusterTooltip = (cluster: any): string => {
  if (!cluster) return '';
  
  const vibeEntries = Object.entries(cluster.vibe_counts || {})
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([vibe, count]) => `${vibe}: ${count}`)
    .join(', ');

  return [
    '<div class="bg-background/90 backdrop-blur-sm border rounded-lg p-3 shadow-lg">',
    `<div class="font-semibold">${cluster.member_count || cluster.total} people</div>`,
    cluster.vibe_mode ? `<div class="text-sm font-medium">${cluster.vibe_mode}</div>` : '',
    `<div class="text-sm text-muted-foreground">${vibeEntries}</div>`,
    '</div>'
  ].join('');
};