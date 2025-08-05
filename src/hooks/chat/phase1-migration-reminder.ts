/**
 * IMPORTANT: After applying the Phase-1 database migrations, you need to:
 * 
 * 1. Run: `pnpm supabase:types` (or `npx supabase gen types typescript --project-id YOUR_PROJECT_ID`)
 * 2. Restart your TypeScript server and ESLint
 * 
 * This will:
 * - Add the new columns (message_type, status, reply_to_id) to the generated types
 * - Include the new RPCs (send_dm_message, toggle_dm_reaction) in the RPC types
 * - Enable full type safety for the Phase-1 features
 * 
 * Until then, the hooks use fallback implementations with (supabase as any).rpc()
 * to avoid TypeScript errors while maintaining functionality.
 */

export const PHASE_1_MIGRATION_REMINDER = true;