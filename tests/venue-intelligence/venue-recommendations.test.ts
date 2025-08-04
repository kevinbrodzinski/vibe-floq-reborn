import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useVenueRecommendations } from '@/hooks/useVenueRecommendations';
import { 
  withErrorHandling, 
  createFallbackRecommendations,
  validateRecommendation,
  optimizeRecommendations 
} from '@/lib/venue-intelligence/errorHandling';
import { venueCache, CacheKeys } from '@/lib/venue-intelligence/caching';
import { VenueRecommendationConfigManager } from '@/lib/venue-intelligence/config';
import { venueAnalytics } from '@/lib/venue-intelligence/analytics';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      not: vi.fn(() => ({
        limit: vi.fn(() => ({
          data: mockVenues,
          error: null
        }))
      }))
    }))
  }))
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

// Mock auth and geo hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123' }
  })
}));

vi.mock('@/hooks/useGeo', () => ({
  useGeo: () => ({
    coords: { lat: 40.7128, lng: -74.0060 } // NYC coordinates
  })
}));

const mockVenues = [
  {
    id: 'venue-1',
    name: 'Test Cafe',
    categories: ['cafe', 'coffee'],
    lat: 40.7130,
    lng: -74.0061,
    rating: 4.5,
    price_tier: '$$',
    address: '123 Test St',
    photo_url: 'https://example.com/cafe.jpg'
  },
  {
    id: 'venue-2',
    name: 'Test Bar',
    categories: ['bar', 'nightlife'],
    lat: 40.7125,
    lng: -74.0065,
    rating: 4.2,
    price_tier: '$$$',
    address: '456 Test Ave',
    photo_url: 'https://example.com/bar.jpg'
  }
];

