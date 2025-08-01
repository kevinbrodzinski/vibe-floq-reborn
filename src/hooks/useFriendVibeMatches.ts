export interface FriendMatch {
  id: string;
  name: string;
  avatar: string;
  match: number;  // 0-1
  location: string;
}

export const useFriendVibeMatches = () => {
  const data: FriendMatch[] = [
    {
      id: 'kai',
      name: 'Kai',
      avatar: 'https://i.pravatar.cc/72?u=kai',
      match: 0.92,
      location: 'Silver Lake',
    },
    {
      id: 'jo',
      name: 'Jo',
      avatar: 'https://i.pravatar.cc/72?u=jo',
      match: 0.78,
      location: 'Downtown LA',
    },
  ];
  return { data };
};