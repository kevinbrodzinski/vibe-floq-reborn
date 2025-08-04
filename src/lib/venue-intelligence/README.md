# Venue Intelligence System

A sophisticated recommendation engine that provides personalized venue suggestions using real-time data, social proof, crowd intelligence, and machine learning.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Venue Intelligence System                │
├─────────────────────────────────────────────────────────────┤
│  🎯 useVenueRecommendations Hook                           │
│  ├── Error Handling & Fallbacks                            │
│  ├── Caching & Performance                                 │
│  └── Analytics & Monitoring                                │
├─────────────────────────────────────────────────────────────┤
│  🧠 Intelligence Engines                                   │
│  ├── Friend Network Analyzer                               │
│  ├── Crowd Intelligence Analyzer                           │
│  ├── Enhanced Vibe Matching                                │
│  └── ML Recommendation Engine                              │
├─────────────────────────────────────────────────────────────┤
│  💾 Data Sources                                           │
│  ├── Supabase (venues, vibes_now, venue_stays)            │
│  ├── Friend Network (friends table)                        │
│  ├── Weather API (contextual recommendations)              │
│  └── User Behavior (user_venue_interactions)               │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { useVenueRecommendations } from '@/hooks/useVenueRecommendations';

function VenueRecommendations() {
  const { 
    data, 
    loading, 
    error, 
    fallbackUsed, 
    dataQuality 
  } = useVenueRecommendations();

  if (loading) return <VenueCardListSkeleton count={5} />;
  if (error && !fallbackUsed) return <ErrorMessage error={error} />;

  return (
    <div>
      {fallbackUsed && <FallbackNotice />}
      {data.map(recommendation => (
        <VenueRecommendationCard 
          key={recommendation.id} 
          recommendation={recommendation} 
        />
      ))}
    </div>
  );
}
```

### Advanced Configuration

```typescript
import { VenueRecommendationConfigManager, ConfigPresets } from '@/lib/venue-intelligence/config';

// Use preset for social-focused recommendations
VenueRecommendationConfigManager.update(ConfigPresets.social);

// Or customize specific parameters
VenueRecommendationConfigManager.update({
  scoring: {
    vibeMatch: 0.4,
    socialProof: 0.3,
    crowdIntelligence: 0.2,
    proximity: 0.1,
    novelty: 0.0
  },
  maxRecommendations: 15
});
```

## 📊 Data Structure

### VenueRecommendation

```typescript
interface VenueRecommendation {
  id: string;
  name: string;
  category: string;
  address: string;
  rating: number;
  priceLevel: '$' | '$$' | '$$$' | '$$$$';
  distance: string;
  travelTime: string;
  imageUrl: string;
  
  // Intelligence data
  vibeMatch: VibeMatchData;
  crowdIntelligence: CrowdIntelligenceData;
  socialProof: SocialProofData;
  context: ContextualData;
  realTime: RealTimeData;
  
  // Scoring
  confidence: number; // 0-1
  topReasons: string[];
  warnings?: string[];
}
```

### Intelligence Components

#### 🎭 Vibe Match
```typescript
interface VibeMatchData {
  score: number; // 0-1
  explanation: string;
  userVibes: string[];
  venueVibes: string[];
  synergy: string;
  personalizedFactors?: string[];
}
```

#### 👥 Social Proof
```typescript
interface SocialProofData {
  friendVisits: number;
  recentVisitors: Array<{
    name: string;
    avatar?: string;
    visitDate: string;
  }>;
  networkRating: number;
  popularWith: string;
}
```

#### 🏢 Crowd Intelligence
```typescript
interface CrowdIntelligenceData {
  currentCapacity: number; // 0-100%
  predictedPeak: string;
  typicalCrowd: string;
  friendCompatibility: string;
  busyTimes: { [hour: string]: number };
  crowdTrends: {
    isGettingBusier: boolean;
    peakTime: string;
    quietTime: string;
    weekdayVsWeekend: 'weekday_preferred' | 'weekend_preferred' | 'consistent';
  };
  waitTimeEstimate: string;
  bestTimeToVisit: string;
}
```

## 🔧 Configuration

### Configuration Options

```typescript
interface VenueRecommendationConfig {
  // Search parameters
  maxVenues: number;           // Default: 50
  searchRadius: number;        // Default: 5 miles
  maxRecommendations: number;  // Default: 10
  