describe('Venue Intelligence System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    venueCache.clear();
    VenueRecommendationConfigManager.reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useVenueRecommendations Hook', () => {
    it('should fetch and process venue recommendations', async () => {
      const { result } = renderHook(() => useVenueRecommendations());

      // Initially loading
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toEqual([]);

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have processed recommendations
      expect(result.current.data.length).toBeGreaterThan(0);
      expect(result.current.error).toBeNull();
      expect(result.current.dataQuality).toBeDefined();
    });

    it('should handle errors gracefully with fallbacks', async () => {
      // Mock Supabase error
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          not: vi.fn(() => ({
            limit: vi.fn(() => ({
              data: null,
              error: new Error('Database connection failed')
            }))
          }))
        }))
      });

      const { result } = renderHook(() => useVenueRecommendations());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should either have fallback data or empty array
      expect(result.current.fallbackUsed).toBeDefined();
      expect(result.current.errorStats).toBeDefined();
    });
  });

  describe('Error Handling System', () => {
    it('should wrap operations with error handling', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Test error'));
      const fallbackValue = 'fallback';

      const result = await withErrorHandling(
        mockOperation,
        'TEST_ERROR',
        fallbackValue
      );

      expect(result).toBe(fallbackValue);
      expect(mockOperation).toHaveBeenCalled();
    });

    it('should create fallback recommendations', () => {
      const fallbackRecs = createFallbackRecommendations(
        mockVenues,
        { lat: 40.7128, lng: -74.0060 }
      );

      expect(fallbackRecs).toHaveLength(2);
      expect(fallbackRecs[0]).toHaveProperty('vibeMatch');
      expect(fallbackRecs[0]).toHaveProperty('crowdIntelligence');
      expect(fallbackRecs[0]).toHaveProperty('socialProof');
      expect(fallbackRecs[0].warnings).toContain('Limited intelligence data available - basic recommendation');
    });

    it('should validate recommendation data', () => {
      const validRecommendation = {
        id: 'test-venue',
        name: 'Test Venue',
        vibeMatch: { score: 0.8 },
        confidence: 0.7,
        realTime: { waitTime: '5 min wait' },
        socialProof: { friendVisits: 3 },
        vibeMatch: { explanation: 'This is a detailed explanation that is longer than 50 characters for testing' }
      } as any;

      const validation = validateRecommendation(validRecommendation);
      expect(validation.isValid).toBe(true);
      expect(validation.quality).toBe('high');
    });

    it('should optimize recommendations by quality', () => {
      const recommendations = [
        {
          confidence: 0.5,
          realTime: { waitTime: 'Wait time unknown' },
          socialProof: { friendVisits: 0 },
          vibeMatch: { explanation: 'Short' }
        },
        {
          confidence: 0.9,
          realTime: { waitTime: '5 min wait' },
          socialProof: { friendVisits: 3 },
          vibeMatch: { explanation: 'This is a much longer and more detailed explanation' }
        }
      ] as any[];

      const optimized = optimizeRecommendations(recommendations);
      
      // Higher quality recommendation should come first
      expect(optimized[0].confidence).toBe(0.9);
      expect(optimized[1].confidence).toBe(0.5);
    });
  });

  describe('Caching System', () => {
    it('should cache and retrieve data', () => {
      const testData = { test: 'data' };
      const cacheKey = 'test-key';

      // Should not exist initially
      expect(venueCache.has(cacheKey)).toBe(false);

      // Set data
      venueCache.set(cacheKey, testData, 5);
      expect(venueCache.has(cacheKey)).toBe(true);

      // Retrieve data
      const retrieved = venueCache.get(cacheKey);
      expect(retrieved).toEqual(testData);
    });

    it('should expire cached data', async () => {
      const testData = { test: 'data' };
      const cacheKey = 'expire-test';

      // Set with very short TTL
      venueCache.set(cacheKey, testData, 0.001); // ~60ms

      expect(venueCache.has(cacheKey)).toBe(true);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(venueCache.has(cacheKey)).toBe(false);
    });

    it('should generate consistent cache keys', () => {
      const lat = 40.7128;
      const lng = -74.0060;
      
      const key1 = CacheKeys.venues(lat, lng);
      const key2 = CacheKeys.venues(lat, lng);
      
      expect(key1).toBe(key2);
      expect(key1).toContain('40.713');
      expect(key1).toContain('-74.006');
    });
  });

  describe('Configuration System', () => {
    it('should validate configuration', () => {
      const validConfig = VenueRecommendationConfigManager.get();
      const validation = VenueRecommendationConfigManager.validate(validConfig);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid configuration', () => {
      const invalidConfig = {
        ...VenueRecommendationConfigManager.get(),
        maxVenues: -1, // Invalid
        searchRadius: 100, // Too large
        scoring: {
          vibeMatch: 2.0, // Invalid weight
          socialProof: 0.5,
          crowdIntelligence: 0.2,
          proximity: 0.2,
          novelty: 0.1
        }
      };

      const validation = VenueRecommendationConfigManager.validate(invalidConfig);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should update configuration', () => {
      const originalConfig = VenueRecommendationConfigManager.get();
      const updates = { maxVenues: 25 };

      VenueRecommendationConfigManager.update(updates);
      
      const updatedConfig = VenueRecommendationConfigManager.get();
      expect(updatedConfig.maxVenues).toBe(25);
      expect(updatedConfig.searchRadius).toBe(originalConfig.searchRadius); // Unchanged
    });
  });

  describe('Analytics System', () => {
    it('should track recommendation events', () => {
      const event = {
        type: 'view' as const,
        venueId: 'test-venue',
        userId: 'test-user',
        recommendationId: 'test-rec',
        confidence: 0.8,
        vibeMatchScore: 0.7,
        socialProofScore: 0.6
      };

      venueAnalytics.trackEvent(event);
      
      const analytics = venueAnalytics.getAnalytics();
      expect(analytics.averageConfidence).toBeCloseTo(0.8);
    });

    it('should calculate venue performance metrics', () => {
      // Track multiple events for a venue
      const venueId = 'test-venue';
      const events = [
        { type: 'view' as const, confidence: 0.8, vibeMatchScore: 0.7, socialProofScore: 0.6 },
        { type: 'click' as const, confidence: 0.8, vibeMatchScore: 0.7, socialProofScore: 0.6 },
        { type: 'favorite' as const, confidence: 0.8, vibeMatchScore: 0.7, socialProofScore: 0.6 }
      ];

      events.forEach(event => {
        venueAnalytics.trackEvent({
          ...event,
          venueId,
          userId: 'test-user',
          recommendationId: `test-rec-${Date.now()}`
        });
      });

      const performance = venueAnalytics.getVenuePerformance(venueId);
      
      expect(performance.views).toBe(1);
      expect(performance.clicks).toBe(1);
      expect(performance.favorites).toBe(1);
      expect(performance.averageConfidence).toBeCloseTo(0.8);
    });

    it('should export analytics data', () => {
      venueAnalytics.trackEvent({
        type: 'view',
        venueId: 'test-venue',
        userId: 'test-user',
        recommendationId: 'test-rec',
        confidence: 0.8,
        vibeMatchScore: 0.7,
        socialProofScore: 0.6
      });

      const jsonExport = venueAnalytics.exportEvents('json');
      const csvExport = venueAnalytics.exportEvents('csv');

      expect(jsonExport).toContain('test-venue');
      expect(csvExport).toContain('timestamp,type,venueId');
      expect(csvExport).toContain('test-venue');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete recommendation flow', async () => {
      const { result } = renderHook(() => useVenueRecommendations());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should have recommendations with all required fields
      if (result.current.data.length > 0) {
        const recommendation = result.current.data[0];
        
        expect(recommendation).toHaveProperty('id');
        expect(recommendation).toHaveProperty('name');
        expect(recommendation).toHaveProperty('vibeMatch');
        expect(recommendation).toHaveProperty('crowdIntelligence');
        expect(recommendation).toHaveProperty('socialProof');
        expect(recommendation).toHaveProperty('context');
        expect(recommendation).toHaveProperty('realTime');
        expect(recommendation).toHaveProperty('confidence');
        expect(recommendation).toHaveProperty('topReasons');

        // Validate data quality
        const validation = validateRecommendation(recommendation);
        expect(validation.isValid).toBe(true);
      }
    });
  });
});