# ADR-0001: Unified EventsSource Interface

## Status

Accepted ✅ (2025-09-05)

## Context

The type system had redundant interfaces causing maintenance issues and test failures:

- `EventsSourceType` interface for static definitions
- `EventsSourceResponseMetadata` interface for API responses  
- Runtime format with different field structure

This created:
- 3-way type inconsistency causing test failures
- Transformation functions needed in `useEventsManager.ts`
- API response confusion between `metadata` vs `source` fields

## Decision

Consolidate all EventsSource representations into a single unified interface:

```typescript
interface EventsSource {
    prefix: string    // Static definition fields
    name: string  
    url: string
    // Runtime fields (optional):
    id?: string
    totalCount?: number
    unknownLocationsCount?: number
}
```

## Alternatives Considered

1. **Keep separate interfaces** - Maintain type safety but continue complexity
2. **Use union types** - Complex type guards needed throughout codebase
3. **Single unified interface** - Chosen for simplicity and consistency

## Consequences

### Positive
- Single source of truth for EventsSource data
- Eliminated transformation functions 
- Fixed test failures from type mismatches
- Simplified API response structure

### Negative
- Optional fields require null checks in some places
- Breaking change required updating 6 event source handlers

### Affected Components
- `src/types/events.ts` - Type definitions
- `src/lib/hooks/useEventsManager.ts` - Removed transformations
- All event source handlers - Updated to unified type
- `src/app/api/events/route.ts` - Changed `metadata` → `source`