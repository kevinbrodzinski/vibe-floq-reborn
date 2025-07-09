import { FloqTab } from '@/store/useActiveTab';

const titles: Record<FloqTab, string> = {
  field: 'Field · Floq',
  floqs: 'Floqs · Floq',
  pulse: 'Pulse · Floq',
  vibe: 'Vibe · Floq',
  afterglow: 'Afterglow · Floq',
  plan: 'Plan · Floq',
};

export const setDocumentTitle = (tab: FloqTab) => {
  document.title = titles[tab] || 'Floq';
};