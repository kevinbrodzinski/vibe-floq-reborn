# TypeScript Guidelines

## Timer Types
- **Web build**: Uses DOM timers (`number`) for cross-platform compatibility
- **Native build**: Uses NodeJS timers (`NodeJS.Timeout`) for Expo compatibility  
- **Best Practice**: Always use `TimerId` and `IntervalId` types from `src/types/Timer.ts` for all timer references

```typescript
import type { TimerId, IntervalId } from '@/types/Timer';

// ✅ Correct
const timeout = useRef<TimerId | null>(null);
const interval = useRef<IntervalId | null>(null);

// ❌ Avoid long generic expressions
const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
```

## Cross-Platform Compatibility
- Web builds exclude `@types/node` to prevent NodeJS type conflicts
- Native builds include NodeJS types for Expo compatibility
- Timer type aliases automatically resolve to the correct platform type