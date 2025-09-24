# Momentary Floq UI (Scaffold)

**Composition** (mobile-first, universal):
1. `MomentHeader` – title + countdown + back/more
2. `MomentumIndicator` – gaining / steady / winding
3. `CurrentStopCard` – venue, vibe pulse, friends here, quick actions
4. `UpcomingStopsCarousel` – horizontal next stops
5. `EphemeralFeed` – moment feed (uses RPC + realtime to be added)
6. `ActionBar` – Join / Share Location / Invite / Save as Ripple

**Data hooks**: see `src/hooks/` (`useWavesNear`, `useRipplesNear`, `useWaveRippleOverview`, `useMomentFeed`, `useMyLiveFloqs`).

**Next wiring**:
- Replace map placeholders with Mapbox (web) / react-native-maps (native).
- Subscribe to realtime channels for feed + participants + floq row.
- Drive `MomentumIndicator` from overview deltas (friend-count trend) or session activity.
- Respect design tokens (colors, spacing, radius) via Tailwind CSS theme.

**UI Library**: 
- Uses shadcn/ui components with Tailwind CSS
- Adapted from original Tamagui version to match project's existing UI patterns

**Key Components**:
- All components are responsive and follow the project's design system
- ActionBar buttons are flexible and wrap appropriately on smaller screens
- Cards use consistent shadcn/ui styling
- Loading states and error handling are implemented