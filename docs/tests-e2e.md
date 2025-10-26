# End-to-End Test Architecture

**Purpose:** Comprehensive documentation of CMF's E2E testing infrastructure, current coverage, and recommendations for improvement.

**Audience:** Developers maintaining or expanding E2E tests

**Last Updated:** 2025-10-26

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Current Coverage](#current-coverage)
3. [Recommended Improvements](#recommended-improvements)
4. [Migration Plan](#migration-plan)

---

## Current Architecture

### Test Infrastructure Overview

**Testing Framework:** Playwright v1.56.0

**Test Location:** `/tests/e2e/` (outside `/src` - tests the running app, not source files directly)

**Test Execution:**
- **Development:** Parallel execution with 6 workers for speed
- **CI:** Sequential execution (1 worker) with 2 retries for stability
- **Browser:** Chromium only (Desktop Chrome configuration)

### Configuration (`playwright.config.ts`)

```typescript
{
  testDir: './tests/e2e',
  fullyParallel: true,                    // Parallel test execution in dev
  workers: process.env.CI ? 1 : 6,        // 6 workers dev, 1 worker CI
  retries: process.env.CI ? 2 : 0,        // Retries only in CI
  reporter: [['html', { open: 'never' }]], // HTML reports without auto-open
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry'               // Traces only on failures
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI, // Reuse dev server locally
    timeout: 120000                        // 2 minute startup timeout
  }
}
```

**Key Features:**
- Automatic dev server startup before tests
- Reuses existing dev server in local development
- HTML reports for debugging (never auto-opens - AI-friendly)
- Trace collection on first retry for debugging failures

### Test File Structure

```
/tests/e2e/
├── test-utils.ts           # Shared utilities, types, functions (297 lines)
├── page-load.spec.ts       # URL processing and page load verification (280 lines)
├── interactive.spec.ts     # User interaction tests (162 lines)
└── console-logs.spec.ts    # Console log capture and debugging (106 lines)
```

### Test Utilities (`test-utils.ts`)

**Core Purpose:** Centralized testing infrastructure to avoid duplication and ensure consistency.

#### Data Structures

```typescript
interface ConsoleMessage {
  type: string              // 'log', 'error', 'warning', 'pageerror'
  text: string              // Console message text
  timestamp: Date
  url?: string              // Page URL when logged
  location?: string         // Source file location
}

interface LogPattern {
  pattern: string | RegExp  // Pattern to match in logs
  description: string       // Human-readable description
  required?: boolean        // Default true - fail test if not found
  requiredInState?: string  // Expected app state when pattern should occur
  cb?: (logs: string[]) => void // Callback for complex assertions
}

interface EventCountExpectations {
  hasVisibleEvents?: boolean
  hasAllEvents?: boolean
  hasFilteredCounts?: boolean
  minVisibleEvents?: number
  maxVisibleEvents?: number
}

interface PageLoadTestCase {
  name: string
  url: string
  expectedLogs: LogPattern[]
  expectedEventCounts?: EventCountExpectations
  timeout?: number
  additionalWaitTime?: number
  skip?: boolean
  timezoneId?: string       // Override browser timezone for test
}
```

#### Key Functions

**`captureConsoleLogs(page, url, options)`**
- Captures all console messages (log, error, warning, pageerror)
- Waits for logs to stabilize (3s default silence after last log)
- Supports waiting for specific log before completing
- Returns array of `ConsoleMessage` objects

**`verifyLogPatterns(logs, expectedLogs, testName)`**
- Validates that expected log patterns appear in captured logs
- Supports state-aware pattern matching (checks app state transitions)
- Supports callbacks for complex assertions (e.g., date range calculations)
- Fails test if required patterns not found

**`extractCounts(logEntry)`**
- Parses event count logs: `State: user-interactive, Events: allEvents:118 visibleEvents:20 {"byMap":98,"bySearch":0,"byDate":0,"byLocationFilter":0}`
- Returns structured count data for assertions
- Used extensively in interactive tests

**`printConsoleLogs(logs, title)`**
- Pretty-prints console logs with timestamps and formatting
- Useful for debugging test failures

**`reportErrors(logs, testName)`**
- Filters and reports error logs
- Returns error count for test assertions

#### Default Configuration

```typescript
const DEFAULT_CAPTURE_OPTIONS: CaptureLogsOptions = {
  timeout: 20000,               // 20s page load timeout
  waitForNetworkIdle: true,     // Wait for network idle
  includeErrors: true,
  includeWarnings: true,
  additionalWaitTime: 5000,     // Wait 5s after last log
  maxWaitForLogs: 45000         // Max 45s total wait for logs
}
```

### Test Categories

#### 1. Page Load Tests (`page-load.spec.ts`)

**Purpose:** Systematic verification of URL parameter processing and application state transitions.

**Approach:** Load URL → Capture console logs → Verify expected patterns → Check event counts

**Test Cases:**

1. **Quick Filter Weekend** (`/?es=sf&qf=weekend`)
   - Verifies weekend date calculation
   - Checks timezone-aware date conversion (LA timezone)
   - Validates date range is >2 days, <3 days
   - Ensures visible events > 0

2. **Custom Date Range** (`/?es=sf&fsd=2025-10-30&fed=2025-11-2`)
   - Tests explicit date filter processing
   - Validates NYC timezone conversion
   - Checks event filtering by date range

3. **Search Filter** (`/?es=sf&sq=berkeley`)
   - Verifies search term application
   - Validates event count reduction
   - Ensures search filtering math is correct

4. **LLZ Coordinates with Events** (`/?es=sf&llz=37.77484,-122.41388,12`)
   - Tests viewport setting from coordinates
   - Validates visible events exist within bounds
   - Checks map bounds filtering

5. **LLZ Coordinates without Events** (`/?es=19hz:ORE&llz=16.32341,-86.54243,12`)
   - Tests viewport with no events in bounds
   - Verifies zero visible events
   - Validates all events filtered by map

6. **Selected Event** (`/?es=sf&se=oapv4pivkccdkqo0iujsk7hkt0`)
   - Tests selected event ID processing
   - Verifies marker selection and popup

**Timezone Support:**
- Tests can specify `timezoneId` to override browser timezone
- Critical for testing date calculations in different timezones
- Examples: `America/Los_Angeles`, `America/New_York`

**State-Aware Pattern Matching:**
- Patterns can specify `requiredInState: 'applying-url-filters'`
- Ensures logs occur during correct app state
- Tracks state transitions via `[APP_STATE] changing: X to Y` logs

**Complex Assertions via Callbacks:**
```typescript
{
  pattern: '[FLTR_EVTS_MGR] setFilter: dateRange: ',
  cb: (logs) => {
    // Extract dates from log, validate range is >2 days, <3 days
    const matches = logs[logs.length - 1].match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/)
    expect(matches).toHaveLength(3)
    const startEpoch = new Date(matches[1]).getTime()
    const endEpoch = new Date(matches[2]).getTime()
    expect(endEpoch - startEpoch).toBeGreaterThan(2 * 24 * 60 * 60 * 1000)
    expect(endEpoch - startEpoch).toBeLessThan(3 * 24 * 60 * 60 * 1000)
  }
}
```

**Environment Variable Support:**
- `TEST_URL` - Test custom URL without modifying code
- `TEST_NAME` - Run only tests matching name substring
- `TEST_TIMEZONE` - Override browser timezone for custom URL tests

#### 2. Interactive Tests (`interactive.spec.ts`)

**Purpose:** Test user interactions with the application in `user-interactive` state.

**Approach:** Load page → Wait for interactive state → Perform user actions → Verify UI updates

**Current Tests:**

1. **Date Filter Clearing - Chip Interaction**
   - Load page with weekend filter (`/?es=sf&qf=weekend`)
   - Wait for `user-interactive` state
   - Verify date filter chip is visible
   - Click chip to clear filter
   - Verify chip is removed
   - Verify "X of Y Visible" button shows all events
   - Confirm no other filter chips remain

2. **Date Filter Clearing - Event List Updates**
   - Load page with weekend filter
   - Count initial events in event list (tbody tr elements)
   - Clear date filter chip
   - Count final events in event list
   - Verify more events visible after clearing
   - Verify event list count matches visible button count

**Testing Strategy:**
- Focus on DOM state changes, not console logs
- Wait for state stabilization before assertions
- Verify multiple UI elements update in sync
- Test both filter application and removal

**Key Patterns:**
```typescript
// Wait for user-interactive state
const logs = await captureConsoleLogs(page, testUrl, {
  ...DEFAULT_CAPTURE_OPTIONS,
  waitForSpecificLog: 'State: user-interactive',
  additionalWaitTime: 2000
})

// Verify element visibility
const dateFilterChip = page.locator('button[data-testid="date-filter-chip"]')
await expect(dateFilterChip).toBeVisible()

// Perform interaction
await dateFilterChip.click()
await page.waitForTimeout(1000) // Allow state update

// Verify result
await expect(dateFilterChip).toHaveCount(0)
```

#### 3. Console Log Debugging (`console-logs.spec.ts`)

**Purpose:** Quick debugging tool for capturing and analyzing console logs from any URL.

**Approach:** Flexible log capture without strict assertions - always passes, just captures data.

**Tests:**

1. **Timezone Test** - Verifies Playwright can override browser timezone
2. **Custom URL Test** - Captures logs from `TEST_URL` environment variable
3. **Pattern Matching** (skipped) - Example of filtering logs by pattern

**Usage:**
```bash
# Capture logs from any URL
TEST_URL="/?es=sf&qf=weekend" npm run test:e2e:console

# Redirect to file for AI analysis
(TEST_URL="/?es=sf" npm run test:e2e:console) &> dev-perf-browser-logs.txt
```

**Output:**
- Pretty-printed console logs with timestamps
- Log type summary (log, error, warning counts)
- Error report with potential issues
- Always passes - debugging tool, not validation

### Available Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run console log debugging (visible browser)
npm run test:e2e:console
TEST_URL="/?es=sf&qf=weekend" npm run test:e2e:console

# Run page load tests (visible browser)
npm run test:e2e:pageload
TEST_NAME="Quick Filter" npm run test:e2e:pageload

# Run interactive tests (visible browser)
npm run test:e2e:interactive

# View HTML test report (after running tests)
npm run test:report  # Alias for: npx playwright show-report
```

### Test Execution Flow

**Page Load Tests:**
1. Playwright starts dev server (`npm run dev`)
2. Test navigates to URL with `captureConsoleLogs()`
3. Console listener captures all logs until stabilized
4. `verifyLogPatterns()` checks expected patterns
5. `reportErrors()` checks for error logs
6. Test reports pass/fail

**Interactive Tests:**
1. Playwright starts dev server
2. Test navigates to URL and waits for `user-interactive` state
3. Test performs user actions (clicks, typing, etc.)
4. Test verifies DOM state changes
5. Test checks synchronization between UI elements
6. Test reports pass/fail

### Debugging Failed Tests

**When tests fail:**

1. Check console output for captured logs
2. Look for specific patterns that weren't found
3. Review app state transitions in logs
4. Use `TEST_URL` to test individual URLs
5. Add `console.log` statements in app code if needed
6. View HTML report: `npm run test:report`
7. Check trace files in `/test-results/` (on retry failures)

**Common Failure Modes:**
- Log pattern not found (app behavior changed)
- Timeout waiting for logs (app too slow or stuck)
- State-specific pattern in wrong state (state machine issue)
- Event count mismatch (filtering logic bug)
- Element not found (UI structure changed)

### Playwright Configuration Details

**Reporter Configuration:**
- HTML reporter with `open: 'never'` - AI-friendly (doesn't open browser)
- Reports saved to `playwright-report/`
- View with `npx playwright show-report`

**Trace Configuration:**
- `trace: 'on-first-retry'` - Only capture traces on failures
- Traces saved to `test-results/`
- View with `npx playwright show-trace <trace-file>`

**Retry Strategy:**
- No retries in development (fail fast)
- 2 retries in CI (handle flakiness)
- `forbidOnly: !!process.env.CI` - Prevent accidental test.only in CI

**Parallel Execution:**
- `fullyParallel: true` - Tests run in parallel
- 6 workers in dev (fast iteration)
- 1 worker in CI (avoid resource contention)

---

## Current Coverage

### What's Tested Today

#### URL Parameter Processing (Comprehensive)

**Date Filters:**
- ✅ Quick filters (`qf=weekend`, `qf=today`, `qf=next7days`)
- ✅ Explicit date ranges (`fsd=YYYY-MM-DD&fed=YYYY-MM-DD`)
- ✅ Timezone-aware date conversions (LA, NYC timezones tested)
- ✅ Date range calculations and validations

**Search Filters:**
- ✅ Search query application (`sq=berkeley`)
- ✅ Event count reduction from search
- ✅ Filter math validation (visibleEvents + bySearch = allEvents)

**Map Viewport:**
- ✅ LLZ coordinate processing (`llz=lat,lng,zoom`)
- ✅ Viewport setting from coordinates
- ✅ Map bounds filtering with events
- ✅ Map bounds filtering without events

**Selected Events:**
- ✅ Selected event ID processing (`se=eventId`)
- ✅ Marker selection and highlighting

**Event Sources:**
- ✅ Event source parsing (`es=source:id`)
- ✅ Multiple event sources (not explicitly tested but supported)

#### User Interactions (Limited)

**Filter Manipulation:**
- ✅ Date filter chip clearing
- ✅ Event list updates after filter changes
- ✅ Visible button count synchronization
- ⚠️ Map filter chip clearing (not tested)
- ⚠️ Search filter chip clearing (not tested)

**UI Synchronization:**
- ✅ Filter chips and event counts in sync
- ✅ Event list and visible button count match
- ⚠️ Map markers and event list sync (not tested)

#### Application State Machine

**State Transitions:**
- ✅ State-aware log pattern matching
- ✅ Transitions from `starting-app` → `user-interactive`
- ✅ State-specific behavior validation
- ⚠️ Error state transitions (not tested)

#### Browser Console Output

**Log Capture:**
- ✅ Console.log messages
- ✅ Console.error messages
- ✅ Console.warning messages
- ✅ Page error messages

**Debug Information:**
- ✅ Event counts and filtering stats
- ✅ State transition logs
- ✅ URL processing logs

### Coverage Gaps

#### Critical User Workflows (Not Tested)

1. **Event Selection from List**
   - Click event in EventList
   - Verify map pans to event location
   - Verify marker highlights
   - Verify popup appears
   - Verify event list scrolls to event (already selected)

2. **Event Selection from Map**
   - Click marker on map
   - Verify popup appears with event details
   - Verify event list scrolls to first event at that marker
   - Verify event list highlights selected event

3. **Filter Combinations**
   - Apply date + search + map filters together
   - Verify filter chips show correct counts
   - Verify event list shows intersection of filters
   - Clear filters in different orders

4. **Map Interactions**
   - Pan map → verify "Filtered by Map" chip appears
   - Zoom map → verify event counts update
   - Click "Filtered by Map" chip → verify map resets
   - Click "X of Y Visible" button → verify map zooms to visible events

5. **Search Functionality**
   - Type search query → verify event list filters in real-time
   - Clear search → verify all events return
   - Search with no results → verify empty state
   - Search + date filter combination

6. **Date Slider Interactions**
   - Drag date slider → verify event list updates
   - Verify dropdown labels update
   - Verify calendar selection updates
   - Verify URL parameter updates
   - Verify quick filter buttons deselect

7. **Calendar Picker**
   - Open calendar picker
   - Select date range
   - Verify event list updates
   - Verify slider updates
   - Verify dropdown labels update

8. **Quick Filter Buttons**
   - Click "Today" → verify correct date range
   - Click "Next 7 Days" → verify correct date range
   - Click "This Weekend" → verify correct date range
   - Verify previous selections cleared

9. **Sidebar Header Actions**
   - Click CMF header → verify popup opens
   - Verify timezone displayed
   - Click "View Usage Doc" → verify link works
   - Click "Enter New Source" → verify redirect to home
   - Click "Share - Copy URL" → verify URL copied

10. **Event Source Header Actions**
    - Click event source header → verify popup opens
    - Verify event count per source
    - Click "View Source" → verify external link
    - Click "Show Only These" → verify reload with single source

#### Edge Cases (Not Tested)

1. **No Events State**
   - Load event source with no events
   - Verify empty state message
   - Verify no map markers

2. **Unresolved Locations**
   - Filter to unresolved events (`sq=unresolved`)
   - Verify "unresolved" marker appears
   - Click unresolved marker → verify popup with event list

3. **Invalid URL Parameters**
   - Invalid event source (`es=invalid`)
   - Invalid selected event (`se=invalid`)
   - Invalid date range (`fsd=invalid`)
   - Invalid LLZ coordinates (`llz=invalid`)

4. **Error States**
   - API error loading events
   - Geocoding failure
   - Network timeout
   - Map rendering error

5. **Performance Under Load**
   - Large event counts (1000+ events)
   - Rapid filter changes
   - Quick map panning/zooming
   - Multiple event sources

6. **Browser Compatibility**
   - Only Chromium tested (no Firefox, Safari, Edge)
   - No mobile viewport testing

7. **Responsive Layout**
   - Desktop vs mobile layouts
   - Panel resizing
   - Horizontal vs vertical panel split

#### API and Data Flow (Not Tested)

1. **Event Fetching**
   - `/api/events` endpoint response
   - Event source handler integration
   - Geocoding API calls
   - Redis cache hits/misses

2. **Caching Behavior**
   - Event data caching
   - Geocoding cache behavior
   - Cache invalidation

3. **Real-time Updates**
   - SWR revalidation
   - Event data freshness
   - Cache expiration

### Test Metrics

**Total E2E Tests:** 10 (as of 2025-10-26)
- Page load tests: 6
- Interactive tests: 2
- Console debugging: 2 (1 active, 1 skipped)

**Test Execution Time:**
- Full suite: ~30 seconds (parallel, 6 workers)
- Page load only: ~18 seconds
- CI execution: Longer (sequential, 1 worker + retries)

**Test Files:** 3
- `page-load.spec.ts` - 280 lines, 6 tests
- `interactive.spec.ts` - 162 lines, 2 tests
- `console-logs.spec.ts` - 106 lines, 2 tests

**Shared Utilities:** 1
- `test-utils.ts` - 297 lines, 16+ utility functions

---

## Recommended Improvements

### Priority 1: Short Execution Time

**Goal:** Optimize test speed while maintaining comprehensive coverage.

#### Recommendations

**1.1 Combine Related Test Cases (HIGH VALUE)**

**Current Problem:** Each test loads a fresh page, even when testing similar workflows.

**Solution:** Group related assertions into single test cases.

**Example - Before (2 separate tests, 2 page loads):**
```typescript
test('Date filter clearing - chip interaction', async ({ page }) => {
  // Load page, verify chip clears
})

test('Date filter clearing - event list updates', async ({ page }) => {
  // Load page again, verify event list updates
})
```

**Example - After (1 test, 1 page load):**
```typescript
test('Date filter clearing - complete workflow', async ({ page }) => {
  // 1. Load page with weekend filter
  // 2. Verify chip is visible
  // 3. Verify initial event counts
  // 4. Click chip to clear
  // 5. Verify chip removed
  // 6. Verify event counts updated
  // 7. Verify event list updated
})
```

**Impact:**
- Reduce page loads by 50%+ for related tests
- Faster execution (no page load overhead)
- More realistic user workflows (users don't reload between actions)

**Confidence:** 95% - Will significantly improve speed without sacrificing coverage.

---

**1.2 Optimize Wait Times (MEDIUM VALUE)**

**Current Problem:** Fixed wait times (`waitForTimeout(1000)`) slow down tests unnecessarily.

**Solution:** Use Playwright's built-in waiting mechanisms.

**Example - Before (fixed delays):**
```typescript
await dateFilterChip.click()
await page.waitForTimeout(1000) // Wait for state update
await expect(dateFilterChip).toHaveCount(0)
```

**Example - After (smart waiting):**
```typescript
await dateFilterChip.click()
// Playwright automatically waits for element to disappear (up to timeout)
await expect(dateFilterChip).toHaveCount(0)
```

**Additional Optimizations:**
```typescript
// Use page.waitForLoadState() instead of waitForTimeout()
await page.waitForLoadState('networkidle')

// Use page.waitForResponse() for API calls
await page.waitForResponse(resp => resp.url().includes('/api/events'))

// Use locator.waitFor() for specific conditions
await dateFilterChip.waitFor({ state: 'hidden' })
```

**Impact:**
- Tests finish as soon as conditions met (no over-waiting)
- More reliable (waits for actual state, not arbitrary time)
- Faster in fast environments, not slower in slow environments

**Confidence:** 90% - Standard best practice, proven effective.

---

**1.3 Reduce Log Capture Overhead (MEDIUM VALUE)**

**Current Problem:** `captureConsoleLogs()` waits up to 45 seconds for logs to stabilize.

**Solution:** Use more targeted log capture strategies.

**Example - Targeted Capture:**
```typescript
// Instead of capturing all logs until stabilization
const logs = await captureConsoleLogs(page, url, {
  maxWaitForLogs: 45000,
  additionalWaitTime: 5000
})

// Use specific log as completion signal
const logs = await captureConsoleLogs(page, url, {
  waitForSpecificLog: 'State: user-interactive',
  additionalWaitTime: 1000  // Shorter wait after target log
})
```

**Alternative - Skip Log Capture for UI Tests:**
```typescript
// Interactive tests don't need full log capture
// Just wait for specific state, then test UI
await page.goto(url)
await page.waitForLoadState('networkidle')

// Or use a specific marker element
await page.locator('[data-testid="app-ready"]').waitFor()
```

**Impact:**
- Reduce test time by 3-5 seconds per test
- Still capture logs when needed for debugging
- Faster feedback during development

**Confidence:** 85% - Some tests genuinely need full logs, others don't.

---

**1.4 Optimize Parallel Execution (LOW VALUE, EASY WIN)**

**Current Problem:** 6 workers in dev, but only 10 total tests - some workers idle.

**Solution:** Match worker count to test count, or keep as-is (no harm in extra workers).

**Recommendation:** Keep current configuration (6 workers) for future growth. As tests increase, parallel execution will provide more value.

**Impact:** Minimal now, but prevents slowdown as test count grows.

**Confidence:** 100% - No downside to current configuration.

---

### Priority 2: Easy and Rapid Iteration During Development

**Goal:** Make debugging tests quick and pleasant for developers.

#### Recommendations

**2.1 Enhanced Debug Utilities (HIGH VALUE)**

**Current Problem:** Test failures require opening HTML report or reading stdout.

**Solution:** Add developer-friendly debug helpers.

**Example - Screenshot on Failure:**
```typescript
// Add to test-utils.ts
export async function debugScreenshot(page: Page, name: string) {
  if (process.env.DEBUG) {
    await page.screenshot({
      path: `test-results/${name}-${Date.now()}.png`,
      fullPage: true
    })
  }
}

// Use in tests
test('Date filter clearing', async ({ page }) => {
  await debugScreenshot(page, 'before-click')
  await dateFilterChip.click()
  await debugScreenshot(page, 'after-click')
})
```

**Example - DOM State Logging:**
```typescript
// Add to test-utils.ts
export async function logElementState(page: Page, selector: string) {
  const elements = await page.locator(selector).all()
  console.log(`${selector}: Found ${elements.length} elements`)
  for (const el of elements) {
    console.log(`  - visible: ${await el.isVisible()}`)
    console.log(`  - text: ${await el.textContent()}`)
  }
}

// Use in tests
await logElementState(page, 'button[aria-label*="filter"]')
```

**Example - Event Count Debugging:**
```typescript
// Add to test-utils.ts
export async function logAppState(page: Page) {
  const eventCounts = await page.evaluate(() => {
    return {
      allEvents: window.cmfEvents?.allEvents?.length || 0,
      visibleEvents: window.cmfEvents?.visibleEvents?.length || 0,
      hiddenCounts: window.cmfEvents?.hiddenCounts || {}
    }
  })
  console.log('App State:', JSON.stringify(eventCounts, null, 2))
}
```

**Impact:**
- Faster debugging (see exactly what's wrong)
- Less context switching (stay in terminal)
- Screenshots provide visual confirmation

**Confidence:** 95% - Standard debugging practice, universally helpful.

---

**2.2 Focused Test Running (HIGH VALUE)**

**Current Problem:** Running full suite when iterating on single test is slow.

**Solution:** Use Playwright's built-in test filtering (already supported, just document better).

**Example - Run Single Test:**
```bash
# Run only tests with "date filter" in name
npm run test:e2e -- -g "date filter"

# Run only interactive tests
npm run test:e2e -- tests/e2e/interactive.spec.ts

# Run in debug mode with browser open
npm run test:e2e -- --debug tests/e2e/interactive.spec.ts
```

**Additional - Test Tagging:**
```typescript
// Tag tests with categories
test('Date filter clearing @smoke @filters', async ({ page }) => {
  // Test implementation
})

// Run only smoke tests
npm run test:e2e -- --grep @smoke

// Run all except slow tests
npm run test:e2e -- --grep-invert @slow
```

**Impact:**
- Run only what you're working on (5-10x faster iteration)
- Debug mode shows browser for visual debugging
- Tags enable smart test selection

**Confidence:** 100% - Built-in Playwright feature, zero implementation cost.

---

**2.3 Better Error Messages (MEDIUM VALUE)**

**Current Problem:** Playwright's default error messages can be cryptic.

**Solution:** Add custom error messages to assertions.

**Example - Before:**
```typescript
await expect(dateFilterChip).toHaveCount(0)
// Error: expect(locator).toHaveCount(expected)
// Expected: 0
// Received: 1
```

**Example - After:**
```typescript
await expect(dateFilterChip).toHaveCount(0, {
  message: 'Date filter chip should be removed after clicking to clear filter'
})
// Error: Date filter chip should be removed after clicking to clear filter
// Expected: 0
// Received: 1
```

**Example - Complex Assertions:**
```typescript
// Before
expect(finalShown).toBe(finalTotal)

// After
expect(finalShown).toBe(finalTotal, {
  message: `After clearing date filter, all events should be visible. ` +
           `Expected ${finalTotal} visible, got ${finalShown}. ` +
           `Hidden counts: ${JSON.stringify(hiddenCounts)}`
})
```

**Impact:**
- Instantly understand what failed and why
- Reduce debugging time by 50%+
- Better collaboration (errors explain themselves)

**Confidence:** 90% - Small effort, big readability improvement.

---

**2.4 Interactive Debug Mode (LOW VALUE, NICE TO HAVE)**

**Current Problem:** When test fails, you have to re-run to inspect.

**Solution:** Use Playwright's UI mode for interactive debugging.

**Example - Enable UI Mode:**
```bash
# Add to package.json scripts
"test:e2e:ui": "playwright test --ui"

# Run with UI mode
npm run test:e2e:ui
```

**Features:**
- Time-travel debugging (step forward/backward)
- DOM inspection at any point
- Network tab to see API calls
- Console logs integrated
- Watch mode (auto-rerun on changes)

**Impact:**
- Significantly faster debugging for complex failures
- Visual confirmation of what's happening
- No need to add temporary console.logs

**Confidence:** 80% - Very powerful, but requires learning UI mode workflow.

---

### Priority 3: Emulating Production as Much as Possible

**Goal:** Ensure tests catch production issues, not just dev issues.

#### Recommendations

**3.1 Use Real Event Sources (HIGH VALUE)**

**Current Problem:** All tests use `es=sf` (San Francisco events) - assumes data exists and is stable.

**Risk:** Production event sources may:
- Return no events (cache expired, API down)
- Return different event counts
- Have geocoding failures
- Have timezone issues

**Solution:** Test with multiple event sources, including edge cases.

**Example - Test Suite with Varied Sources:**
```typescript
const eventSourceTests = [
  {
    name: 'Google Calendar with many events',
    source: 'gc:calendar@example.com',
    expectedMinEvents: 50
  },
  {
    name: 'Facebook events (few events)',
    source: 'fb:12345',
    expectedMinEvents: 1,
    expectedMaxEvents: 10
  },
  {
    name: '19hz events (unresolved locations)',
    source: '19hz:ORE',
    expectedUnresolvedEvents: true
  }
]
```

**Alternative - Test Source:**
```typescript
// Create dedicated test event source
// See: src/lib/api/eventSources/testSource.ts
const testEvents = [
  { location: 'San Francisco', ... },     // Resolved
  { location: 'Invalid Location', ... },  // Unresolved
  { location: 'Berkeley', ... },          // Resolved
]

// Tests use: es=test:stable
// Provides consistent, controlled test data
```

**Impact:**
- Catch production-specific issues (API failures, data variance)
- More confidence in releases
- Test against real geocoding and timezone issues

**Confidence:** 90% - Critical for production parity, but requires test data management.

**Trade-off:**
- ✅ More realistic
- ❌ Tests may fail due to external data changes (need test event source)
- ❌ Slower (real API calls vs cached data)

---

**3.2 Test with Production-like Environment Variables (MEDIUM VALUE)**

**Current Problem:** Tests use dev environment (.env.local) - may differ from production.

**Solution:** Add test environment configuration that mirrors production.

**Example - Test Environment Config:**
```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    baseURL: process.env.TEST_ENV === 'prod-like'
      ? 'http://localhost:3000'  // With prod env vars
      : 'http://localhost:3000', // With dev env vars
  }
})
```

**Example - Environment-specific Tests:**
```typescript
test('Geocoding uses production cache', async ({ page }) => {
  // Verify Upstash Redis cache is used (not filesystem)
  // Check cache headers in API responses
})

