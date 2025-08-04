# Venue Intelligence Backend System

A comprehensive backend system for powering sophisticated venue recommendations with real-time intelligence, social proof, crowd analysis, and machine learning.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Backend Architecture                     │
├─────────────────────────────────────────────────────────────┤
│  🚀 Supabase Edge Functions (Deno)                        │
│  ├── venue-intelligence-v2 (Main API)                     │
│  ├── venue-analytics (Analytics Collection)               │
│  ├── crowd-intelligence (Real-time Crowd Data)            │
│  └── get_weather (Weather Context)                        │
├─────────────────────────────────────────────────────────────┤
│  💾 PostgreSQL Database + PostGIS                         │
│  ├── Core Tables (venues, profiles, friends)              │
│  ├── Intelligence Tables (venue_events, venue_offers)     │
│  ├── Analytics Tables (venue_recommendation_analytics)    │
│  ├── ML Tables (user_venue_interactions)                  │
│  └── Cache Tables (venue_intelligence_cache)              │
├─────────────────────────────────────────────────────────────┤
│  ⚡ Real-time Features                                     │
│  ├── Live Presence Tracking (vibes_now)                   │
│  ├── Crowd Intelligence (capacity prediction)             │
│  ├── Event Notifications (venue_events)                   │
│  └── Special Offers (venue_offers)                        │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Edge Functions

### 1. venue-intelligence-v2

**Primary API for venue recommendations and intelligence**

```typescript
POST /functions/v1/venue-intelligence-v2
```

**Modes:**
- `recommendations` - Get personalized venue recommendations
- `friend_network` - Analyze friend network for social proof
- `crowd_intelligence` - Get crowd data for venues
- `vibe_match` - Calculate vibe compatibility
- `analytics` - Get recommendation analytics

**Example Request:**
```json
{
  "mode": "recommendations",
  "user_id": "user-uuid",
  "lat": 40.7128,
  "lng": -74.0060,
  "user_vibes": ["social", "energetic"],
  "limit": 10,
  "config": {
    "scoring_weights": {
      "vibe_match": 0.4,
      "social_proof": 0.3,
      "crowd_intelligence": 0.2,
      "proximity": 0.1,
      "novelty": 0.0
    },
    "max_distance_km": 5,
    "min_confidence": 0.3
  }
}
```

**Response:**
```json
{
  "success": true,
  "recommendations": [
    {
      "venue": {
        "id": "venue-uuid",
        "name": "Cool Bar",
        "categories": ["bar", "nightlife"],
        "distance": "0.8km",
        "travel_time": "3 min"
      },
      "intelligence": {
        "vibe_match": {
          "score": 0.85,
          "explanation": "Strong alignment between your social + energetic vibes and venue's bar + nightlife atmosphere",
          "user_vibes": ["social", "energetic"],
          "venue_vibes": ["social", "energetic"],
          "synergy": "Multiple vibe alignments create natural connection"
        },
        "social_proof": {
          "friend_visits": 3,
          "recent_visitors": [...],
          "network_rating": 4.5,
          "popular_with": "3 friends visited recently"
        },
        "crowd_intelligence": {
          "current_capacity": 45,
          "predicted_peak": "22:00 (busy period)",
          "typical_crowd": "After-work crowd, casual meetups",
          "wait_time_estimate": "5-10 minute wait expected",
          "best_time_to_visit": "8pm for optimal experience"
        }
      },
      "scoring": {
        "confidence": 0.82,
        "top_reasons": ["85% vibe match", "3 friends visited recently", "Great time to visit"],
        "warnings": [],
        "breakdown": {
          "vibe_match": 0.85,
          "social_proof": 0.6,
          "crowd_intelligence": 0.7,
          "proximity": 0.9,
          "novelty": 0.8
        }
      }
    }
  ],
  "total": 1,
  "config_used": {...}
}
```

### 2. venue-analytics

**Analytics collection and performance tracking**

```typescript
POST /functions/v1/venue-analytics
```

**Modes:**
- `track_event` - Track single recommendation event
- `track_batch` - Track multiple events at once
- `get_analytics` - Get user analytics summary
- `get_venue_performance` - Get venue performance metrics
- `get_user_engagement` - Get user engagement patterns

**Example Event Tracking:**
```json
{
  "mode": "track_event",
  "event": {
    "user_id": "user-uuid",
    "venue_id": "venue-uuid",
    "recommendation_id": "rec-123",
    "event_type": "click",
    "confidence_score": 0.82,
    "vibe_match_score": 0.85,
    "social_proof_score": 0.6,
    "metadata": {
      "source": "social_tab",
      "position": 1
    }
  }
}
```

