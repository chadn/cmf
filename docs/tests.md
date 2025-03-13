# Tests

This file makes it easy to see test coverage.
Compare tests below to [Directory Structure in Implementation.md](Implementation.md#directory-structure)

```
npm test
...
-----------------------|---------|----------|---------|---------|-------------------
File                   | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------------|---------|----------|---------|---------|-------------------
All files              |   32.11 |    43.91 |   32.23 |    32.2 |
 app                   |       0 |        0 |       0 |       0 |
  layout.tsx           |       0 |      100 |       0 |       0 | 2-12
  page.tsx             |       0 |        0 |       0 |       0 | 3-173
 app/api/calendar      |       0 |        0 |       0 |       0 |
  route.ts             |       0 |        0 |       0 |       0 | 1-190
 app/home              |       0 |      100 |       0 |       0 |
  page.tsx             |       0 |      100 |       0 |       0 | 3-8
 app/privacy           |       0 |      100 |       0 |       0 |
  page.tsx             |       0 |      100 |       0 |       0 | 3-7
 app/terms             |       0 |      100 |       0 |       0 |
  page.tsx             |       0 |      100 |       0 |       0 | 3-7
 components/common     |     100 |      100 |     100 |     100 |
  ErrorMessage.tsx     |     100 |      100 |     100 |     100 |
  LoadingSpinner.tsx   |     100 |      100 |     100 |     100 |
 components/events     |   23.68 |    52.38 |   33.33 |   22.22 |
  EventDetails.tsx     |     100 |      100 |     100 |     100 |
  EventFilters.tsx     |       0 |        0 |       0 |       0 | 3-213
  EventList.tsx        |     100 |      100 |     100 |     100 |
 components/home       |     100 |      100 |     100 |     100 |
  CalendarSelector.tsx |     100 |      100 |     100 |     100 |
 components/layout     |       0 |        0 |       0 |       0 |
  Footer.tsx           |       0 |      100 |       0 |       0 | 3-54
  Header.tsx           |       0 |        0 |       0 |       0 | 3-70
 components/map        |       0 |        0 |       0 |       0 |
  MapContainer.tsx     |       0 |        0 |       0 |       0 | 3-190
  MapMarker.tsx        |       0 |        0 |       0 |       0 | 3-51
  MapPopup.tsx         |       0 |        0 |       0 |       0 | 3-89
 lib/api               |       0 |        0 |       0 |       0 |
  calendar.ts          |       0 |        0 |       0 |       0 | 1-85
  geocoding.ts         |       0 |        0 |       0 |       0 | 5-125
 lib/cache             |       0 |        0 |       0 |       0 |
  filesystem.ts        |       0 |        0 |       0 |       0 | 1-75
  upstash.ts           |       0 |        0 |       0 |       0 | 1-97
 lib/hooks             |   52.84 |    68.33 |   42.85 |   52.89 |
  useEvents.ts         |   98.48 |    95.34 |     100 |   98.46 | 65
  useMap.ts            |       0 |        0 |       0 |       0 | 3-204
 lib/utils             |   80.86 |    80.55 |    87.5 |    82.4 |
  date.ts              |   80.64 |      100 |     100 |   80.64 | 16-17,58-59,76-77
  debug.ts             |   82.75 |    78.37 |     100 |   86.79 | 25,45,107,125-128
  location.ts          |   76.92 |       75 |      75 |      75 | 52-66
-----------------------|---------|----------|---------|---------|-------------------

Test Suites: 9 passed, 9 total
Tests:       59 passed, 59 total
Snapshots:   0 total
Time:        2.656 s
```

## Test Coverage Summary

### Completed Test Coverage

1. **Common Components (100% coverage)**

    - `LoadingSpinner`: Tests for different sizes, colors, and custom class names
    - `ErrorMessage`: Tests for rendering error messages, custom class names, retry button functionality, and conditional rendering

2. **Event Components (partial coverage)**

    - `EventList`: Tests for rendering event lists, event selection, loading state, error state, and empty state
    - `EventDetails`: Tests for rendering event details, close button functionality, unresolved location messages, and handling events without descriptions

3. **Home Components (100% coverage)**

    - `CalendarSelector`: Tests for form rendering, error handling, form submission, example calendar selection, and loading state

4. **Hooks (partial coverage)**

    - `useEvents`: Tests for loading state, fetching calendar events, filtering by date range, search query, map bounds, and unknown locations, as well as error handling

5. **Utilities (good coverage)**
    - **Date Utilities (80.64% coverage)**: Tests for formatting event dates, durations, and relative time strings
    - **Location Utilities (76.92% coverage)**: Tests for truncating locations, checking if locations are within bounds, and calculating center points
    - **Debug Utilities (82.75% coverage)**: Tests for conditional logging based on environment variables and error logging

### Remaining Test Coverage

1. **App Pages (0% coverage)**

    - `layout.tsx`, `page.tsx`, and other page components
    - API routes like `app/api/calendar/route.ts`

2. **Event Components (needs improvement)**

    - `EventFilters.tsx`: No tests for filtering functionality

3. **Layout Components (0% coverage)**

    - `Footer.tsx`, `Header.tsx`: No tests for rendering and functionality

4. **Map Components (0% coverage)**

    - `MapContainer.tsx`, `MapMarker.tsx`, `MapPopup.tsx`: No tests for map rendering, markers, and popups

5. **API Utilities (0% coverage)**

    - `calendar.ts`, `geocoding.ts`: No tests for API functionality

6. **Cache Utilities (0% coverage)**

    - `filesystem.ts`, `upstash.ts`: No tests for caching functionality

7. **Hooks (needs improvement)**
    - `useMap.ts`: No tests for map functionality

## Recommendations for Future Testing

1. **Priority Components to Test Next:**

    - `EventFilters.tsx`: This is part of the core event functionality and currently has 0% coverage
    - Map components: These are central to the application's functionality

2. **API and Cache Testing:**

    - Create mocks for external API calls to test `calendar.ts` and `geocoding.ts`
    - Test cache functionality in `filesystem.ts` and `upstash.ts`

3. **Remaining Utility Functions:**

    - Complete testing for `date.ts`, particularly the `getRelativeTimeString` function
    - Improve coverage for `location.ts`, focusing on the `findLargestCity` function

4. **Integration Tests:**

    - Consider adding integration tests that test multiple components working together
    - Test the full user flow from selecting a calendar to viewing events on the map

5. **End-to-End Tests:**
    - Consider adding Cypress or Playwright tests for end-to-end testing of critical user flows
