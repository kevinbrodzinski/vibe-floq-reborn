# Device QA Checklist for Live Presence

Share this checklist with testers to validate presence functionality across different devices and network conditions.

## Pre-Test Setup
- [ ] Two devices with the app installed
- [ ] Both devices connected to the same Wi-Fi network
- [ ] Staging environment with `?presence=live` URL parameter

## 1. Baseline Connection Test
- [ ] Toggle LIVE mode in staging (`?presence=live`)
- [ ] Both devices on same Wi-Fi → Verify each dot appears within ≤2 s of location change
- [ ] Move one device 50+ meters → Dot position updates on other device

## 2. Geohash Bucket Switching Test
- [ ] Walk (or mock-GPS) ≥1.5 km east with one device
- [ ] Observer: Check Dev-overlay logs for WS unsubscribe/subscribe events
- [ ] Verify dot moves smoothly without duplicates or gaps

## 3. TTL Expiry Test
- [ ] Put Device A in background for 2+ minutes (≥90 s TTL)
- [ ] Observer: Dot fades on Device B within 90-120 seconds
- [ ] Re-open Device A → Dot re-appears within 10 s on Device B

## 4. Offline Resilience Test
- [ ] Device B: Enable airplane mode → wait 30 s → disable airplane mode
- [ ] App stays open throughout test
- [ ] Observer: WS reconnects automatically
- [ ] Presence refreshes via fallback `presence_nearby` call

## 5. Cluster Stress Test
**Prerequisites**: Run `npm run load:presence --count 150` on staging

- [ ] Pan/zoom map with 150+ load bots active
- [ ] Verify: Frame rate stays >48 fps (no severe jitter)
- [ ] Verify: "+N" badges render correctly for clusters >4 dots
- [ ] Verify: No memory leaks after 5+ minutes of panning

## 6. RLS Security Test
- [ ] Sign in Device A with user1, Device B with user2 (non-friends)
- [ ] Each device should see:
  - [ ] Self dot (when `include_self=true`)
  - [ ] Load bots (public visibility)
  - [ ] **NOT** the other real user (when `include_self=false`)

## 7. Analytics Validation
Monitor PostHog dashboard for these events during testing:

- [ ] `presence_upsert_error` → Should be 0 during normal operation
- [ ] `presence_ws_error` → Should be 0 during normal operation
- [ ] Any errors captured with device info and timestamp

## Failure Reporting Template

For any test failures, capture:

| Field | Value |
|-------|-------|
| Timestamp | `YYYY-MM-DD HH:MM:SS` |
| Device | `iPhone 15 / Pixel 8 / etc.` |
| Test Section | `TTL Expiry / Cluster Stress / etc.` |
| Expected | What should have happened |
| Actual | What actually happened |
| Screenshot | Attach if relevant |

## Post-Test Cleanup
- [ ] Stop load testing script (`Ctrl+C`)
- [ ] Clear staging data if needed
- [ ] Report results in shared document/Slack

## Performance Benchmarks
- **Presence Update Latency**: <2 seconds
- **WebSocket Reconnection**: <10 seconds
- **TTL Expiry**: 90-120 seconds
- **Frame Rate During Load**: >48 fps
- **Memory Usage**: Stable over 5+ minutes