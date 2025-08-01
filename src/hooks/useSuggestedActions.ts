export interface SuggestedAction {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  primary?: boolean;
}

export const useSuggestedActions = () => {
  const actions: SuggestedAction[] = [
    {
      id: 'venues',
      title: '3 venues match your vibe',
      subtitle: '2 in West Hollywood · 1 in DTLA',
      cta: 'Explore Pulse',
      primary: true,
    },
    {
      id: 'floq',
      title: '"Friday Flow" Floq nearby',
      subtitle: '6 people · 0.3 mi away',
      cta: 'Request Invite',
    },
  ];
  return { actions };
};