test('Analytics tracking works', async ({ page }) => {
  // Verify Umami tracking calls are made
  // Check network requests include tracking data
})
```

**Impact:**
- Catch environment-specific issues before production
- Verify API keys and external services work
- Test caching behavior matches production

**Confidence:** 75% - Valuable, but may require test API keys and services.

**Trade-off:**
- ✅ Catches config issues
- ❌ Requires separate test API keys
- ❌ May incur API costs (geocoding, etc.)

---

**3.3 Test Real API Responses (LOW VALUE)**

**Current Problem:** Tests assume API responses are well-formed and complete.

**Solution:** Add tests that verify API response structure.

**Example - API Response Validation:**
```typescript
test('API returns valid event data structure', async ({ page }) => {
  // Intercept API response
  const response = await page.waitForResponse(
    resp => resp.url().includes('/api/events?id=sf')
  )

  const data = await response.json()

  // Verify structure
  expect(data).toHaveProperty('events')
  expect(data).toHaveProperty('source')
  expect(data.events).toBeInstanceOf(Array)

  // Verify first event has required fields
  const event = data.events[0]
  expect(event).toHaveProperty('id')
  expect(event).toHaveProperty('name')
  expect(event).toHaveProperty('start')
  expect(event).toHaveProperty('end')
  expect(event).toHaveProperty('resolved_location')
})
```

**Impact:**
- Catch API contract changes
- Verify geocoding success rates
- Detect data quality issues

**Confidence:** 70% - Useful, but overlaps with unit tests and API tests.

**Trade-off:**
- ✅ Validates end-to-end data flow
- ❌ Brittle (breaks when API changes intentionally)
- ❌ Overlaps with backend testing

**Recommendation:** Add 1-2 tests to validate critical API contracts, but don't overdo it.

---

### Priority 4: Not Overengineering

**Goal:** Keep tests simple, maintainable, and focused.

#### Recommendations

**4.1 Avoid Premature Abstraction (HIGH VALUE)**

**Current Status:** Good - test-utils.ts provides shared utilities without over-abstracting.

**Example of GOOD abstraction (keep this):**
```typescript
// Shared utility used by multiple tests
export async function captureConsoleLogs(page, url, options) {
  // Implementation
}

