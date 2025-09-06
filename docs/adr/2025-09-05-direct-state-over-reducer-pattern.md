# ADR-0003: Direct State Management Over Reducer Pattern

## Status

Accepted ✅ (2025-09-05)

## Context

The `useEventsManager` hook used a complex `useReducer` pattern:

```typescript
// 23 lines of reducer boilerplate
const [state, dispatch] = useReducer(eventsReducer, initialState)
// 8 dispatch calls throughout the hook
dispatch({ type: 'SET_EVENTS', payload: data.events })
dispatch({ type: 'SET_FILTERS', payload: { ...state.filters, dateRange } })
```

Issues:
- `FilterEventsManager` already managed events and filters internally
- Duplicate state management between reducer and FilterEventsManager
- Added unnecessary complexity for simple state needs
- Required `EventsState` and `EventsAction` interfaces

## Decision

Replace `useReducer` with direct state management:

```typescript
const [error, setError] = useState<Error | null>(null)
// FilterEventsManager already manages events & filters
setError(new Error(userMessage))
```

## Alternatives Considered

1. **Keep useReducer pattern** - Maintain Redux-like state management
2. **Use Zustand or other state library** - Add external dependency  
3. **Direct useState calls** - Chosen for simplicity and reduced duplication

## Consequences

### Positive
- Removed 30+ lines of boilerplate code
- Single source of truth in FilterEventsManager
- Eliminated duplicate state tracking
- Simplified hook interface and testing

### Negative
- Less structured state updates (but not needed for this use case)
- Moved away from Redux patterns (acceptable for this scope)

### Affected Components
- `src/lib/hooks/useEventsManager.ts` - Removed reducer logic
- `src/types/events.ts` - Removed `EventsState` and `EventsAction` interfaces
- All dispatch calls replaced with direct FilterEventsManager method calls