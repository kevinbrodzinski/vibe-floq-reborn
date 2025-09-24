import * as React from 'react';
import { onEvent, Events } from '@/services/eventBridge';
import { useFlowRecorder } from '@/hooks/useFlowRecorder';
import { useVenueInteractions } from '@/hooks/useVenueInteractions';
import { useVenueActions } from '@/hooks/useVenueActions';
import { useGeo } from '@/hooks/useGeo';
import { toastOk, toastWarn, toastErr } from '@/lib/ui/toast';
import { enqueue, drain, isOnline } from '@/lib/offline/venueQueue';

export function FlowAndVenueBridge() {
  const recorder = useFlowRecorder();
  const { share, plan, checkIn } = useVenueInteractions();
  const { onCreatePlan } = useVenueActions();
  const { coords } = useGeo();

  React.useEffect(() => {
    // Replay queued actions when coming back online
    const onUp = () => drain(async (job) => {
      if (job.t==='join'    && checkIn) await checkIn(job.id, { lat: coords?.lat, lng: coords?.lng });
      if (job.t==='save'    && share)   await share(job.id,   { lat: coords?.lat, lng: coords?.lng });
      if (job.t==='plan'    && plan)    await plan(job.id,    { lat: coords?.lat, lng: coords?.lng });
      if (job.t==='checkin' && checkIn) await checkIn(job.id, { lat: job.lat, lng: job.lng });
    });
    window.addEventListener('online', onUp, { passive: true });
    onUp();

    const offFlowStart = onEvent(Events.FLOQ_FLOW_START_REQUEST, async ({ venueId }) => {
      try {
        if (recorder?.start) {
          await recorder.start({ 
            visibility: 'public',
            start_center: coords ? { lng: coords.lng, lat: coords.lat } : undefined 
          });
          toastOk('Flow started');
        } else {
          toastWarn('Flow recorder not available');
        }
      } catch (error) {
        toastErr('Could not start flow');
      }
    });

    const offJoin = onEvent(Events.UI_VENUE_JOIN, async ({ venueId }) => {
      try {
        if (venueId && checkIn) {
          if (isOnline()) { 
            await checkIn(venueId, { 
              lat: coords?.lat, 
              lng: coords?.lng,
              vibe: null // will use current vibe from store
            }); 
            toastOk('Checked in'); 
          } else { 
            enqueue({ t:'join', id: venueId }); 
            toastOk('Queued: will check in when online'); 
          }
        } else {
          toastWarn('Join unavailable');
        }
      } catch (error) {
        toastErr('Could not join venue');
      }
    });

    const offSave = onEvent(Events.UI_VENUE_SAVE, async ({ venueId }) => {
      try {
        if (venueId && share) {
          if (isOnline()) { 
            await share(venueId, {
              lat: coords?.lat,
              lng: coords?.lng,
            }); 
            toastOk('Saved to places'); 
          } else { 
            enqueue({ t:'save', id: venueId }); 
            toastOk('Queued: will save when online'); 
          }
        } else {
          toastWarn('Save unavailable');
        }
      } catch (error) {
        toastErr('Could not save venue');
      }
    });

    const offPlan = onEvent(Events.UI_VENUE_PLAN, async ({ venueId }) => {
      try {
        if (venueId && plan) {
          if (isOnline()) { 
            await plan(venueId, {
              lat: coords?.lat,
              lng: coords?.lng,
            }); 
            toastOk('Added to plan'); 
          } else { 
            enqueue({ t:'plan', id: venueId }); 
            toastOk('Queued: will add to plan when online'); 
          }
        } else if (onCreatePlan && venueId) {
          onCreatePlan(venueId);
          toastOk('Plan started');
        } else {
          toastWarn('Plan unavailable');
        }
      } catch (error) {
        toastErr('Could not add to plan');
      }
    });

    return () => {
      window.removeEventListener('online', onUp);
      offFlowStart();
      offJoin();
      offSave();
      offPlan();
    };
  }, [recorder, checkIn, share, plan, onCreatePlan, coords]);

  return null;
}