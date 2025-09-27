import { describe, it, expect } from 'vitest';
import { Events } from '@/services/eventBridge';

describe('EventBridge Uniqueness', () => {
  it('has no duplicate event values', () => {
    const eventValues = Object.values(Events);
    const uniqueValues = new Set(eventValues);
    
    expect(eventValues.length).toBe(uniqueValues.size);
    
    // Additional check: find any duplicates if they exist
    const duplicates = eventValues.filter((value, index, arr) => 
      arr.indexOf(value) !== index
    );
    
    if (duplicates.length > 0) {
      console.error('Duplicate event values found:', duplicates);
    }
    
    expect(duplicates).toHaveLength(0);
  });

  it('has no duplicate event keys', () => {
    const eventKeys = Object.keys(Events);
    const uniqueKeys = new Set(eventKeys);
    
    expect(eventKeys.length).toBe(uniqueKeys.size);
  });

  it('validates critical layer events exist', () => {
    expect(Events.FLOQ_LAYER_TOGGLE).toBe('floq:layer:toggle');
    expect(Events.FLOQ_LAYER_SET).toBe('floq:layer:set');
  });

  it('follows naming convention', () => {
    const eventValues = Object.values(Events);
    
    // All events should use colon notation
    eventValues.forEach(value => {
      expect(value).toMatch(/^[a-z]+:[a-z:]+$/);
    });
  });
});