// Used in multiple test files
const logs = await captureConsoleLogs(page, url, DEFAULT_CAPTURE_OPTIONS)
```

**Example of BAD abstraction (avoid this):**
```typescript
// Over-abstracted test builder
export function buildPageLoadTest(config: TestConfig) {
  return async ({ page }) => {
    await loadPage(page, config.url)
    await waitForState(page, config.state)
    await verifyElements(page, config.elements)
    await verifyLogs(page, config.logs)
    await takeScreenshot(page, config.name)
  }
}

// Hard to understand what this test does
test('Weekend filter', buildPageLoadTest({
  url: '/?es=sf&qf=weekend',
  state: 'user-interactive',
  elements: ['date-chip'],
  logs: ['weekend'],
  name: 'weekend'
}))
```

**Guideline:** Abstract when you have 3+ identical patterns, not before.

**Impact:**
- Tests remain readable (you can see what they do)
- Easy to modify individual tests
- New contributors can understand tests quickly

**Confidence:** 95% - Proven best practice in testing.

---

**4.2 Keep Test Data Inline (MEDIUM VALUE)**

**Current Status:** Good - test cases defined in test files, not external fixtures.

**Example of GOOD pattern (keep this):**
```typescript
const pageLoadTests: PageLoadTestCase[] = [
  {
    name: 'Quick Filter Weekend',
    url: '/?es=sf&qf=weekend',
    expectedLogs: [
      {
        pattern: 'Processing quick date filter: weekend',
        description: 'Weekend filter processing'
      }
    ]
  }
]
```

**Example of BAD pattern (avoid this):**
```typescript
// External fixture file: fixtures/page-load-tests.json
{
  "tests": [
    {
      "name": "Quick Filter Weekend",
      "url": "/?es=sf&qf=weekend",
      "expectedLogs": [...]
    }
  ]
}

