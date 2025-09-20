// Make postgrest-js safe in the browser regardless of how it was imported.
// We import the CJS bundle and re-expose a default + named exports.
import * as cjs from '@supabase/postgrest-js/dist/cjs/index.js';

// Named export you'd typically use
export const PostgrestClient = cjs.PostgrestClient;

// Re-export all named symbols (if any)
export * from '@supabase/postgrest-js/dist/cjs/index.js';

// Provide a default (what wrapper.mjs tried to do, but failed)
export default cjs.PostgrestClient;