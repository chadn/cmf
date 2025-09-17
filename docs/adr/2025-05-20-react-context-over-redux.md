# ADR: React Context Over Redux for State Management

## Status

Accepted ✅ (2025-05-20)

## Context

The Calendar Map Filter application needed a state management solution for:

- Event data and filtering state
- Map viewport and interaction state
- UI state (loading, selections, etc.)

Options considered were Redux, Zustand, and React's built-in Context API with hooks.

## Decision

Use React Context API + Custom Hooks instead of Redux or other external state management libraries.

## Alternatives Considered

1. **Redux Toolkit** - Industry standard, predictable state updates
2. **Zustand** - Lightweight alternative to Redux
3. **React Context + Hooks** - Chosen for built-in solution

## Consequences

### Positive

- No additional bundle size from state management libraries
- Leverages React's built-in capabilities
- Simpler mental model for this application's scope
- Custom hooks (`useEventsManager`, `useMap`) encapsulate complex logic cleanly
- Next.js data fetching patterns work seamlessly

### Negative

- Less structured than Redux for complex state updates
- No time-travel debugging capabilities
- Potential for prop drilling if not designed carefully

### Implementation Approach

- Custom hooks abstract state complexity
- Context providers scope state appropriately
- Server state handled via SWR and Next.js patterns
- Local component state for UI interactions

### Affected Components

- `src/lib/hooks/useEventsManager.ts` - Event data and filtering logic
- `src/lib/hooks/useMap.ts` - Map state and interactions
- `src/app/page.tsx` - Main application state coordination
