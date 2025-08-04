export interface VenueRecommendationConfig {
  // Search parameters
  maxVenues: number;
  searchRadius: number; // in miles
  maxRecommendations: number;
  
  // Scoring weights
  scoring: {
    vibeMatch: number;
    socialProof: number;
    crowdIntelligence: number;
    proximity: number;
    novelty: number;
  };
  
  // ML parameters
  ml: {
    behaviorHistoryDays: number;
    minDataPointsForML: number;
    confidenceThreshold: number;
  };
  
  // Social parameters
  social: {
    friendNetworkCacheTTL: number; // minutes
    maxRecentVisitors: number;
    socialProofWeight: number;
  };
  
  // Performance parameters
  performance: {
    cacheTTL: number; // minutes
    maxConcurrentRequests: number;
    timeoutMs: number;
  };
  
  // Quality thresholds
  quality: {
    minConfidenceScore: number;
    minVibeMatchScore: number;
    preferHighQualityData: boolean;
  };
}

// Default configuration
export const DEFAULT_CONFIG: VenueRecommendationConfig = {
  maxVenues: 50,
  searchRadius: 5,
  maxRecommendations: 10,
  
  scoring: {
    vibeMatch: 0.35,
    socialProof: 0.25,
    crowdIntelligence: 0.15,
    proximity: 0.25,
    novelty: 0.1
  },
  
  ml: {
    behaviorHistoryDays: 180,
    minDataPointsForML: 5,
    confidenceThreshold: 0.3
  },
  
  social: {
    friendNetworkCacheTTL: 5,
    maxRecentVisitors: 3,
    socialProofWeight: 0.8
  },
  
  performance: {
    cacheTTL: 10,
    maxConcurrentRequests: 5,
    timeoutMs: 30000
  },
  
  quality: {
    minConfidenceScore: 0.2,
    minVibeMatchScore: 0.3,
    preferHighQualityData: true
  }
};

// Environment-based configuration overrides
const getEnvironmentConfig = (): Partial<VenueRecommendationConfig> => {
  const env = process.env.NODE_ENV;
  
  switch (env) {
    case 'development':
      return {
        performance: {
          ...DEFAULT_CONFIG.performance,
          cacheTTL: 2, // Shorter cache in dev
          timeoutMs: 10000
        },
        quality: {
          ...DEFAULT_CONFIG.quality,
          minConfidenceScore: 0.1, // Lower threshold in dev
          preferHighQualityData: false
        }
      };
      
    case 'production':
      return {
        performance: {
          ...DEFAULT_CONFIG.performance,
          cacheTTL: 15, // Longer cache in prod
          maxConcurrentRequests: 10
        },
        quality: {
          ...DEFAULT_CONFIG.quality,
          minConfidenceScore: 0.4, // Higher threshold in prod
          preferHighQualityData: true
        }
      };
      
    default:
      return {};
  }
};

// Merge configurations
function mergeConfigs(
  base: VenueRecommendationConfig,
  override: Partial<VenueRecommendationConfig>
): VenueRecommendationConfig {
  return {
    ...base,
    ...override,
    scoring: { ...base.scoring, ...override.scoring },
    ml: { ...base.ml, ...override.ml },
    social: { ...base.social, ...override.social },
    performance: { ...base.performance, ...override.performance },
    quality: { ...base.quality, ...override.quality }
  };
}

// Global configuration instance
let currentConfig = mergeConfigs(DEFAULT_CONFIG, getEnvironmentConfig());

// Configuration management
export const VenueRecommendationConfigManager = {
  get: (): VenueRecommendationConfig => currentConfig,
  
  update: (updates: Partial<VenueRecommendationConfig>): void => {
    currentConfig = mergeConfigs(currentConfig, updates);
  },
  
  reset: (): void => {
    currentConfig = mergeConfigs(DEFAULT_CONFIG, getEnvironmentConfig());
  },
  
  // Validate configuration
  validate: (config: VenueRecommendationConfig): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Validate scoring weights sum to reasonable range
    const totalWeight = Object.values(config.scoring).reduce((sum, weight) => sum + weight, 0);
    if (totalWeight < 0.8 || totalWeight > 1.2) {
      errors.push(`Scoring weights should sum to ~1.0, got ${totalWeight.toFixed(2)}`);
    }
    
    // Validate ranges
    if (config.maxVenues < 1 || config.maxVenues > 200) {
      errors.push('maxVenues should be between 1 and 200');
    }
    
    if (config.searchRadius < 0.1 || config.searchRadius > 50) {
      errors.push('searchRadius should be between 0.1 and 50 miles');
    }
    
    if (config.ml.behaviorHistoryDays < 7 || config.ml.behaviorHistoryDays > 365) {
      errors.push('behaviorHistoryDays should be between 7 and 365');
    }
    
    // Validate confidence thresholds
    if (config.quality.minConfidenceScore < 0 || config.quality.minConfidenceScore > 1) {
      errors.push('minConfidenceScore should be between 0 and 1');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

// Configuration presets for different use cases
export const ConfigPresets = {
  // Prioritize speed over accuracy
  fast: {
    maxVenues: 20,
    maxRecommendations: 5,
    performance: {
      cacheTTL: 30,
      maxConcurrentRequests: 3,
      timeoutMs: 5000
    },
    quality: {
      minConfidenceScore: 0.1,
      minVibeMatchScore: 0.2,
      preferHighQualityData: false
    }
  } as Partial<VenueRecommendationConfig>,
  
  // Prioritize accuracy over speed
  accurate: {
    maxVenues: 100,
    maxRecommendations: 15,
    ml: {
      behaviorHistoryDays: 365,
      minDataPointsForML: 10,
      confidenceThreshold: 0.5
    },
    quality: {
      minConfidenceScore: 0.6,
      minVibeMatchScore: 0.5,
      preferHighQualityData: true
    }
  } as Partial<VenueRecommendationConfig>,
  
  // Balanced approach
  balanced: DEFAULT_CONFIG,
  
  // Focus on social features
  social: {
    scoring: {
      vibeMatch: 0.25,
      socialProof: 0.45,
      crowdIntelligence: 0.15,
      proximity: 0.15,
      novelty: 0.05
    },
    social: {
      friendNetworkCacheTTL: 2,
      maxRecentVisitors: 5,
      socialProofWeight: 1.0
    }
  } as Partial<VenueRecommendationConfig>
};

// Helper to apply preset
export function applyConfigPreset(preset: keyof typeof ConfigPresets): void {
  VenueRecommendationConfigManager.update(ConfigPresets[preset]);
}