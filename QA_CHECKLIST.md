# Vibe Phase 1 MVP - QA Checklist

## 🚀 Acceptance Gates

### Performance
- [ ] `p95 evaluate() ≤ 80ms` on mid-range device
- [ ] No noticeable battery drain during 30-min session
- [ ] TypeScript compilation clean: `npm run typecheck`

### Functionality  
- [ ] Works with no location permissions (graceful degradation)
- [ ] No network requests in this phase
- [ ] No PII leaves device
- [ ] Gradients visibly change when testing different inputs

### Testing
- [ ] Unit tests pass: `npm run test`
- [ ] DB parity test remains green
- [ ] DEV console shows no vibe enum mismatches

## 🧪 Manual QA Steps

### 1. Basic Engine Test
```bash
# In browser dev console:
floq.vibeNow()           # Should return current vibe reading
floq.vibeTest(1.4, 25)   # Test with movement/venue data
```

### 2. Debug Panel
- Flip `VibeDebugPanel open={true}` in FieldLayout
- Should show current vibe, confidence, and component scores
- Updates every 60 seconds

### 3. Gradient Integration
- Watch for ring/gradient color changes
- Test by temporarily modifying SignalCollector defaults:
```javascript
// In SignalCollector.collect(), temporarily return:
{ hour: 18, isWeekend: true, speedMps: 1.4, dwellMinutes: 25, screenOnRatio01: 0.1 }
```
- Should see social/hype/flowing tendencies and brighter gradients

### 4. Accessibility
- [ ] Reduce Motion preference disables shimmer animations
- [ ] No accessibility violations in debug panel

## 🔧 Environment Setup

Add to `.env`:
```
VITE_VIBE_DETECTION=on
```

## 📊 Success Metrics

- Engine runs smoothly for 30+ minutes
- Confidence scores generally >0.5 during peak hours
- Component scores make intuitive sense (high circadian during evening, etc.)
- Gradient updates are visually noticeable
- No console errors or memory leaks

## 🐛 Known Limitations (Phase 1)

- Uses placeholder movement/venue data (real GPS integration in Phase 2)
- No weather integration yet
- Confidence not reflected in UI desaturation
- No user feedback loop yet

## 🎯 Phase 2 Prep

- Wire real GPS speed calculation  
- Add venue dwell time tracking
- Implement confidence-based UI effects
- Add "correct vibe" feedback UI