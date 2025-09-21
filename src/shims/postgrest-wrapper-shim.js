// Postgrest-js wrapper shim to handle ESM/CJS compatibility issues
// This resolves the "does not provide an export named 'default'" error

import * as PostgRESTPackage from '@supabase/postgrest-js';

// Handle both named and default exports for maximum compatibility
export * from '@supabase/postgrest-js';

// Provide default export - check if the package has a default export first
export default PostgRESTPackage.default || PostgRESTPackage;