// Test file - harder to understand and modify
const tests = loadFixture('page-load-tests.json')
```

**Guideline:** Keep test data in TypeScript files for:
- Type safety
- Easy refactoring
- Clear context
- IDE support

**Exception:** Large datasets (100+ test cases) can be in JSON/CSV, but keep test logic in TypeScript.

**Impact:**
- Tests are self-documenting
- Refactoring is easier (TypeScript finds all references)
- No context switching between files

**Confidence:** 90% - Standard testing practice.

---

**4.3 One Assertion Per Logical Concept (LOW VALUE)**

**Current Status:** Mixed - some tests have multiple assertions, which is fine.

**Example of GOOD multi-assertion (keep this):**
```typescript
test('Date filter clearing updates UI', async ({ page }) => {
  // Related assertions that validate one concept: "UI updates correctly"
  await expect(dateFilterChip).toHaveCount(0)
  await expect(visibleButton).toContainText('118 of 118 Visible')
  await expect(eventRows).toHaveCount(118)
})
```

**Example of BAD multi-concept test (avoid this):**
```typescript
test('Application works', async ({ page }) => {
  // Unrelated assertions - hard to debug when it fails
  await expect(dateFilterChip).toBeVisible()  // Concept 1: Filter applied
  await mapMarker.click()                      // Concept 2: Map interaction
  await expect(popup).toBeVisible()            // Concept 2: Popup appears
  await searchInput.fill('berkeley')           // Concept 3: Search
  await expect(eventRows).toHaveCount(5)       // Concept 3: Search results
})
```

**Guideline:** Multiple assertions OK if they validate the same user action or workflow.

**Impact:**
- Balanced between "one giant test" and "too many tiny tests"
- Test failures are still debuggable
- Tests represent real user workflows

**Confidence:** 85% - Subjective, but this balance works well.

---

### Priority 5: Not Sacrificing Quality or Coverage

**Goal:** Maintain comprehensive coverage while implementing optimizations.

#### Recommendations

**5.1 Maintain Coverage Metrics (HIGH VALUE)**

**Current Problem:** No tracking of what workflows are covered vs. not covered.

**Solution:** Document and track coverage explicitly.

**Example - Coverage Checklist:**
```markdown
## E2E Test Coverage

