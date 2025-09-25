// Field system heartbeat - makes the organism alive
import { useEffect, useRef } from 'react';
import { estimateVenuePulse } from '@/core/venue/PulseEstimator';
import { updatePersonEnergy, type PersonState } from '@/core/field/FieldCoupling';
import { useEnhancedPresence } from '@/hooks/useEnhancedPresence';
import { useGeo } from '@/hooks/useGeo';
import { EnhancedVenueIntelligence } from '@/core/vibe/collectors/EnhancedVenueIntelligence';
import { rankTimeGate } from '@/core/privacy/RankTimeGate';
import { edgeLog } from '@/lib/edgeLog';

type Opts = { envelope?: 'strict' | 'balanced' | 'permissive' };

export function useFieldHeartbeat(opts: Opts = {}) {
  const { envelope = 'balanced' } = opts;
  const presence = useEnhancedPresence();
  const { coords } = useGeo(); // Get location from useGeo
  const ven = useRef(new EnhancedVenueIntelligence());
  const person = useRef<PersonState>({ energy: 0.6, slope: 0, momentum: 0 });
  const tickRef = useRef<number | null>(null);
  const lastLog = useRef(0);

  useEffect(() => {
    let alive = true;
    const loop = async () => {
      const gate = rankTimeGate({
        envelopeId: envelope,
        featureTimestamps: [Date.now()],
        epsilonCost: 0.0,
      });

      let pulse = null;
      if (gate.ok && coords?.lat && coords?.lng) {
        const intel = await ven.current.getVenueIntelligence({
          lat: coords.lat,
          lng: coords.lng,
        });
        pulse = estimateVenuePulse(intel);
      }

      person.current = updatePersonEnergy(person.current, pulse, null);

      const now = Date.now();
      if (now - lastLog.current > 60_000) {
        lastLog.current = now;
        edgeLog('field_heartbeat_tick', {
          receiptId: gate.ok ? gate.receiptId : undefined,
          degrade: gate.ok ? gate.degrade : 'suppress',
          energy_bin: person.current.energy < 0.34 ? 'low' : person.current.energy < 0.67 ? 'mid' : 'high',
        });
      }

      if (!alive) return;
      tickRef.current = self.setTimeout(loop, 1500);
    };

    loop();
    return () => {
      alive = false;
      if (tickRef.current) clearTimeout(tickRef.current);
    };
  }, [envelope, coords?.lat, coords?.lng]);

  return person.current; // latest state if caller needs it
}