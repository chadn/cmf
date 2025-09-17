# Fix Quick Filter URL Parameter Timing Issue

## Table of Contents

- [Status](#status)
- [Context](#context)
  - [The Problem](#the-problem)
  - [Evidence](#evidence)
- [Decision](#decision)
- [Alternatives Considered](#alternatives-considered)
  - [Option B: Modify DateQuickButtons to Work Earlier](#option-b-modify-datequickbuttons-to-work-earlier)
  - [Option C: Add New State for Filter Application](#option-c-add-new-state-for-filter-application)
  - [Option D: Force DateQuickButtons to Render in DOM](#option-d-force-datequickbuttons-to-render-in-dom)
- [Consequences](#consequences)
  - [Positive](#positive)
  - [Negative](#negative)
- [Validation](#validation)
- [Implementation](#implementation)

## Status

Accepted

## Context

CMF supports quick filter URL parameters (`qf=next7days`, `qf=today`, etc.) to automatically apply date filters on page load. However, these filters weren't being applied because of a component lifecycle timing issue.

### The Problem

Quick filter URL parameters were handled in the DateQuickButtons component, which only exists when the date filter popover is open.

Details:

The application follows this state flow:

1. `uninitialized` - initial state
2. `events-init` - events are being fetched
3. `map-init` - events are loaded, map is being set up
4. `main-state` - app is ready for user interactions

The issue was:

1. Quick filter URL parameter (`qf=next7days`) gets parsed correctly during initialization
2. In `map-init` state, `resetMapToAllEventsAndShowAll()` is called, showing ALL events
3. DateQuickButtons component waits for `appState === 'main-state'` to apply the quick filter, but component doesn't exist yet (popover closed).
4. Filter is never applied, leaving all events visible

This created a poor user experience where bookmarked filtered URLs would appear broken.

### Evidence

From the logs:

```
[2025-09-08.23:25:36.498][INFO][DATE] parseAsDateQuickFilter parse queryValue: next7days
...
23:25:39.022 [INFO][APP] uE: map-init: zoom is null (not set),resetMapToAllEventsAndShowAll
23:25:39.024 [INFO][APP] uE: map-init done (url params)
23:25:39.027 [INFO][APP] action=MAP_INITIALIZED making appState=main-state, prevState=map-init
```

The quick filter was parsed but never applied because the DateQuickButtons component only triggers in `main-state`, after the map had already been reset to show all events.

## Decision

We will apply the quick filter during the `map-init` phase by implementing new URL
parameter handling logic in a component that is always rendered (DateAndSearchFilters),
rather than relying on a component that only exists inside a closed popover
(DateQuickButtons).

And in order to not duplicate logic, the logic will be done in `src/lib/utils/quickFilters.ts` so can be used by
both DateAndSearchFilters and DateQuickButtons.

## Alternatives Considered

### Option B: Modify DateQuickButtons to Work Earlier

- Change DateQuickButtons to apply filters in `'map-init'` state instead of just `'main-state'`
- **Rejected**: Component still might not exist, doesn't address root cause

### Option C: Add New State for Filter Application

- Add new state `'apply-url-filters'` between events-init and map-init
- **Rejected**: More complex, larger change, potential for new bugs

### Option D: Force DateQuickButtons to Render in DOM

- Modify Radix UI Popover implementation to always render DateQuickButtons in DOM but hidden with `display: none`
- This would allow the useEffect in DateQuickButtons to run during initialization even when popover is closed
- **Rejected**: While technically feasible, this approach feels less clean than moving the
  logic to an always-rendered component. It also couples the solution to the specific popover
  implementation and could have performance implications from rendering hidden components
  unnecessarily.

## Consequences

### Positive

- Quick filter URLs work correctly on page load
- Better separation of concerns: URL handling vs manual interactions
- No breaking changes to existing functionality

### Negative

- Additional complexity in DateAndSearchFilters component

## Validation

The fix can be tested with URLs like:

- `http://localhost:3000/?es=sf&qf=next7days`
- `http://localhost:3000/?es=sf&qf=weekend`
- `http://localhost:3000/?es=sf&qf=today`

## Implementation

- **URL Parameter Handling**: New logic in DateAndSearchFilters processes `qf` parameters during `map-init` or `main-state`
- **Shared Logic**: Created `src/lib/utils/quickFilters.ts` utility with unified filter configurations used by both DateAndSearchFilters and DateQuickButtons
- **Consistent Boundaries**: Extracted `getStartOfDay()`/`getEndOfDay()` functions to `src/lib/utils/date.ts` ensuring all components use 4:01am-11:59pm day boundaries
- **Guard Mechanism**: `initialUrlProcessed` ref prevents duplicate filter application