### 3. crowd-intelligence

**Real-time crowd data and capacity prediction**

```typescript
POST /functions/v1/crowd-intelligence
```

**Modes:**
- `get_crowd_data` - Get current crowd intelligence
- `update_presence` - Update user presence at venue
- `get_historical_patterns` - Get historical crowd patterns
- `predict_capacity` - Predict future capacity

**Example Crowd Data:**
```json
{
  "mode": "get_crowd_data",
  "venue_id": "venue-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "crowd_data": {
    "venue_id": "venue-uuid",
    "current_capacity": 45,
    "capacity_percentage": 45,
    "dominant_vibe": "social",
    "vibe_distribution": {
      "social": 8,
      "energetic": 5,
      "flowing": 2
    },
    "predicted_peak": "22:00 (90% capacity)",
    "wait_time_estimate": "5-10 minute wait expected",
    "best_time_to_visit": "8pm for optimal experience",
    "crowd_trends": {
      "is_getting_busier": true,
      "peak_time": "22:00",
      "quiet_time": "15:00",
      "weekday_vs_weekend": "weekend_preferred"
    },
    "real_time_events": [...]
  }
}
```

## 💾 Database Schema

### Core Tables

#### venues
```sql
CREATE TABLE venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_id text NOT NULL,
  name text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  geom geography(point,4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng,lat),4326)) STORED,
  address text,
  categories text[],
  rating numeric,
  price_tier text DEFAULT '$$',
  photo_url text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (provider, provider_id)
);
```

#### venue_events
```sql
CREATE TABLE venue_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  event_type text DEFAULT 'general',
  capacity integer,
  price_range text,
  created_at timestamptz DEFAULT now()
);
```

#### venue_offers
```sql
CREATE TABLE venue_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id uuid REFERENCES venues(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  offer_type text DEFAULT 'discount',
  discount_percentage integer,
  discount_amount numeric,
  expires_at timestamptz NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

### Intelligence Tables

#### user_venue_interactions
```sql
CREATE TABLE user_venue_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  venue_id uuid REFERENCES venues(id) ON DELETE CASCADE,
  interaction_type text NOT NULL, -- view, click, favorite, share, check_in
  interaction_count integer DEFAULT 1,
  last_interaction_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  UNIQUE(profile_id, venue_id, interaction_type)
);
```

#### venue_recommendation_analytics
```sql
CREATE TABLE venue_recommendation_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  venue_id uuid REFERENCES venues(id) ON DELETE CASCADE,
  recommendation_id text NOT NULL,
  event_type text NOT NULL, -- view, click, favorite, visit, share
  confidence_score numeric,
  vibe_match_score numeric,
  social_proof_score numeric,
  crowd_intelligence_score numeric,
  proximity_score numeric,
  novelty_score numeric,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
```

#### venue_intelligence_cache
```sql
CREATE TABLE venue_intelligence_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text UNIQUE NOT NULL,
  data jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

### Database Functions

#### venues_within_radius
```sql
SELECT * FROM venues_within_radius(40.7128, -74.0060, 5.0);
```
Returns venues within specified radius with distance calculations.

#### get_user_behavior_patterns
```sql
SELECT * FROM get_user_behavior_patterns('user-uuid', 180);
```
Returns user behavior patterns for ML training.

#### get_friend_network_venue_data
```sql
SELECT * FROM get_friend_network_venue_data('user-uuid', 'venue-uuid');
```
Returns friend network data for social proof calculations.

#### upsert_venue_interaction
```sql
SELECT upsert_venue_interaction('user-uuid', 'venue-uuid', 'click', '{"source": "app"}');
```
Upserts user venue interaction for ML training.

## 🔄 Real-time Features

### Presence Tracking
- Users can update their presence at venues via `crowd-intelligence` function
- Real-time capacity calculations based on active presence
- Automatic expiration of presence data

### Live Events
- Venues can have real-time events (happy hours, live music, etc.)
- Events are included in venue intelligence responses
- Time-based filtering for relevant events

### Special Offers
- Dynamic special offers with expiration times
- Integrated into venue recommendations
- Automatic cleanup of expired offers

## 📊 Analytics & Monitoring

### Event Tracking
- **View**: User sees venue recommendation
- **Click**: User clicks on venue
- **Favorite**: User favorites venue
- **Visit**: User visits venue
- **Share**: User shares venue

### Performance Metrics
- Click-through rates
- Conversion rates (view → visit)
- Recommendation confidence scores
- User engagement patterns
- Venue performance analytics