### URL Processing
- [x] qf=weekend (6 assertions)
- [x] fsd/fed date range (4 assertions)
- [x] sq=search (3 assertions)
- [x] llz=coordinates (5 assertions)
- [x] se=eventId (2 assertions)
- [ ] es=source1,source2 (multiple sources)
- [ ] Invalid URL parameters

### User Interactions
- [x] Clear date filter chip (2 tests)
- [ ] Clear search filter chip
- [ ] Clear map filter chip
- [ ] Select event from list
- [ ] Select event from map
- [ ] Pan/zoom map
- [ ] Drag date slider
- [ ] Click quick filter button
```

**Implementation:** Add coverage tracker to tests-e2e.md (this document).

**Impact:**
- Know exactly what's tested and what's not
- Prioritize new tests based on gaps
- Prevent coverage regression

**Confidence:** 100% - Essential for maintaining quality.

---

**5.2 Add Smoke Tests for Critical Paths (HIGH VALUE)**

**Current Problem:** No lightweight "does basic functionality work?" tests.

**Solution:** Create fast smoke test suite that runs on every commit.

**Example - Smoke Test Suite:**
```typescript
// tests/e2e/smoke.spec.ts
test.describe('Smoke Tests', () => {
  test('App loads with event source', async ({ page }) => {
    await page.goto('/?es=sf')
    await expect(page.locator('text=Visible')).toBeVisible()
    await expect(page.locator('.maplibregl-canvas')).toBeVisible()
  })

  test('Search filters events', async ({ page }) => {
    await page.goto('/?es=sf')
    await page.fill('[placeholder*="Search"]', 'berkeley')
    await expect(page.locator('text=Filtered by Search')).toBeVisible()
  })

  test('Date filter works', async ({ page }) => {
    await page.goto('/?es=sf&qf=weekend')
    await expect(page.locator('text=Filtered by Date')).toBeVisible()
  })
})
```

**Benefits:**
- Fast (<10 seconds for all smoke tests)
- Run on every commit (pre-push hook)
- Catch breaking changes immediately

**Implementation:**
```bash
# Add to package.json
"test:e2e:smoke": "playwright test tests/e2e/smoke.spec.ts"