  // Scoring weights (should sum to ~1.0)
  scoring: {
    vibeMatch: number;         // Default: 0.35
    socialProof: number;       // Default: 0.25
    crowdIntelligence: number; // Default: 0.15
    proximity: number;         // Default: 0.25
    novelty: number;          // Default: 0.1
  };
  
  // ML parameters
  ml: {
    behaviorHistoryDays: number;    // Default: 180
    minDataPointsForML: number;     // Default: 5
    confidenceThreshold: number;    // Default: 0.3
  };
  
  // Performance settings
  performance: {
    cacheTTL: number;              // Default: 10 minutes
    maxConcurrentRequests: number; // Default: 5
    timeoutMs: number;             // Default: 30000
  };
}
```

### Configuration Presets

- **`fast`**: Optimized for speed over accuracy
- **`accurate`**: Optimized for accuracy over speed  
- **`balanced`**: Default balanced approach
- **`social`**: Emphasizes social proof and friend network data

## 🛠️ Intelligence Engines

### Friend Network Analyzer

Analyzes user's friend network to provide social proof and compatibility scores.

```typescript
const analyzer = new FriendNetworkAnalyzer(userId);
const insights = await analyzer.analyzeVenueForNetwork(venueId);

// Returns: friend visits, network rating, compatibility score, social trends
```

**Features:**
- Friend visit history analysis
- Network compatibility scoring
- Social trend detection
- Testimonial extraction

### Crowd Intelligence Analyzer

Predicts venue capacity and optimal visit times using historical presence data.

```typescript
const analyzer = new CrowdIntelligenceAnalyzer(venueId);
const intelligence = await analyzer.analyzeCrowdIntelligence(venueCategories);

// Returns: current capacity, peak predictions, wait times, best visit times
```

**Features:**
- Real-time capacity estimation
- Peak time prediction
- Wait time estimation
- Optimal visit time recommendations

### Enhanced Vibe Matching

Provides personalized vibe compatibility using user preferences and behavior patterns.

```typescript
const matcher = new EnhancedVibeMatching(userId);
const match = await matcher.calculateEnhancedVibeMatch(
  userVibes, 
  venueCategories, 
  venueVibe,
  userHistory
);

// Returns: enhanced match score, explanation, synergy analysis
```

**Features:**
- Personalized preference learning
- Time-context awareness
- Detailed match explanations
- Synergy analysis

### ML Recommendation Engine

Uses machine learning to predict venue preferences based on user behavior patterns.

```typescript
const engine = new MLRecommendationEngine(userId);
const recommendations = await engine.generateRecommendations(venues, context);

// Returns: ML-powered scores with confidence levels and explanations
```

**Features:**
- Behavior pattern analysis
- Temporal preference matching
- Social context inference
- Confidence scoring

## 🔄 Caching Strategy

### Cache Types

- **Venue Data**: 10 minutes (frequently changing)
- **Friend Network**: 5 minutes (social data)
- **Crowd Intelligence**: 2 minutes (real-time data)
- **Weather Data**: 10 minutes (contextual data)
- **ML Recommendations**: 15 minutes (computationally expensive)

### Usage

```typescript
import { withCache, CacheKeys } from '@/lib/venue-intelligence/caching';

const cachedData = await withCache(
  CacheKeys.venues(lat, lng),
  () => fetchVenuesFromDatabase(),
  10 // TTL in minutes
);
```

## 📈 Analytics & Monitoring

### Event Tracking

```typescript
import { 
  trackRecommendationView,
  trackRecommendationClick,
  trackRecommendationFavorite 
} from '@/lib/venue-intelligence/analytics';

// Track user interactions
trackRecommendationView(venueId, userId, recommendation);
trackRecommendationClick(venueId, userId, recommendation);
trackRecommendationFavorite(venueId, userId, recommendation);
```

### Analytics Dashboard

```typescript
import { venueAnalytics } from '@/lib/venue-intelligence/analytics';

