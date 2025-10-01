# ADR: Single-Pass Filtering Optimization

Date: 2025-10-01
Status: Accepted

## Context

Performance profiling revealed significant rendering delays during map interactions, with violations showing "message handler took 182-407ms" and long tasks blocking the main thread for 400-700ms. Investigation identified multiple root causes:

### Issues Identified Through Investigation

1. **Triple-pass filtering in `getCmfEvents()` - PRIMARY ISSUE**: Processing 3,352 events through 3 separate array iterations (90-115ms)
   - Pass 1: Calculate hidden counts for filter chips
   - Pass 2: Apply domain filters (date, search, location)
   - Pass 3: Apply map bounds filter
   - **Impact**: 90-115ms per call × 6 calls per interaction = 540-690ms blocking time

2. **React Strict Mode double renders - EXPECTED BEHAVIOR**: Development-only intentional double-invocation
   - **Investigation**: Confirmed via render tracking showing renders in pairs (+1-2ms apart)
   - **Impact**: Doubles render count in development only, no production impact
   - **Decision**: Keep enabled for development safety, optimize underlying operations instead

3. **Unnecessary state updates - CONTRIBUTING FACTOR**: Creating new object references even when values unchanged
   - Viewport updates triggering setState with identical values
   - Map dimensions check calling setState unnecessarily
   - Bounds updates without value comparison
   - **Investigation**: Logging showed "dimensions unchanged" but still calling setState
   - **Impact**: Each unnecessary setState triggers full hook chain re-render

4. **MapLibre GL library overhead - LIBRARY LIMITATION**: Internal mousemove handlers taking 182-220ms
   - **Investigation**: Violations show `maplibre-gl.js:34 'mousemove' handler took 220ms`
   - **Impact**: Affects hover interactions with 973 markers visible
   - **Decision**: Accepted limitation, future optimization would require marker clustering

### Issues Investigated and Ruled Out

- ✅ **nuqs library**: Initially suspected due to GitHub issue #822, but confirmed fixed in v2.4.3
  - **Evidence**: Render logs showed "URL changes: NONE" during all double renders
  - **Conclusion**: Not causing performance issues

- ✅ **`currentBounds` changes**: Suspected of triggering excessive `getCmfEvents` calls
  - **Evidence**: Debounced updates showed bounds changed AFTER most renders completed
  - **Conclusion**: Debouncing working correctly, not the primary issue

### Performance Impact

During a typical map drag interaction with 3,352 events and 973 markers:
- `getCmfEvents` called 6+ times per interaction
- Each call: 90-115ms × 6 = 540-690ms total blocking time
- Combined with Strict Mode double renders: effectively 1080-1380ms perceived delay
- Result: Visible lag, poor UX, Chrome violations

## Decision

Implement single-pass filtering with early-exit optimizations and prevent unnecessary state updates.

### Optimization 1: Single-Pass Filtering

**Before (3 passes):**
```typescript
// Pass 1: Calculate counts
this.allEvents.forEach(event => {
    if (!passesSearch) result.hiddenCounts.bySearch++
    if (!passesDate) result.hiddenCounts.byDate++
    // ... etc
})

// Pass 2: Domain filter
const domainFiltered = this.allEvents.filter(applyDomainFilters)

// Pass 3: Map filter
result.visibleEvents = domainFiltered.filter(applyMapFilter)
```

**After (1 pass):**
```typescript
const visibleEvents: CmfEvent[] = []

for (const event of this.allEvents) {
    // Calculate all filters once
    const passesSearch = applySearchFilter(event, this.filters.searchQuery)
    const passesDate = applyDateFilter(event, this.filters.dateRange)
    const passesLocationFilter = applyUnknownLocationsFilter(event, this.filters.showUnknownLocationsOnly)
    const passesMap = !mapBounds || applyMapFilter(event, mapBounds, this.aggregateCenter)

    // Update counts
    if (!passesSearch && this.filters.searchQuery) result.hiddenCounts.bySearch++
    // ... other counts

    // Include if passes ALL filters
    if (passesSearch && passesDate && passesLocationFilter && passesMap) {
        visibleEvents.push(event)
    }
}

result.visibleEvents = visibleEvents
```

### Optimization 2: Prevent Unnecessary State Updates

**Viewport changes (`useMap.ts`):**
```typescript
setMapState((prev) => {
    // Only update if values actually changed
    if (prev.viewport.latitude === newViewport.latitude &&
        prev.viewport.longitude === newViewport.longitude &&
        prev.viewport.zoom === newViewport.zoom) {
        return prev // Skip setState
    }
    return { ...prev, viewport: newViewport }
})
```

**Bounds changes (`useAppController.ts`):**
```typescript
const boundsChanged = !currentBounds ||
    currentBounds.north !== bounds.north ||
    currentBounds.south !== bounds.south ||
    currentBounds.east !== bounds.east ||
    currentBounds.west !== bounds.west

if (boundsChanged) {
    setCurrentBounds(bounds)
}
// Skip setState if unchanged
```

