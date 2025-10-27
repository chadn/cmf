# E2E Test Architecture

**Purpose:** Principles and patterns for writing E2E tests that are clear, maintainable, and resilient to refactoring.

**Audience:** AI agents and developers writing or maintaining E2E tests

**Last Updated:** 2025-10-27

---

## Table of Contents

1. [Core Principles](#core-principles)
2. [Test Organization](#test-organization)
3. [What to Test Where](#what-to-test-where)
4. [Selector Strategy](#selector-strategy)
5. [Console Log Usage](#console-log-usage)
6. [Test Data Strategy](#test-data-strategy)
7. [Mobile Testing](#mobile-testing)
8. [Surviving Refactors](#surviving-refactors)

---

## Core Principles

### 1. Test User Behavior, Not Implementation

**❌ BAD - Tests implementation details:**
```typescript
test('FilterEventsManager.setDateRange called', async ({ page }) => {
  // Testing internal function calls - breaks during refactors
  const spy = page.evaluate(() => window.FilterEventsManager.setDateRange)
  expect(spy).toHaveBeenCalled()
})
```

**✅ GOOD - Tests user-visible behavior:**
```typescript
test('Weekend filter shows only weekend events', async ({ page }) => {
  await page.goto('/?es=test:stable&qf=weekend')

  // Verify what user sees
  await expect(page.getByRole('button', { name: /filtered by date/i })).toBeVisible()

  // Verify events are actually on weekend
  const eventDates = await page.getByRole('cell', { name: /\d{4}-\d{2}-\d{2}/ }).allTextContents()
  for (const dateStr of eventDates) {
    const date = new Date(dateStr)
    expect([5, 6, 0]).toContain(date.getDay())  // Fri, Sat, Sun
  }
})
```

**Why:** Implementation can change (ai-proposal.md refactor) but user behavior shouldn't.

---

### 2. Use Console Logs for State Validation

Console logs are **CRITICAL** for testing app state transitions - they're the ONLY way to verify internal state in E2E tests.

**Use console logs for:**
- ✅ State machine transitions (`starting-app` → `applying-url-filters` → `user-interactive`)
- ✅ Filter application order and timing
- ✅ Internal behavior that affects correctness (timezone conversions, date calculations)
- ✅ Verifying business logic executed correctly

**Use DOM assertions for:**
- ✅ User-visible behavior (chips appear, events filtered, map updates)

**Example - Combined approach:**
```typescript
test('Weekend filter applies correctly', async ({ page }) => {
  const logs = await captureConsoleLogs(page, '/?es=test:stable&qf=weekend')

  // ✅ Verify state transitions (console logs)
  verifyLogPatterns(logs, [
    {
      pattern: 'Processing quick date filter: weekend',
      requiredInState: 'applying-url-filters',
      description: 'Weekend filter processed during URL parsing'
    },
    {
      pattern: /setFilter: dateRange:/,
      requiredInState: 'applying-url-filters',
      description: 'Date range set before user interaction'
    },
    {
      pattern: 'State: user-interactive',
      description: 'App ready for user interaction'
    }
  ])

  // ✅ Verify user-visible behavior (DOM)
  await expect(page.getByRole('button', { name: /filtered by date/i })).toBeVisible()
})
```

---

### 3. E2E Tests USE Real Functions, Don't Reimplement Logic

**❌ BAD - Reimplementing weekend logic:**
```typescript
test('Weekend filter calculates correctly', async ({ page }) => {
  // Reimplementing business logic in test
  const today = new Date()
  const dayOfWeek = today.getDay()
  let daysToFriday = dayOfWeek < 5 ? 5 - dayOfWeek : 0
  const friday = new Date(today.getTime() + daysToFriday * 86400000)
  // ... 10 more lines of date math
})
```

**✅ GOOD - Using actual function:**
```typescript
import { calculateQuickFilterRange } from '@/lib/utils/quickFilters'

test('Weekend filter applies correctly', async ({ page }) => {
  const logs = await captureConsoleLogs(page, '/?es=test:stable&qf=weekend')

  verifyLogPatterns(logs, [
    {
      pattern: /setFilter: dateRange:.*start.*end/,
      cb: (logs) => {
        // Extract what the app actually did
        const match = logs[0].match(/start: "([^"]+)", end: "([^"]+)"/)
        const actualStart = new Date(match[1])
        const actualEnd = new Date(match[2])

        // Verify it's a reasonable weekend range using real function
        const daysDiff = (actualEnd - actualStart) / (1000 * 60 * 60 * 24)
        expect(daysDiff).toBeGreaterThanOrEqual(2)  // Fri to Sun minimum
        expect(actualStart.getDay()).toBe(5)  // Friday
        expect(actualEnd.getDay()).toBe(0)    // Sunday
      }
    }
  ])
})
```

**Why:**
- Single source of truth for business logic
- If function logic changes, unit tests fail (appropriate place to catch it)
- E2E tests validate integration, not reimplemented logic

---

### 4. Tests Must Survive Refactors

The codebase is early-stage and **big refactors are planned** (see `docs/ai-proposal.md`). Tests must work before AND after refactoring.

**Refactor-proof patterns:**
- ✅ Test user-visible behavior (button text, event counts)
- ✅ Use semantic selectors (getByRole, getByText)
- ✅ Validate state transitions via console logs (state machine won't change)
- ✅ Test workflows, not component implementation

**Brittle patterns to avoid:**
- ❌ Testing specific callback chains (these will be removed)
- ❌ Testing component internal state (components will be restructured)
- ❌ Relying on CSS class names (may change during refactor)
- ❌ Testing implementation details (debounce timing, etc.)

---

## Test Organization

### File Structure

```
tests/e2e/
├── test-utils.ts              # Shared utilities (captureConsoleLogs, etc.)
├── smoke.spec.ts              # 3 critical workflows (<20s)
├── user-workflows.spec.ts     # All interactive tests
├── edge-cases.spec.ts         # Error states, invalid inputs
└── console-logs.spec.ts       # Debug helper
```

### Which File For What Test?

**smoke.spec.ts** - Top 3 user workflows from analytics
- Load app with events
- View today's events (top workflow)
- View selected event from shared URL (top workflow)
- **Goal:** Fast feedback (<20s), run before every commit
- **Tag:** `@smoke`

**user-workflows.spec.ts** - All user interactions
- Selected event (3 triggers, 3 visual cues, Exception behavior)
- Filter chips (create and remove: map, date, search)
- Search functionality
- Date selector (slider, calendar, quick filters)
- Map interactions (pan, zoom)
- **Goal:** Comprehensive coverage of user actions
- **Tag:** `@workflow`

**edge-cases.spec.ts** - Error and boundary conditions
- No events state
- Invalid URL parameters
- Unresolved locations
- API errors (if testable)
- **Goal:** Medium priority edge cases
- **Tag:** `@edge`

**console-logs.spec.ts** - Debug utility
- Capture logs from any URL
- Always passes (not a validation test)
- **Goal:** Fast debugging during development

---

## What to Test Where

| What | Where | Example |
|------|-------|---------|
| **Pure logic** | Unit tests | `calculateWeekendRange()` with various inputs |
| **State transitions** | E2E (console logs) | App moves from `applying-url-filters` → `user-interactive` |
| **User-visible behavior** | E2E (DOM) | Filter chip appears, event list updates |
| **Integration** | E2E (logs + DOM) | URL param → filter applied → state transitions → UI updates |
| **Timezone bugs** | E2E (logs + DOM) | Date conversion happens correctly, displayed properly |
| **Component updates** | E2E (interactive) | Click filter chip → state updates → UI syncs |
| **Selected Event behavior** | E2E (interactive) | Click event → map pans → popup appears → Exception applies |

### Unit Tests vs E2E Tests

**Unit tests** (`src/**/__tests__/*.test.ts`)
- Test pure functions in isolation
- Example: `calculateWeekendRange(todayValue, totalDays, getDateFromDays)`
- Fast (<1ms per test), no browser needed
- Already comprehensive ✅

**E2E tests** (`tests/e2e/*.spec.ts`)
- Test user workflows and integration
- USE unit-tested functions, don't reimplement
- Verify state transitions via console logs
- Test user-visible behavior via DOM

---

## Selector Strategy

**With 1,000-3,000 events, every attribute matters.** Follow this strict priority:

### Priority 1: Semantic Selectors (Preferred)

```typescript
// ✅ Buttons
page.getByRole('button', { name: /filtered by date/i })
page.getByRole('button', { name: /visible/i })

// ✅ Table rows
page.getByRole('row', { name: /today event/i })

// ✅ Form inputs
page.getByLabel('Search events')
page.getByPlaceholder('Search...')

// ✅ Text content
page.getByText(/filtered by map/i)
page.getByText('118 of 118 Visible')
```

**Why:**
- Built into HTML, zero performance overhead
- Accessibility-friendly
- Works before and after refactors

### Priority 2: Stable CSS Selectors

```typescript
// ✅ Library-provided classes (MapLibre)
page.locator('.maplibregl-popup')
page.locator('.maplibregl-canvas')

// ✅ Existing ARIA attributes
page.locator('button[aria-label*="filter"]')

// ✅ Stable custom classes (if they exist and won't change)
page.locator('.event-list-table')  // Example from EventList.tsx:243
```

**Why:**
- No DOM changes needed
- Works with existing structure
- Library classes won't change

### Priority 3: data-testid (Last Resort - Use Sparingly!)

**⚠️ IMPORTANT:** Filter chips **already have data-testid** (see ActiveFilters.tsx:61)
- `date-filter-chip`, `map-filter-chip`, `search-filter-chip` ✅
- Only 3 elements, no performance impact
- **Use these existing data-testid attributes in tests**

**ONLY add data-testid to critical elements lacking semantic selectors:**

```typescript
// ✅ Existing: Filter chips (already have data-testid)
page.locator('[data-testid="date-filter-chip"]')
page.locator('[data-testid="map-filter-chip"]')
page.locator('[data-testid="search-filter-chip"]')

// ✅ Optional: Hidden state indicator (1 element, for state validation)
<div data-app-state={appState} style={{ display: 'none' }} />

// Test usage:
const state = await page.locator('[data-app-state]').getAttribute('data-app-state')
expect(state).toBe('user-interactive')
```

**NEVER add to repeated elements:**
```typescript
// ❌ NEVER DO THIS - Performance impact with 3,000 events!
<tr data-testid="event-item" data-event-id={event.id}>

// ✅ DO THIS - Use semantic HTML
<tr role="row">  // Already has role
```

### Real Examples

**Event List:**
```typescript
// ✅ Get event by name
const eventRow = page.getByRole('row', { name: /today event/i })

// ✅ Get all event rows
const eventRows = page.getByRole('row')
const count = await eventRows.count()

// ✅ Get event table
const eventTable = page.locator('.event-list-table')  // Stable class
```

**Filter Chips:**
```typescript
// ✅ Option 1: Use existing data-testid (most specific, recommended)
const dateChip = page.locator('[data-testid="date-filter-chip"]')
const mapChip = page.locator('[data-testid="map-filter-chip"]')
const searchChip = page.locator('[data-testid="search-filter-chip"]')

// ✅ Option 2: Use semantic selector (also works)
const dateChip = page.getByRole('button', { name: /filtered by date/i })
const searchChip = page.getByRole('button', { name: /filtered by search/i })
const mapChip = page.getByRole('button', { name: /filtered by map/i })
```

**Marker Popup:**
```typescript
// ✅ Use MapLibre standard class
const popup = page.locator('.maplibregl-popup')
await expect(popup).toBeVisible()

// ✅ Get popup content
const popupContent = popup.locator('.maplibregl-popup-content')
```

---

## Console Log Usage

### When to Use Console Logs

**✅ Use for state validation:**
```typescript
verifyLogPatterns(logs, [
  {
    pattern: 'Processing quick date filter: weekend',
    requiredInState: 'applying-url-filters'
  },
  {
    pattern: 'State: user-interactive'
  }
])
```

**✅ Use for internal behavior verification:**
```typescript
verifyLogPatterns(logs, [
  {
    pattern: /setFilter: dateRange:/,
    cb: (logs) => {
      // Verify correct dates were calculated
      const match = logs[0].match(/start: "([^"]+)", end: "([^"]+)"/)
      // ... validate using real functions
    }
  }
])
```

### When to Avoid Console Logs

**❌ Don't rely on logs that might change:**
```typescript
// ❌ This debug log might be removed during refactor
pattern: 'DEBUG: handleViewportChange called'

// ✅ Use state machine logs instead (won't change)
pattern: 'State: user-interactive'
```

### Best Practices

1. **Use `requiredInState`** - Validates logs occur during correct app state
2. **Use callbacks for complex validation** - Extract data from logs and verify with real functions
3. **Focus on state transitions** - State machine is stable, won't change during refactor
4. **Don't test debug logs** - Only test logs that are part of core behavior

---

## Test Data Strategy

### testSource.ts - Controlled Test Data

**Always use `test:stable` or `test:comprehensive` for E2E tests:**

```typescript
// ✅ Stable test data
await page.goto('/?es=test:stable')

// ❌ External data that can change
await page.goto('/?es=sf')  // Only for manual testing
```

### Event Sets

**`test:stable`** - Small set (5-10 events) for smoke tests
- Dynamic dates (always "today", "weekend", etc.)
- Known locations (SF, Oakland, Berkeley)
- One unresolved location
- Fast to load and process

**`test:comprehensive`** - Large set (50-100 events) for full coverage
- Mix of dates (past, present, future)
- Various locations (spread out geographically)
- Multiple unresolved locations
- Edge cases (timezone boundaries, etc.)

**`test:timezone`** - Static dates for timezone edge case testing
- Fixed UTC times (e.g., midnight UTC)
- Events in different timezones
- Timezone conversion edge cases

### Dynamic vs Static Dates

**Dynamic dates** (for smoke tests):
```typescript
{
  id: 'event-today',
  start: () => getTodayAt(14, 0, 'America/Los_Angeles'),  // Always "today"
  // ...
}
```
✅ Tests always work regardless of when run
❌ More complex

**Static dates** (for timezone tests):
```typescript
{
  id: 'event-utc-midnight',
  start: '2025-11-01T00:00:00Z',  // Fixed date
  // ...
}
```
✅ Simple, predictable
❌ Tests might fail in different date ranges

**Hybrid approach** (recommended):
- Smoke tests use dynamic dates
- Timezone edge case tests use static dates
- Comprehensive tests use mix

---

## Mobile Testing

### Device Configuration

**Primary mobile device: iPhone 16** (most popular)

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'mobile-iphone16',
      use: {
        ...devices['iPhone 16'],
        // Or manually if not in Playwright yet:
        viewport: { width: 393, height: 852 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true
      }
    }
  ]
})
```

### Execution Strategy

```bash
# Smoke tests - desktop only (fast feedback)
npm run test:e2e:smoke

# Full tests - both desktop and mobile
npm run test:e2e:full

# Mobile only
npm run test:e2e:mobile
```

### Mobile-Specific Testing

**Test mobile-specific interactions:**
```typescript
test('Mobile: tap event to select @mobile', async ({ page }) => {
  // Use tap instead of click
  const eventRow = page.getByRole('row').first()
  await eventRow.tap()  // Mobile tap

  await expect(page.locator('.maplibregl-popup')).toBeVisible()
})
```

**Test mobile layout:**
```typescript
test('Mobile: vertical layout works @mobile', async ({ page }) => {
  await page.goto('/?es=test:stable')

  // Verify both map and list visible (stacked vertically)
  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible()
})
```

---

## Surviving Refactors

### ai-proposal.md Context

The codebase will undergo significant refactoring:
- Remove callback chains (5+ callbacks → 0 callbacks)
- Remove debounce complexity (sync bounds calculation)
- Simplify components (single responsibility)
- New hooks (useMapState, useMapSync)

**Tests must work before AND after this refactor.**

### What Will Change

- ❌ Callback implementation (removed)
- ❌ Debounce timing (removed)
- ❌ Component internal structure
- ❌ Hook implementations

### What Won't Change

- ✅ User-visible behavior (buttons, chips, events)
- ✅ State machine transitions
- ✅ URL parameters and processing
- ✅ Filter logic (what gets filtered)
- ✅ Selected Event behavior and Exception
- ✅ Business logic functions (calculateWeekendRange, etc.)

### Write Refactor-Proof Tests

**Focus on what won't change:**

```typescript
test('Pan map creates map filter chip', async ({ page }) => {
  await page.goto('/?es=test:stable')

  // Get initial bounds (doesn't matter how - will work after refactor)
  const initialCount = await page.getByRole('row').count()

  // Pan map (user action - won't change)
  await page.locator('canvas.maplibregl-canvas').click({ position: { x: 100, y: 100 } })
  await page.mouse.move(200, 200)

  // Verify result (user-visible - won't change)
  await expect(page.getByRole('button', { name: /filtered by map/i })).toBeVisible()

  const newCount = await page.getByRole('row').count()
  expect(newCount).toBeLessThan(initialCount)
})
```

**Avoid testing internals:**

```typescript
// ❌ DON'T TEST THIS - Will break during refactor
test('debouncedUpdateBounds called after pan', async ({ page }) => {
  // This tests implementation, not behavior
})

// ❌ DON'T TEST THIS - Callback chains are being removed
test('onBoundsChange callback fires', async ({ page }) => {
  // Callbacks are being removed per ai-proposal.md
})
```

---

## Summary

**Core principles:**
1. Test user behavior, not implementation
2. Use console logs for state validation
3. E2E tests USE real functions
4. Tests must survive refactors

**Selector priority:**
1. Semantic selectors (getByRole, getByText)
2. Stable CSS selectors (library classes)
3. data-testid (only when absolutely necessary)

**Test organization:**
- `smoke.spec.ts` - 3 critical workflows (<20s)
- `user-workflows.spec.ts` - All interactions
- `edge-cases.spec.ts` - Error states

**Key practices:**
- Always use `test:stable` event source
- Focus on user-visible behavior
- Validate state transitions via console logs
- Use semantic selectors (performance-conscious)
- Test on desktop + iPhone 16

---

**Next:** See [tests-e2e-examples.md](tests-e2e-examples.md) for code examples and [tests-e2e-migration.md](tests-e2e-migration.md) for implementation plan.
