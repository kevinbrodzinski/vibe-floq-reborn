import React, { useState } from 'react';
import { getVibeToken } from '@/lib/tokens/vibeTokens';
import type { TileVenue } from '@/lib/api/mapContracts';

interface ExploreDrawerProps {
  venues: TileVenue[];
  onJoin: (pid: string) => void;
  onSave: (pid: string) => void;
  onPlan: (pid: string) => void;
  onChangeVenue: (pid: string) => void;
}

export function ExploreDrawer({
  venues,
  onJoin,
  onSave,
  onPlan,
  onChangeVenue,
}: ExploreDrawerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const t = getVibeToken('social' as any);
  const primary = venues?.[0];

  if (!primary) return null;

  return (
    <>
      {/* Tap-to-open pill */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="fixed left-4 right-4 bottom-28 z-[420] px-4 py-3 rounded-2xl text-left backdrop-blur transition-all duration-300 hover:scale-[1.02]"
          style={{
            background: t.bg,
            border: `1px solid ${t.ring}`,
            boxShadow: `0 0 24px ${t.glow}`,
          }}
        >
          <div className="text-white/90 text-sm font-semibold truncate">
            {primary.name}
          </div>
          <div className="text-green-300/90 text-xs">
            {primary.open_now ? 'LIVE' : 'Open'}
            {primary.busy_band && primary.busy_band > 2 && ' • Busy'}
          </div>
        </button>
      )}

      {/* Bottom sheet */}
      {isExpanded && (
        <div
          className="fixed left-0 right-0 bottom-0 z-[600] px-4 pt-3 pb-6 animate-in slide-in-from-bottom duration-300"
          style={{
            background: 'rgba(12,16,26,0.95)',
            borderTop: '1px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(12px)',
          }}
          role="dialog"
          aria-label="Explore"
        >
          <div className="mx-auto max-w-[520px]">
            {/* Handle bar */}
            <div className="flex justify-center mb-3">
              <button
                onClick={() => setIsExpanded(false)}
                className="w-12 h-1 bg-white/30 rounded-full"
                aria-label="Collapse"
              />
            </div>

            {/* Primary venue card */}
            <div
              className="rounded-xl p-4 mb-3 transition-all duration-200"
              style={{
                background: t.bg,
                border: `1px solid ${t.ring}`,
              }}
            >
              <div className="text-white/90 text-sm font-semibold truncate mb-2">
                {primary.name}
              </div>
              <div className="text-white/70 text-xs mb-3">
                {primary.category && (
                  <span className="capitalize">{primary.category}</span>
                )}
                {primary.open_now && (
                  <span className="text-green-300/90"> • Open now</span>
                )}
                {primary.busy_band && (
                  <span className="text-orange-300/90">
                    {' • '}
                    {primary.busy_band <= 1 ? 'Quiet' : 
                     primary.busy_band <= 2 ? 'Moderate' : 
                     primary.busy_band <= 3 ? 'Busy' : 'Very busy'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onJoin(primary.pid)}
                  className="px-3 py-2 rounded-md text-xs font-semibold transition-all duration-200 hover:scale-105"
                  style={{ background: t.base, color: t.fg }}
                >
                  Join
                </button>
                <button
                  onClick={() => onSave(primary.pid)}
                  className="px-3 py-2 rounded-md text-xs bg-white/10 text-white/85 hover:bg-white/15 transition-all duration-200"
                >
                  Save
                </button>
                <button
                  onClick={() => onPlan(primary.pid)}
                  className="px-3 py-2 rounded-md text-xs bg-white/10 text-white/85 hover:bg-white/15 transition-all duration-200"
                >
                  Plan
                </button>
                <button
                  onClick={() => onChangeVenue(primary.pid)}
                  className="ml-auto text-[11px] underline text-white/85 hover:text-white/95 transition-colors duration-200"
                >
                  Change venue
                </button>
              </div>
            </div>

            {/* Additional venues list */}
            {venues.slice(1).length > 0 && (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                <div className="text-white/60 text-xs mb-2 px-1">
                  More nearby venues
                </div>
                {venues.slice(1, 6).map((venue) => (
                  <button
                    key={venue.pid}
                    onClick={() => onJoin(venue.pid)}
                    className="w-full text-left rounded-lg px-3 py-2 bg-white/5 border border-white/10 text-white/85 hover:bg-white/8 transition-all duration-200 hover:border-white/20"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium truncate">
                          {venue.name}
                        </div>
                        <div className="text-xs text-white/60">
                          {venue.category && (
                            <span className="capitalize">{venue.category}</span>
                          )}
                          {venue.open_now && (
                            <span className="text-green-300/90"> • Open</span>
                          )}
                        </div>
                      </div>
                      {venue.busy_band && venue.busy_band > 2 && (
                        <div className="text-xs text-orange-300/90">
                          Busy
                        </div>
                      )}
                    </div>
                  </button>
                ))}

                {venues.length > 6 && (
                  <div className="text-center pt-2">
                    <button
                      onClick={() => onChangeVenue('')}
                      className="text-xs text-white/70 underline hover:text-white/90 transition-colors duration-200"
                    >
                      See all {venues.length} venues
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}