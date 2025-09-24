# Serendipity Engine: Frequent Resonance Match

## Overview
The Serendipity Engine creates AI-powered "Frequent Resonance Matches" - unexpected but perfect social connections based on deep pattern analysis of user behavior, preferences, and temporal-spatial patterns.

## Core Algorithm: Frequent Resonance Match

### **Primary Factors (Total: 100%)**

#### 1. **Shared Interests & Vibes (35% weight)**
- **Music taste overlap** (10%)
- **Food preferences** (8%)
- **Hobbies & activities** (7%)
- **Reading/watching habits** (5%)
- **Vibe pairing at similar times** (5%) ⭐ *NEW - NEEDS BACKEND*

#### 2. **Temporal Compatibility (25% weight)**
- **Free time windows overlap** (10%)
- **Sleep schedules compatibility** (8%)
- **Availability patterns** (7%)

#### 3. **Spatial Resonance (25% weight)**
- **Frequent locations at similar times** (15%) ⭐ *EXISTING BACKEND*
- **Current location proximity** (5%)
- **Commute patterns overlap** (5%)

#### 4. **Social Chemistry (15% weight)**
- **Mutual friends** (8%)
- **Previous interaction quality** (4%)
- **Communication style compatibility** (3%)

---

## Backend Requirements

### ✅ **Existing Features**
- **Frequent locations tracking** - Already implemented
- **Time-based location patterns** - Available
- **User location history** - Stored in database

### 🔧 **Features to Build**

#### 1. **Vibe Pairing System**
```sql
-- New table: vibe_pairing_patterns
CREATE TABLE vibe_pairing_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  partner_user_id UUID REFERENCES profiles(id),
  vibe_type TEXT NOT NULL, -- 'hype', 'chill', 'social', etc.
  time_of_day TEXT NOT NULL, -- 'morning', 'afternoon', 'evening', 'night'
  day_of_week INTEGER, -- 0-6 (Sunday-Saturday)
  frequency_score DECIMAL(3,2), -- How often they vibe together
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient vibe pairing queries
CREATE INDEX idx_vibe_pairing_user_time ON vibe_pairing_patterns(user_id, time_of_day, day_of_week);
```

#### 2. **Resonance Matching Algorithm**
```typescript
interface ResonanceMatch {
  userId: string;
  partnerId: string;
  resonanceScore: number; // 0-100
  factors: {
    sharedInterests: number;
    temporalCompatibility: number;
    spatialResonance: number;
    socialChemistry: number;
    vibePairing: number;
  };
  reasoning: string[];
  suggestedActivity: string;
  suggestedTime: string;
  suggestedLocation: string;
}
```

#### 3. **Edge Function: generate-resonance-match**
```typescript
// supabase/functions/generate-resonance-match/index.ts
export const generateResonanceMatch = async (req: any) => {
  const { userId, limit = 5 } = req.body;
  
  // 1. Get user's frequent locations and times
  const frequentPatterns = await getFrequentPatterns(userId);
  
  // 2. Find users with overlapping patterns
  const potentialMatches = await findOverlappingUsers(userId, frequentPatterns);
  
  // 3. Calculate resonance scores
  const resonanceMatches = await calculateResonanceScores(userId, potentialMatches);
  
  // 4. Return top matches
  return resonanceMatches.slice(0, limit);
};
```

---

## Morning Swipe Card Format

### **Card Title**: "Today's Frequent Resonance Match"

### **Card Content**:
```
🎯 94% Resonance Match

👤 Sarah Chen
💫 "You both love indie coffee shops at 9am on weekdays"

🎵 Shared Interests: Indie music, coffee culture, morning walks
📍 Frequent Overlap: Blue Bottle Coffee (Venice) - 9:15am weekdays
🌅 Vibe Pairing: Both "chill" vibes during morning hours

💡 Suggested: Coffee & conversation at Blue Bottle
⏰ Time: Today 9:15am
📍 Location: Blue Bottle Coffee (Venice)

[Skip] [View Profile] [Connect]
```

### **AI Insight Footer**:
```
✨ AI detected perfect resonance based on your shared morning coffee ritual patterns and indie music taste
```

---

## Implementation Priority

### **Phase 1: Foundation** (Week 1)
- [ ] Create `vibe_pairing_patterns` table
- [ ] Build vibe pairing tracking system
- [ ] Implement basic resonance scoring

### **Phase 2: Algorithm** (Week 2)
- [ ] Develop `generate-resonance-match` edge function
- [ ] Integrate existing frequent location data
- [ ] Add temporal compatibility analysis

### **Phase 3: UI Integration** (Week 3)
- [ ] Create morning swipe card component
- [ ] Integrate with existing Pulse screen
- [ ] Add resonance match notifications

### **Phase 4: Optimization** (Week 4)
- [ ] Machine learning model for better predictions
- [ ] A/B testing for resonance scoring
- [ ] Performance optimization

---

## Technical Notes

### **Database Queries Needed**:
```sql
-- Get user's frequent locations with times
SELECT location, time_of_day, frequency 
FROM frequent_locations 
WHERE user_id = $1 
ORDER BY frequency DESC;

-- Find users with overlapping patterns
SELECT DISTINCT u.id, u.display_name
FROM users u
JOIN frequent_locations fl1 ON u.id = fl1.user_id
JOIN frequent_locations fl2 ON fl1.location = fl2.location 
  AND fl1.time_of_day = fl2.time_of_day
WHERE fl2.user_id = $1 AND u.id != $1;

-- Get vibe pairing data
SELECT partner_user_id, vibe_type, frequency_score
FROM vibe_pairing_patterns
WHERE user_id = $1 AND time_of_day = $2;
```

### **Performance Considerations**:
- Cache frequent patterns for 24 hours
- Use Redis for real-time resonance scoring
- Implement pagination for large user bases
- Add rate limiting for edge functions

---

## Success Metrics

### **Engagement Metrics**:
- Resonance match acceptance rate (>60% target)
- Time spent on morning cards
- Connection quality (measured by follow-up interactions)

### **Technical Metrics**:
- Algorithm response time (<500ms)
- Match accuracy (measured by user feedback)
- System uptime (>99.9%)

---

## Future Enhancements

### **Advanced Features**:
- **Mood-based matching** - Consider current emotional state
- **Event-based resonance** - Match during specific events/festivals
- **Seasonal patterns** - Account for seasonal behavior changes
- **Group resonance** - Match multiple compatible users

### **AI Improvements**:
- **Deep learning model** for better pattern recognition
- **Natural language processing** for activity suggestions
- **Predictive analytics** for future compatibility 