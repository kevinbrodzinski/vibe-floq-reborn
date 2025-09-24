# CORS & Vite Module Resolution Fixes

## Summary of Changes

### ✅ Vite Configuration Updates
- **`vite.config.ts`**: Added ESM alias for `@supabase/postgrest-js` and included Supabase packages in `optimizeDeps`
- **`vite.web.config.ts`**: Applied matching configuration for consistency

### ✅ Supabase Client Headers
- **`src/integrations/supabase/client.ts`**: Removed problematic `Range-Unit` and `Accept-Profile` headers that were causing CORS preflight failures

### ✅ Enhanced CORS Helper
- **`supabase/functions/_shared/cors.ts`**: Added new `buildCors()` function that:
  - Echoes all requested headers to prevent "not allowed" errors
  - Provides unified `preflight`, `json`, and `error` response helpers
  - Maintains backward compatibility with existing functions

### ✅ Updated Edge Functions
- **`social-forecast/index.ts`**: Now uses enhanced CORS helper
- **`clusters/index.ts`**: Now uses enhanced CORS helper

### ✅ Testing Harness
- **`scripts/test-cors.mjs`**: Tool to validate CORS preflight handling

## Expected Results
- Preview should load without Vite import errors
- All edge function calls should return 200/204 (no CORS failures)
- Future header additions won't break CORS
- Consistent error handling across functions

## Next Steps
Apply the same CORS pattern to remaining edge functions by:
1. Import: `import { buildCors } from '../_shared/cors.ts';`
2. Pattern: `const { preflight, json, error } = buildCors(req);`
3. Replace local CORS with shared helper

## Testing
Run the CORS test harness:
```bash
node scripts/test-cors.mjs \
  TEST_ORIGIN=https://your-preview-url \
  SUPABASE_FUNCTIONS_URL=https://reztyrrafsmlvvlqvsqt.supabase.co/functions/v1
```