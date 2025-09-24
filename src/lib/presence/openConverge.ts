type LngLat = { lng: number; lat: number };

function getAnchor(): LngLat | null {
  return (window as any)?.floq?.myLocation ?? null;
}

function getFriendLL(friendId: string): {
  lngLat?: LngLat;
  energy01?: number;
  direction?: 'up' | 'down' | 'flat';
  name?: string;
} | null {
  const entry = (window as any)?.floq?.friendsIndex?.[friendId];
  return entry ?? null;
}

/** Returns true if we fired the event. */
export function openConvergeForFriend(friendId: string): boolean {
  const anchor = getAnchor();
  const fr = getFriendLL(friendId);
  if (!fr?.lngLat) return false;

  window.dispatchEvent(
    new CustomEvent('converge:open', {
      detail: {
        peer: {
          id: friendId,
          lngLat: fr.lngLat,
          energy01: fr.energy01,
          direction: fr.direction,
        },
        anchor,
      },
    })
  );
  return true;
}

export function canConverge(friendId: string): boolean {
  const anchor = getAnchor();
  const fr = getFriendLL(friendId);
  return Boolean(anchor && fr?.lngLat);
}