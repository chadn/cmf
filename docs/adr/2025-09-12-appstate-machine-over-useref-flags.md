# ADR: AppState Machine over useRef Flags

Date: 2025-09-12
Status: Superseded by [2025-09-23-smart-hook-dumb-component-architecture.md](2025-09-23-smart-hook-dumb-component-architecture.md)
Supersedes: [2025-09-05-direct-state-over-reducer-pattern.md](2025-09-05-direct-state-over-reducer-pattern.md)

## Context

The application initialization flow had become complex and error-prone due to scattered state tracking using multiple `useRef` flags (`hasAutoResized.current`, `urlParamsProcessed.current`). This led to:

- **Race conditions**: Timing issues between components during URL parameter processing
- **Debugging difficulties**: State existed outside React's lifecycle and DevTools
- **Maintenance issues**: Hard to understand the sequence of operations across components
- **No single source of truth**: Multiple flags tracked overlapping concerns

The previous ADR advocated for direct state over reducer patterns, but the initialization flow proved to be a special case requiring more structured state management.

## Decision

We will implement a comprehensive AppState machine using `useReducer` for application initialization flow, while maintaining direct state management for user interactions.

**AppState Machine Structure:**

```typescript
type AppState =
    | 'events-init' // Fetching events from API
    | 'events-loaded' // Events ready, start URL processing
    | 'url-applied' // Domain filters applied, ready for viewport
    | 'viewport-set' // Viewport configured, ready for interaction
    | 'user-interactive' // Normal user interaction mode
```

**Key Components:**

- Dedicated `appStateReducer.ts` with action creators and type guards
- State transitions logged for debugging
- Parent-to-child callback pattern for cross-component coordination
- State-driven component behavior (components check `appState` before acting)

## Rationale

**Why this doesn't contradict the "direct state" ADR:**

- AppState machine is specifically for **initialization flow**, not user interactions
- User interactions (map panning, filtering, selections) still use direct state
- This creates a clear separation: structured initialization vs. reactive interactions

**Benefits over useRef flags:**

- **Single source of truth**: Always know exactly what state the app is in
- **Explicit transitions**: Clear progression through initialization phases
- **Debuggable**: State changes are logged and trackable in React DevTools
- **Predictable**: Components only act when in appropriate states
- **Race condition elimination**: State machine enforces valid execution order

## Implementation Details

**State Flow:**

```
events-init → events-loaded → url-applied → viewport-set → user-interactive
```

**Component Coordination:**

- `page.tsx` manages the AppState machine
- `DateAndSearchFilters` processes URL parameters and signals completion via callback
- `useMap` provides map functionality but doesn't manage initialization state
- All components check `appState` to determine when to act

**Action Creators:**

```typescript
export const appActions = {
    eventsLoading: () => ({ type: 'EVENTS_LOADING' }) as const,
    eventsLoaded: (hasEvents: boolean) => ({ type: 'EVENTS_LOADED', hasEvents }) as const,
    urlFiltersApplied: () => ({ type: 'URL_FILTERS_APPLIED' }) as const,
    viewportSet: () => ({ type: 'VIEWPORT_SET' }) as const,
}
```

## Status

✅ **Implemented in v0.2.16**

- Replaced all initialization-related useRef flags with AppState machine
- Added comprehensive logging for state transitions
- Eliminated race conditions in URL parameter processing
- Improved maintainability and debugging experience

This decision applies specifically to application initialization flow. Direct state management remains the preferred pattern for user interactions and component-local state.