# Add to pre-push hook
#!/bin/sh
npm run test:e2e:smoke
```

**Impact:**
- Immediate feedback on breaking changes
- Confidence to refactor without breaking core functionality
- Fast enough to run continuously

**Confidence:** 95% - Standard practice for fast feedback.

---

**5.3 Add Visual Regression Tests (MEDIUM VALUE, FUTURE)**

**Current Problem:** No validation that UI looks correct, only that elements exist.

**Solution:** Add Playwright's visual comparison testing.

**Example - Visual Regression Test:**
```typescript
test('Map page renders correctly', async ({ page }) => {
  await page.goto('/?es=sf')

  // Wait for map to load
  await page.waitForSelector('.maplibregl-canvas')

  // Take screenshot and compare to baseline
  await expect(page).toHaveScreenshot('map-page.png', {
    maxDiffPixels: 100  // Allow minor rendering differences
  })
})
```

**Benefits:**
- Catch UI regressions (layout, styling, etc.)
- Verify responsive layouts
- Detect unintended visual changes

**Challenges:**
- Flaky (fonts, map tiles, timing)
- Requires baseline management
- Large image files

**Recommendation:** Start small (1-2 critical views), evaluate flakiness before expanding.

**Impact:**
- Catch visual regressions automatically
- Reduce manual QA time
- More confidence in UI changes

**Confidence:** 60% - Powerful but requires careful tuning to avoid flakiness.

**Trade-off:**
- ✅ Catches visual bugs
- ❌ Can be flaky (map tiles, fonts, timing)
- ❌ Requires baseline management
- ❌ Slower (screenshot comparison)

**Recommendation:** Defer until after implementing other higher-priority improvements.

---

**5.4 Ensure Test Reliability (HIGH VALUE)**

**Current Problem:** Some tests may be flaky (not observed yet, but risk exists).

**Solution:** Follow best practices to prevent flakiness.

**Example - Reliable Patterns:**
```typescript
// GOOD: Wait for specific condition
await expect(page.locator('text=Visible')).toBeVisible()

