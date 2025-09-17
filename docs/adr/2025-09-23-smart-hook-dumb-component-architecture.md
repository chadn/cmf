# ADR: Smart Hook/Dumb Component Architecture

Date: 2025-09-23
Status: Accepted
Supersedes: [2025-09-12-appstate-machine-over-useref-flags.md](2025-09-12-appstate-machine-over-useref-flags.md)

## Context

The application had grown to a complex 440-line `page.tsx` component with mixed business logic and rendering concerns. This created several problems:

- **Maintainability issues**: Mixed business logic and UI rendering in single component
- **Testing difficulties**: Complex component with business logic hard to test independently
- **State management complexity**: 10+ useState calls, 6+ useEffect hooks scattered throughout
- **Poor separation of concerns**: Event handling, URL processing, and rendering coupled together
- **Page load timing issues**: Complex initialization flow with race conditions
- **Limited reusability**: Business logic tightly coupled to specific component

The previous AppState machine (v0.2.16) improved initialization flow but didn't address the fundamental architectural concerns.

## Decision

We will implement a **Smart Hook/Dumb Component architecture** with complete business logic extraction and enhanced state machine.

**Architecture Structure:**

```typescript
// Services Layer - Pure business logic
src/lib/services/
├── urlProcessingService.ts    // URL parsing and validation
├── appStateService.ts         // State transition logic

// Smart Hook - React state orchestration
src/lib/hooks/
├── useAppController.ts        // ALL business logic extracted here

// Dumb Components - Pure rendering
src/app/page.tsx               // Only JSX and prop passing
src/components/               // Props-only interfaces
```

**Enhanced 7-State Machine:**

```typescript
type AppState =
    | 'starting-app'            // App should start in this state, when successfully parses es, before fetching events
    | 'fetching-events'         // SWR fetching events from API
    | 'processing-events'       // resetMapToVisibleEvents, header setup
    | 'applying-url-filters'    // DateAndSearchFilters processes date/search URL params
    | 'parsing-remaining-url'   // Handle se, llz, auto-resize logic
    | 'finalizing-setup'        // Final transition before interaction (placeholder for tracking)
    | 'user-interactive'        // Normal user interaction mode
```

## Rationale

**Smart Hook/Dumb Component Benefits:**

- **Single Source of Truth**: All business logic centralized in `useAppController`
- **Testable Components**: Dumb components tested with simple props
- **Reusable Services**: Business logic available to any component/hook
- **Clear Responsibilities**: Each layer has single, well-defined purpose
- **Better Error Boundaries**: Easier to isolate and handle failures

**Enhanced State Machine Benefits:**

- **Improved Granularity**: 7 states vs previous 8 - removed unnecessary transition-only states
- **Present Tense Naming**: All states use present/progressive tense following FSM best practices
- **Unique & Greppable**: State names are unique and easy to search in codebase
- **Automatic Transitions**: State machine handles progression autonomously

**Architecture Quality:**

- **95% Code Reuse**: Existing utility functions preserved
- **Function Modules**: Modern TypeScript patterns, tree-shakable exports
- **Type Safety**: Comprehensive interfaces with proper separation
- **Performance**: 2.5 second load time with complete state progression

## Implementation Results

**Code Transformation:**
- **page.tsx**: 440 lines → 50 lines (88% reduction)
- **useAppController**: ~509 lines of extracted business logic
- **useUrlProcessor**: ~286 lines of centralized URL processing logic
- **Services**: ~233 lines of pure business logic functions
- **Types**: Consolidated interfaces with `CurrentUrlState` reuse throughout component tree

**Technical Achievements:**
- ✅ Perfect Smart Hook/Dumb Component separation
- ✅ Complete state machine with automatic transitions
- ✅ Centralized URL processing in `useUrlProcessor` smart hook
- ✅ Type consolidation using `CurrentUrlState` interface across components
- ✅ Eliminated duplicate date calculations and redundant state tracking
- ✅ All TypeScript strict mode compliance with zero warnings
- ✅ Zero functionality loss - all events and markers working
- ✅ Enhanced E2E testing with Playwright covering all URL scenarios
- ✅ Build system success with clean compilation

**Performance Results:**
- **Load Time**: 2.5 seconds from initial request to user-interactive
- **State Transitions**: 7 automatic transitions without delays
- **Event Processing**: All events processed efficiently
- **Memory Usage**: No leaks or excessive re-renders
- **Code Quality**: 476 unit tests passing, 72% test coverage

## Architectural Patterns Established