const analytics = venueAnalytics.getAnalytics();
// Returns: performance metrics, quality distribution, engagement rates

const venuePerformance = venueAnalytics.getVenuePerformance(venueId);
// Returns: views, clicks, favorites, average confidence

const userEngagement = venueAnalytics.getUserEngagement(userId);
// Returns: engagement patterns, preferred vibe ranges
```

## 🚨 Error Handling

### Graceful Degradation

The system provides multiple levels of fallback:

1. **Primary**: Full intelligence with all data sources
2. **Degraded**: Basic recommendations with limited intelligence
3. **Fallback**: Simple venue list with minimal processing

```typescript
import { withErrorHandling, createFallbackRecommendations } from '@/lib/venue-intelligence/errorHandling';

// Wrap operations with error handling
const result = await withErrorHandling(
  () => complexRecommendationLogic(),
  'RECOMMENDATION_ERROR',
  fallbackValue
);
```

### Error Monitoring

```typescript
import { VenueRecommendationErrorHandler } from '@/lib/venue-intelligence/errorHandling';

const errorStats = VenueRecommendationErrorHandler.getErrorStats();
// Returns: error counts by severity, recent errors
```

## 🎨 UI Components

### Loading States

```typescript
import { 
  VenueCardSkeleton,
  VenueCardListSkeleton,
  VenueCardGridSkeleton 
} from '@/components/ui/VenueCardSkeleton';

// Use during loading
{loading && <VenueCardListSkeleton count={5} />}
```

### Recommendation Display

```typescript
import { VenueRecommendationCard } from '@/components/social/VenueRecommendationCard';

<VenueRecommendationCard 
  recommendation={recommendation}
  onView={() => trackRecommendationView(recommendation.id, userId, recommendation)}
  onFavorite={() => trackRecommendationFavorite(recommendation.id, userId, recommendation)}
/>
```

## 🔬 Testing

### Unit Tests

```bash
npm test venue-intelligence
```

### Integration Tests

```bash
npm test tests/venue-intelligence/venue-recommendations.test.ts
```

### Test Coverage

- ✅ Hook functionality with mocked data
- ✅ Error handling and fallbacks
- ✅ Caching behavior and expiration
- ✅ Configuration validation
- ✅ Analytics event tracking
- ✅ Intelligence engine calculations

## 🚀 Performance Optimizations

### Implemented

- **Caching**: Multi-level caching with appropriate TTLs
- **Error Handling**: Graceful degradation with fallbacks
- **Lazy Loading**: Components load intelligence data progressively
- **Batch Processing**: Multiple venues processed efficiently
- **Configuration**: Tunable performance vs accuracy trade-offs

### Recommendations

- Consider implementing service workers for offline caching
- Add CDN caching for venue images
- Implement request deduplication for concurrent requests
- Consider database query optimization with indexes

## 📝 Migration Guide

### From Basic Venue Display

If you're upgrading from basic venue display:

1. Replace `useVenues()` with `useVenueRecommendations()`
2. Update UI components to use `VenueRecommendationCard`
3. Add loading states with skeleton components
4. Implement analytics tracking for user interactions

### Database Requirements

Ensure these tables exist:
- `venues` (with lat/lng coordinates)
- `friends` (for social proof)
- `vibes_now` (for real-time presence)
- `venue_stays` (for behavior analysis)
- `user_venue_interactions` (for ML training)

## 🤝 Contributing

### Adding New Intelligence

1. Create new analyzer class in appropriate file
2. Integrate with `useVenueRecommendations` hook
3. Add configuration options if needed
4. Write comprehensive tests
5. Update documentation

### Performance Improvements

1. Profile with realistic data volumes
2. Add caching where appropriate
3. Consider database query optimization
4. Test error handling paths

## 📚 API Reference

For detailed API documentation, see individual files:

- `useVenueRecommendations.ts` - Main hook
- `friendNetworkAnalysis.ts` - Social intelligence
- `crowdIntelligence.ts` - Capacity analysis
- `mlRecommendations.ts` - ML engine
- `errorHandling.ts` - Error management
- `caching.ts` - Performance optimization
- `config.ts` - Configuration system
- `analytics.ts` - Monitoring and tracking