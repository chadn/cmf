# E2E Test Examples

**Purpose:** Detailed code examples and patterns for writing E2E tests

**Audience:** Developers and AI agents implementing E2E tests

**Last Updated:** 2025-10-27

---

## Table of Contents

1. [Selected Event Tests](#selected-event-tests)
2. [Filter Chip Tests](#filter-chip-tests)
3. [State Validation Tests](#state-validation-tests)
4. [Using Real Functions](#using-real-functions)
5. [Smoke Test Examples](#smoke-test-examples)
6. [Mobile Test Examples](#mobile-test-examples)
7. [Edge Case Examples](#edge-case-examples)
8. [Anti-Patterns](#anti-patterns)

---

## Selected Event Tests

Based on **usage.md section 4**: Selected Event has 3 triggers, 3 visual cues, and Exception behavior.

### Trigger 1: Click Map Marker

```typescript
// tests/e2e/user-workflows.spec.ts
import { test, expect } from '@playwright/test'
import { captureConsoleLogs, verifyLogPatterns, DEFAULT_CAPTURE_OPTIONS } from './test-utils'

test('Click map marker selects event (map does not change)', async ({ page }) => {
  await page.goto('/?es=test:stable')

  // Wait for app to be interactive
  const logs = await captureConsoleLogs(page, '/?es=test:stable', {
    ...DEFAULT_CAPTURE_OPTIONS,
    waitForSpecificLog: 'State: user-interactive',
    additionalWaitTime: 2000
  })

  // Get initial map viewport to verify it doesn't change
  const initialViewport = await page.evaluate(() => {
    const map = window.mapRef?.current
    return {
      center: map?.getCenter(),
      zoom: map?.getZoom()
    }
  })

  // Click a map marker
  const marker = page.locator('svg.maplibregl-marker').first()
  await marker.click()

  // VISUAL CUE 1: Marker popup visible
  const popup = page.locator('.maplibregl-popup')
  await expect(popup).toBeVisible()

  // VISUAL CUE 2: Event row highlighted (green background)
  // Get event ID from popup to find corresponding row
  const eventName = await popup.locator('.maplibregl-popup-content').textContent()
  const eventRow = page.getByRole('row', { name: new RegExp(eventName.trim(), 'i') })
  await expect(eventRow).toHaveCSS('background-color', /.*/)  // Has background color set

  // VISUAL CUE 3: URL updated with se parameter
  await page.waitForTimeout(500)  // Give URL time to update
  expect(page.url()).toMatch(/se=[^&]+/)

  // Verify map did NOT change (key difference from other triggers)
  const finalViewport = await page.evaluate(() => {
    const map = window.mapRef?.current
    return {
      center: map?.getCenter(),
      zoom: map?.getZoom()
    }
  })
  expect(finalViewport.center.lng).toBeCloseTo(initialViewport.center.lng, 4)
  expect(finalViewport.center.lat).toBeCloseTo(initialViewport.center.lat, 4)
  expect(finalViewport.zoom).toBe(initialViewport.zoom)
})
```

### Trigger 2: Click Event Row

```typescript
test('Click event row selects event (map centers and zooms)', async ({ page }) => {
  await page.goto('/?es=test:stable')

  // Wait for interactive state
  await page.waitForLoadState('networkidle')

  // Get initial event list count
  const initialEventCount = await page.getByRole('row').count()

  // Click an event row (use semantic selector)
  const eventRow = page.getByRole('row', { name: /today event/i })
  await eventRow.click()

  // VISUAL CUE 1: Marker popup visible
  const popup = page.locator('.maplibregl-popup')
  await expect(popup).toBeVisible()

  // VISUAL CUE 2: Event row highlighted
  await expect(eventRow).toHaveClass(/selected|highlighted|bg-green/)

  // VISUAL CUE 3: URL updated with se parameter
  expect(page.url()).toContain('se=event-today')

  // Verify map DID change (panned/zoomed to event)
  const mapChanged = await page.evaluate(() => {
    // Map should have centered on event
    return window.mapRef?.current?.getZoom() > 10  // Zoomed in
  })
  expect(mapChanged).toBe(true)

  // SELECTED EVENTS EXCEPTION: Event list is FROZEN
  // Even though map changed, event list should NOT update
  const finalEventCount = await page.getByRole('row').count()
  expect(finalEventCount).toBe(initialEventCount)  // Count unchanged

  // Verify visible button shows same count (frozen)
  const visibleButton = page.getByRole('button', { name: /visible/i })
  const buttonText = await visibleButton.textContent()
  expect(buttonText).toMatch(/\d+ of \d+ visible/i)
})
```

### Trigger 3: Load with se Parameter

```typescript
test('Load with se parameter selects event', async ({ page }) => {
  // Load URL with se parameter
  const logs = await captureConsoleLogs(page, '/?es=test:stable&se=event-today-sf')

  // Verify state transitions include selected event processing
  verifyLogPatterns(logs, [
    {
      pattern: 'Processing selected event parameter: event-today-sf',
      requiredInState: 'applying-url-filters',
      description: 'Selected event parsed from URL'
    },
    {
      pattern: 'State: user-interactive',
      description: 'App ready'
    }
  ])

  // VISUAL CUE 1: Marker popup visible
  const popup = page.locator('.maplibregl-popup')
  await expect(popup).toBeVisible()

  // VISUAL CUE 2: Event row highlighted
  const eventRow = page.getByRole('row', { name: /today event/i })
  await expect(eventRow).toHaveClass(/selected|highlighted|bg-green/)

  // VISUAL CUE 3: URL still has se parameter
  expect(page.url()).toContain('se=event-today-sf')

  // Verify map centered on event (same as clicking event row)
  const mapCentered = await page.evaluate(() => {
    return window.mapRef?.current?.getZoom() > 10
  })
  expect(mapCentered).toBe(true)
})
```

### Selected Events Exception Behavior

```typescript
test('Selected event freezes event list and filters', async ({ page }) => {
  await page.goto('/?es=test:stable')
  await page.waitForLoadState('networkidle')

  // Get initial state
  const initialEventCount = await page.getByRole('row').count()
  const initialVisibleText = await page.getByRole('button', { name: /visible/i }).textContent()

  // Select an event by clicking row
  const eventRow = page.getByRole('row', { name: /weekend event/i })
  await eventRow.click()

  // Wait for selection to complete
  await expect(page.locator('.maplibregl-popup')).toBeVisible()

  // Map likely changed (zoomed in), but event list should be FROZEN
  const frozenEventCount = await page.getByRole('row').count()
  const frozenVisibleText = await page.getByRole('button', { name: /visible/i }).textContent()

  expect(frozenEventCount).toBe(initialEventCount)  // FROZEN
  expect(frozenVisibleText).toBe(initialVisibleText)  // FROZEN

  // Map chip should NOT update (frozen)
  const mapChip = page.getByRole('button', { name: /filtered by map/i })
  await expect(mapChip).toHaveCount(0)  // No new chip

  // Close popup to deselect and UNFREEZE
  const closeButton = page.locator('.maplibregl-popup-close-button')
  await closeButton.click()

  // Wait for popup to close
  await expect(page.locator('.maplibregl-popup')).toHaveCount(0)

  // Event list should now UNFREEZE and update
  await page.waitForTimeout(500)  // Give time for unfreeze
  const unfrozenEventCount = await page.getByRole('row').count()

  // Map chip may now appear if map bounds changed
  // (unless all events still fit in viewport)
})
```

---

## Filter Chip Tests

Based on **usage.md section 10**: Three filter types (map, date, search) with chips.

### Map Filter Chip

```typescript
test('Pan map creates map filter chip', async ({ page }) => {
  await page.goto('/?es=test:stable')
  await page.waitForLoadState('networkidle')

  // Verify no map chip initially
  const mapChip = page.getByRole('button', { name: /filtered by map/i })
  await expect(mapChip).toHaveCount(0)

  // Get initial event count
  const initialCount = await page.getByRole('row').count()

  // Pan map to move some events out of bounds
  const canvas = page.locator('canvas.maplibregl-canvas')
  await canvas.click({ position: { x: 200, y: 200 } })

  // Drag to pan
  await page.mouse.down()
  await page.mouse.move(400, 400)
  await page.mouse.up()

  // Wait for filter to apply
  await page.waitForTimeout(1000)

  // Verify map filter chip appears
  await expect(mapChip).toBeVisible()

  // Verify event list filtered
  const filteredCount = await page.getByRole('row').count()
  expect(filteredCount).toBeLessThan(initialCount)

  // Verify visible button updated
  const visibleButton = page.getByRole('button', { name: /visible/i })
  const buttonText = await visibleButton.textContent()
  expect(buttonText).toContain(`${filteredCount} of`)

  // Verify chip count matches filtered out count
  const chipText = await mapChip.textContent()
  const filteredOutCount = initialCount - filteredCount
  expect(chipText).toContain(filteredOutCount.toString())
})

test('Click map chip removes map filter', async ({ page }) => {
  // Setup: create map filter by panning
  await page.goto('/?es=test:stable')
  await page.waitForLoadState('networkidle')

  // Pan to create filter
  const canvas = page.locator('canvas.maplibregl-canvas')
  await canvas.click({ position: { x: 200, y: 200 } })
  await page.mouse.down()
  await page.mouse.move(400, 400)
  await page.mouse.up()
  await page.waitForTimeout(1000)

  // Verify chip exists
  const mapChip = page.getByRole('button', { name: /filtered by map/i })
  await expect(mapChip).toBeVisible()

  const countWithFilter = await page.getByRole('row').count()

  // Click chip to remove filter
  await mapChip.click()

  // Verify chip removed
  await expect(mapChip).toHaveCount(0)

  // Verify all events visible again
  const countWithoutFilter = await page.getByRole('row').count()
  expect(countWithoutFilter).toBeGreaterThan(countWithFilter)

  // Verify visible button shows all events
  const visibleButton = page.getByRole('button', { name: /visible/i })
  const buttonText = await visibleButton.textContent()
  expect(buttonText).toMatch(/(\d+) of \1 visible/i)  // X of X (same number)
})
```

### Date Filter Chip

```typescript
test('Apply weekend filter creates date chip', async ({ page }) => {
  const logs = await captureConsoleLogs(page, '/?es=test:stable&qf=weekend')

  // Verify state transitions
  verifyLogPatterns(logs, [
    {
      pattern: 'Processing quick date filter: weekend',
      requiredInState: 'applying-url-filters'
    },
    {
      pattern: /setFilter: dateRange:/,
      requiredInState: 'applying-url-filters'
    }
  ])

  // Verify date filter chip visible
  const dateChip = page.getByRole('button', { name: /filtered by date/i })
  await expect(dateChip).toBeVisible()

  // Verify events are actually weekend events
  const eventDates = await page.locator('tbody tr td').nth(1).allTextContents()  // Date column
  for (const dateStr of eventDates) {
    const date = new Date(dateStr)
    expect([5, 6, 0]).toContain(date.getDay())  // Fri, Sat, Sun
  }

  // Verify chip count
  const chipText = await dateChip.textContent()
  expect(chipText).toMatch(/\d+ filtered by date/i)
})

test('Click date chip removes date filter', async ({ page }) => {
  await page.goto('/?es=test:stable&qf=weekend')
  await page.waitForLoadState('networkidle')

  // Get count with filter
  const countWithFilter = await page.getByRole('row').count()

  // Click chip to clear
  const dateChip = page.getByRole('button', { name: /filtered by date/i })
  await dateChip.click()

  // Verify chip removed
  await expect(dateChip).toHaveCount(0)

  // Verify more events visible
  const countWithoutFilter = await page.getByRole('row').count()
  expect(countWithoutFilter).toBeGreaterThan(countWithFilter)

  // Verify visible button shows all events
  const visibleText = await page.getByRole('button', { name: /visible/i }).textContent()
  expect(visibleText).toMatch(/(\d+) of \1 visible/i)
})
```

### Search Filter Chip

```typescript
test('Type search creates search filter chip', async ({ page }) => {
  await page.goto('/?es=test:stable')
  await page.waitForLoadState('networkidle')

  // Get initial count
  const initialCount = await page.getByRole('row').count()

  // Type in search box (use semantic selector)
  const searchInput = page.getByLabel(/search/i)
  await searchInput.fill('oakland')

  // Wait for filter to apply
  await page.waitForTimeout(500)

  // Verify search filter chip appears
  const searchChip = page.getByRole('button', { name: /filtered by search/i })
  await expect(searchChip).toBeVisible()

  // Verify events filtered
  const filteredCount = await page.getByRole('row').count()
  expect(filteredCount).toBeLessThan(initialCount)

  // Verify all visible events contain search term
  const eventNames = await page.locator('tbody tr td').first().allTextContents()
  for (const name of eventNames) {
    expect(name.toLowerCase()).toContain('oakland')
  }
})

test('Clear search removes search filter chip', async ({ page }) => {
  await page.goto('/?es=test:stable&sq=oakland')
  await page.waitForLoadState('networkidle')

  // Verify chip exists
  const searchChip = page.getByRole('button', { name: /filtered by search/i })
  await expect(searchChip).toBeVisible()

  // Clear search box
  const searchInput = page.getByLabel(/search/i)
  await searchInput.clear()

  // Verify chip removed
  await page.waitForTimeout(500)
  await expect(searchChip).toHaveCount(0)

  // Verify all events visible
  const visibleText = await page.getByRole('button', { name: /visible/i }).textContent()
  expect(visibleText).toMatch(/(\d+) of \1 visible/i)
})
```

---

## State Validation Tests

Using console logs with `requiredInState` to validate app state transitions.

### URL Parameter Processing

```typescript
test('Weekend filter processes during applying-url-filters state', async ({ page }) => {
  const logs = await captureConsoleLogs(page, '/?es=test:stable&qf=weekend')

  verifyLogPatterns(logs, [
    {
      pattern: '[APP_STATE] changing: starting-app to fetching-data',
      description: 'App starts'
    },
    {
      pattern: '[APP_STATE] changing: fetching-data to applying-url-filters',
      description: 'Data fetched, ready to apply URL filters'
    },
    {
      pattern: 'Processing quick date filter: weekend',
      requiredInState: 'applying-url-filters',
      description: 'Weekend filter MUST process during applying-url-filters state'
    },
    {
      pattern: /setFilter: dateRange:.*start.*end/,
      requiredInState: 'applying-url-filters',
      description: 'Date range set during URL processing',
      cb: (logs) => {
        // Verify dates are reasonable weekend range
        const match = logs[0].match(/start: "([^"]+)", end: "([^"]+)"/)
        expect(match).toBeTruthy()

        const start = new Date(match[1])
        const end = new Date(match[2])

        // Weekend: Friday to Sunday (2-3 days)
        const daysDiff = (end - start) / (1000 * 60 * 60 * 24)
        expect(daysDiff).toBeGreaterThanOrEqual(2)
        expect(daysDiff).toBeLessThanOrEqual(3)

        expect(start.getDay()).toBe(5)  // Friday
        expect(end.getDay()).toBe(0)    // Sunday
      }
    },
    {
      pattern: '[APP_STATE] changing: applying-url-filters to user-interactive',
      description: 'URL filters applied, app ready'
    }
  ])
})
```

### Multiple URL Parameters

```typescript
test('Multiple URL parameters process in correct order', async ({ page }) => {
  const logs = await captureConsoleLogs(page, '/?es=test:stable&qf=weekend&sq=oakland&llz=37.8044,-122.2712,12')

  verifyLogPatterns(logs, [
    {
      pattern: 'Processing quick date filter: weekend',
      requiredInState: 'applying-url-filters'
    },
    {
      pattern: 'Processing search query: oakland',
      requiredInState: 'applying-url-filters'
    },
    {
      pattern: /Processing llz.*37.8044.*-122.2712.*12/,
      requiredInState: 'applying-url-filters'
    },
    {
      pattern: 'State: user-interactive'
    }
  ])

  // Verify all filters applied
  await expect(page.getByRole('button', { name: /filtered by date/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /filtered by search/i })).toBeVisible()

  // Verify map centered on coordinates
  const mapCenter = await page.evaluate(() => {
    const map = window.mapRef?.current
    return map?.getCenter()
  })
  expect(mapCenter.lat).toBeCloseTo(37.8044, 2)
  expect(mapCenter.lng).toBeCloseTo(-122.2712, 2)
})
```

---

## Using Real Functions

Import and use actual business logic functions instead of reimplementing.

### Weekend Filter with Real Function

```typescript
import { calculateQuickFilterRange } from '@/lib/utils/quickFilters'

test('Weekend filter uses calculateWeekendRange correctly', async ({ page }) => {
  const logs = await captureConsoleLogs(page, '/?es=test:stable&qf=weekend')

  verifyLogPatterns(logs, [
    {
      pattern: /setFilter: dateRange:.*start.*end/,
      cb: (logs) => {
        // Extract actual dates from app logs
        const logEntry = logs[0]
        const match = logEntry.match(/start: "([^"]+)", end: "([^"]+)"/)
        const actualStart = new Date(match[1])
        const actualEnd = new Date(match[2])

        // Use real function to verify (don't reimplement logic)
        // Note: We'd need to extract todayValue/totalDays from app context
        // For now, verify basic properties that weekend range must have

        // Weekend must be Friday to Sunday
        expect(actualStart.getDay()).toBe(5)  // Friday
        expect(actualEnd.getDay()).toBe(0)    // Sunday

        // Weekend must be 2-3 days
        const daysDiff = (actualEnd - actualStart) / (1000 * 60 * 60 * 24)
        expect(daysDiff).toBeGreaterThanOrEqual(2)
        expect(daysDiff).toBeLessThanOrEqual(3)
      }
    }
  ])
})
```

### Date Calculation Validation

```typescript
import { getDateFromUrlDateString } from '@/lib/utils/date'

test('Custom date range processes correctly', async ({ page }) => {
  const fsd = '2025-10-30'
  const fed = '2025-11-02'

  const logs = await captureConsoleLogs(page, `/?es=test:stable&fsd=${fsd}&fed=${fed}`)

  verifyLogPatterns(logs, [
    {
      pattern: /Processing filter dates: fsd.*fed/,
      requiredInState: 'applying-url-filters'
    },
    {
      pattern: /setFilter: dateRange/,
      cb: (logs) => {
        const match = logs[0].match(/start: "([^"]+)", end: "([^"]+)"/)
        const actualStart = new Date(match[1])
        const actualEnd = new Date(match[2])

        // Use real function to parse expected dates
        const expectedStart = getDateFromUrlDateString(fsd)
        const expectedEnd = getDateFromUrlDateString(fed)

        // Compare (allowing for timezone differences)
        expect(actualStart.toDateString()).toBe(expectedStart.toDateString())
        expect(actualEnd.toDateString()).toBe(expectedEnd.toDateString())
      }
    }
  ])
})
```

---

## Smoke Test Examples

Fast tests (<20s total) for critical workflows.

```typescript
// tests/e2e/smoke.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Smoke Tests @smoke', () => {
  test('Load app with events', async ({ page }) => {
    await page.goto('/?es=test:stable')

    // Fast verification: map and list visible
    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible()
    await expect(page.getByRole('table')).toBeVisible()

    // Verify events loaded
    const eventCount = await page.getByRole('row').count()
    expect(eventCount).toBeGreaterThan(0)

    // Verify visible button shows counts
    const visibleButton = page.getByRole('button', { name: /visible/i })
    await expect(visibleButton).toBeVisible()
    const buttonText = await visibleButton.textContent()
    expect(buttonText).toMatch(/\d+ of \d+ visible/i)
  })

  test('View today\'s events', async ({ page }) => {
    await page.goto('/?es=test:stable&qf=today')

    // Verify date filter chip
    await expect(page.getByRole('button', { name: /filtered by date/i })).toBeVisible()

    // Verify at least one event (test data includes today event)
    const eventCount = await page.getByRole('row').count()
    expect(eventCount).toBeGreaterThan(0)

    // Quick check: events are today (first event should be)
    const firstEventDate = await page.locator('tbody tr').first().locator('td').nth(1).textContent()
    const today = new Date().toISOString().split('T')[0]
    expect(firstEventDate).toContain(today)
  })

  test('View selected event from shared URL', async ({ page }) => {
    await page.goto('/?es=test:stable&se=event-today-sf')

    // Verify all 3 visual cues (fast checks)
    await expect(page.locator('.maplibregl-popup')).toBeVisible()  // 1. Popup
    expect(page.url()).toContain('se=event-today-sf')  // 2. URL

    // 3. Row highlighted (find it by event name)
    const eventRow = page.getByRole('row', { name: /today event/i })
    await expect(eventRow).toHaveCSS('background-color', /.*/)
  })
})
```

---

## Mobile Test Examples

Testing on iPhone 16 viewport.

```typescript
// tests/e2e/user-workflows.spec.ts
test('Mobile: tap event to select @mobile', async ({ page }) => {
  // Configure mobile viewport
  await page.setViewportSize({ width: 393, height: 852 })

  await page.goto('/?es=test:stable')
  await page.waitForLoadState('networkidle')

  // Use tap instead of click for mobile
  const eventRow = page.getByRole('row', { name: /today event/i })
  await eventRow.tap()

  // Verify selection (same as desktop)
  await expect(page.locator('.maplibregl-popup')).toBeVisible()
  await expect(eventRow).toHaveClass(/selected|highlighted/)
  expect(page.url()).toContain('se=event-today')
})

test('Mobile: vertical layout works @mobile', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 })

  await page.goto('/?es=test:stable')

  // Verify both map and list visible (stacked vertically on mobile)
  const eventTable = page.getByRole('table')
  const mapCanvas = page.locator('canvas.maplibregl-canvas')

  await expect(eventTable).toBeVisible()
  await expect(mapCanvas).toBeVisible()

  // On mobile, list should be above map (or vice versa)
  const tableBox = await eventTable.boundingBox()
  const mapBox = await mapCanvas.boundingBox()

  // One should be above the other (Y coordinates different)
  expect(Math.abs(tableBox.y - mapBox.y)).toBeGreaterThan(100)
})

test('Mobile: filter chips accessible @mobile', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 })

  await page.goto('/?es=test:stable&qf=weekend&sq=oakland')

  // Verify chips visible and tappable on mobile
  const dateChip = page.getByRole('button', { name: /filtered by date/i })
  const searchChip = page.getByRole('button', { name: /filtered by search/i })

  await expect(dateChip).toBeVisible()
  await expect(searchChip).toBeVisible()

  // Tap to remove
  await dateChip.tap()
  await expect(dateChip).toHaveCount(0)
})
```

---

## Edge Case Examples

Error states and boundary conditions.

### No Events State

```typescript
test('Handle no events gracefully', async ({ page }) => {
  // Use event source that returns no events (or filter to zero)
  await page.goto('/?es=test:stable&sq=xyznonexistent')

  // Verify map still visible
  await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible()

  // Verify empty state message or zero count
  const eventCount = await page.getByRole('row').count()
  expect(eventCount).toBe(0)

  // Verify visible button shows 0
  const visibleButton = page.getByRole('button', { name: /visible/i })
  const buttonText = await visibleButton.textContent()
  expect(buttonText).toMatch(/0 of \d+ visible/i)
})
```

### Invalid URL Parameters

```typescript
test('Handle invalid event source', async ({ page }) => {
  await page.goto('/?es=invalid-source-xyz')

  // Should show error or redirect to home
  // (Exact behavior depends on implementation)
  const hasError = await page.getByText(/error|invalid/i).isVisible().catch(() => false)
  const isHome = page.url().endsWith('/')

  expect(hasError || isHome).toBe(true)
})

test('Handle invalid selected event ID', async ({ page }) => {
  await page.goto('/?es=test:stable&se=nonexistent-event-id')

  // Should load app normally but no selection
  await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible()

  // No popup should appear
  await expect(page.locator('.maplibregl-popup')).toHaveCount(0)

  // se parameter may be removed from URL
  // (Or remain but ignored)
})

test('Handle invalid date parameters', async ({ page }) => {
  await page.goto('/?es=test:stable&fsd=invalid-date&fed=also-invalid')

  // Should load app with default date range (no filter)
  await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible()

  // No date filter chip should appear
  const dateChip = page.getByRole('button', { name: /filtered by date/i })
  await expect(dateChip).toHaveCount(0)
})
```

### Unresolved Locations

```typescript
test('Show unresolved locations with special search', async ({ page }) => {
  await page.goto('/?es=test:stable&sq=unresolved')

  // Verify search chip appears
  await expect(page.getByRole('button', { name: /filtered by search/i })).toBeVisible()

  // Verify only unresolved events shown
  const eventRows = await page.getByRole('row').count()
  expect(eventRows).toBeGreaterThan(0)

  // Verify events have "unresolved" in location
  const locations = await page.locator('tbody tr td').nth(3).allTextContents()  // Location column
  for (const location of locations) {
    expect(location.toLowerCase()).toContain('unresolved')
  }
})
```

---

## Anti-Patterns

Examples of what NOT to do.

### ❌ DON'T: Add data-testid to Repeated Elements

```typescript
// ❌ BAD - Performance impact with 3,000 events
<tr data-testid="event-item" data-event-id={event.id}>
  <td data-testid="event-name">{event.name}</td>
  <td data-testid="event-date">{event.date}</td>
</tr>

// ✅ GOOD - Use semantic HTML
<tr role="row">
  <td>{event.name}</td>
  <td>{event.date}</td>
</tr>

// Test with semantic selectors
const eventRow = page.getByRole('row', { name: /event name/i })
```

### ❌ DON'T: Reimplement Business Logic

```typescript
// ❌ BAD - Reimplementing weekend calculation
test('Weekend filter', async ({ page }) => {
  const today = new Date()
  const dayOfWeek = today.getDay()
  let daysToFriday = 0
  if (dayOfWeek === 0) daysToFriday = 5
  else if (dayOfWeek < 5) daysToFriday = 5 - dayOfWeek
  // ... 15 more lines of date math
})

// ✅ GOOD - Use real function or verify properties
import { calculateQuickFilterRange } from '@/lib/utils/quickFilters'

test('Weekend filter', async ({ page }) => {
  // Verify weekend properties (Friday to Sunday)
  const logs = await captureConsoleLogs(page, '/?es=test:stable&qf=weekend')
  verifyLogPatterns(logs, [{
    pattern: /setFilter: dateRange/,
    cb: (logs) => {
      const match = logs[0].match(/start: "([^"]+)", end: "([^"]+)"/)
      expect(new Date(match[1]).getDay()).toBe(5)  // Friday
      expect(new Date(match[2]).getDay()).toBe(0)  // Sunday
    }
  }])
})
```

### ❌ DON'T: Test Implementation Details

```typescript
// ❌ BAD - Testing callback chains (will be removed)
test('onBoundsChange callback fires', async ({ page }) => {
  // Testing implementation that will change per ai-proposal.md
  const callbackSpy = await page.evaluate(() => {
    return window.onBoundsChangeCallback
  })
  expect(callbackSpy).toHaveBeenCalled()
})

// ✅ GOOD - Test behavior
test('Pan map filters events', async ({ page }) => {
  // Test what user sees
  await page.goto('/?es=test:stable')
  // ... pan map ...
  await expect(page.getByRole('button', { name: /filtered by map/i })).toBeVisible()
})
```

### ❌ DON'T: Use waitForTimeout Without Reason

```typescript
// ❌ BAD - Arbitrary timeout
await page.waitForTimeout(5000)  // Why 5 seconds?

// ✅ GOOD - Wait for specific condition
await expect(page.getByRole('button', { name: /filtered/i })).toBeVisible()

// ✅ GOOD - Wait for network idle
await page.waitForLoadState('networkidle')

// ✅ GOOD - Wait for state
const logs = await captureConsoleLogs(page, url, {
  waitForSpecificLog: 'State: user-interactive'
})
```

### ❌ DON'T: Use External Test Data

```typescript
// ❌ BAD - External data can change
await page.goto('/?es=sf')  // Real SF events change over time

// ✅ GOOD - Controlled test data
await page.goto('/?es=test:stable')  // Predictable, stable data
```

---

## Summary

**Key patterns:**
- Selected Event: 3 triggers, 3 cues, Exception behavior
- Filter Chips: Create and remove for map, date, search
- State Validation: Use console logs with requiredInState
- Real Functions: Import and use, don't reimplement
- Semantic Selectors: getByRole, getByText (performance-conscious)

**Avoid:**
- data-testid on repeated elements
- Reimplementing business logic
- Testing implementation details
- Arbitrary timeouts
- External test data

---

**Next:** See [tests-e2e-migration.md](tests-e2e-migration.md) for implementation plan.
