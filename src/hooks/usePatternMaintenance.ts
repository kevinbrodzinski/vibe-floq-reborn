// Weekly pattern maintenance hook for decay and cleanup
import { useEffect } from 'react';
import { 
  readVenueImpacts, 
  writeVenueImpacts, 
  readTemporalPrefs, 
  writeTemporalPrefs,
  cleanupOldPatterns,
  invalidatePatternCache
} from '@/core/patterns/service';
import { DECAY } from '@/core/patterns/evolve';
import { storage } from '@/lib/storage';
import type { Vibe } from '@/lib/vibes';

const MAINTENANCE_KEY = 'pattern:lastDecay';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function usePatternMaintenance() {
  useEffect(() => {
    const performMaintenance = async () => {
      try {
        const lastMaintenance = Number(await storage.getItem(MAINTENANCE_KEY) ?? 0);
        const now = Date.now();
        const isDue = (now - lastMaintenance) > WEEK_MS;

        if (!isDue) return;

        console.log('[Patterns] Running weekly maintenance...');

        // Venue pattern decay
        try {
          const venueStore = await readVenueImpacts();
          let venueChanged = false;

          Object.keys(venueStore.data).forEach(venueType => {
            const impact = venueStore.data[venueType];
            if (!impact) return;

            // Apply L2 decay to energy delta
            const oldEnergyDelta = impact.energyDelta;
            impact.energyDelta = Number((impact.energyDelta * DECAY).toFixed(4));

            // Light center pull for preferred vibes (optional smoothing)
            const preferredVibes = impact.preferredVibes;
            const vibeCount = Object.keys(preferredVibes).length;
            
            if (vibeCount > 0) {
              const uniformWeight = 1 / vibeCount;
              Object.keys(preferredVibes).forEach(vibe => {
                const currentWeight = preferredVibes[vibe as Vibe] ?? 0;
                const decayed = currentWeight * DECAY + uniformWeight * (1 - DECAY);
                preferredVibes[vibe as Vibe] = Number(decayed.toFixed(4));
              });
            }

            venueChanged = true;
          });

          if (venueChanged) {
            await writeVenueImpacts(venueStore);
          }
        } catch (error) {
          console.warn('[Patterns] Venue decay failed:', error);
        }

        // Temporal pattern decay (optional smoothing back to uniform)
        try {
          const temporalStore = await readTemporalPrefs();
          let temporalChanged = false;

          Object.keys(temporalStore.data).forEach(hourStr => {
            const hour = parseInt(hourStr);
            const distribution = temporalStore.data[hour];
            if (!distribution) return;

            const vibeKeys = Object.keys(distribution);
            if (vibeKeys.length === 0) return;

            const uniformWeight = 1 / vibeKeys.length;
            
            vibeKeys.forEach(vibe => {
              const currentWeight = distribution[vibe as Vibe] ?? 0;
              const decayed = currentWeight * DECAY + uniformWeight * (1 - DECAY);
              distribution[vibe as Vibe] = Number(decayed.toFixed(4));
            });

            temporalChanged = true;
          });

          if (temporalChanged) {
            await writeTemporalPrefs(temporalStore);
          }
        } catch (error) {
          console.warn('[Patterns] Temporal decay failed:', error);
        }

        // Cleanup old pattern data
        try {
          await cleanupOldPatterns();
        } catch (error) {
          console.warn('[Patterns] Cleanup failed:', error);
        }

        // Invalidate cache to force fresh reads
        invalidatePatternCache();

        // Record maintenance completion
        await storage.setItem(MAINTENANCE_KEY, String(now));

        if (import.meta.env.DEV) {
          console.log('[Patterns] Weekly maintenance completed');
        }

      } catch (error) {
        console.error('[Patterns] Maintenance failed:', error);
      }
    };

    // Run maintenance check on mount
    performMaintenance();

    // Set up daily check (will only run maintenance weekly)
    const interval = setInterval(performMaintenance, 24 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    // Expose manual maintenance trigger for admin/dev use
    triggerMaintenance: async () => {
      await storage.removeItem(MAINTENANCE_KEY); // Force maintenance
      window.location.reload(); // Simple way to re-trigger useEffect
    }
  };
}