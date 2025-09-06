# ADR-0002: Simplified FilteredEvents Structure

## Status

Accepted ✅ (2025-09-05)

## Context

The FilteredEvents interface was overly complex with 7 confusing arrays:

```typescript
interface FilteredEvents {
    mapFilteredEvents: CmfEvent[]         // filtered OUT by map
    searchFilteredEvents: CmfEvent[]      // filtered OUT by search  
    dateFilteredEvents: CmfEvent[]        // filtered OUT by date
    unknownLocationsFilteredEvents: CmfEvent[]  // filtered OUT by location
    filteredEvents: CmfEvent[]            // all filtered out events
    shownEvents: CmfEvent[]               // events that pass all filters  
    allEvents: CmfEvent[]                 // unfiltered events
}
```

Problems:
- "Filtered" naming was ambiguous (sometimes meant "removed", sometimes "processed")
- Managing 7 separate arrays was complex and error-prone
- Unclear data flow and relationships between arrays

## Decision

Simplify to 2 clear arrays plus metadata structure:

```typescript
interface FilteredEvents {
    allEvents: CmfEvent[]
    visibleEvents: CmfEvent[]  // clearer than "shownEvents"
    hiddenCounts: {
        byMap: number
        bySearch: number
        byDate: number  
        byLocationFilter: number
    }
}
```

## Alternatives Considered

1. **Keep existing 7 arrays** - Maintain current complexity
2. **Use computed properties** - Add getters for filtered arrays
3. **Simplified structure with counts** - Chosen for clarity and performance

## Consequences

### Positive
- Eliminated naming confusion around "filtered" 
- Clearer data flow with just 2 arrays
- Better performance - counts instead of array management
- Updated 5 components with cleaner interfaces

### Negative
- Breaking change required updating all consuming components
- Loss of direct access to individual filter arrays (now computed if needed)

### Affected Components
- `src/lib/events/FilterEventsManager.ts` - Core logic changes
- `src/lib/hooks/useMap.ts` - Updated to use `visibleEvents`
- `src/app/page.tsx` - Event count display logic
- `src/components/events/EventList.tsx` - Data access patterns  
- `src/components/events/ActiveFilters.tsx` - Uses `hiddenCounts`