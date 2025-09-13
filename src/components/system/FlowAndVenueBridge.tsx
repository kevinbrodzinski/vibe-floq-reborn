import * as React from 'react';
import { onEvent, Events } from '@/services/eventBridge';

export function FlowAndVenueBridge() {
  React.useEffect(() => {
    const offFlowStart = onEvent(Events.FLOQ_FLOW_START_REQUEST, ({ venueId }) => {
      try {
        console.log('[FlowAndVenueBridge] Flow start requested for venue:', venueId);
        // TODO: Connect to actual flow recorder when available
        // recorder.start?.({ venueId });
      } catch (error) {
        console.warn('[FlowAndVenueBridge] Error starting flow:', error);
      }
    });

    const offJoin = onEvent(Events.UI_VENUE_JOIN, ({ venueId }) => {
      try {
        console.log('[FlowAndVenueBridge] Join venue requested:', venueId);
        // TODO: Connect to actual venue join logic when available
        // venues?.join?.(venueId);
      } catch (error) {
        console.warn('[FlowAndVenueBridge] Error joining venue:', error);
      }
    });

    const offSave = onEvent(Events.UI_VENUE_SAVE, ({ venueId }) => {
      try {
        console.log('[FlowAndVenueBridge] Save venue requested:', venueId);
        // TODO: Connect to actual venue save logic when available
        // venues?.save?.(venueId);
      } catch (error) {
        console.warn('[FlowAndVenueBridge] Error saving venue:', error);
      }
    });

    const offPlan = onEvent(Events.UI_VENUE_PLAN, ({ venueId }) => {
      try {
        console.log('[FlowAndVenueBridge] Plan venue requested:', venueId);
        // TODO: Connect to actual venue planning logic when available
        // venues?.plan?.(venueId);
      } catch (error) {
        console.warn('[FlowAndVenueBridge] Error planning venue:', error);
      }
    });

    return () => {
      offFlowStart();
      offJoin();
      offSave();
      offPlan();
    };
  }, []);

  return null;
}