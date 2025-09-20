// Make postgrest-js safe in the browser regardless of how it was imported.
// We import the CJS bundle using a specific path that bypasses our aliases.
import * as cjs from '@supabase/postgrest-js/dist/cjs/index.cjs';

// Named export you'd typically use
export const PostgrestClient = cjs.PostgrestClient;

// Re-export all named symbols (if any)  
export * from '@supabase/postgrest-js/dist/cjs/index.cjs';

// Provide a default (what wrapper.mjs tried to do, but failed)
export default cjs.PostgrestClient;