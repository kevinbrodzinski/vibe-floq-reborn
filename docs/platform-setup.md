# Dual-Platform Setup

This project supports both **web preview** and **native iOS/Android builds** using a dual-entry point architecture.

## Architecture Overview

- **One codebase, two entry points**
- **Web**: Uses Vite + `src/main.web.tsx`
- **Native**: Uses Capacitor + `src/main.native.tsx`

## Entry Points

### Web Entry (`src/main.web.tsx`)
- Used for browser development and deployment
- Handles Vite HMR and web-specific optimizations
- No React Native dependencies

### Native Entry (`src/main.native.tsx`)
- Used for iOS/Android builds via Capacitor
- Includes React Native polyfills and native dependencies
- Shares the same React components as web

## Development Workflow

### Web Development (Default)
```bash
pnpm dev              # Start web development server
pnpm build:web        # Build for web production
pnpm preview:web      # Preview web production build
```

### Native Development
```bash
pnpm sync:ios         # Sync to iOS platform  
pnpm open:ios         # Open in Xcode
TARGET=native pnpm build:ios  # Build iOS app with native target
pnpm clean:ios        # Clean iOS artifacts
```

**Important**: Always use `TARGET=native` for iOS builds to disable HMR and ensure proper native bundling.

## Platform Detection

Use the platform helpers for better performance:

```typescript
import { isNative, IS_NATIVE } from '@/lib/platform';

// ✅ Use constant for better tree-shaking
if (IS_NATIVE) {
  // Native-specific code (dead code eliminated on web)
} else {
  // Web-specific code (dead code eliminated on native)
}

// ✅ Or use function for dynamic checks
if (isNative()) {
  // When you need runtime detection
}
```

## Adding Platform-Specific Dependencies

### ✅ Safe for both platforms
- React, React DOM
- Supabase JS
- Zustand, React Query
- Most UI libraries

### ⚠️ Guard native-only imports
```typescript
// ❌ Don't do this - breaks web builds
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ Do this instead
import { isNative } from '@/lib/platform';

let storage;
if (isNative()) {
  storage = require('@react-native-async-storage/async-storage').default;
} else {
  storage = localStorage;
}
```

## Final Pre-TestFlight Checklist

⚠️ **Critical**: Since `tsconfig.json` is read-only, manually verify TypeScript recognizes `@entry` alias in your editor.

1. **Web sanity check**: `npm run dev` → browser loads without errors
2. **Web production**: `npm run build:web && npm run preview:web` → static preview works  
3. **Native build**: `TARGET=native npm run build:ios` → no React Native resolution errors
4. **iOS sync**: `npx cap sync ios` after every build (copies fresh Vite bundle)
5. **Simulator test**: `npx cap open ios` → app boots and shows React UI
6. **Archive & upload**: TestFlight processing complete

## CI/CD

- **Web preview**: Automatically deployed via Vite/Netlify
- **Native builds**: Use EAS Build or Capacitor CI for TestFlight/Play Store

## File Structure

```
src/
├── main.web.tsx      # Web entry point
├── main.native.tsx   # Native entry point
├── App.tsx           # Shared app component
├── lib/
│   └── platform.ts   # Platform detection helpers
└── components/       # Shared React components

config/
├── vite.web.config.ts    # Web bundler config
├── metro.config.js       # Native bundler config
└── eas.json              # Native build config
```

## Troubleshooting

### Web build fails
- Check for native-only imports in shared files
- Ensure all React Native dependencies are properly guarded

### Native build fails
- Run `pnpm clean:ios` and try again
- Check that all required native dependencies are installed
- Verify Xcode project settings in `ios/` directory

### Both builds work but features differ
- Ensure platform detection is working correctly
- Check environment variable loading (`.env.web` vs `.env.native`)