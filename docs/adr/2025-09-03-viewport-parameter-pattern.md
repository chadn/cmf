# ADR-0004: Viewport Parameter Pattern for Map Filtering

## Status

Accepted ✅ (2025-09-03, v0.2.9)

## Context

Initial map filtering implementation caused "96 of 100 events" bug on page load instead of showing all events. The issue was circular updates between map viewport changes and event filtering.

Problems:

- Storing viewport bounds in filter state caused circular updates
- No distinction between programmatic vs user-initiated map changes
- Independent chip counts were incorrect
- "Show all events" vs "filter by viewport" modes were not distinguished

## Decision

Implement viewport parameter pattern with explicit mode distinction:

1. **FilterEventsManager** accepts `currentViewport` as parameter, never stores it
2. **Page state** manages `isShowingAllEvents` flag and `currentViewportBounds`
3. **Conditional viewport passing**: `currentViewport: isShowingAllEvents ? null : currentViewportBounds`
4. **User interaction detection** via `fromUserInteraction` parameter

## Alternatives Considered

1. **Store viewport in filter state** - Causes circular updates
2. **Complex timing-based solutions** - Brittle and hard to debug
3. **Parameter passing pattern** - Chosen for predictable data flow

## Consequences

### Positive

- Eliminated circular update loops
- Clear distinction between "show all" vs "map filtering" modes
- Independent chip counts work correctly
- Predictable data flow from user interactions

### Negative

- Slightly more complex state management in page component
- Additional `isShowingAllEvents` flag to manage
- More parameters to pass between components

### Architecture Impact

- Single-stage filtering model with domain filters (date, search, location type)
- Map filtering applied independently for accurate chip counts
- Clear separation between persistent domain filters and transient map filtering

### Affected Components

- `src/lib/events/FilterEventsManager.ts` - Method signature changed
- `src/app/page.tsx` - Added mode flag and bounds state
- `src/lib/hooks/useMap.ts` - Enhanced bounds change detection
- `src/components/map/MapContainer.tsx` - User interaction detection
