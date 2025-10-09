# ADR: Upgrade to Next.js 15 and React 19

Date: 2025-10-08
Status: Accepted

## Context

The project was running Next.js 14.2.28 with React 18.3.1. Next.js 15 was released with significant improvements and React 19 support, bringing:

- Performance improvements in React 19 (automatic batching, transitions, server components enhancements)
- Stable Turbopack for faster development builds
- Better type safety and developer experience
- Security updates and bug fixes
- Improved caching defaults (opt-out instead of opt-in)

### Breaking Changes Evaluated

1. **Asynchronous Dynamic APIs**: `cookies()`, `headers()`, `draftMode()`, `searchParams`, and `params` are now async
   - **Impact**: None - project doesn't use these APIs

2. **Caching Behavior**: GET Route Handlers default to uncached (previously cached)
   - **Impact**: Minimal - all API routes already use `export const dynamic = 'force-dynamic'`

3. **React 19 Requirement**: App Router requires React 19
   - **Impact**: Major - requires upgrading all React dependencies and third-party libraries

4. **Images Config**: `domains` deprecated in favor of `remotePatterns`
   - **Impact**: Minor - single configuration change needed

5. **NextRequest Properties**: `geo` and `ip` removed (use `@vercel/functions` instead)
   - **Impact**: None - project doesn't use these properties

6. **react-map-gl v8**: Major update required for React 19 compatibility
   - **Impact**: Moderate - import paths changed from `react-map-gl` to `react-map-gl/maplibre`
   - API changes: removed `mapboxAccessToken`, `attributionControl={true}`, `scrollZoom.speed`, `showUserHeading`

## Decision

Upgrade to Next.js 15.5.4 and React 19.2.0 along with compatible versions of all dependencies.

### Dependencies Updated

**Core Framework:**
- `next`: 14.2.28 → 15.5.4
- `react`: 18.3.1 → 19.2.0
- `react-dom`: 18.3.1 → 19.2.0
- `@types/react`: 18.2.45 → 19.2.2
- `@types/react-dom`: 18.2.17 → 19.2.1
- `eslint-config-next`: 14.0.4 → 15.5.4
- `eslint-plugin-react-hooks`: 5.2.0 → 7.0.0

**Map Libraries (Major Upgrade):**
- `react-map-gl`: 7.1.6 → 8.1.0 (requires new import path `/maplibre`)
- `maplibre-gl`: 3.6.2 → 5.8.0

**UI & Utilities:**
- `@radix-ui/react-popover`: 1.1.14 → 1.1.15
- `@radix-ui/react-slider`: 1.3.5 → 1.3.6
- `@testing-library/react`: 14.1.2 → 16.3.0
- Various minor updates to keep ecosystem compatible

**Vercel Platform:**
- `@vercel/functions`: 2.0.3 → 3.1.3
- `@vercel/kv`: 0.2.4 → 3.0.0

### Code Changes Required

1. **next.config.js** - Updated images configuration:
   ```javascript
   // Before
   images: {
       domains: ['maps.googleapis.com'],
   }

   // After
   images: {
       remotePatterns: [
           {
               protocol: 'https',
               hostname: 'maps.googleapis.com',
           },
       ],
   }
   ```

2. **react-map-gl imports** - Updated to use MapLibre-specific exports:
   ```typescript
   // Before
   import Map, { ... } from 'react-map-gl'

   // After
   import Map, { ... } from 'react-map-gl/maplibre'
   ```

3. **MapContainer.tsx** - Removed deprecated props:
   - Removed `mapboxAccessToken=""` (not needed for MapLibre)
   - Removed `attributionControl={true}` (default behavior)
   - Simplified `scrollZoom` from object to `true` (speed option removed)
   - Removed `showUserHeading={false}` from GeolocateControl (prop removed)

4. **Sidebar.tsx** - ESLint compliance:
   - Changed `<a href="/">` to `<Link href="/">` for internal navigation

## Considered Alternatives

### 1. Stay on Next.js 14 with React 18
**Pros:**
- Zero upgrade effort
- No risk of breaking changes

**Cons:**
- Missing performance improvements
- Security updates delayed
- Eventually forced upgrade with more accumulated changes

### 2. Incremental upgrade (14.3 → 15.0 → 15.5)
**Pros:**
- Lower risk per step
- Easier to identify issues

**Cons:**
- More time consuming
- Unnecessary given clean codebase

**Rejected because:** Clean codebase with no breaking API usage made direct upgrade safe.

### 3. Next.js 15 with React 18 (compatibility mode)
**Pros:**
- Smaller React upgrade surface

**Cons:**
- Not supported for App Router (requires React 19)
- Misses React 19 improvements

**Rejected because:** App Router requires React 19 in Next.js 15.

## Consequences

### Positive

- ✅ **All tests pass** - 503 tests passing, 68.68% coverage maintained
- ✅ **Production build succeeds** - Build time ~5 seconds, bundle sizes reasonable
- ✅ **Performance improvements** - React 19 automatic optimizations
- ✅ **Better developer experience** - Turbopack, improved type safety
- ✅ **Future-proof** - Latest stable versions with long-term support
- ✅ **Security updates** - Latest patches and fixes

### Neutral

- **Map library behavior** - react-map-gl v8 uses different API but provides same functionality
- **ESLint stricter** - Caught internal link using `<a>` instead of `<Link>` (good for future)

### Risks Mitigated

- **Third-party compatibility** - All key libraries verified compatible with React 19
- **Breaking changes** - Thoroughly analyzed, none affect existing code patterns
- **Testing coverage** - Comprehensive test suite caught no regressions

### Follow-up Tasks

- ✅ **Monitor for React 19-specific issues in production**
- ✅ **Evaluated remaining major version upgrades**

### Deferred Upgrades (with rationale)

After evaluation, the following upgrades are **not recommended** at this time:

#### Jest v30 (Deferred)
**Why defer:**
- JSDOM v26 introduces breaking changes to `window.location` mocking
- Requires `--experimental-vm-modules` flag for react-map-gl v8 ESM imports
- 17 test failures requiring significant test rewrites
- Current Jest v29 works perfectly with all 503 tests passing

**When to reconsider:**
- JSDOM v26 `window.location` mocking becomes more straightforward
- react-map-gl documents Jest v30 compatibility better
- Community establishes clearer migration patterns

#### Tailwind CSS v4 (Deferred)
**Why defer:**
- Complete architectural rewrite (JavaScript config → CSS-first config)
- New browser requirements: Safari 16.4+, Chrome 111+, Firefox 128+
- Breaking changes: `@tailwind` directives removed, new `@import` syntax required
- Plugin ecosystem needs maturity (`tailwindcss-animate` compatibility unknown)
- Automated upgrade tool requires Node.js 20+

**When to reconsider:**
- Tailwind v4 ecosystem matures (6-12 months)
- Plugin compatibility confirmed
- Team ready for comprehensive CSS configuration migration

#### ESLint v9 (Deferred)
**Why defer:**
- Requires migration from `.eslintrc.json` to `eslint.config.js` (flat config)
- Next.js deprecated `next lint` (will be removed in v16)
- Better to wait for Next.js v16's official migration guidance
- Plugin compatibility issues possible

**When to reconsider:**
- Next.js v16 release with migration documentation
- ESLint flat config becomes standard in Next.js ecosystem

## References

- [Next.js 15 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-15)
- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [react-map-gl v8 Upgrade Guide](https://visgl.github.io/react-map-gl/docs/upgrade-guide)
- [Radix UI React 19 Support](https://github.com/radix-ui/primitives/issues/2900)
