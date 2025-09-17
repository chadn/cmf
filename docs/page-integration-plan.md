# Page.tsx Integration Plan for useAppController Hook

## Overview

This document outlines the minimal changes required to integrate the `useAppController` smart hook into `page.tsx`, following the Phase 3 architecture while maintaining a small git diff and safe testing approach.

## Current Architecture (Before Integration)

```
page.tsx (590 lines)
├── All URL query state management (8 hooks)
├── All business logic (400+ lines)
├── All React state (10+ useState calls)
├── All effect hooks (6+ useEffect calls)
├── Component rendering (JSX)
└── Event handlers (20+ functions)
```

## Target Architecture (After Integration)

```
page.tsx (≈150 lines) - Dumb Component
├── useAppController() - Smart Hook
├── Simple destructuring
├── Component rendering (JSX)
└── Minimal prop passing

useAppController.ts (550 lines) - Smart Hook
├── All URL query state management
├── All business logic
├── All React state
├── All effect hooks
└── Clean interfaces returned
```

## Integration Strategy: Copy-Replace Approach

### Phase 1: Hook Verification (✅ COMPLETED)
- ✅ useAppController.ts created with all business logic
- ✅ TypeScript errors resolved
- ✅ Basic tests created
- ✅ Build passes successfully

### Phase 2: Minimal Page Integration (NEXT)

**File: `src/app/page.tsx`**

**Step 1: Add useAppController import**
```typescript
// Add this import at the top
import { useAppController } from '@/lib/hooks/useAppController'
```

**Step 2: Replace all business logic with single hook call**
```typescript
function HomeContent() {
    // REPLACE all current state/effects/handlers with:
    const { state, eventData, mapData, handlers } = useAppController()

    // KEEP only the early return for no event source
    if (!eventData.hasEventSource) {
        return (
            <div className="min-h-screen flex flex-col">
                <main className="flex-grow flex items-center justify-center">
                    <EventsSourceSelector />
                </main>
                <Footer />
            </div>
        )
    }

    // KEEP the JSX rendering with prop updates
    return (
        <div className="min-h-screen flex flex-col">
            <main className="h-screen">
                <PanelGroup
                    direction={state.isDesktop ? 'horizontal' : 'vertical'}
                    className="h-full w-full"
                    onLayout={/* REMOVE - this setter is not needed */}
                >
                    {/* Update all component props to use destructured values */}
                </PanelGroup>
            </main>
        </div>
    )
}
```

**Step 3: Update component props systematically**

1. **Sidebar component:**
```typescript
<Sidebar
    headerName={state.headerName}
    eventCount={{
        shown: eventData.cmfEvents.visibleEvents.length,
        total: eventData.cmfEvents.allEvents.length
    }}
    eventSources={eventData.eventSources}
    onResetMapToVisibleEvents={handlers.onResetMapToVisibleEvents}
    llzChecked={mapData.llzChecked}
    onLlzCheckedChange={handlers.onLlzCheckedChange}
    preferQfChecked={mapData.preferQfChecked}
    onPreferQfCheckedChange={handlers.onPreferQfCheckedChange}
    currentUrlState={state.currentUrlState}
    /* REMOVE ref={eventsSidebarRef} - not needed */
    className="h-full"
>
```

2. **ActiveFilters component:**
```typescript
<ActiveFilters
    cmfEvents={eventData.cmfEvents}
    onClearMapFilter={handlers.onClearMapFilter}
    onClearSearchFilter={handlers.onClearSearchFilter}
    onClearDateFilter={handlers.onClearDateFilter}
/>
```

3. **DateAndSearchFilters component:**
```typescript
<DateAndSearchFilters
    searchQuery={/* Extract from state.currentUrlState */}
    onSearchChange={handlers.onSearchChange}
    dateSliderRange={state.dateSliderRange}
    onDateRangeChange={handlers.onDateRangeChange}
    onDateQuickFilterChange={handlers.onDateQuickFilterChange}
    /* REMOVE appState, dispatch, and URL props - handled in hook */
/>
```

4. **EventList component:**
```typescript
<EventList
    cmfEvents={eventData.cmfEvents}
    selectedEventId={/* Extract from state.currentUrlState */}
    onEventSelect={handlers.onEventSelect}
    apiIsLoading={eventData.apiIsLoading}
/>
```

5. **MapContainer component:**
```typescript
<MapContainer
    viewport={mapData.viewport}
    onViewportChange={handlers.onViewportChange}
    markers={mapData.markers}
    selectedMarkerId={mapData.selectedMarkerId}
    onMarkerSelect={handlers.onMarkerSelect}
    onBoundsChange={handlers.onBoundsChange}
    onWidthHeightChange={handlers.onWidthHeightChange}
    selectedEventId={/* Extract from state.currentUrlState */}
    onEventSelect={handlers.onEventSelect}
    eventSources={eventData.eventSources || undefined}
/>
```

## Expected Git Diff Size

**Before Integration:**
- `page.tsx`: 590 lines

**After Integration:**
- `page.tsx`: ~150 lines (440 lines removed)
- Net change: Large deletion, small additions

**Diff Summary:**
```
src/app/page.tsx:
- Remove: ~450 lines of business logic
- Add: ~10 lines (import + hook call + destructuring)
- Modify: ~50 lines (component prop updates)
```

## Benefits of This Approach

1. **Minimal Risk**: All business logic preserved in hook, just moved
2. **Testable**: Hook can be tested independently
3. **Clean Separation**: Clear Smart Hook / Dumb Component boundary
4. **React Best Practices**: Follows recommended patterns
5. **Incremental**: Can be done in small, safe steps

## Testing Strategy

1. **Before Integration**: Verify all functionality works
2. **After Integration**: Verify identical behavior
3. **Regression Testing**: Compare before/after screenshots
4. **Manual Testing**: Test all user interactions
5. **Build Verification**: Ensure no TypeScript errors

## Rollback Plan

If integration causes issues:
1. Revert `page.tsx` changes via git
2. Keep `useAppController.ts` for future use
3. Investigate issues in hook independently
4. Re-attempt integration with fixes

## Component Interface Updates Needed

Some components may need minor prop interface updates:

1. **DateAndSearchFilters**: Remove direct appState/dispatch dependency
2. **ActiveFilters**: May need cleaner handler interfaces
3. **Sidebar**: Verify all props are correctly passed

## Next Steps

1. ✅ Complete this planning document
2. ⏭️ Execute Step 1: Add import
3. ⏭️ Execute Step 2: Replace business logic with hook
4. ⏭️ Execute Step 3: Update component props
5. ⏭️ Test integration thoroughly
6. ⏭️ Document any issues and fixes needed

## Success Criteria

- [ ] Page renders without errors
- [ ] All user interactions work identically
- [ ] No TypeScript errors
- [ ] Build passes successfully
- [ ] Git diff shows clean smart/dumb separation
- [ ] Tests pass (existing + new hook tests)