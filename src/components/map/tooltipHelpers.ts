import { vibeEmoji } from '@/utils/vibe';

export const renderClusterTooltip = (cluster: any): string => {
  if (!cluster) return '';
  
  // Get top 3 vibes with emojis
  const vibeEntries = Object.entries(cluster.vibe_counts || {})
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([vibe, count]) => `${vibeEmoji(vibe)} ${vibe}: ${count}`)
    .join('<br/>');

  // Get dominant vibe with emoji
  const dominantVibe = cluster.vibe_mode 
    ? `${vibeEmoji(cluster.vibe_mode)} ${cluster.vibe_mode}`
    : null;

  return [
    `<div style="
      background: rgba(0,0,0,0.85);
      color: white;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 12px;
      max-width: 220px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      line-height: 1.4;
    ">`,
    `<div style="font-weight: 600; margin-bottom: 6px; color: #fff;">📍 Cluster ${cluster.gh6}</div>`,
    `<div style="margin-bottom: 4px; font-weight: 500;">👥 ${cluster.member_count || cluster.total} people</div>`,
    dominantVibe ? `<div style="margin-bottom: 4px; padding: 2px 6px; background: rgba(255,255,255,0.1); border-radius: 4px; font-size: 11px;"><strong>Dominant:</strong> ${dominantVibe}</div>` : '',
    vibeEntries ? `<div style="font-size: 11px; color: #ccc; margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.2);">${vibeEntries}</div>` : '',
    `</div>`
  ].filter(Boolean).join('');
};