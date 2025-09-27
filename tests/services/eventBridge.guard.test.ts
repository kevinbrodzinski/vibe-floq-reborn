import { describe, it, expect } from 'vitest';
import { Events, assertEventName } from '@/services/eventBridge';

describe('EventBridge Guard Rails', () => {
  it('prevents unknown event names', () => {
    expect(() => {
      assertEventName('unknown:event:name');
    }).toThrow('Unknown event: unknown:event:name');
  });

  it('allows valid event names', () => {
    expect(() => {
      assertEventName(Events.FLOQ_LAYER_TOGGLE);
    }).not.toThrow();
    
    expect(() => {
      assertEventName(Events.FLOQ_LAYER_SET);
    }).not.toThrow();
  });

  it('has unique event values', () => {
    const eventValues = Object.values(Events);
    const uniqueValues = new Set(eventValues);
    expect(eventValues.length).toBe(uniqueValues.size);
  });
});