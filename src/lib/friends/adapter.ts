/**
 * Friends adapter for onboarding
 * Provides dev fixtures and production contact import
 */

export type Friend = { id: string; name: string; initials: string };

export interface FriendsAdapter {
  findExisting(): Promise<Friend[]>;
}

export const devFriendsAdapter: FriendsAdapter = {
  async findExisting() {
    if (process.env.NODE_ENV !== 'development') return [];
    return [
      { id: '1', name: 'Sarah', initials: 'S' },
      { id: '2', name: 'Tom', initials: 'T' },
      { id: '3', name: 'Alex', initials: 'A' },
      { id: '4', name: 'Kai', initials: 'K' },
      { id: '5', name: 'Maya', initials: 'M' },
      { id: '6', name: 'Zoe', initials: 'Z' },
      { id: '7', name: 'Leo', initials: 'L' },
      { id: '8', name: 'Noa', initials: 'N' },
    ];
  },
};
