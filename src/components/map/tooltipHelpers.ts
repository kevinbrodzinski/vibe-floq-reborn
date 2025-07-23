export const renderClusterTooltip = (cluster: any): string => {
  if (!cluster) return '';
  
  const vibeEntries = Object.entries(cluster.vibe_counts || {})
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([vibe, count]) => `${vibe}: ${count}`)
    .join(', ');

  return [
    `<div style="
      background: rgba(0,0,0,0.85);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      max-width: 200px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    ">`,
    `<div style="font-weight: 600; margin-bottom: 4px;">Cluster ${cluster.gh6}</div>`,
    `<div style="margin-bottom: 2px;">Total: ${cluster.total}</div>`,
    vibeEntries ? `<div>Top vibes: ${vibeEntries}</div>` : '',
    `</div>`
  ].filter(Boolean).join('');
};