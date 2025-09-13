import { onEvent, emitEvent, Events } from '@/services/eventBridge';

/** 
 * Bridges legacy breadcrumb events to new flow events for backward compatibility.
 * Call once at app bootstrap to ensure all existing breadcrumb callers work seamlessly.
 */
export function initFlowEventBridgeAdapters() {
  // Forward breadcrumb events to flow events
  const offShow = onEvent(Events.FLOQ_BREADCRUMB_SHOW, (payload) => {
    emitEvent(Events.FLOQ_FLOW_SHOW, payload ?? {});
  });
  
  const offHide = onEvent(Events.FLOQ_BREADCRUMB_HIDE, () => {
    emitEvent(Events.FLOQ_FLOW_HIDE, {});
  });
  
  const offRetrace = onEvent(Events.FLOQ_BREADCRUMB_RETRACE, (payload) => {
    emitEvent(Events.FLOQ_FLOW_RETRACE, payload ?? {});
  });

  // Return cleanup function if needed
  return () => {
    offShow();
    offHide(); 
    offRetrace();
  };
}