### Data Quality Monitoring
- Recommendation score completeness
- Data freshness tracking
- Error rate monitoring
- Cache hit rates

## ⚡ Performance Optimizations

### Database Indexes
```sql
-- Spatial index for venue queries
CREATE INDEX venues_gix ON venues USING GIST (geom);

-- Performance indexes
CREATE INDEX idx_venue_events_venue_id_time ON venue_events(venue_id, start_time);
CREATE INDEX idx_user_venue_interactions_profile_venue ON user_venue_interactions(profile_id, venue_id);
CREATE INDEX idx_venue_recommendation_analytics_user_time ON venue_recommendation_analytics(user_id, created_at);
```

### Caching Strategy
- **Venue Intelligence Cache**: 10-15 minutes TTL
- **Friend Network Data**: 5 minutes TTL
- **Crowd Intelligence**: 2 minutes TTL
- **Weather Data**: 10 minutes TTL

### Query Optimization
- PostGIS spatial queries for efficient radius searches
- Batch processing for multiple venue analysis
- Parallel processing in Edge Functions
- Connection pooling and query optimization

## 🔧 Configuration

### Environment Variables
```bash
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENWEATHER_API_KEY=your-weather-api-key
```

### Scoring Weights Configuration
```json
{
  "scoring_weights": {
    "vibe_match": 0.35,        // Vibe compatibility importance
    "social_proof": 0.25,      // Friend network influence
    "crowd_intelligence": 0.15, // Crowd data importance
    "proximity": 0.25,         // Distance factor
    "novelty": 0.1            // Exploration factor
  }
}
```

## 🚀 Deployment

### Database Migration
```bash
# Apply the venue intelligence migration
supabase db push
```

### Edge Functions Deployment
```bash
# Deploy all functions
supabase functions deploy venue-intelligence-v2
supabase functions deploy venue-analytics
supabase functions deploy crowd-intelligence

# Deploy with environment variables
supabase secrets set OPENWEATHER_API_KEY=your-key
```

### Monitoring Setup
```bash
# Enable function logs
supabase functions logs venue-intelligence-v2 --follow

# Monitor database performance
supabase db logs --follow
```

## 📈 Usage Examples

### Frontend Integration
```typescript
// Get venue recommendations
const response = await supabase.functions.invoke('venue-intelligence-v2', {
  body: {
    mode: 'recommendations',
    user_id: user.id,
    lat: userLocation.lat,
    lng: userLocation.lng,
    user_vibes: ['social', 'energetic'],
    limit: 10
  }
});

// Track user interaction
await supabase.functions.invoke('venue-analytics', {
  body: {
    mode: 'track_event',
    event: {
      user_id: user.id,
      venue_id: venue.id,
      recommendation_id: `rec-${Date.now()}`,
      event_type: 'click',
      confidence_score: recommendation.confidence
    }
  }
});

// Get crowd intelligence
const crowdData = await supabase.functions.invoke('crowd-intelligence', {
  body: {
    mode: 'get_crowd_data',
    venue_id: venue.id
  }
});
```

### Mobile App Integration
```typescript
// Update user presence
await supabase.functions.invoke('crowd-intelligence', {
  body: {
    mode: 'update_presence',
    venue_id: currentVenue.id,
    presence_data: {
      vibe: 'social',
      duration_minutes: 120
    }
  }
});
```

## 🔍 Troubleshooting

### Common Issues

1. **Slow Venue Queries**
   - Check PostGIS indexes are created
   - Verify spatial queries use proper SRID
   - Monitor query execution plans

2. **Analytics Not Recording**
   - Verify user authentication
   - Check RLS policies
   - Monitor function logs

3. **Crowd Intelligence Inaccurate**
   - Check presence data expiration
   - Verify venue categorization
   - Review capacity calculation logic

### Performance Monitoring
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
WHERE query LIKE '%venues%' 
ORDER BY mean_time DESC;

-- Monitor cache hit rates
SELECT 
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE expires_at > now()) as cache_hits
FROM venue_intelligence_cache;
```

## 🚧 Future Enhancements

1. **Machine Learning Pipeline**
   - Automated model training
   - A/B testing framework
   - Personalization improvements

2. **Advanced Analytics**
   - Cohort analysis
   - Predictive modeling
   - Business intelligence dashboards

3. **External Integrations**
   - Google Maps integration
   - Social media data
   - Review platform APIs

4. **Scalability Improvements**
   - Redis caching layer
   - Background job processing
   - Microservices architecture

---

This backend system provides a robust foundation for sophisticated venue intelligence, supporting real-time recommendations, analytics, and crowd intelligence at scale.