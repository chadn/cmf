# E2E Test Migration Plan

**Purpose:** Phased implementation plan for E2E test improvements

**Audience:** Developers and AI agents implementing the E2E test suite

**Last Updated:** 2025-10-27

---

## Table of Contents

1. [Overview](#overview)
2. [Phase 0: Foundation](#phase-0-foundation-week-1)
3. [Phase 1: Core Workflows](#phase-1-core-workflows-week-2-3)
4. [Phase 2: Comprehensive Coverage](#phase-2-comprehensive-coverage-week-4-5)
5. [Success Criteria](#success-criteria)
6. [Rollback Plan](#rollback-plan)

---

## Overview

### Goals

1. **Test critical user workflows** based on actual usage (Selected Event, filters)
2. **Fast smoke tests** (<20s) for commit-time feedback
3. **Mobile coverage** (50% of users on iPhone 16)
4. **Refactor-proof tests** that survive ai-proposal.md changes
5. **Performance-conscious** (no data-testid on 3,000 events)

### Current State

**Existing tests (10 total):**
- ✅ URL parameter processing (comprehensive)
- ✅ Page load verification
- ✅ Date filter clearing (2 tests)
- ❌ Missing: Selected Event (3 triggers, Exception)
- ❌ Missing: Filter chips (map, search)
- ❌ Missing: Mobile testing

**Strengths:**
- Good test utilities (test-utils.ts)
- State-aware pattern (requiredInState)
- Console log capture working well

**Gaps:**
- No smoke tests for fast feedback
- Missing critical workflows (Selected Event)
- Desktop Chromium only (50% of users on mobile)

---

## Phase 0: Foundation (Week 1)

**Goal:** Establish infrastructure for all future tests

### Task 0.1: Expand testSource.ts

**File:** `src/lib/api/eventSources/testSource.ts`

**Add dynamic event data for stable tests:**

```typescript
import { addDays, startOfDay, setHours, nextSaturday } from 'date-fns'

// Helper functions
function getTodayAt(hour: number, minute: number, timezone = 'America/Los_Angeles') {
  const now = new Date()
  const date = setHours(startOfDay(now), hour)
  date.setMinutes(minute)
  return date.toISOString()
}

function getTomorrowAt(hour: number, minute: number, timezone = 'America/Los_Angeles') {
  const tomorrow = addDays(new Date(), 1)
  const date = setHours(startOfDay(tomorrow), hour)
  date.setMinutes(minute)
  return date.toISOString()
}

function getNextWeekendFriday(hour: number, minute: number, timezone = 'America/Los_Angeles') {
  const now = new Date()
  const dayOfWeek = now.getDay()
  let daysToFriday = 0

  if (dayOfWeek === 0) daysToFriday = 5      // Sunday
  else if (dayOfWeek < 5) daysToFriday = 5 - dayOfWeek  // Mon-Thu
  else if (dayOfWeek === 5) daysToFriday = 7  // Friday (next week)
  else daysToFriday = 6                       // Saturday

  const friday = addDays(now, daysToFriday)
  const date = setHours(startOfDay(friday), hour)
  date.setMinutes(minute)
  return date.toISOString()
}

// Test event sets
export const TEST_EVENTS = {
  // Dynamic dates for smoke tests
  stable: [
    {
      id: 'event-today-sf',
      name: 'Today Event SF',
      description: 'Event happening today in San Francisco',
      start: getTodayAt(14, 0),
      end: getTodayAt(16, 0),
      location: 'San Francisco, CA',
      location_details: {
        resolved_location: {
          lat: 37.7749,
          lng: -122.4194,
          formatted_address: 'San Francisco, CA, USA'
        }
      },
      tz: 'America/Los_Angeles'
    },
    {
      id: 'event-weekend-oakland',
      name: 'Weekend Event Oakland',
      description: 'Weekend event in Oakland',
      start: getNextWeekendFriday(18, 0),
      end: getNextWeekendFriday(22, 0),
      location: 'Oakland, CA',
      location_details: {
        resolved_location: {
          lat: 37.8044,
          lng: -122.2712,
          formatted_address: 'Oakland, CA, USA'
        }
      },
      tz: 'America/Los_Angeles'
    },
    {
      id: 'event-tomorrow-berkeley',
      name: 'Tomorrow Event Berkeley',
      description: 'Event tomorrow in Berkeley',
      start: getTomorrowAt(10, 0),
      end: getTomorrowAt(12, 0),
      location: 'Berkeley, CA',
      location_details: {
        resolved_location: {
          lat: 37.8715,
          lng: -122.2730,
          formatted_address: 'Berkeley, CA, USA'
        }
      },
      tz: 'America/Los_Angeles'
    },
    {
      id: 'event-unresolved',
      name: 'Unresolved Location Event',
      description: 'Event with unresolved location',
      start: getTodayAt(20, 0),
      end: getTodayAt(22, 0),
      location: 'gibberish123',
      location_details: {
        resolved_location: null
      },
      tz: 'UNKNOWN_TZ'
    }
  ],

  // Static dates for timezone edge case testing
  timezone: [
    {
      id: 'event-utc-midnight',
      name: 'UTC Midnight Event',
      description: 'Event at midnight UTC to test timezone conversion',
      start: '2025-11-01T00:00:00Z',
      end: '2025-11-01T02:00:00Z',
      location: 'New York, NY',
      location_details: {
        resolved_location: {
          lat: 40.7128,
          lng: -74.0060,
          formatted_address: 'New York, NY, USA'
        }
      },
      tz: 'America/New_York'
    }
  ]
}

// Existing testSource.ts handler should use TEST_EVENTS.stable
```

**Effort:** 2-3 hours
**Value:** High - Foundation for all tests
**Confidence:** 95%

---

### Task 0.2: Add Minimal data-testid

**Only add ONE data-testid attribute for app state:**

**File:** `src/app/page.tsx` or `src/components/map/MapContainer.tsx`

```typescript
// Add hidden state indicator (ONE element, critical for state validation)
<div
  data-app-state={appState}
  style={{ display: 'none' }}
  aria-hidden="true"
/>
```

**DO NOT add data-testid to:**
- ❌ Event list items (use getByRole)
- ❌ Filter chips (use getByRole)
- ❌ Any repeated elements

**Effort:** 5 minutes
**Value:** Medium - Enables state validation
**Confidence:** 100%

---

### Task 0.3: Create Smoke Tests

**File:** `tests/e2e/smoke.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Smoke Tests @smoke', () => {
  test('Load app with events', async ({ page }) => {
    await page.goto('/?es=test:stable')

    await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible()
    await expect(page.getByRole('table')).toBeVisible()

    const eventCount = await page.getByRole('row').count()
    expect(eventCount).toBeGreaterThan(0)

    const visibleButton = page.getByRole('button', { name: /visible/i })
    await expect(visibleButton).toBeVisible()
  })

  test('View today\'s events', async ({ page }) => {
    await page.goto('/?es=test:stable&qf=today')

    await expect(page.getByRole('button', { name: /filtered by date/i })).toBeVisible()

    const eventCount = await page.getByRole('row').count()
    expect(eventCount).toBeGreaterThan(0)
  })

  test('View selected event from shared URL', async ({ page }) => {
    await page.goto('/?es=test:stable&se=event-today-sf')

    await expect(page.locator('.maplibregl-popup')).toBeVisible()
    expect(page.url()).toContain('se=event-today-sf')

    const eventRow = page.getByRole('row', { name: /today event/i })
    await expect(eventRow).toHaveCSS('background-color', /.*/)
  })
})
```

**Effort:** 1-2 hours
**Value:** High - Fast feedback loop
**Confidence:** 95%

---

### Task 0.4: Configure Mobile Testing

**File:** `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: process.env.CI ? 1 : 6,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry'
  },

  projects: [
    {
      name: 'desktop-chrome',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'mobile-iphone16',
      use: {
        // iPhone 16 specs
        viewport: { width: 393, height: 852 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15',
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true
      }
    }
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
})
```

**Effort:** 15 minutes
**Value:** High - 50% of users on mobile
**Confidence:** 100%

---

### Task 0.5: Update package.json Scripts

**File:** `package.json`

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:smoke": "playwright test tests/e2e/smoke.spec.ts --project=desktop-chrome",
    "test:e2e:full": "playwright test",
    "test:e2e:mobile": "playwright test --project=mobile-iphone16",
    "test:e2e:console": "playwright test tests/e2e/console-logs.spec.ts --headed",
    "test:e2e:pageload": "playwright test tests/e2e/page-load.spec.ts",
    "test:e2e:interactive": "playwright test tests/e2e/interactive.spec.ts",
    "test:e2e:ui": "playwright test --ui",
    "test:report": "playwright show-report"
  }
}
```

**Effort:** 5 minutes
**Value:** Medium - Easier test execution
**Confidence:** 100%

---

### Phase 0 Summary

**Total effort:** ~4-6 hours
**Deliverables:**
- ✅ testSource.ts with stable event data
- ✅ Minimal data-testid (1 element)
- ✅ 3 smoke tests (<20s)
- ✅ Mobile configuration (iPhone 16)
- ✅ Updated npm scripts

**Run smoke tests:**
```bash
npm run test:e2e:smoke
```

**Expected result:** 3 tests pass in <20 seconds

---

## Phase 1: Core Workflows (Week 2-3)

**Goal:** Test critical user workflows from usage.md

### Task 1.1: Selected Event Tests

**File:** `tests/e2e/user-workflows.spec.ts`

**Implement 4 tests:**
1. Click map marker selects event (map doesn't change)
2. Click event row selects event (map centers and zooms)
3. Load with se parameter selects event
4. Close popup deselects and unfreezes

**See:** [tests-e2e-examples.md#selected-event-tests](tests-e2e-examples.md#selected-event-tests) for full code

**Effort:** 6-8 hours
**Value:** Critical - Top user workflow
**Confidence:** 90%

---

### Task 1.2: Filter Chip Tests

**File:** `tests/e2e/user-workflows.spec.ts`

**Implement 6 tests:**
1. Pan map creates map filter chip
2. Click map chip removes filter
3. Apply weekend filter creates date chip
4. Click date chip removes filter
5. Type search creates search chip
6. Clear search removes chip

**See:** [tests-e2e-examples.md#filter-chip-tests](tests-e2e-examples.md#filter-chip-tests) for full code

**Effort:** 4-6 hours
**Value:** High - Core filtering functionality
**Confidence:** 90%

---

### Task 1.3: Mobile Versions

**File:** `tests/e2e/user-workflows.spec.ts`

**Add @mobile tagged versions:**
- Mobile: tap event to select
- Mobile: vertical layout works
- Mobile: filter chips accessible

**Effort:** 2-3 hours
**Value:** High - 50% of users
**Confidence:** 85%

---

### Phase 1 Summary

**Total effort:** ~12-17 hours
**Deliverables:**
- ✅ 10 new workflow tests
- ✅ Selected Event coverage (3 triggers, 3 cues, Exception)
- ✅ Filter chip coverage (map, date, search)
- ✅ Mobile test coverage

**Run all tests:**
```bash
npm run test:e2e:full
```

**Expected result:** ~20 total tests, 30-40s execution time

---

## Phase 2: Comprehensive Coverage (Week 4-5)

**Goal:** Edge cases and full coverage

### Task 2.1: Edge Case Tests

**File:** `tests/e2e/edge-cases.spec.ts`

**Implement 5 tests:**
1. Handle no events gracefully
2. Handle invalid event source
3. Handle invalid selected event ID
4. Handle invalid date parameters
5. Show unresolved locations with special search

**See:** [tests-e2e-examples.md#edge-case-examples](tests-e2e-examples.md#edge-case-examples) for code

**Effort:** 3-4 hours
**Value:** Medium - Edge case coverage
**Confidence:** 85%

---

### Task 2.2: Additional Workflow Tests

**File:** `tests/e2e/user-workflows.spec.ts`

**Implement as needed:**
- Date selector interactions (slider, calendar)
- Search functionality (real-time filtering)
- Visible button click behavior
- Multiple filters combination

**Effort:** 4-6 hours
**Value:** Medium - Comprehensive coverage
**Confidence:** 80%

---

### Task 2.3: Optimize Existing Tests

**Review and optimize:**
- Combine related tests where appropriate
- Remove unnecessary waits
- Ensure reliable selectors
- Add better error messages

**Effort:** 2-3 hours
**Value:** Medium - Maintainability
**Confidence:** 90%

---

### Phase 2 Summary

**Total effort:** ~9-13 hours
**Deliverables:**
- ✅ Edge case coverage
- ✅ Additional workflow tests
- ✅ Optimized test suite

**Expected result:** ~30 total tests, 40-50s execution time

---

## Success Criteria

### Coverage Goals

**Critical workflows (must be tested):**
- [x] Load app with events
- [x] View today's events (qf=today)
- [x] View selected event from shared URL
- [x] Click map marker to select
- [x] Click event row to select
- [x] Selected Events Exception behavior
- [x] Create and remove map filter chip
- [x] Create and remove date filter chip
- [x] Create and remove search filter chip

**Important workflows (should be tested):**
- [ ] Date selector interactions
- [ ] Search real-time filtering
- [ ] Visible button click
- [ ] Multiple filters together

**Edge cases (medium priority):**
- [ ] No events state
- [ ] Invalid URL parameters
- [ ] Unresolved locations

### Performance Goals

**Execution time:**
- ✅ Smoke tests: <20 seconds
- ✅ Full suite: <60 seconds (desktop + mobile)
- ✅ Single test: <5 seconds average

**Test count:**
- Phase 0: 3 tests (smoke)
- Phase 1: +10 tests (workflows)
- Phase 2: +5-10 tests (edge cases)
- **Total:** ~20-25 tests

### Quality Goals

**Reliability:**
- ✅ Tests pass consistently (>95% pass rate)
- ✅ No flaky tests (retry and still pass)
- ✅ Clear error messages when failing

**Maintainability:**
- ✅ Clear test organization (smoke, workflows, edge-cases)
- ✅ Semantic selectors (no data-testid except app-state)
- ✅ Tests survive ai-proposal.md refactor
- ✅ Well-documented with examples

---

## Rollback Plan

### If Tests Are Flaky

**Identify flakiness:**
```bash
# Run same test 10 times
npx playwright test tests/e2e/smoke.spec.ts --repeat-each=10
```

**Common causes and fixes:**
1. **Race conditions** → Add proper waits (waitForLoadState, expect().toBeVisible())
2. **Timing issues** → Remove fixed timeouts, use smart waits
3. **Selector brittleness** → Use semantic selectors (getByRole, getByText)
4. **External dependencies** → Use test:stable event source

**Rollback:** Disable flaky test with `test.skip()` until fixed

---

### If Execution Time Too Slow

**Diagnose:**
```bash
# Run with trace
npx playwright test --trace on
npx playwright show-trace trace.zip
```

**Common causes and fixes:**
1. **Too many page loads** → Combine related tests
2. **Unnecessary waits** → Remove fixed timeouts
3. **Log capture overhead** → Use `waitForSpecificLog` with shorter additionalWaitTime
4. **Too many workers** → Reduce from 6 to 3 (still parallel)

**Rollback:** Revert to Phase 0 (just smoke tests) if full suite >2 minutes

---

### If Tests Break During Refactor

**Expected during ai-proposal.md refactor:**
- Callback-based tests will break (none written, so OK)
- Implementation detail tests will break (avoided in our tests)

**Should NOT break:**
- User-visible behavior tests (our focus)
- State transition tests (state machine unchanged)
- Semantic selector tests (HTML structure stable)

**If tests break unexpectedly:**
1. Check if user-visible behavior actually changed
2. Update test if behavior intentionally changed
3. File issue if test should have passed but didn't

---

## Migration Checklist

### Phase 0: Foundation
- [ ] Expand testSource.ts with stable events
- [ ] Add data-app-state attribute
- [ ] Create smoke.spec.ts (3 tests)
- [ ] Configure mobile testing (iPhone 16)
- [ ] Update package.json scripts
- [ ] Run smoke tests - all pass <20s
- [ ] Commit changes

### Phase 1: Core Workflows
- [ ] Implement Selected Event tests (4 tests)
- [ ] Implement Filter Chip tests (6 tests)
- [ ] Add mobile versions (3 tests)
- [ ] Run full suite - all pass <40s
- [ ] Commit changes

### Phase 2: Comprehensive Coverage
- [ ] Implement edge case tests (5 tests)
- [ ] Add additional workflow tests (as needed)
- [ ] Optimize existing tests
- [ ] Run full suite - all pass <60s
- [ ] Commit changes

### Documentation
- [x] Create tests-e2e-architecture.md
- [x] Create tests-e2e-examples.md
- [x] Create tests-e2e-migration.md
- [ ] Update tests.md with links to new docs
- [ ] Update CLAUDE.md if needed

---

## Timeline Summary

**Week 1: Foundation**
- Days 1-2: Expand testSource.ts, add data-app-state
- Days 3-4: Create smoke tests, configure mobile
- Day 5: Test and commit

**Week 2-3: Core Workflows**
- Days 1-3: Selected Event tests
- Days 4-5: Filter Chip tests
- Days 6-7: Mobile versions, test and commit

**Week 4-5: Comprehensive (Optional)**
- Days 1-2: Edge case tests
- Days 3-4: Additional workflow tests
- Day 5: Optimize and commit

**Total: 2-5 weeks depending on scope**

---

## Next Steps

1. **Review this plan** - Approve or adjust
2. **Start Phase 0** - Foundation work
3. **Run smoke tests** - Verify infrastructure
4. **Proceed to Phase 1** - Core workflows
5. **Iterate** - Add tests as needed

**Ready to start Phase 0?**

---

**Related docs:**
- [tests-e2e-architecture.md](tests-e2e-architecture.md) - Principles and patterns
- [tests-e2e-examples.md](tests-e2e-examples.md) - Code examples
- [usage.md](usage.md) - User workflows to test
- [ai-proposal.md](ai-proposal.md) - Upcoming refactor context
