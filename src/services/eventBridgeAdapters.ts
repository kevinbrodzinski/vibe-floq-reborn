import { onEvent, emitEvent, Events } from '@/services/eventBridge';

export function initFlowEventBridgeAdapters() {
  const off1 = onEvent(Events.FLOQ_BREADCRUMB_SHOW, (p) =>
    emitEvent(Events.FLOQ_FLOW_SHOW, { path: p?.path ?? [], mode: p?.mode ?? 'display' })
  );
  const off2 = onEvent(Events.FLOQ_BREADCRUMB_HIDE, () =>
    emitEvent(Events.FLOQ_FLOW_HIDE, {})
  );
  const off3 = onEvent(Events.FLOQ_BREADCRUMB_RETRACE, (p) =>
    emitEvent(Events.FLOQ_FLOW_RETRACE, p ?? {})
  );
  return () => { off1(); off2(); off3(); };
}