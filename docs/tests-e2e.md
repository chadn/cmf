# End-to-End Testing Documentation

**Purpose:** Overview and index for E2E testing documentation

**Audience:** Developers and AI agents working with E2E tests

**Last Updated:** 2025-10-27

---

## Overview

CMF's E2E tests use Playwright to validate user workflows, state transitions, and integration behavior. The documentation is split into three focused documents:

1. **[Architecture](tests-e2e-architecture.md)** - Principles, patterns, and best practices (~300 lines)
2. **[Examples](tests-e2e-examples.md)** - Detailed code examples and patterns (~800 lines)
3. **[Migration Plan](tests-e2e-migration.md)** - Phased implementation plan (~400 lines)

---

## Quick Start

### Run Tests

```bash
# Smoke tests (fast, <20s)
npm run test:e2e:smoke

# Full suite (desktop + mobile)
npm run test:e2e:full

# Mobile only (iPhone 16)
npm run test:e2e:mobile

# Debug with visible browser
npm run test:e2e -- --headed

# Single test
npm run test:e2e -- -g "test name"

# View test report
npm run test:report
```

### Debug Console Logs

```bash
# Capture logs from any URL
TEST_URL="/?es=sf&qf=weekend" npm run test:e2e:console

# Redirect to file for analysis
(TEST_URL="/?es=sf" npm run test:e2e:console) &> dev-perf-browser-logs.txt
```

---

## Current State

**Test Framework:** Playwright v1.56.0

**Test Count:** 10 tests
- Page load tests: 6 (URL processing)
- Interactive tests: 2 (Date filter clearing)
- Console debugging: 2 (Debug helper)

**Execution Time:** ~30 seconds (parallel, 6 workers)

**Coverage:**
- ✅ URL parameter processing (comprehensive)
- ✅ Date filter chip clearing
- ⚠️ Missing: Selected Event workflows (3 triggers, Exception behavior)
- ⚠️ Missing: Map and search filter chips
- ⚠️ Missing: Mobile testing (50% of users on mobile)

---

## Documentation Structure

### [tests-e2e-architecture.md](tests-e2e-architecture.md)

**Core principles and patterns for writing maintainable, refactor-proof tests.**

