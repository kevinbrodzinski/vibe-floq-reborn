import * as React from 'react';
import { Star, Users, Zap } from 'lucide-react';
import {
  normalizeScoreToPercent,
  formatDistance,
  estimateWalkMinutes,
  estimateDriveMinutes,
  minToLabel,
  prettyCategory,
} from '@/utils/venueMetrics';

type BaseRow = {
  name: string;
  photo_url?: string | null;
  distance_m?: number | string | null;
  categories?: string[] | null;
  canonical_tags?: string[] | null;
  rating?: number | null;          // optional if you have it
  price_tier?: string | null;      // e.g. "$$"
  regulars_count?: number | null;  // optional
};

type Props = {
  row: BaseRow;
  // Whatever your personalization API returns; we'll normalize it.
  matchScore?: number | null; // 0–1, 0–5, or 0–100 — we handle it.
  tagline?: string;           // keep to a short sentence; we clamp to 1 line.
  className?: string;
};

export function VenueCard({ row, matchScore, tagline, className }: Props) {
  const matchPct = normalizeScoreToPercent(matchScore);

  const distance = formatDistance(row.distance_m);
  const walk = estimateWalkMinutes(row.distance_m);
  const drive = estimateDriveMinutes(row.distance_m);

  const primaryCategory =
    (row.categories?.[0] && prettyCategory(row.categories[0])) ||
    (row.canonical_tags?.[0] && prettyCategory(row.canonical_tags[0])) ||
    '';

  return (
    <div className={`w-full rounded-2xl bg-white/5 border border-white/10 p-3 md:p-4 flex gap-3 ${className ?? ''}`}>
      {/* Thumb */}
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/10">
        {row.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.photo_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 flex flex-col gap-1">
        {/* Top row: Name + Match */}
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 font-semibold text-base md:text-lg text-white truncate">
            {row.name}
          </div>

          {matchPct != null && (
            <div className="shrink-0 inline-flex items-center gap-1 rounded-full bg-yellow-500/15 border border-yellow-500/30 px-2.5 h-7">
              <Zap className="h-3.5 w-3.5 text-yellow-400" />
              <span className="text-xs font-medium text-yellow-200 whitespace-nowrap">
                {matchPct}% match
              </span>
            </div>
          )}
        </div>

        {/* Meta row: category • distance • walk • drive • rating • price */}
        <div className="text-xs text-white/70 whitespace-nowrap overflow-hidden text-ellipsis">
          {primaryCategory && <span>{primaryCategory}</span>}
          {distance && (
            <>
              {!!primaryCategory && <span> · </span>}
              <span>{distance}</span>
            </>
          )}
          {walk && (
            <>
              <span> · </span>
              <span>{minToLabel(walk)} walk</span>
            </>
          )}
          {drive && (
            <>
              <span> · </span>
              <span>{minToLabel(drive)} drive</span>
            </>
          )}
          {/* Optional rating & price if you have them on the row */}
          {/* {row.rating && (
            <>
              <span> · </span>
              <Star className="inline h-3 w-3 -mt-0.5" />
              <span>{row.rating.toFixed(1)}</span>
            </>
          )}
          {row.price_tier && (
            <>
              <span> · </span>
              <span>{row.price_tier}</span>
            </>
          )} */}
        </div>

        {/* Tagline (single line only) */}
        {tagline && (
          <div className="text-xs text-white/80 overflow-hidden text-ellipsis whitespace-nowrap">
            {tagline}
          </div>
        )}

        {/* Footer chips (optional) */}
        {row.regulars_count ? (
          <div className="mt-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/15 px-2 h-6 text-[11px] text-white/80">
              <Users className="h-3.5 w-3.5" />
              {row.regulars_count} regular{row.regulars_count === 1 ? '' : 's'}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}