import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateRealtimePayload, createSafeRealtimeHandler } from '@/lib/realtime/validation';

describe('validateRealtimePayload', () => {
  it('should return false for null payload', () => {
    expect(validateRealtimePayload(null)).toBe(false);
  });

  it('should return false for undefined payload', () => {
    expect(validateRealtimePayload(undefined)).toBe(false);
  });

  it('should return false for array payload', () => {
    expect(validateRealtimePayload([])).toBe(false);
  });

  it('should return false for string payload', () => {
    expect(validateRealtimePayload('invalid')).toBe(false);
  });

  it('should return false for payload missing required fields', () => {
    expect(validateRealtimePayload({})).toBe(false);
    expect(validateRealtimePayload({ eventType: 'INSERT' })).toBe(false);
    expect(validateRealtimePayload({ eventType: 'INSERT', schema: 'public' })).toBe(false);
  });

  it('should return false for payload missing new/old fields', () => {
    const payload = {
      eventType: 'INSERT',
      schema: 'public',
      table: 'messages'
    };
    expect(validateRealtimePayload(payload)).toBe(false);
  });

  it('should return true for valid payload', () => {
    const payload = {
      eventType: 'INSERT',
      schema: 'public',
      table: 'messages',
      new: { id: '1', content: 'test' },
      old: null
    };
    expect(validateRealtimePayload(payload)).toBe(true);
  });

  it('should return true for valid payload with null new/old', () => {
    const payload = {
      eventType: 'DELETE',
      schema: 'public',
      table: 'messages',
      new: null,
      old: { id: '1', content: 'test' }
    };
    expect(validateRealtimePayload(payload)).toBe(true);
  });
});

describe('createSafeRealtimeHandler', () => {
  let mockHandler: ReturnType<typeof vi.fn>;
  let mockErrorHandler: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockHandler = vi.fn();
    mockErrorHandler = vi.fn();
    vi.clearAllMocks();
  });

  it('should not call handler for invalid payload', () => {
    const safeHandler = createSafeRealtimeHandler(mockHandler, mockErrorHandler);
    
    safeHandler(null);
    
    expect(mockHandler).not.toHaveBeenCalled();
    expect(mockErrorHandler).toHaveBeenCalledWith(
      expect.any(Error),
      null
    );
  });

  it('should call handler for valid payload', () => {
    const validPayload = {
      eventType: 'INSERT',
      schema: 'public',
      table: 'messages',
      new: { id: '1', content: 'test' },
      old: null
    };
    
    const safeHandler = createSafeRealtimeHandler(mockHandler, mockErrorHandler);
    
    safeHandler(validPayload);
    
    expect(mockHandler).toHaveBeenCalledWith(validPayload);
    expect(mockErrorHandler).not.toHaveBeenCalled();
  });

  it('should handle errors thrown by handler', () => {
    const validPayload = {
      eventType: 'INSERT',
      schema: 'public',
      table: 'messages',
      new: { id: '1', content: 'test' },
      old: null
    };
    
    const throwingHandler = vi.fn(() => {
      throw new Error('Handler error');
    });
    
    const safeHandler = createSafeRealtimeHandler(throwingHandler, mockErrorHandler);
    
    safeHandler(validPayload);
    
    expect(throwingHandler).toHaveBeenCalledWith(validPayload);
    expect(mockErrorHandler).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Handler error' }),
      validPayload
    );
  });

  it('should use console.error when no error handler provided', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const safeHandler = createSafeRealtimeHandler(mockHandler);
    
    safeHandler(null);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      '[RealtimeHandler] Payload validation failed:',
      expect.any(Error),
      null
    );
    
    consoleSpy.mockRestore();
  });
});