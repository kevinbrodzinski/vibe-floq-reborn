# 🛠 My-Flocks Refactor – Troubleshooting Guide

## Common Issues and Quick Fixes

| Symptom | Likely Cause | One-Minute Fix | Deep Dive |
|---------|-------------|----------------|-----------|
| **Plus is not defined** in browser console | Component that uses `<Plus />` wasn't re-imported after we renamed Lucide-react export to PlusIcon | ```tsx<br>import { Plus as PlusIcon } from 'lucide-react';<br>```<br>then search-replace any bare Plus elements. | ESLint rule `import/no-named-as-default` will catch this; turn it on in `.eslintrc`. |
| **Grey screen + "component suspended"** after clicking a flock | Moment drawer still wrapped in `<Suspense>` but its lazy import moved | Remove `<Suspense>` wrapper or wrap click handler in startTransition as:<br>`startTransition(() => openMomentDrawer(flock))` | See React docs "avoiding a waterfall" – lazy + dynamic import chain can cause the suspend. |
| **Skeletons don't animate** | Tailwind purge removed `animate-pulse` class in template-literal | Confirm class isn't stored in a variable. If it is, whitelist it in `tailwind.config.js` safelist. | In Tailwind v3, any literal string is safe – only dynamic concatenations are stripped. |
| **No gradient background on avatar** | `primary_vibe` came back null | `getVibeGradient('floq', vibe ?? 'default')` – make sure "default" is mapped in gradient.ts. | Log raw flock rows; older rows often have `primary_vibe` NULL. |
| **Keyboard focus outline invisible** | Missed `focus-visible:ring` class or removed role/tabIndex | Ensure card root: `role="button" tabIndex={0} className="focus-visible:ring-2 …"` | Axe-core browser extension will flag. |
| **"Undefined is not a function (ResizeObserver)"** in Safari ≤ 14 | Polyfill not loaded for ResizeObserver | `import 'resize-observer-polyfill/dist/ResizeObserver.global';` at top of main.tsx. | Only old iOS 14/ macOS Big Sur; OK to ignore if your support matrix ≥ Safari 15. |
| **"Cannot read property of undefined"** | Missing optional chaining on flock properties | Add optional chaining: `flock?.title` or `flock?.primary_vibe` | Often happens when database returns incomplete data or during loading states. |
| **"Hydration mismatch"** | Server/client render differences | Check for dynamic timestamps or client-only state in render | Usually from `Date.now()`, `window` objects, or random values in SSR. |

## 🔄 Quick Cache-Buster

If you're seeing persistent import errors or stale modules:

```bash
# Stop dev server
# Then run:
rm -rf node_modules/.vite
# or alternatively:
pnpm dev --force

# Restart with:
pnpm dev
```

This flushes any stale virtual module where Vite still references the old Plus export.

## ✅ Regression Checklist (CI step)

Add these checks to your GitHub Actions so missing imports never hit production:

1. **Type Check**: `pnpm typecheck` → 0 errors
2. **Lint Check**: `pnpm lint` → 0 errors  
3. **Tests**: `pnpm vitest run` → all green
4. **Accessibility**: Lighthouse a11y score ≥ 98 on `/floqs`

### Sample GitHub Action

```yaml
name: Quality Checks
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: pnpm install
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm vitest run
      - run: pnpm build
```

## 🐛 Additional Debugging Tips

### For Import Issues
- Check that all imports use consistent paths (`@/components` vs `../components`)
- Verify no circular dependencies between components
- Ensure TypeScript paths in `tsconfig.json` match actual file structure

### For Styling Issues
- Use browser DevTools to inspect if Tailwind classes are actually applied
- Check if custom CSS is conflicting with Tailwind utilities
- Verify dark mode variants are working correctly with `dark:` prefixes

### For Performance Issues
- Use React DevTools Profiler to identify slow renders
- Check if unnecessary re-renders are happening due to object/array creation in render
- Verify proper `useMemo`/`useCallback` usage for expensive computations

---

*Feel free to extend this guide as new edge-cases are discovered during development.*