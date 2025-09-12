import { endRally } from '@/lib/api/rally';

export async function endRallyWithAfterglow(rallyId: string) {
  return await endRally(rallyId);
}