**Key topics:**
- Test user behavior, not implementation
- Use console logs for state validation
- E2E tests USE real functions (don't reimplement logic)
- Selector strategy (semantic > CSS > data-testid)
- Test data strategy (testSource.ts)
- Mobile testing (iPhone 16)
- Surviving refactors (ai-proposal.md context)

**When to read:** Before writing any new E2E test

---

### [tests-e2e-examples.md](tests-e2e-examples.md)

**Detailed code examples for all major test patterns.**

**Key sections:**
- Selected Event tests (3 triggers, 3 visual cues, Exception)
- Filter Chip tests (map, date, search)
- State validation with console logs
- Using real functions (calculateWeekendRange, etc.)
- Smoke test examples
- Mobile test examples
- Edge case examples
- Anti-patterns (what NOT to do)

**When to read:** While implementing specific test types

---

### [tests-e2e-migration.md](tests-e2e-migration.md)

**Phased implementation plan for improving E2E test coverage.**

**Phases:**
- **Phase 0 (Week 1):** Foundation - testSource.ts, smoke tests, mobile config
- **Phase 1 (Week 2-3):** Core workflows - Selected Event, filter chips
- **Phase 2 (Week 4-5):** Comprehensive coverage - edge cases, optimization

**When to read:** Planning implementation timeline

---

## Critical User Workflows to Test

Based on [usage.md](usage.md) and actual user analytics:

1. **Load app with events** - Top workflow
2. **View today's events** (`qf=today`) - Top workflow
3. **View selected event from shared URL** (`se=eventId`) - Top workflow
4. **Selected Event (3 triggers):**
   - Click map marker → popup appears, map doesn't change
   - Click event row → map centers/zooms, popup appears
   - Load with `se` param → same as clicking event row
5. **Selected Event (3 visual cues):**
   - Map marker popup visible
   - Event row highlighted (green background)
   - URL updated with `se` parameter
6. **Selected Events Exception:**
   - Event list frozen while popup open
   - Visible count frozen while popup open
   - Map chip frozen while popup open
7. **Filter chips (3 types):**
   - Pan map → "X Filtered by Map" chip appears
   - Change date → "X Filtered by Date" chip appears
   - Type search → "X Filtered by Search" chip appears
8. **Remove filters:** Click any chip to remove that filter

---

## Test File Organization

```
tests/e2e/
├── test-utils.ts              # Shared utilities (keep and enhance)
├── smoke.spec.ts              # 3 critical workflows (<20s)
├── user-workflows.spec.ts     # All interactive tests
├── edge-cases.spec.ts         # Error states, invalid inputs
└── console-logs.spec.ts       # Debug helper (keep as-is)
```

**Clear ownership:**
- **smoke.spec.ts** → Top 3 workflows (load, today, selected event)
- **user-workflows.spec.ts** → All user interactions (Selected Event, filter chips, search, date)
- **edge-cases.spec.ts** → Error states, invalid params, empty states

---

## Key Patterns

### Test User Behavior, Not Implementation

```typescript
// ✅ GOOD - Tests user-visible behavior
test('Weekend filter shows weekend events', async ({ page }) => {
  await page.goto('/?es=test:stable&qf=weekend')
  await expect(page.getByRole('button', { name: /filtered by date/i })).toBeVisible()

  // Verify events are actually weekend events
  const eventDates = await page.getByRole('cell').allTextContents()
  for (const dateStr of eventDates) {
    const date = new Date(dateStr)
    expect([5, 6, 0]).toContain(date.getDay())  // Fri, Sat, Sun
  }
})

// ❌ BAD - Tests implementation details
test('FilterEventsManager.setDateRange called', async ({ page }) => {
  // This breaks during refactors
})
```

### Use Console Logs for State Validation

```typescript
test('Weekend filter processes during correct state', async ({ page }) => {
  const logs = await captureConsoleLogs(page, '/?es=test:stable&qf=weekend')

  verifyLogPatterns(logs, [
    {
      pattern: 'Processing quick date filter: weekend',
      requiredInState: 'applying-url-filters',  // ✅ State validation
      description: 'Weekend filter processed during URL parsing'
    },
    {
      pattern: 'State: user-interactive',
      description: 'App ready'
    }
  ])
})
```

### Use Semantic Selectors (Performance-Conscious)

```typescript
// ✅ GOOD - Semantic selectors (no performance impact)
const eventRow = page.getByRole('row', { name: /today event/i })
const dateChip = page.getByRole('button', { name: /filtered by date/i })
const searchInput = page.getByLabel(/search/i)

// ⚠️ OK - Library classes (stable)
const popup = page.locator('.maplibregl-popup')
const canvas = page.locator('canvas.maplibregl-canvas')

// ❌ BAD - data-testid on repeated elements (performance impact with 3,000 events!)
<tr data-testid="event-item" data-event-id={event.id}>  // DON'T DO THIS
```

### Use Real Functions, Don't Reimplement

```typescript
import { calculateQuickFilterRange } from '@/lib/utils/quickFilters'

// ✅ GOOD - Use actual function
test('Weekend filter uses correct calculation', async ({ page }) => {
  // Verify properties without reimplementing
  expect(actualStart.getDay()).toBe(5)  // Friday
  expect(actualEnd.getDay()).toBe(0)    // Sunday
})

// ❌ BAD - Reimplementing business logic
test('Weekend filter', async ({ page }) => {
  const today = new Date()
  const dayOfWeek = today.getDay()
  let daysToFriday = dayOfWeek < 5 ? 5 - dayOfWeek : 0
  // ... 15 more lines of date math (duplicated from source)
})
```

---

## Test Data Strategy

**Always use `test:stable` for E2E tests:**

```typescript
// ✅ GOOD - Controlled test data
await page.goto('/?es=test:stable')

// ❌ BAD - External data can change
await page.goto('/?es=sf')  // Only for manual testing
```

**Event sets in testSource.ts:**
- `test:stable` - Small set (5-10 events) for smoke tests, dynamic dates
- `test:comprehensive` - Large set (50-100 events) for full coverage
- `test:timezone` - Static dates for timezone edge case testing

---

## Mobile Testing

**Primary device: iPhone 16** (50% of users on mobile)

```typescript
// Configure in playwright.config.ts
projects: [
  { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
  { name: 'mobile-iphone16', use: { viewport: { width: 393, height: 852 }, isMobile: true } }
]

// Test mobile-specific interactions
test('Mobile: tap event to select @mobile', async ({ page }) => {
  const eventRow = page.getByRole('row').first()
  await eventRow.tap()  // Use tap, not click
  await expect(page.locator('.maplibregl-popup')).toBeVisible()
})
```

---

## Next Steps

1. **Read [Architecture](tests-e2e-architecture.md)** - Understand principles
2. **Review [Examples](tests-e2e-examples.md)** - See code patterns
3. **Follow [Migration Plan](tests-e2e-migration.md)** - Implement Phase 0
4. **Run smoke tests** - Verify infrastructure works
5. **Proceed to Phase 1** - Add core workflow tests

---

## FAQ

**Q: Do I need to add data-testid attributes?**
A: Almost never. Use semantic selectors (getByRole, getByText). Only add data-testid for hidden state indicators (1-2 elements max). NEVER on repeated elements.

**Q: How do I test state transitions?**
A: Use console logs with `requiredInState` pattern. See [Architecture: Console Log Usage](tests-e2e-architecture.md#console-log-usage).

**Q: What if my test breaks during the ai-proposal.md refactor?**
A: If you tested user behavior (not implementation), it shouldn't break. See [Architecture: Surviving Refactors](tests-e2e-architecture.md#surviving-refactors).

**Q: How do I run a single test?**
A: `npm run test:e2e -- -g "test name"`

**Q: How do I debug a failing test?**
A: `npm run test:e2e -- --headed` or `npm run test:e2e:ui` for interactive mode

**Q: Where do I find code examples?**
A: See [examples.md](tests-e2e-examples.md) for comprehensive examples

---

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [usage.md](usage.md) - User workflows to test
- [implementation.md](implementation.md) - Technical implementation details
- [ai-proposal.md](ai-proposal.md) - Upcoming refactor context
- [tests.md](tests.md) - Overall test strategy (unit, integration, E2E)

---

**For detailed information, see:**
- **[tests-e2e-architecture.md](tests-e2e-architecture.md)** - Principles and patterns
- **[tests-e2e-examples.md](tests-e2e-examples.md)** - Code examples
- **[tests-e2e-migration.md](tests-e2e-migration.md)** - Implementation plan