### Optimization 3: Diagnostic Logging (Temporary)

Added performance monitoring to identify bottlenecks:
- Render tracking in `useAppController`, `useMap`, `MapContainer`
- Timing logs in `getCmfEvents`, viewport/bounds handlers
- Stack trace logging for slow operations
- Performance threshold warnings

**Note**: Diagnostic logging to be removed in v0.3.6

## Consequences

### Positive

✅ **~50% filtering performance improvement**: `getCmfEvents` reduced from 90-115ms to 47-52ms
   - **Impact**: Total blocking time per interaction: 540-690ms → 270-312ms (54% improvement)
   - **User experience**: Noticeably smoother map dragging and interactions

✅ **Eliminated unnecessary state updates**: Prevented setState calls when values unchanged
   - Viewport: Skip setState if lat/lng/zoom identical
   - Map dimensions: Skip setState if width/height unchanged
   - Bounds: Skip setState if north/south/east/west identical
   - **Impact**: Reduced cascading re-renders through hook chain (eliminated ~30% of unnecessary renders)

✅ **Better understanding of render pipeline**: Diagnostic logging revealed complete render chain
   - Confirmed React Strict Mode as double-render source (expected, development-only)
   - Identified nuqs library was NOT the issue (v2.4.3 working correctly)
   - Mapped complete flow: useAppController → useMap → MapContainer

✅ **Scalability**: Single-pass algorithm O(n) instead of O(3n), better for larger datasets

✅ **Maintainability**: Cleaner code with combined filtering logic, removed unused `applyDomainFilters` import

### Neutral

⚖️ **React Strict Mode**: Confirmed double renders are intentional development behavior
   - **Evidence**: Every render shows paired execution (+1-2ms apart) with no state changes between
   - **Decision**: Keep enabled - catching bugs more important than development smoothness
   - **Impact**: Production unaffected

⚖️ **MapLibre GL overhead**: 182-220ms mousemove violations remain
   - **Root cause**: Library's internal handling of 973 markers during hover
   - **Decision**: Accepted limitation for current marker count
   - **Future**: Would require marker clustering if marker count grows significantly

### Negative

⚠️ **Temporary verbose logging**: Added diagnostic code increases bundle size temporarily
   - Performance tracking in 5 files (useAppController, useMap, MapContainer, FilterEventsManager, performance-monitor)
   - **Mitigation**: All clearly marked "performance" category, scheduled for removal in v0.3.6

⚠️ **Still above 20ms threshold**: `getCmfEvents` at 47-52ms for 3,352 events
   - Originally 90-115ms, improved 50%, but custom threshold set to 20ms shows warnings
   - **Assessment**: 47-52ms acceptable for 3,352 events, further optimization available if needed (see Future Optimizations)

## Implementation Notes

### Files Modified

- `src/lib/events/FilterEventsManager.ts`: Single-pass filtering implementation
- `src/lib/hooks/useMap.ts`: Viewport change detection, render tracking
- `src/lib/hooks/useAppController.ts`: Bounds change detection, URL param tracking, render tracking
- `src/components/map/MapContainer.tsx`: Render tracking, prop change detection, dimensions tracking
- `src/lib/utils/performance-monitor.ts`: Long task observer, event timing monitoring (new file)
- `src/components/PerformanceMonitor.tsx`: Client component wrapper (new file)

### Performance Monitoring Results

Single map drag interaction (before → after):
- `getCmfEvents` time: **90-115ms → 47-52ms** (50% improvement)
- Total blocking time: **540-690ms → 270-312ms** (54% improvement)
- Chrome violations: **Reduced from 400-700ms to occasional 200-300ms**

### Future Optimizations (If Needed)

If sub-20ms filtering is required for larger datasets:

1. **Memoize filter results**: Cache results keyed by bounds/filters
2. **Virtual scrolling**: Render only visible markers (react-window)
3. **Web Workers**: Offload filtering to background thread
4. **Marker clustering**: Reduce MapLibre GL overhead (addresses mousemove violations)
5. **Incremental filtering**: Update results incrementally during pan/zoom

## Related Decisions

- [2025-09-23-smart-hook-dumb-component-architecture](2025-09-23-smart-hook-dumb-component-architecture.md) - Hook architecture enabling this optimization
- [2025-09-05-simplified-filtered-events-structure](2025-09-05-simplified-filtered-events-structure.md) - CmfEvents structure being optimized
- [2025-09-03-viewport-parameter-pattern](2025-09-03-viewport-parameter-pattern.md) - Map bounds filtering pattern

## References

- Chrome Performance Violations: https://developer.chrome.com/docs/lighthouse/performance/
- React 18 Strict Mode: https://react.dev/reference/react/StrictMode
- Performance API: https://developer.mozilla.org/en-US/docs/Web/API/Performance
