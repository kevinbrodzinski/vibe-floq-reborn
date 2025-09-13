import * as React from 'react';
import { onEvent, Events } from '@/services/eventBridge';
import { useFlowRecorder } from '@/hooks/useFlowRecorder';
import { useVenueInteractions } from '@/hooks/useVenueInteractions';
import { useVenueActions } from '@/hooks/useVenueActions';
import { useGeo } from '@/hooks/useGeo';

export function FlowAndVenueBridge() {
  const recorder = useFlowRecorder();
  const { share, plan, checkIn } = useVenueInteractions();
  const { onCreatePlan } = useVenueActions();
  const { coords } = useGeo();

  React.useEffect(() => {
    const offFlowStart = onEvent(Events.FLOQ_FLOW_START_REQUEST, ({ venueId }) => {
      try {
        if (recorder?.start) {
          recorder.start({ 
            visibility: 'public',
            start_center: coords ? { lng: coords.lng, lat: coords.lat } : undefined 
          });
          console.info('[Bridge] ✅ Flow recording started', venueId);
        } else {
          console.info('[Bridge] 📝 Start flow requested (recorder not available)', venueId);
        }
      } catch (error) {
        console.warn('[Bridge] ❌ Error starting flow:', error);
      }
    });

    const offJoin = onEvent(Events.UI_VENUE_JOIN, ({ venueId }) => {
      try {
        if (checkIn && venueId) {
          checkIn(venueId, { 
            lat: coords?.lat, 
            lng: coords?.lng,
            vibe: null // will use current vibe from store
          });
          console.info('[Bridge] ✅ Venue check-in completed', venueId);
        } else {
          console.info('[Bridge] 📝 Join venue requested (hook not available)', venueId);
        }
      } catch (error) {
        console.warn('[Bridge] ❌ Error joining venue:', error);
      }
    });

    const offSave = onEvent(Events.UI_VENUE_SAVE, ({ venueId }) => {
      try {
        if (share && venueId) {
          share(venueId, {
            lat: coords?.lat,
            lng: coords?.lng,
          });
          console.info('[Bridge] ✅ Venue saved/shared', venueId);
        } else {
          console.info('[Bridge] 📝 Save venue requested (hook not available)', venueId);
        }
      } catch (error) {
        console.warn('[Bridge] ❌ Error saving venue:', error);
      }
    });

    const offPlan = onEvent(Events.UI_VENUE_PLAN, ({ venueId }) => {
      try {
        if (plan && venueId) {
          plan(venueId, {
            lat: coords?.lat,
            lng: coords?.lng,
          });
          console.info('[Bridge] ✅ Venue added to plan', venueId);
        } else if (onCreatePlan && venueId) {
          onCreatePlan(venueId);
          console.info('[Bridge] ✅ Plan creation initiated', venueId);
        } else {
          console.info('[Bridge] 📝 Plan venue requested (hook not available)', venueId);
        }
      } catch (error) {
        console.warn('[Bridge] ❌ Error planning venue:', error);
      }
    });

    return () => {
      offFlowStart();
      offJoin();
      offSave();
      offPlan();
    };
  }, [recorder, checkIn, share, plan, onCreatePlan, coords]);

  return null;
}