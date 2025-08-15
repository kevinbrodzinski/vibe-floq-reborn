import { PlanStop } from '@/types/plan';

export type TimelineStopData = {
  id: string;
  start: Date;
  end: Date;
  title: string;
  subtitle?: string;
  status?: 'draft' | 'confirmed';
  venue?: { id?: string; name?: string; photoUrl?: string | null };
};

/**
 * Your DB stop → TimelineStopData
 * Handles common field names safely.
 */
export function mapPlanStop(s: PlanStop): TimelineStopData {
  // Accept several naming variants safely
  const start =
    (s as any).start_time ?? (s as any).start ?? (s as any).planned_start ?? null;
  const end =
    (s as any).end_time ?? (s as any).end ?? (s as any).planned_end ?? null;

  const startDate = start ? new Date(start) : new Date();
  const endDate = end ? new Date(end) : new Date(startDate.getTime() + 60 * 60000);

  return {
    id: (s as any).id ?? crypto.randomUUID(),
    start: startDate,
    end: endDate,
    title: (s as any).title ?? (s as any).name ?? 'Stop',
    subtitle:
      (s as any).description ??
      (s as any).notes ??
      (s as any).address ??
      undefined,
    status: ((s as any).status ?? (s as any).state ?? 'draft') as 'draft' | 'confirmed',
    venue: {
      id: (s as any).venue_id ?? undefined,
      name: (s as any).venue_name ?? (s as any).title ?? undefined,
      photoUrl:
        (s as any).photo_url ??
        (s as any).image_url ??
        (s as any).hero_url ??
        null,
    },
  };
}

export function mapPlanStops(stops: PlanStop[] = []): TimelineStopData[] {
  return (stops ?? []).map(mapPlanStop);
}