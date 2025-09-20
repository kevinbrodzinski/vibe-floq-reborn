import React, { useEffect, useMemo, useState } from 'react';
import { coPresenceBus } from '@/lib/events/coPresenceBus';
import SocialBatterySheet from '@/components/SocialBattery/SocialBatterySheet';
import { useFieldHeartbeat } from '@/hooks/useFieldHeartbeat';

export default function EnergyModalBinder({ floqId }: { floqId?: string }) {
  const [open, setOpen] = useState(false);
  
  useEffect(() => {
    const off = coPresenceBus.on('energy:open', (p) => {
      if (p?.floqId && floqId && p.floqId !== floqId) return;
      setOpen(true);
    });
    return off;
  }, [floqId]);

  // Use heartbeat for live % + direction
  const hb = useFieldHeartbeat({ envelope: 'balanced' });
  const energy = Math.max(0, Math.min(1, hb?.energy ?? 0.5));
  const slope  = hb?.slope ?? 0;
  const dir: 'rising'|'stable'|'falling' = slope > 0.02 ? 'rising' : slope < -0.02 ? 'falling' : 'stable';

  // Wire actions if you want (optional)
  const onRallyNow = useMemo(() => async () => { 
    setOpen(false); 
    // TODO: call your rally action 
  }, []);
  
  const onMeetHalfway = useMemo(() => async () => { 
    setOpen(false); 
    // TODO: emit openMeetHalfway({floqId}) 
  }, [floqId]);

  return (
    <SocialBatterySheet
      open={open}
      onClose={() => setOpen(false)}
      energy={energy}
      dir={dir}
      onRallyNow={onRallyNow}
      onMeetHalfway={onMeetHalfway}
    />
  );
}