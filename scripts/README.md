# Floq Presence Testing Infrastructure

This directory contains the testing infrastructure for validating the live presence system before production rollout.

## Quick Start

### 1. Smoke Test (Basic Validation)
```bash
# Test basic presence pipeline with 20 mock users
npm run smoke:presence -- --rows 20 --jwt $SERVICE_ROLE_KEY
```

### 2. Load Test (Stress Testing)
```bash
# Create 150 fake users with auth tokens (run once)
npm run create:loadbots -- --count 150 --service-key $SERVICE_ROLE_KEY

# Start continuous load testing with 150 simulated users
npm run load:presence -- --count 150
```

### 3. Device Testing
Follow the [device QA checklist](./device-qa-checklist.md) for manual testing on real devices.

## Environment Setup

### Required Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
POSTHOG_PUBLIC_KEY=your-posthog-key  # For error tracking
```

### Supabase Service Role Key
You'll need the service role key for:
- Creating fake users (`createFakeUsers.ts`)
- Bypassing RLS during smoke tests (`smokePresence.ts`)

Get it from: [Supabase Dashboard → Settings → API](https://supabase.com/dashboard/project/11986cc9-7473-4e33-83dd-acd244d83d3e/settings/api)

## Scripts Overview

### `smokePresence.ts`
**Purpose**: Validate the core presence pipeline works correctly
**What it does**:
- Creates N random presence entries via edge function
- Tests RLS policies with anon key
- Validates geographic filtering (ST_DWithin)
- Checks data integrity (geohash6, expires_at)

**Usage**:
```bash
npx ts-node scripts/smokePresence.ts --rows 50 --jwt $SERVICE_ROLE_KEY
```

### `createFakeUsers.ts`
**Purpose**: Generate authenticated users for realistic load testing
**What it does**:
- Creates N users in Supabase Auth
- Generates long-lived JWT tokens
- Saves tokens to `loadbot-tokens.json`

**Usage**:
```bash
npx ts-node scripts/createFakeUsers.ts --count 150 --service-key $SERVICE_ROLE_KEY
```

### `loadPresence.ts`
**Purpose**: Simulate real-world presence load
**What it does**:
- Uses pre-generated auth tokens
- Updates presence every 8-12 seconds per user
- Staggers requests to avoid thundering herd
- Reports progress with dots (. = success)

**Usage**:
```bash
npx ts-node scripts/loadPresence.ts --count 150
```

## Testing Strategy

### Phase 1: Development
- Run smoke test on every PR
- Fix any RLS or edge function issues
- Validate PostHog error tracking

### Phase 2: Staging
- Deploy to staging environment
- Run load test with 150 simulated users
- Execute device QA checklist
- Monitor performance metrics

### Phase 3: Production Rollout
- Start with 10% rollout (`?rollout=10`)
- Monitor PostHog dashboard for errors
- Gradually increase percentage
- Full rollout at 100%

## Monitoring & Analytics

### PostHog Events
The system tracks these critical error events:
- `presence_upsert_error`: Edge function failures
- `presence_ws_error`: WebSocket connection issues

### Performance Metrics
Monitor these during load testing:
- **Presence Update Latency**: <2 seconds
- **WebSocket Reconnection**: <10 seconds  
- **Database Write Rate**: Check Supabase dashboard
- **Memory Usage**: Should remain stable

## Troubleshooting

### Common Issues

**Smoke test fails with "Expected at least 1 row"**
- Check RLS policies on `vibes_now` table
- Verify edge function is inserting data correctly
- Ensure anon key has SELECT permissions

**Load test shows many errors**
- Check if `loadbot-tokens.json` exists
- Verify tokens haven't expired (60min default)
- Monitor Supabase auth rate limits

**WebSocket errors during device testing**
- Check network connectivity
- Verify realtime is enabled for the table
- Monitor Supabase realtime logs

### Debug Mode URLs
Use these for manual testing:
- `?presence=live` - Full live mode
- `?presence=stub` - Two static dots for UI testing
- `?presence=mock` - No presence data
- `?debug_presence=true` - Enable presence debug logs
- `?rollout=50` - 50% rollout simulation

## File Structure
```
scripts/
├── README.md                    # This file
├── smokePresence.ts            # Basic pipeline validation
├── createFakeUsers.ts          # Bulk user creation
├── loadPresence.ts             # Continuous load testing
├── device-qa-checklist.md     # Manual testing guide
└── loadbot-tokens.json         # Generated auth tokens (gitignored)
```

## CI Integration

Add to your GitHub Actions workflow:
```yaml
- name: Smoke Test Presence
  run: npm run smoke:presence -- --rows 10 --jwt ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
  env:
    NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```