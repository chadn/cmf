# Test Coverage

This document covers manual and automated tests.

## Table of Contents

- [Manual Testing](#manual-testing)
    - [Testing Background Knowledge](#testing-background-knowledge)
    - [Testing Different URLs](#testing-different-urls)
    - [Testing Use Cases](#testing-use-cases)
- [Automated Test Coverage](#automated-test-coverage)
    - [End-to-End Testing](#end-to-end-testing)
        - [Playwright Directory Structure](#playwright-directory-structure)
        - [E2E Example](#e2e-example)
    - [Integration Tests](#integration-tests)
    - [Unit and Component Tests](#unit-and-component-tests)
    - [Jest Coverage](#jest-coverage)
- [Next Steps for Testing](#next-steps-for-testing)
    - [Priority 1: Improve Map Component Testing](#priority-1-improve-map-component-testing)
    - [Priority 2: Complete Hook Testing](#priority-2-complete-hook-testing)
    - [Priority 3: API and Cache Testing](#priority-3-api-and-cache-testing)
    - [Priority 4: Improve Event Components Testing](#priority-4-improve-event-components-testing)
    - [Priority 5: App Pages Testing](#priority-5-app-pages-testing)
- [Testing Strategy](#testing-strategy)

## Manual Testing

This section covers smoke testing (Core Functionality) and some detailed functional testing scenarios.

### Testing Background Knowledge

In addition to [CMF Definitions](usage.md#definitions), manual testers should understand:

- **Map container** - defined by browser viewport, the height and width of the map in pixels
- **Map viewport** - defined by lat/long/zoom coordinates to control map contents based on center point and zoom level (1=earth view, 22=maximum zoom)
- **Map bounds** - geographic boundaries (north/south lat, east/west long) computed from viewport and map container
- Any event with coordinates outside map bounds is considered out of Map bounds or out of the Map container
- All filter chips are independent; their counts should never exceed total events:
    - "Filtered by Date" updates only on page load and when start/end dates change via user action
    - "Filtered by Search" updates only on page load and when user types in search box
    - "Filtered by Map" updates only on page load and when map changes via direct user action
      Note: Selected event creates an exception to this rule
- The visible button contains the count of currently visible events (ones not filtered) and total events. It is by definition the count of events in the Event list.
- The following should always be in sync when user filters by changing map, date, or search:
    - events in event list should be all visible events, all events not filtered out.
    - "X of Y Visible" button - count X should match number of events in event list, Y is total number of events from all event sources.
    - marker numbers - the number of visible events at a location appears on the marker.

Note:

- South / North → Latitude in degrees (−90 to +90), usually up to 6 decimal places
- West / East → Longitude in degrees (−180 to +180), usually up to 6 decimal places
- Latitude vs longitude:
    - Longitudes can go to 180, So longitudes are **_longer_** than latitudes, which only go up to 90. Nice mnemonic.
    - Longitudes cover full 360 around earth (-180 to +180), latitudes only go from the South pole (-90) to the north pole (+90).

### Testing Date Changes

**Date Changes can be triggered by:**

- **URL processing during page load** (only during `applying-url-filters` state) - `sd`+`ed` determine fullRange (`minDate`, `maxDate`), `qf` and `fsd`+`fed` determine initial `activeRange`
- **Component: Sidebar** (only during `user-interactive` state) - clearing date chip resets `activeRange` to entire range
- **Component: DateAndSearchFilters** (only during `user-interactive` state) - Clicking on slider, calendar, or quick filters change `activeRange` (during `user-interactive` state)

**Data Flow Priority:**

- During `applying-url-filters`: `initialUrlFilterRange` (from qf=weekend) > URL params (fsd/fed) > defaults
- During `user-interactive`: `dateSliderRange` (from user clicks) > defaults
    - URL params are **write-only** during user-interactive (updated but not read)

**Date Changes Need to propagate to:**

- **URL** - `qf=xx` parameter can be changed or cleared. `fsd`+`fed` maybe same in future, for now they should be cleared after initial processing.
- **Filters (functions)** - update via `FilterEventsManager.setDateRange()`
- **Component: Sidebar** - X of Y Visible, date chip
- **Component: DateAndSearchFilters** - slider position, calendar selection, quick filter buttons, dropdown labels

**Key Test Scenarios:**

1. Load `/?qf=weekend` - should show weekend dates in all UI components
2. User drags slider - should immediately update dropdown labels and event counts
3. User clicks calendar - should immediately update all UI components
4. User clicks quick filter - should override any previous selections
5. User clicks "Filtered by Date" chip to reset dates.

### Testing Different URLs

Background in [implementation.md: URL Parsing](implementation.md#url-parsing)

Note these URL tests are automated via `npm run test:pageload` as part of [End-to-End Testing](#end-to-end-testing)

1. `/` - should load home page
1. `/?es=SRC` - should load event source (or sources if SRC is a,b,etc) then the show default map page
    1. "xx of xx visible" counts are accurate, xx is the total number of all events.
    1. map shows all events
    1. Event list shows all events
    1. no filtered-by chips are shown
    1. clicking on CMF in top left reveals timezone, CMF Version, About text, and links: "View Usage Doc on Github", "Enter New Source" (goes back to home page), and "Share - Copy URL to Clipboard"
    1. clicking on event source header reveals popup with list of event source(s). For each, shows total number of events from that source and "View Source" link that goes to a page roughly showing all events. When more than one source is shown, a "Show Only These" link is shown that will reload page showing on that event source.
1. `/?es=SRC&se=bbbbbb` - starts with map page showing selected event `bbbbb`
1. `/?es=SRC&sq=berkeley` - starts with map page with visible events filtered by search query `berkeley`. Map is zoomed to show visible events.
1. `/?es=SRC&sq=unresolved` - starts with map page, only showing events with unresolved locations.
1. `/?es=SRC&qf=weekend` - starts with map page with visible events filtered by date, start is friday, end is the sunday 2 days later. Map is zoomed to show visible events.
1. `/?es=SRC&qf=weekend&sq=berkeley` - starts with map page with visible events filtered by date and filtered by search. Map is zoomed to show visible events.
1. `/?es=SRC&fsd=2025-01-01&fed=2025-12-31` - starts with map page with visible events filtered by specific user-defined date range (filter start/end dates). Map is zoomed to show visible events.
1. `/?es=SRC&llz=LATITUDE,LONGITUDE,ZOOM` - starts with map page where map canvas center is LATITUDE,LONGITUDE (both are floating point numbers) and zoomed to ZOOM level, where ZOOM is positive integer. Since llz is in URL, llzChecked variable and checkbox are true. When llz is not in URL on page load, the checkbox is empty and llzChecked is false. Checkbox is in popup when you click CMF.
1. In general, if there's no llz in URL, the map will auto zoom and center based on the URL params.

### Testing Use Cases

Selected Event and Marker Popup

1. Verify all 3 indicators from **Selected Event** in [CMF Definitions](usage.md#definitions) occur for each of the 3 triggers
1. Since the product prioritizes a user experience that enables easy browsing of events, then enable the which includes casually clicking on various events in event list and seeing where they are on the map WITHOUT the event list changing on every click due to map zooming in, making events become off the map
1. When user clicks on event in event list, the map may zoom in, making some events out of bounds

Visible Button, Map, and Filter Chips:

1. Any time only one chip is shown, the number filtered out, X, when added to Y from "<Y> of <Z> Visible" button, should equal Z, the total number of events from all sources.
1. If visible button says "118 of 118 Visible", and then user moves map so that it says "20 of 118 Visible", filter chip "98 Filtered By Map" appears and events list should only show 20 events. Clicking visible button should zoom in to those 2, not change visible events.
1. Clicking on "116 Filtered By Map" should reset map to show best zoom in where "118 of 118 Visible"
1. If date filter is updated, and "110 Filtered by Date" chip appears, and no map chip exists, then Visible Button should say "8 of 118 Visible" and clicking on it will zoom map to show only those 8.
1. If user moves map in same way as case 1, then chip "98 Filtered By Map" should appear. Date chip should never change from moving map. Visible button may drop to less than 8 but no more than 8.
1. If visible button says "0 of 118 Visible", clicking on it does nothing.
1. If visible button says "1 of 118 Visible", clicking on it zooms to just that 1 event, similar to selected event.

Share - Copy URL

- copying URL and immediately pasting into a new browser (or incognito mode of chrome) should load the map page exactly the same as original. Note that as time passes it may no longer load the map page exactly the same due to the fact that events can be added/removed/modified.

## Automated Test Coverage

### End-to-End Testing

E2E tests are performed by Playwright, which emulates users by loading web page, clicking on app, reading console logs, etc. 
Tests live in [/tests/e2e](../tests/e2e/), outside of `/src`, since E2E doesn't test source files directly, but the running app (UI, API endpoints).

**📚 E2E Test Documentation:**
- [tests-e2e-architecture.md](tests-e2e-architecture.md) - Testing principles, patterns, and selector strategies
- [tests-e2e-examples.md](tests-e2e-examples.md) - Code examples and anti-patterns
- [tests-e2e-migration.md](tests-e2e-migration.md) - Phased implementation plan and progress, temporary.

**Examples:** 
```bash
npm run test:e2e:smoke  # ~8s, smoke test runs 3 critical workflow tests
npm run test:e2e        # ~60s, runs all 42 workflow tests
```

**Quick console debugging:** From the command line, run tests and get browser console logs (output from `logr`) for any URL:

```bash
# Test specific URL with parameters
(TEST_URL="/?es=sf" npm run test:e2e:console) &> dev-perf-browser-logs.txt   # AI can use this to iterate on testing its changes
(TEST_URL="/?es=sf" npm run test:e2e:console) 2>&1 |tee dev-perf-browser-logs.txt
```

Run page-load tests, which automate some of the manual tests listed above in [Testing Different URLs](#testing-different-urls)

```bash
# Run all page-load tests
time npm run test:e2e:pageload

# Run tests with names that contain "Quick Filter"
TEST_NAME="Quick Filter" time npm run test:e2e:pageload
```

If tests fail, then playwright reports are available to see details - make sure you view stdout under Attachments to figure out why it failed.

**Available E2E commands:**

- `npm run test:e2e` - Run all E2E tests headlessly (desktop + mobile) (2-5 mins)
- `npm run test:e2e:smoke` - Run smoke tests only (~30s)
- `npm run test:e2e:mobile` - Run all tests on mobile (iPhone 16)
- `npm run test:e2e:full` - Run all tests on both desktop and mobile
- `npm run test:e2e:console` - Run console log debugging test with visible browser
- `npm run test:e2e:pageload` - Run page-load verification tests with visible browser
- `npm run test:e2e:interactive` - Run interactive user state tests with visible browser
- `npm run test:report` - Open HTML report from last test run

```bash
# Run specific test file:
npm run test:e2e -- tests/e2e/interactive.spec.ts --headed

# Run specific test within the file:
npm run test:e2e -- tests/e2e/interactive.spec.ts -g "filter chip interaction" --headed

# Run smoke tests on desktop only (fastest feedback):
npm run test:e2e:smoke -- --project=desktop-chrome
```

#### Playwright Directory Structure

**Generated artifacts** (ignored by git):

- `/test-results/` - Screenshots, videos, traces from failed tests
- `/playwright-report/` - Beautiful HTML reports with test results
- `/blob-report/` - Raw binary report data for CI/CD integration
- `/playwright/.cache/` - Playwright's internal cache and browser binaries

**Custom test paths:**

- `/tests/e2e/` - E2E test files
- `/tests/e2e/test-results/` - Project-specific test results
- `/tests/e2e/playwright-report/` - Project-specific reports

#### E2E Example

```bash
time npm run test:e2e

> calendar-map-filter@0.4.9 test:e2e
> playwright test

🚫 Skipping, skip=true in code for test: "Custom fsd Date Range Test"

🚫 Skipping, skip=true in code for test: "Unresolved Events Marker Popup"

================================================================================
TEST SUMMARY
================================================================================

✅ PASSED (38):
  console-logs.spec.ts 11:5  › desktop-chrome › console-logs.spec.ts › test with custom (LA) timezone
  console-logs.spec.ts 40:9  › desktop-chrome › console-logs.spec.ts › Console Log Debugging › capture console logs from custom URL
  interactive.spec.ts 12:9  › desktop-chrome › interactive.spec.ts › User Interactive State Tests › Date filter clearing - qf=weekend filter chip interaction
  page-load.spec.ts 247:17  › desktop-chrome › page-load.spec.ts › Page Load Tests - URL Processing Verification › Quick Filter qf=weekend Test
  page-load.spec.ts 247:17  › desktop-chrome › page-load.spec.ts › Page Load Tests - URL Processing Verification › Search Filter sq=berkeley Test
  page-load.spec.ts 247:17  › desktop-chrome › page-load.spec.ts › Page Load Tests - URL Processing Verification › LLZ Coordinates Test With Visible Events
  page-load.spec.ts 247:17  › desktop-chrome › page-load.spec.ts › Page Load Tests - URL Processing Verification › LLZ Coordinates Test With No Visible Events
  page-load.spec.ts 247:17  › desktop-chrome › page-load.spec.ts › Page Load Tests - URL Processing Verification › Selected Event se= Marker Popup
  smoke.spec.ts 35:9  › desktop-chrome › smoke.spec.ts › Smoke Tests - Critical User Workflows › Workflow 1: Load app with events
  smoke.spec.ts 72:9  › desktop-chrome › smoke.spec.ts › Smoke Tests - Critical User Workflows › Workflow 2: View today's events (qf=today)
  smoke.spec.ts 116:9  › desktop-chrome › smoke.spec.ts › Smoke Tests - Critical User Workflows › Workflow 3: View selected event from shared URL (se=)
  user-workflows.spec.ts 20:9  › desktop-chrome › user-workflows.spec.ts › Selected Event Workflows › Trigger 1: Click map marker selects event
  user-workflows.spec.ts 60:9  › desktop-chrome › user-workflows.spec.ts › Selected Event Workflows › Trigger 2: Click event row selects event
  user-workflows.spec.ts 112:9  › desktop-chrome › user-workflows.spec.ts › Selected Event Workflows › Trigger 3: Load with se parameter selects event
  user-workflows.spec.ts 143:9  › desktop-chrome › user-workflows.spec.ts › Selected Event Workflows › Exception: Close popup deselects and unfreezes event list
  user-workflows.spec.ts 299:9  › desktop-chrome › user-workflows.spec.ts › Filter Chip Workflows › Date filter: Weekend quick filter creates date chip
  user-workflows.spec.ts 328:9  › desktop-chrome › user-workflows.spec.ts › Filter Chip Workflows › Date filter: Click chip removes date filter
  user-workflows.spec.ts 359:9  › desktop-chrome › user-workflows.spec.ts › Filter Chip Workflows › Search filter: Type search creates search chip
  user-workflows.spec.ts 397:9  › desktop-chrome › user-workflows.spec.ts › Filter Chip Workflows › Search filter: Click chip clears search
  console-logs.spec.ts 11:5  › mobile-iphone16 › console-logs.spec.ts › test with custom (LA) timezone
  interactive.spec.ts 12:9  › mobile-iphone16 › interactive.spec.ts › User Interactive State Tests › Date filter clearing - qf=weekend filter chip interaction
  console-logs.spec.ts 40:9  › mobile-iphone16 › console-logs.spec.ts › Console Log Debugging › capture console logs from custom URL
  page-load.spec.ts 247:17  › mobile-iphone16 › page-load.spec.ts › Page Load Tests - URL Processing Verification › Quick Filter qf=weekend Test
  page-load.spec.ts 247:17  › mobile-iphone16 › page-load.spec.ts › Page Load Tests - URL Processing Verification › Search Filter sq=berkeley Test
  page-load.spec.ts 247:17  › mobile-iphone16 › page-load.spec.ts › Page Load Tests - URL Processing Verification › LLZ Coordinates Test With Visible Events
  page-load.spec.ts 247:17  › mobile-iphone16 › page-load.spec.ts › Page Load Tests - URL Processing Verification › LLZ Coordinates Test With No Visible Events
  smoke.spec.ts 35:9  › mobile-iphone16 › smoke.spec.ts › Smoke Tests - Critical User Workflows › Workflow 1: Load app with events
  page-load.spec.ts 247:17  › mobile-iphone16 › page-load.spec.ts › Page Load Tests - URL Processing Verification › Selected Event se= Marker Popup
  smoke.spec.ts 72:9  › mobile-iphone16 › smoke.spec.ts › Smoke Tests - Critical User Workflows › Workflow 2: View today's events (qf=today)
  smoke.spec.ts 116:9  › mobile-iphone16 › smoke.spec.ts › Smoke Tests - Critical User Workflows › Workflow 3: View selected event from shared URL (se=)
  user-workflows.spec.ts 20:9  › mobile-iphone16 › user-workflows.spec.ts › Selected Event Workflows › Trigger 1: Click map marker selects event
  user-workflows.spec.ts 60:9  › mobile-iphone16 › user-workflows.spec.ts › Selected Event Workflows › Trigger 2: Click event row selects event
  user-workflows.spec.ts 112:9  › mobile-iphone16 › user-workflows.spec.ts › Selected Event Workflows › Trigger 3: Load with se parameter selects event
  user-workflows.spec.ts 299:9  › mobile-iphone16 › user-workflows.spec.ts › Filter Chip Workflows › Date filter: Weekend quick filter creates date chip
  user-workflows.spec.ts 143:9  › mobile-iphone16 › user-workflows.spec.ts › Selected Event Workflows › Exception: Close popup deselects and unfreezes event list
  user-workflows.spec.ts 359:9  › mobile-iphone16 › user-workflows.spec.ts › Filter Chip Workflows › Search filter: Type search creates search chip
  user-workflows.spec.ts 328:9  › mobile-iphone16 › user-workflows.spec.ts › Filter Chip Workflows › Date filter: Click chip removes date filter
  user-workflows.spec.ts 397:9  › mobile-iphone16 › user-workflows.spec.ts › Filter Chip Workflows › Search filter: Click chip clears search

⏭️  SKIPPED (10):
  console-logs.spec.ts 28:10  › desktop-chrome › console-logs.spec.ts › Console Log Debugging › capture console logs from home page
  console-logs.spec.ts 70:10  › desktop-chrome › console-logs.spec.ts › Console Log Debugging › check for specific log patterns
  interactive.spec.ts 108:10  › desktop-chrome › interactive.spec.ts › User Interactive State Tests › Date filter clearing - verify event list updates
  user-workflows.spec.ts 209:10  › desktop-chrome › user-workflows.spec.ts › Filter Chip Workflows › Map filter: Pan map creates map filter chip
  user-workflows.spec.ts 255:10  › desktop-chrome › user-workflows.spec.ts › Filter Chip Workflows › Map filter: Click chip removes map filter
  console-logs.spec.ts 28:10  › mobile-iphone16 › console-logs.spec.ts › Console Log Debugging › capture console logs from home page
  console-logs.spec.ts 70:10  › mobile-iphone16 › console-logs.spec.ts › Console Log Debugging › check for specific log patterns
  interactive.spec.ts 108:10  › mobile-iphone16 › interactive.spec.ts › User Interactive State Tests › Date filter clearing - verify event list updates
  user-workflows.spec.ts 209:10  › mobile-iphone16 › user-workflows.spec.ts › Filter Chip Workflows › Map filter: Pan map creates map filter chip
  user-workflows.spec.ts 255:10  › mobile-iphone16 › user-workflows.spec.ts › Filter Chip Workflows › Map filter: Click chip removes map filter

================================================================================
TOTAL: 48 tests (38 passed, 0 failed, 10 skipped)
================================================================================

To open last HTML report run:
  npx playwright show-report

real 181.412	user 23.348	sys 5.252	pcpu 15.76
```

```bash
time npm run test:e2e:pageload

> calendar-map-filter@0.3.5 test:e2e:pageload
> playwright test tests/e2e/page-load.spec.ts --headed
...
  6 passed (18.4s)

To open last HTML report run:

  npx playwright show-report

real 19.169	user 23.509	sys 9.991	pcpu 100.00
```

### Integration Tests

**Convention:** Keep tests next to feature code.

```
src/features/cart/Cart.tsx
src/features/cart/__tests__/Cart.integration.test.tsx
```

**Status:** Low priority, not implemented yet, partially covered by e2e tests.

### Unit and Component Tests

**Command:** `npm test` runs Jest with coverage for all unit and component tests.

**Test Types:**

- **Unit Tests**: Test individual functions and utilities (e.g., date calculations, URL parsing)
- **Component Tests**: Test React components using React Testing Library (e.g., EventList, DateFilters, MapContainer)
- **Hook Tests**: Test custom React hooks in isolation

**Convention:** Keep tests next to source code.

```
src/lib/utils/date.ts                        # Utility functions
src/lib/utils/__tests__/date.test.ts         # Unit tests for utilities

src/components/events/EventList.tsx          # React component
src/components/events/__tests__/EventList.test.tsx  # Component tests with RTL
```

### Jest Coverage

**Test Coverage:** The following output from `npm test` makes it easy to see test coverage and compare against the [Directory Structure in implementation.md](implementation.md#directory-structure)

```bash
npm test
> calendar-map-filter@0.4.8 test
> jest --coverage && node src/scripts/show-total-loc.mjs && date && echo
...
----------------------------|---------|----------|---------|---------|-----------------------------------------------------------
File                        | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------------------------|---------|----------|---------|---------|-----------------------------------------------------------
All files                   |   70.94 |    64.91 |   73.42 |   71.15 |
 components/common          |     100 |      100 |     100 |     100 |
  ErrorMessage.tsx          |     100 |      100 |     100 |     100 |
  LoadingSpinner.tsx        |     100 |      100 |     100 |     100 |
 components/events          |   77.48 |    66.93 |   74.35 |   78.32 |
  DateAndSearchFilters.tsx  |    64.7 |     42.1 |   57.14 |   66.66 | 64,94-222
  DateQuickButtons.tsx      |    90.9 |       75 |     100 |    90.9 | 43-44
  EventList.tsx             |   82.05 |    78.04 |   80.95 |   81.57 | 38-39,134-136,161-163,188-190,217-219
 components/home            |   80.55 |    66.66 |     100 |      80 |
  EventsSourceSelector.tsx  |   80.55 |    66.66 |     100 |      80 | 35-39,46-47
 components/layout          |     100 |      100 |     100 |     100 |
  Footer.tsx                |     100 |      100 |     100 |     100 |
  Header.tsx                |     100 |      100 |     100 |     100 |
 components/map             |   84.89 |    73.33 |   88.57 |   86.78 |
  MapContainer.tsx          |   82.07 |    71.42 |   85.71 |   82.35 | 54-63,79,88,122-124,170,196-198,234,304-306
  MapMarker.tsx             |   94.44 |    81.81 |     100 |     100 | 15,35
  MapPopup.tsx              |   86.76 |    72.97 |    90.9 |   91.66 | 75-81,92
 components/ui              |   91.17 |    66.66 |      80 |   96.77 |
  button.tsx                |     100 |    66.66 |     100 |     100 | 41
  calendar.tsx              |   81.25 |       75 |   71.42 |   92.85 | 35
  slider.tsx                |     100 |    33.33 |     100 |     100 | 13
 lib                        |     100 |      100 |     100 |     100 |
  utils.ts                  |     100 |      100 |     100 |     100 |
 lib/api                    |   91.76 |    83.33 |   94.73 |   92.94 |
  geocoding.ts              |   91.76 |    83.33 |   94.73 |   92.94 | 56,87,125,159,290,318-320,364,389,431
 lib/api/eventSources/plura |   75.64 |    76.92 |      60 |   75.34 |
  types.ts                  |     100 |      100 |     100 |     100 |
  utils.ts                  |      75 |    76.92 |      60 |      75 | 71,91-92,100,148,157-191
 lib/cache                  |   73.23 |    77.19 |   85.71 |   72.46 |
  upstash.ts                |   73.23 |    77.19 |   85.71 |   72.46 | 11,45-46,73-103,140,187
 lib/config                 |     100 |      100 |     100 |     100 |
  env.ts                    |     100 |      100 |     100 |     100 |
 lib/events                 |   69.23 |    69.09 |      50 |   69.07 |
  FilterEventsManager.ts    |   69.44 |    77.14 |   46.66 |      70 | 37-39,53-69,112,135-136,152-160,199-217
  examples.ts               |     100 |      100 |     100 |     100 |
  filters.ts                |   66.66 |       55 |   57.14 |   65.38 | 32,43,67-71,83-114
 lib/hooks                  |      33 |    22.64 |   46.39 |   32.47 |
  useAppController.ts       |   11.11 |        0 |       0 |   11.68 | 118-575
  useBreakpoint.ts          |    7.69 |        0 |       0 |      10 | 11-22
  useEventsManager.ts       |   57.52 |    54.23 |   61.76 |      58 | 109-126,136-180,193-213
  useMap.ts                 |   67.85 |    36.36 |      80 |   68.42 | 43-49,120-132,148-154,165-169,191-194,198,231-232,265-276
  useUrlProcessor.ts        |    8.03 |        0 |       0 |    8.49 | 73-357
 lib/services               |    6.74 |        0 |       0 |    6.81 |
  urlProcessingService.ts   |    6.74 |        0 |       0 |    6.81 | 25-237
 lib/state                  |   97.14 |     82.6 |   91.66 |   96.55 |
  appStateReducer.ts        |   97.14 |     82.6 |   91.66 |   96.55 | 102
 lib/utils                  |   83.07 |    76.91 |   88.02 |   83.42 |
  calendar.ts               |   85.71 |     72.5 |     100 |   85.71 | 28-29,46,56,76,82,128-129,134-135,151
  date-19hz-parsing.ts      |    90.9 |    83.07 |   83.33 |   90.76 | 96-97,104-105,359-378
  date-constants.ts         |     100 |      100 |     100 |     100 |
  date.ts                   |   94.54 |    90.54 |     100 |   94.19 | 67-68,97,140-141,236,454,501-502
  headerNames.ts            |     100 |      100 |     100 |     100 |
  icsParser.ts              |     100 |      100 |     100 |     100 |
  location.ts               |   74.64 |    66.66 |   86.95 |   76.15 | 51-52,211,228,256-262,315,390-391,406-442
  logr.ts                   |   71.66 |    67.44 |   91.66 |   70.68 | 39,68-93,113,160
  quickFilters.ts           |   97.72 |      100 |     100 |   97.43 | 149
  timezones.ts              |   87.75 |     86.2 |   84.61 |    88.5 | 55,76-84,87,95-100,136
  umami.ts                  |   18.42 |        0 |       0 |   20.58 | 17-21,37-63,75-77,93-109
  url-utils.ts              |   94.87 |    84.29 |   96.15 |   97.57 | 76-77,317,325
  utils-client.ts           |      54 |    68.75 |      60 |   54.16 | 14-43,61,65,96,115-116
  utils-server.ts           |      25 |        0 |       0 |      20 | 9,33-100,107
  utils-shared.ts           |   92.53 |    86.53 |     100 |   93.54 | 26,45,47,49
  venue-parsing.ts          |   96.87 |     82.6 |     100 |   96.82 | 151-152
 types                      |   33.33 |      100 |       0 |   28.57 |
  error.ts                  |       0 |      100 |       0 |       0 | 1-8
  events.ts                 |      75 |      100 |     100 |     100 |
----------------------------|---------|----------|---------|---------|-----------------------------------------------------------

Test Suites: 1 skipped, 33 passed, 33 of 34 total
Tests:       10 skipped, 618 passed, 628 total
Snapshots:   0 total
Time:        2.969 s, estimated 3 s
Ran all test suites.
Total Lines of Code: 2524
Sat Oct 25 12:05:52 PDT 2025

```

## Next Steps for Testing

### Priority 1: Improve Map Component Testing

1. Improve test coverage for MapContainer component (currently at 11.68%)
    - Create proper mocks for Map, Marker, and Popup components from react-map-gl
    - Test viewport changes, marker rendering, and popup functionality
    - Focus on testing user interactions with the map

### Priority 2: Complete Hook Testing

1. Create tests for useMap and useEventsManager hooks (currently at 0%)
    - Mock maplibre-gl functionality
    - Test map initialization, viewport changes, and marker management
    - Test event filtering, sorting, and date range selection logic

### Priority 3: API and Cache Testing

1. Create tests for API utilities (calendar.ts, geocoding.ts)
    - Mock fetch requests
    - Test response parsing and error handling

### Priority 4: Improve Event Components Testing

1. Increase test coverage for EventList.tsx (currently at 56%)
    - Test sorting functionality
    - Test filtering behavior
    - Test pagination and scrolling
2. Create tests for ActiveFilters.tsx (currently at 0%)
    - Test filter display
    - Test filter removal

### Priority 5: App Pages Testing

1. Create tests for main app pages
    - Test page rendering and component integration
    - Test routing and navigation

## Testing Strategy

For components:

- Test rendering with different props
- Test user interactions
- Test conditional rendering
- Focus on edge cases and error states

For hooks:

- Test initialization
- Test state changes
- Test error handling

For utilities:

- Test all edge cases
- Test error handling
- Ensure consistent behavior across environments

For API:

- Create mocks for external services
- Test success and error paths
