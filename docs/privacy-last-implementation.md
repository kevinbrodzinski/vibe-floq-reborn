# Privacy-Last Implementation Framework

## Overview

The Privacy-Last framework ensures core features work independently of privacy controls, making privacy an optional enhancement rather than a foundational requirement. This approach maximizes reliability while enabling gradual privacy feature rollout.

## Architecture

### Core → Privacy-Optional → Enhanced Pattern

1. **Core Hook**: Implements base functionality without privacy considerations
2. **Privacy-Enhanced Hook**: Wraps core functionality with optional privacy gates
3. **Default Export**: Privacy-enhanced version for backward compatibility

## Feature Flags

Control privacy activation per environment and per feature:

```typescript
PRIVACY_GATES_ENABLED: process.env.NODE_ENV !== 'production', // Master switch
PRIVACY_CONTEXT_COLLECTION: false,  // Context-aware features  
PRIVACY_PREDICTABILITY_GATES: false // Predictability-heavy flows
```

## Implementation Guidelines

### DO: Privacy-Last Pattern

```typescript
// 1. Core hook (no privacy)
export function useFeatureCore() {
  return useQuery({ /* core implementation */ });
}

// 2. Privacy-enhanced wrapper
export function useFeatureWithPrivacy() {
  const core = useFeatureCore();
  const privacyEnabled = useFeatureFlag('PRIVACY_GATES_ENABLED');
  
  const enhancedAction = useCallback(async () => {
    if (!privacyEnabled) {
      return await coreAction(); // Direct execution
    }
    
    const { result, degrade } = await runWithPrivacyOptional(
      coreAction,
      { envelopeId: 'balanced', epsilonCost: 0.01 },
      'feature_name'
    );
    
    if (degrade === 'suppress') return { error: 'blocked' };
    if (degrade === 'category') return { data: fallbackData };
    
    return { data: result };
  }, [privacyEnabled]);
  
  return { ...core, enhancedAction };
}

// 3. Default export (privacy-enhanced)
export const useFeature = useFeatureWithPrivacy;
```

### DON'T: Privacy-First Antipattern

```typescript
// ❌ WRONG: Privacy as foundation
export function useFeature() {
  const gate = rankTimeGate(/* ... */);
  if (!gate.ok) throw new Error('Privacy gate failed'); // Breaks core functionality
  
  return useQuery({ /* core blocked by privacy */ });
}
```

## Testing Strategy

### Phase 1: Core Functionality
- Test core hooks independently
- Verify UI works without privacy flags
- Validate all user flows function normally

### Phase 2: Privacy Integration  
- Test privacy-enhanced hooks with flags OFF (should work identically to core)
- Test degradation modes return usable fallback objects
- Verify suppress mode doesn't break UI

### Phase 3: Production Rollout
- Enable `PRIVACY_GATES_ENABLED` in staging
- Monitor `privacy_gate` metrics for each feature
- Gradually enable per-feature flags based on metrics

## Code Review Checklist

- [ ] Core functionality works without privacy flags
- [ ] Privacy wrapper uses `runWithPrivacyOptional()` 
- [ ] All degradation modes return UI-compatible objects
- [ ] Feature flag controls privacy activation
- [ ] Observability logging included
- [ ] Tests cover both privacy-on and privacy-off scenarios
- [ ] Backward compatibility maintained

## Migration Paths

### Existing Features
1. Extract core functionality to `*Core` hook
2. Wrap with privacy-optional pattern
3. Update default export to privacy-enhanced version
4. Add feature flag control

### New Features
1. Implement core hook first
2. Add privacy wrapper as separate task
3. Ship core functionality before privacy integration
4. Enable privacy flags after core validation

## Benefits

- **Reliability**: Core features never break due to privacy system issues
- **Performance**: Privacy overhead only when explicitly enabled
- **Gradual Rollout**: Per-feature privacy activation based on metrics
- **Debugging**: Clear separation between core and privacy logic
- **Testing**: Independent validation of core vs privacy-enhanced paths
- **Maintainability**: Privacy concerns isolated from business logic

## Observability

Monitor these metrics during rollout:

- `privacy_gate: {ok, degrade, suppress}` by feature
- UI error rates before/after privacy activation  
- Feature latency impact
- Percentage of fallback vs full responses rendered
- User experience impact per degradation mode

## Key Files

- `src/core/privacy/privacyOptional.ts` - Core privacy-optional utility
- `src/constants/featureFlags.ts` - Privacy feature flags
- `src/lib/edgeLog.ts` - Privacy gate observability
- `tests/core/privacy/privacyOptional.test.ts` - Core framework tests