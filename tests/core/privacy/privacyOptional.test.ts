import { runWithPrivacyOptional } from '@/core/privacy/privacyOptional';
import { isFeatureEnabled } from '@/constants/featureFlags';

// Mock the feature flags
jest.mock('@/constants/featureFlags', () => ({
  isFeatureEnabled: jest.fn()
}));

// Mock edgeLog
jest.mock('@/lib/edgeLog', () => ({
  edgeLog: jest.fn()
}));

// Mock withGate
jest.mock('@/core/privacy/withGate', () => ({
  withGate: jest.fn()
}));

const mockIsFeatureEnabled = isFeatureEnabled as jest.MockedFunction<typeof isFeatureEnabled>;
const { withGate } = require('@/core/privacy/withGate');

describe('runWithPrivacyOptional', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns full when gates are disabled', async () => {
    mockIsFeatureEnabled.mockReturnValue(false);
    
    const task = jest.fn().mockResolvedValue('test result');
    
    const result = await runWithPrivacyOptional(task, {}, 'test_feature');
    
    expect(result).toEqual({
      result: 'test result',
      degrade: 'full'
    });
    expect(task).toHaveBeenCalled();
  });

  it('returns full with receipt when gates enabled and ok', async () => {
    mockIsFeatureEnabled.mockReturnValue(true);
    withGate.mockResolvedValue({
      ok: true,
      degrade: 'full',
      receiptId: 'receipt123',
      data: 'gated result'
    });
    
    const task = jest.fn().mockResolvedValue('test result');
    
    const result = await runWithPrivacyOptional(task, {}, 'test_feature');
    
    expect(result).toEqual({
      result: 'gated result',
      degrade: 'full',
      receiptId: 'receipt123'
    });
  });

  it('returns category degrade when gate degrades', async () => {
    mockIsFeatureEnabled.mockReturnValue(true);
    withGate.mockResolvedValue({
      ok: true,
      degrade: 'category',
      receiptId: 'receipt456',
      data: 'degraded result'
    });
    
    const task = jest.fn().mockResolvedValue('test result');
    
    const result = await runWithPrivacyOptional(task, {}, 'test_feature');
    
    expect(result).toEqual({
      result: 'degraded result',
      degrade: 'category',
      receiptId: 'receipt456'
    });
  });

  it('returns suppress when gate blocks', async () => {
    mockIsFeatureEnabled.mockReturnValue(true);
    withGate.mockResolvedValue({
      ok: false,
      degrade: 'suppress',
      receiptId: 'receipt789',
      reason: 'ttl_expired'
    });
    
    const task = jest.fn();
    
    const result = await runWithPrivacyOptional(task, {}, 'test_feature');
    
    expect(result).toEqual({
      degrade: 'suppress',
      receiptId: 'receipt789',
      reason: 'ttl_expired'
    });
    expect(task).not.toHaveBeenCalled();
  });

  it('handles task execution errors when gates disabled', async () => {
    mockIsFeatureEnabled.mockReturnValue(false);
    
    const task = jest.fn().mockRejectedValue(new Error('Task failed'));
    
    const result = await runWithPrivacyOptional(task, {}, 'test_feature');
    
    expect(result).toEqual({
      degrade: 'suppress',
      reason: 'execution_failed'
    });
  });

  it('handles gate errors gracefully', async () => {
    mockIsFeatureEnabled.mockReturnValue(true);
    withGate.mockRejectedValue(new Error('Gate error'));
    
    const task = jest.fn();
    
    const result = await runWithPrivacyOptional(task, {}, 'test_feature');
    
    expect(result).toEqual({
      degrade: 'suppress',
      reason: 'gate_error'
    });
  });
});