// BAD: Fixed timeout
await page.waitForTimeout(1000)

// GOOD: Wait for network idle
await page.waitForLoadState('networkidle')

// BAD: Assume page loaded
await page.goto(url)

// GOOD: Wait for element before interacting
await page.locator('button').waitFor()
await page.locator('button').click()

// BAD: Immediate interaction
await page.locator('button').click()

// GOOD: Use test IDs for stable selectors
await page.locator('[data-testid="date-filter-chip"]')

// RISKY: CSS selectors may change
await page.locator('div.flex.items-center > button:nth-child(2)')
```

**Anti-flakiness Checklist:**
- ✅ Use `await expect()` instead of `waitForTimeout()`
- ✅ Wait for elements before interacting
- ✅ Use stable selectors (test IDs, ARIA labels)
- ✅ Avoid race conditions (wait for network idle)
- ✅ Clean up state between tests
- ✅ Don't depend on external data that changes
- ✅ Use retries only in CI, not in dev (fail fast locally)

**Impact:**
- Tests pass consistently
- No "flaky test" reputation
- Confidence in test results

**Confidence:** 95% - Critical for test suite health.

---

## Migration Plan

**If significant changes are recommended (which they are):**

### Phase 1: Quick Wins (Week 1-2)

**Goal:** Improve developer experience without breaking existing tests.

1. **Add Debug Utilities**
   - Add `debugScreenshot()`, `logElementState()`, `logAppState()` to test-utils.ts
   - Document usage in README
   - Confidence: 95% | Effort: Low | Value: High

2. **Improve Error Messages**
   - Add custom messages to all assertions
   - Update test-utils.ts assertion helpers
   - Confidence: 90% | Effort: Low | Value: High

3. **Document Test Filtering**
   - Add examples to README for running focused tests
   - Add test tags for smoke/filters/map/etc.
   - Confidence: 100% | Effort: Low | Value: Medium

4. **Add Coverage Tracking**
   - Create coverage checklist in this document
   - Update after each new test
   - Confidence: 100% | Effort: Low | Value: High

**Outcome:** Better debugging, faster iteration, no test changes required.

---

### Phase 2: Optimize Existing Tests (Week 3-4)

**Goal:** Improve test speed and reliability.

1. **Combine Interactive Tests**
   - Merge date filter clearing tests into single workflow test
   - Add map filter and search filter clearing to same test
   - Confidence: 95% | Effort: Medium | Value: High

2. **Optimize Wait Times**
   - Replace `waitForTimeout()` with smart waiting
   - Use `waitForLoadState()` and element waits
   - Reduce log capture wait times where possible
   - Confidence: 90% | Effort: Medium | Value: Medium

3. **Ensure Test Reliability**
   - Audit all selectors (prefer test IDs)
   - Add `waitFor()` before all interactions
   - Remove unnecessary timeouts
   - Confidence: 95% | Effort: Medium | Value: High

**Outcome:** Tests run 30-50% faster, more reliable, still comprehensive.

---

### Phase 3: Expand Coverage (Week 5-8)

**Goal:** Close critical coverage gaps.

1. **Add Smoke Tests**
   - Create smoke.spec.ts with 5-10 fast tests
   - Add to pre-push hook
   - Confidence: 95% | Effort: Low | Value: High

2. **Add Event Selection Tests**
   - Click event in list → verify map pans and marker highlights
   - Click marker → verify popup and event list scroll
   - Confidence: 90% | Effort: Medium | Value: High

3. **Add Filter Combination Tests**
   - Date + search + map filters together
   - Clear filters in different orders
   - Verify filter chip counts are correct
   - Confidence: 85% | Effort: Medium | Value: High

4. **Add Map Interaction Tests**
   - Pan map → verify "Filtered by Map" chip
   - Click "X of Y Visible" → verify map zooms
   - Click filter chips → verify map resets
   - Confidence: 85% | Effort: Medium | Value: High

5. **Add Edge Case Tests**
   - No events state
   - Invalid URL parameters
   - Unresolved locations
   - Confidence: 80% | Effort: Low | Value: Medium

**Outcome:** 30-40 total E2E tests covering all critical workflows.

---

### Phase 4: Production Parity (Week 9-10, Optional)

**Goal:** Ensure tests catch production-specific issues.

1. **Create Test Event Source**
   - Stable test data that doesn't change
   - Mix of resolved/unresolved locations
   - Various date ranges and timezones
   - Confidence: 85% | Effort: Medium | Value: Medium

2. **Add API Response Tests**
   - Verify API contract (2-3 tests)
   - Test geocoding success rates
   - Validate event data structure
   - Confidence: 75% | Effort: Low | Value: Low

3. **Test with Production-like Config**
   - Add test environment variables
   - Verify caching behavior
   - Test analytics tracking
   - Confidence: 70% | Effort: High | Value: Medium

**Outcome:** Higher confidence that tests catch production issues.

---

### Phase 5: Advanced Features (Future, Optional)

**Goal:** Add advanced testing capabilities.

1. **Visual Regression Tests**
   - Start with 1-2 critical views
   - Evaluate flakiness
   - Expand if successful
   - Confidence: 60% | Effort: High | Value: Medium

2. **Performance Tests**
   - Test with 1000+ events
   - Measure filter performance
   - Verify no memory leaks
   - Confidence: 70% | Effort: High | Value: Low

3. **Multi-browser Testing**
   - Add Firefox and Safari projects
   - Test mobile viewports
   - Confidence: 80% | Effort: Low | Value: Low

**Outcome:** Comprehensive test suite with advanced capabilities.

---

### Rollout Strategy

**Incremental Approach:**

1. **Implement in feature branch** - Don't break existing tests
2. **Run both old and new tests in parallel** - Verify new tests catch same issues
3. **Gradually replace old tests** - Once confidence is high
4. **Monitor for flakiness** - Adjust as needed
5. **Document changes** - Update README and this document

**Success Criteria:**

- ✅ Test execution time <60 seconds for full suite
- ✅ All critical workflows have E2E coverage
- ✅ <5% flakiness rate (tests pass >95% of time)
- ✅ Developers prefer E2E tests over manual testing
- ✅ Coverage tracked and maintained

**Rollback Plan:**

- Keep old tests until new tests prove stable (2-4 weeks)
- If flakiness increases, revert and reassess
- Document lessons learned

---

## Summary

### Current State Strengths

✅ **Well-structured utilities** - test-utils.ts provides excellent shared functionality

✅ **Comprehensive URL testing** - All major URL parameters tested thoroughly

✅ **State-aware testing** - Validates correct app state transitions

✅ **Good documentation** - README explains test structure and usage

✅ **Fast parallel execution** - 30 seconds for full suite (6 workers)

### Current State Weaknesses

⚠️ **Limited interaction testing** - Only 2 interactive tests (date filter clearing)

⚠️ **No smoke tests** - No fast "does it work?" test suite

⚠️ **Coverage gaps** - Missing event selection, map interactions, filter combinations

⚠️ **No visual testing** - Only functional testing, no UI regression detection

⚠️ **Fixed wait times** - Some unnecessary delays slow tests down

### Top 5 Priorities (In Order)

1. **Add smoke tests** - Fast feedback on every commit
   - Effort: Low | Value: High | Confidence: 95%

2. **Expand interaction coverage** - Test event selection, map interactions, filter combinations
   - Effort: Medium | Value: High | Confidence: 90%

3. **Optimize wait times** - Replace fixed delays with smart waiting
   - Effort: Medium | Value: Medium | Confidence: 90%

4. **Add debug utilities** - Screenshots, DOM logging, app state inspection
   - Effort: Low | Value: High | Confidence: 95%

5. **Improve error messages** - Custom messages for all assertions
   - Effort: Low | Value: High | Confidence: 90%

### Expected Outcomes After Improvements

- **Test execution time:** 30s → ~40-50s (more tests, but optimized)
- **Test count:** 10 → 35-40 tests
- **Coverage:** ~30% workflows → 85% workflows
- **Developer satisfaction:** Higher (better debugging, faster iteration)
- **Confidence in releases:** Higher (fewer production bugs)

---

**Questions or feedback?** Open an issue or contact the maintainers.
