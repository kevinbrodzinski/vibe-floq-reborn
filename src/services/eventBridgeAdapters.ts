import { onEvent, emitEvent, Events } from '@/services/eventBridge';

export function initFlowEventBridgeAdapters() {
  const offShow = onEvent(Events.FLOQ_BREADCRUMB_SHOW, (p) =>
    emitEvent(Events.FLOQ_FLOW_SHOW, { path: p?.path ?? [], mode: p?.mode ?? 'display' })
  );
  const offHide = onEvent(Events.FLOQ_BREADCRUMB_HIDE, () => emitEvent(Events.FLOQ_FLOW_HIDE, {}));
  const offRetrace = onEvent(Events.FLOQ_BREADCRUMB_RETRACE, (p) =>
    emitEvent(Events.FLOQ_FLOW_RETRACE, p ?? {})
  );
  return () => { offShow(); offHide(); offRetrace(); };
}