import { emitEvent } from '@/services/eventBridge';

export function emit(name: any, payload: any) { 
  try { 
    emitEvent(name, payload); 
  } catch {} 
}

// Global dev harness for QA
;(window as any).floq = Object.assign((window as any).floq || {}, { emit });