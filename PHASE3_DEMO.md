# Phase 3 Demo - Smart Hook Extraction

This demonstrates the Phase 3 concept with **minimal changes** to `page.tsx`.

## Created: `useUrlProcessor` Hook

**File:** `src/lib/hooks/useUrlProcessor.ts` (~75 lines)

**What it does:**
- Extracts complex URL processing logic from `page.tsx`
- Uses `processMapPosition()` service for clean business logic
- Returns simple interface for page to use

## How to Use in page.tsx

**Before (current page.tsx):**
```typescript
// Large useEffect with complex URL processing logic
useEffect(() => {
  if (!isReadyForViewportSetting(appState)) return

  // Step 3-4: Handle selected event
  if (selectedEventIdUrl) {
    const event = cmfEvents.allEvents.find((e) => e.id === selectedEventIdUrl)
    if (!event) {
      logr.warn('app', `Invalid event ID: ${selectedEventIdUrl}`)
      // TODO: Clear invalid se from URL
    } else {
      logr.info('app', 'Valid event ID, selecting event')
      handleEventSelect(selectedEventIdUrl)
      dispatch(appActions.viewportSet())
      return
    }
  }

  // Step 5: Handle llz coordinates
  if (llzUrl !== null) {
    const vp = llzObjectToViewport(llzUrl)
    setViewport(vp)
    setLlzChecked(true)
    setIsShowingAllEvents(false)
    const bounds = calculateBoundsFromViewport(vp, mapHookWidthHeight.w, mapHookWidthHeight.h)
    resetMapToVisibleEvents({ useBounds: true, mapBounds: bounds })
    dispatch(appActions.viewportSet())
    return
  }

  // Step 6-7: Auto-resize to visible events
  resetMapToVisibleEvents({ useBounds: true })
}, [/* many dependencies */])
```

**After (with useUrlProcessor):**
```typescript
// Import the hook
import { useUrlProcessor } from '@/lib/hooks/useUrlProcessor'

// Replace the complex useEffect with a simple hook call
const urlProcessor = useUrlProcessor({
  appState,
  selectedEventIdUrl,
  llzUrl,
  allEvents: cmfEvents.allEvents,
  onEventSelect: handleEventSelect,
  onViewportChange: setViewport,
  onLlzCheckedChange: setLlzChecked,
  onViewportSet: () => dispatch(appActions.viewportSet()),
})

// Handle fallback case (auto-resize) - much simpler
useEffect(() => {
  if (isReadyForViewportSetting(appState) && !urlProcessor.shouldStopProcessing) {
    logr.info('app', 'Auto-resizing to visible events')
    resetMapToVisibleEvents({ useBounds: true })
  }
}, [appState, urlProcessor.shouldStopProcessing, resetMapToVisibleEvents])
```

## Benefits Demonstrated

### ✅ **Minimal Git Diff**
- Only ~10 lines changed in `page.tsx`
- Complex logic extracted to focused hook
- All important comments preserved

### ✅ **Service Integration**
- Hook uses `processMapPosition()` service
- Clean separation: Hook = React logic, Service = Business logic
- Easy to test both independently

### ✅ **React Best Practices**
- Smart hook handles complex logic
- Page becomes simpler and more readable
- Clear interfaces between layers

### ✅ **Incremental Approach**
- Can extract one piece at a time
- Each extraction provides immediate value
- Existing functionality preserved

## Next Steps

This demonstrates how Phase 3 can be done incrementally:

1. **Extract URL processing** ✅ (demonstrated)
2. **Extract state management helpers** (could extract state transition logic)
3. **Extract handler utilities** (could extract event selection, filter handling)
4. **Create container hook** (combine extracted pieces)

Each step provides value while keeping changes minimal.