
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

### Layer Decision Tree

When choosing the appropriate layer for a new component:

- **Does it block interaction behind it?** → `modal` (70)
- **Is it ephemeral feedback?** → `toast` (90) 
- **Is it a fixed tool/FAB?** → `system` (50)
- **Does it overlay the map?** → `overlay` (30)
- **Is it purely local stacking?** → Use relative values ≤ 30

### ESLint Protection

Our ESLint config automatically prevents hardcoded z-index values:
- No `z-[number]` or `z-{number}` in Tailwind classes above z-40
- No inline `zIndex: number` in style objects above 40
- UI library components in `/src/components/ui/` are exempt from these rules

Only relative z-index values ≤30 are allowed for local component stacking.

### Testing Z-Index Hierarchy

Use the test utilities in `/src/test/utils/zIndexHelpers.ts`:

```typescript
import { validateLayerHierarchy } from '@/test/utils/zIndexHelpers';

// Test that toasts appear above modals
await validateLayerHierarchy('[data-testid="toast"]', '[role="dialog"]');
```

### Troubleshooting

**Problem**: Component appears behind expected layer
**Solution**: 
1. Check if using semantic `zIndex()` helper
2. Verify parent container doesn't have lower z-index
3. Ensure no competing Tailwind z-classes

**Problem**: ESLint errors about hardcoded z-index
**Solution**: Replace with semantic layer from `@/constants/z`

**Problem**: Dropdown/menu hidden inside modal
**Solution**: UI library components should use `z-[75]` to appear above modals

### Performance Considerations

- The `zIndex()` helper is lightweight and doesn't cause re-renders
- Avoid creating many deeply nested stacking contexts
- Test performance on mobile with 5+ layered components active
