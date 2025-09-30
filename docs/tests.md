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
- West / East → Longitude in degrees (−180 to +180), usually up to 6 decimal places.
- Remember Longitudes can go to 180, _longer_ than latitudes that only go up to 90.
  Another way is longitudes cover full 360 around earth (-180 to +180), latitudes only go from

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

Background in [Implementation.md: URL Parsing](Implementation.md#url-parsing)

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

E2E tests are performed by Playwright. Tests live in [/tests/e2e](../tests/e2e/), outside of `/src`, since E2E doesn't test source files directly, but the running app (UI, API endpoints).

**Quick console debugging:** From the command line, run tests and get browser console logs (output from `logr`) for any URL:

```bash
# Test specific URL with parameters
TEST_URL="/?es=sf" npm run test:console
```

Run page-load tests, which automate some of the manual tests listed above in [Testing Different URLs](#testing-different-urls)

```bash
# Run all
time npm run test:pageload

# Run tests with names that contain "Quick Filter"
TEST_NAME="Quick Filter" time npm run test:pageload
```

If tests fail, then playwright reports are available to see details - make sure you view stdout under Attachments to figure out why it failed.

**Available E2E commands:**

- `npm run test:e2e` - Run all E2E tests headlessly
- `npm run test:e2e:console` - Run console log debugging test with visible browser

```
# Run the new interactive test:
npm run test:e2e -- tests/e2e/interactive.spec.ts --headed

# Run specific test within the file:
npm run test:e2e -- tests/e2e/interactive.spec.ts -g "filter chip interaction" --headed
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

```
time npm run test:pageload

> calendar-map-filter@0.3.0 test:pageload
> playwright test tests/e2e/page-load.spec.ts --headed
...
  6 passed (18.7s)

To open last HTML report run:

  npx playwright show-report

real 19.511	user 19.103	sys 10.020	pcpu 100.00
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

**Test Coverage:** This document makes it easy to see test coverage and compare against the [Directory Structure in Implementation.md](Implementation.md#directory-structure)

```
npm test
> calendar-map-filter@0.3.3 test
> jest --coverage && node src/scripts/show-total-loc.mjs && date && echo
...
----------------------------|---------|----------|---------|---------|-----------------------------------------------
File                        | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------------------------|---------|----------|---------|---------|-----------------------------------------------
All files                   |   70.71 |    63.53 |   73.71 |   71.03 |
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
 components/map             |   92.77 |    79.51 |   96.96 |    95.3 |
  MapContainer.tsx          |   92.13 |    78.94 |      95 |   92.94 | 146,172-174,265-267
  MapMarker.tsx             |   94.44 |    81.81 |     100 |     100 | 15,35
  MapPopup.tsx              |   93.22 |    79.41 |     100 |   98.07 | 78
 components/ui              |   94.11 |    66.66 |      90 |     100 |
  button.tsx                |     100 |    66.66 |     100 |     100 | 41
  calendar.tsx              |    87.5 |       75 |   85.71 |     100 | 71,138-148
  slider.tsx                |     100 |    33.33 |     100 |     100 | 13
 lib                        |     100 |      100 |     100 |     100 |
  utils.ts                  |     100 |      100 |     100 |     100 |
 lib/api                    |   91.76 |    83.33 |   94.73 |   92.94 |
  geocoding.ts              |   91.76 |    83.33 |   94.73 |   92.94 | 50,81,119,153,284,312-314,358,383,425
 lib/api/eventSources/plura |   75.64 |    76.92 |      60 |   75.34 |
  types.ts                  |     100 |      100 |     100 |     100 |
  utils.ts                  |      75 |    76.92 |      60 |      75 | 71,91-92,100,148,157-191
 lib/config                 |   33.33 |    22.22 |     100 |   23.07 |
  env.ts                    |   33.33 |    22.22 |     100 |   23.07 | 3-8,13-17
 lib/events                 |    73.4 |    75.51 |      60 |   73.25 |
  FilterEventsManager.ts    |   72.58 |    79.31 |   55.55 |   72.88 | 42-44,58-74,115,132-133,189-207
  examples.ts               |     100 |      100 |     100 |     100 |
  filters.ts                |   73.33 |       70 |   71.42 |   73.07 | 32,43,67-71,83,108-114
 lib/hooks                  |   34.43 |    28.08 |   46.39 |   33.48 |
  useAppController.ts       |   12.21 |        0 |       0 |    12.8 | 117-529
  useBreakpoint.ts          |    7.69 |        0 |       0 |      10 | 11-22
  useEventsManager.ts       |   53.84 |    49.03 |   63.63 |   52.06 | 115-134,144-192,210-234,245-270
  useMap.ts                 |      71 |    39.47 |   77.41 |   72.83 | 21-28,116-127,144-150,161-165,208-209,242-253
  useUrlProcessor.ts        |     7.4 |        0 |       0 |    7.84 | 72-347
 lib/services               |    6.81 |        0 |       0 |    6.89 |
  urlProcessingService.ts   |    6.81 |        0 |       0 |    6.89 | 25-237
 lib/state                  |   97.14 |     82.6 |   91.66 |   96.55 |
  appStateReducer.ts        |   97.14 |     82.6 |   91.66 |   96.55 | 102
 lib/utils                  |   82.78 |    77.11 |   86.99 |   83.45 |
  calendar.ts               |   85.52 |     72.5 |     100 |   85.52 | 28-29,45,55,75,81,127-128,133-134,150
  date-19hz-parsing.ts      |   90.83 |    84.61 |   83.33 |   90.69 | 97-98,105-106,360-379
  date-constants.ts         |     100 |      100 |     100 |     100 |
  date.ts                   |    82.9 |    78.72 |   85.71 |   82.72 | 45-63,82-83,99-100,108-109,148-149,244
  headerNames.ts            |       0 |        0 |       0 |       0 | 6-38
  icsParser.ts              |     100 |      100 |     100 |     100 |
  location.ts               |   76.51 |       72 |   86.95 |   77.86 | 205,239-245,298,373-374,383-414
  logr.ts                   |   71.18 |    67.44 |   91.66 |   70.17 | 39,68-93,113,160
  quickFilters.ts           |   97.72 |      100 |     100 |   97.43 | 149
  timezones.ts              |    75.6 |    53.33 |      75 |   75.75 | 41-44,58-61,101-102
  umami.ts                  |   41.17 |     37.5 |       0 |   46.66 | 14-18,31-34
  url-utils.ts              |   94.87 |    84.29 |   96.15 |   97.57 | 76-77,312,320
  utils-client.ts           |    54.9 |     64.7 |      80 |    55.1 | 14-45,63,98,117-118
  utils-shared.ts           |   76.19 |    84.21 |      75 |    77.5 | 26,45,47,49,67-71
  venue-parsing.ts          |     100 |    86.66 |     100 |     100 | 22,59,85,145-149
 types                      |      75 |      100 |     100 |     100 |
  events.ts                 |      75 |      100 |     100 |     100 |
----------------------------|---------|----------|---------|---------|-----------------------------------------------

Test Suites: 1 skipped, 30 passed, 30 of 31 total
Tests:       10 skipped, 478 passed, 488 total
Snapshots:   0 total
Time:        4.605 s
Ran all test suites.
Total Lines of Code: 2189
Tue Sep 30 15:23:19 PDT 2025
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
2. Create tests for Cache utilities (filesystem.ts, upstash.ts)
    - Mock file system and Redis interactions
    - Test caching and retrieval logic

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
