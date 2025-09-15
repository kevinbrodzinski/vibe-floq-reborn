import { onEvent, Events } from '@/services/eventBridge';

type Sink = (name:string, props:any)=>void;
function getSink():Sink{
  const w = (window as any);
  if (w?.__analytics?.track) return (n,p)=>w.__analytics.track(n,p);
  return (n,p)=>console.info('[analytics]',n,p);
}

export function mountAnalytics(){
  const sink = getSink();
  
  // Converge system analytics
  window.addEventListener('ui_converge_prefill', (e: Event) => {
    const { friendId, venueId } = (e as CustomEvent).detail ?? {};
    sink('converge_prefill_shown', { friendId, venueId });
  });

  window.addEventListener('ui_converge_request', (e: Event) => {
    const { from, id } = (e as CustomEvent).detail ?? {};
    sink('converge_venue_selected', { source: from, venueId: id });
  });

  window.addEventListener('ui_banner_action', (e: Event) => {
    const { action, friendId, source } = (e as CustomEvent).detail ?? {};
    sink('cross_paths_banner_action', { action, friendId, source });
  });

  const offs = [
    onEvent(Events.FLOQ_CONVERGENCE_DETECTED, p=>sink('convergence_detected', p)),
    onEvent(Events.FLOQ_FLOW_SHOW,          p=>sink('flow_show', p)),
    onEvent(Events.FLOQ_FLOW_RETRACE_GOTO,  p=>sink('flow_retrace_goto', p)),
    onEvent(Events.UI_VENUE_JOIN,           p=>sink('venue_join', p)),
    onEvent(Events.UI_VENUE_SAVE,           p=>sink('venue_save', p)),
    onEvent(Events.UI_VENUE_PLAN,           p=>sink('venue_plan', p)),
    onEvent(Events.UI_OPEN_DIRECTIONS,      p=>sink('directions_open', p)),
  ];
  return ()=> offs.forEach(off=>off());
}