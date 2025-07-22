# Contributing Guide

## Z-Index Convention

Our unified z-index system ensures predictable stacking order across all components. Use these semantic constants from `@/constants/z`:

| Constant | Value | Purpose |
|----------|-------|---------|
| `Z.map` | 0 | Map / WebGL canvas |
| `Z.mapOverlay` | 10 | Markers, PIXI overlays |
| `Z.ui` (+ aliases `uiHeader`, `uiControls`, `uiInteractive`) | 20 | Regular page UI |
| `Z.overlay` / `banner` | 30 | Field / Floq banners, status strips |
| `Z.timewarp` | 40 | Time-warp slider |
| `Z.system` | 50 | Floating FABs, viewport controls |
| `Z.navigation` | 60 | Top header & bottom nav |
| `Z.modal` | 70 | All Radix sheets / dialogs |
| `Z.dmSheet` | 80 | Quick-DM overlay |
| `Z.toast` | 90 | Toast / Sonner notifications |
| `Z.debug` | 9999 | Dev-only panels |

### Usage

Instead of hardcoded values:
```tsx
// ❌ Don't do this
<div className="z-50 fixed bottom-4 right-4" />
<div style={{ zIndex: 75 }} />

// ✅ Do this
import { zIndex } from '@/constants/z';
<div {...zIndex('system')} className="fixed bottom-4 right-4" />
<div {...zIndex('modal', { position: 'sticky' })} />
```

The `zIndex()` helper returns `{ style: { zIndex: value } }` to avoid leaking attributes to the DOM.

### ESLint Protection

Our ESLint config automatically prevents hardcoded z-index values:
- No `z-[number]` or `z-{number}` in Tailwind classes
- No inline `zIndex: number` in style objects

Only relative z-index values ≤10 are allowed for local component stacking.