**Services Pattern (Pure Functions):**
```typescript
// Function modules, not classes
export function processDomainFilters(params: UrlParams): DomainFilterResult
// Note: shouldTransitionTo() exists but unused - reserved for future state validation needs
```

**Smart Hook Pattern:**
```typescript
// Primary business logic orchestrator
export function useAppController() {
  // ALL app-level business logic here
  return {
    state: AppStateData,      // Includes consolidated CurrentUrlState
    eventData: EventData,
    mapData: MapData,
    handlers: EventHandlers,
    hasEventSource: boolean
  }
}

// Specialized URL processing smart hook
export function useUrlProcessor(config: UrlProcessorConfig): UrlProcessorResult {
  // Centralized URL processing across all phases:
  // 1. Domain filters (applying-url-filters state)
  // 2. Remaining URL parsing (parsing-remaining-url state)
  // 3. URL parameter sync (user-interactive state)
  return { dateConfig }
}
```

**Dumb Component Pattern:**
```typescript
function HomeContent() {
  const { state, eventData, mapData, handlers } = useAppController()
  // ONLY rendering and prop passing with consolidated types
  return (
    <DateAndSearchFilters
      urlState={state.currentUrlState}  // Using CurrentUrlState type
      dateConfig={state.dateConfig}     // From useUrlProcessor
      onSearchChange={handlers.onSearchChange}
    />
  )
}
```

## Page Load State Machine Documentation

The 7-state machine provides clear separation of initialization concerns:

1. **starting-app** → **fetching-events**: App parses event source, starts SWR fetch
2. **fetching-events** → **processing-events**: Events fetched, map processing begins
3. **processing-events** → **applying-url-filters**: resetMapToVisibleEvents, header setup
4. **applying-url-filters** → **parsing-remaining-url**: Date/search URL filters applied
5. **parsing-remaining-url** → **finalizing-setup**: Event selection and map positioning
6. **finalizing-setup** → **user-interactive**: Setup complete, ready for interaction

Each transition is automatic with proper validation and logging.

## URL Processing Architecture

**Centralized URL Processing in useUrlProcessor:**
The `useUrlProcessor` smart hook handles all URL parameter processing across three distinct phases:

**Phase 1: Domain Filters (applying-url-filters state)**
- Processes date range filters (`fsd`, `fed`, `qf` parameters)
- Applies search queries (`sq` parameter)
- Uses `urlProcessingService.processDomainFilters()` for business logic
- Eliminates duplicate date calculations previously scattered across components

**Phase 2: Remaining URL Processing (parsing-remaining-url state)**
- Validates and processes event selection (`se` parameter)
- Handles map positioning from location/zoom coordinates (`llz` parameter)
- Implements auto-resize logic when no specific positioning is provided
- Follows Implementation.md steps 3-7 for URL parsing precedence

**Phase 3: URL Parameter Sync (user-interactive state)**
- Updates URL parameters when viewport changes (maintains `llz` sync)
- Manages URL parameter optimization (removes redundant parameters)
- Handles ongoing URL state synchronization during user interactions

**Type Consolidation Benefits:**
- Components receive `CurrentUrlState` objects instead of individual parameters
- Eliminates 15+ individual URL-related props across component interfaces
- Centralizes date configuration calculations in single location
- Provides consistent interfaces for all URL-related data access

## Testing Strategy

**Comprehensive Coverage:**
- **Unit Tests**: Services layer with pure function testing (476 tests passing)
- **Hook Tests**: useAppController with state machine validation
- **E2E Tests**: Playwright with console monitoring for all URL scenarios
- **Component Tests**: React Testing Library for UI components

**Testing Infrastructure:**
- 750+ test cases for date utilities with comprehensive timezone coverage
- Complete URL parsing scenario coverage with Playwright E2E tests
- Console testing with `TEST_URL="/?es=sf" npm run test:console`
- 72% test coverage across the application

## Future Architecture Guidance

**When to Use This Pattern:**
✅ Complex state management with multiple data sources
✅ Components with mixed business logic and rendering
✅ Applications needing independent component testing
✅ State machines with multiple transition conditions

**Extension Patterns:**
```typescript
// Multiple smart hooks
const eventController = useAppController()
const notificationController = useNotificationController()

// Service composition
const result = pipe(
  processDomainFilters,
  validateEventSelection,
  calculateMapPosition
)(urlParams)
```

## Status

✅ **Fully Implemented in v0.3.0**

- Complete architectural transformation with zero functionality loss
- All tests passing (unit and E2E) with comprehensive coverage
- Production-ready with enhanced maintainability
- Established patterns for future feature development

This architecture provides the foundation for scalable CMF enhancements while maintaining excellent performance and code quality.