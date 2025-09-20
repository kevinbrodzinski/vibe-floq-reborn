// Safe shim for any deep import that expects a default export.
// Import from the PACKAGE ROOT (exported by the package), not a deep path,
// and then provide a default for consumers that expect one.
import * as pkg from '@supabase/postgrest-js';

// Named export you might use directly
export const PostgrestClient = pkg.PostgrestClient;

// Re-export all named symbols so nothing is lost
export * from '@supabase/postgrest-js';

// Provide a default so wrapper.mjs / consumers that expect default won't crash
export default pkg.PostgrestClient;