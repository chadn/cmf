# Test Coverage

This document makes it easy to see test coverage and compare against the [Directory Structure in Implementation.md](Implementation.md#directory-structure)

```
npm test
> calendar-map-filter@0.1.0 test
> jest
...
-----------------------|---------|----------|---------|---------|----------------------------
File                   | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------------|---------|----------|---------|---------|----------------------------
All files              |    38.7 |     47.6 |   41.32 |   38.82 |
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
 components/events     |      75 |    80.95 |   83.33 |   73.61 |
  EventDetails.tsx     |     100 |      100 |     100 |     100 |
  EventFilters.tsx     |   67.24 |       60 |      75 |   66.07 | 40-52,59-71,83,148-156,172
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
 lib/utils             |   86.08 |    86.11 |     100 |   87.96 |
  date.ts              |   80.64 |      100 |     100 |   80.64 | 16-17,58-59,76-77
  debug.ts             |   82.75 |    78.37 |     100 |   86.79 | 25,42-45,107,128
  location.ts          |     100 |    91.66 |     100 |     100 | 90-94
-----------------------|---------|----------|---------|---------|----------------------------

Test Suites: 10 passed, 10 total
Tests:       74 passed, 74 total
Snapshots:   0 total
Time:        1.927 s, estimated 2 s
Ran all test suites.
```

## Current Coverage (as of latest test run)

| Category  | % Statements | % Branches | % Functions | % Lines |
| --------- | ------------ | ---------- | ----------- | ------- |
| All files | 38.7         | 47.6       | 41.32       | 38.82   |

## Completed Test Coverage

### Components

-   **Common Components**:
    -   ✅ LoadingSpinner (100% coverage)
    -   ✅ ErrorMessage (100% coverage)
-   **Event Components**:
    -   ✅ EventList (100% coverage)
    -   ✅ EventDetails (100% coverage)
    -   ✅ EventFilters (67.24% coverage)
        -   Remaining uncovered lines: 40-52, 59-71, 83, 148-156, 172
-   **Home Components**:
    -   ✅ CalendarSelector (100% coverage)
-   **Layout Components**:
    -   ❌ Footer (0% coverage)
    -   ❌ Header (0% coverage)
-   **Map Components**:
    -   ❌ MapContainer (0% coverage)
    -   ❌ MapMarker (0% coverage)
    -   ❌ MapPopup (0% coverage)

### Hooks

-   ✅ useEvents (98.48% coverage)
    -   Remaining uncovered lines: 65
-   ❌ useMap (0% coverage)

### Utilities

-   ✅ date.ts (80.64% coverage)
    -   Remaining uncovered lines: 16-17, 58-59, 76-77
-   ✅ debug.ts (82.75% coverage)
    -   Remaining uncovered lines: 25, 45, 107, 125-128
-   ✅ location.ts (100% coverage)

### API

-   ❌ calendar.ts (0% coverage)
-   ❌ geocoding.ts (0% coverage)

### Cache

-   ❌ filesystem.ts (0% coverage)
-   ❌ upstash.ts (0% coverage)

### App Pages

-   ❌ layout.tsx (0% coverage)
-   ❌ page.tsx (0% coverage)
-   ❌ home/page.tsx (0% coverage)
-   ❌ privacy/page.tsx (0% coverage)
-   ❌ terms/page.tsx (0% coverage)

## Next Steps for Testing

### Priority 1: Complete Component Testing

1. ✅ Create tests for EventFilters component (67.24% coverage achieved)
2. Create tests for Map components (MapContainer, MapMarker, MapPopup)
3. Create tests for Layout components (Header, Footer)

### Priority 2: Complete Hook Testing

1. Create tests for useMap hook

### Priority 3: API and Cache Testing

1. Create tests for API utilities (calendar.ts, geocoding.ts)
2. Create tests for Cache utilities (filesystem.ts, upstash.ts)

### Priority 4: App Pages Testing

1. Create tests for main app pages

## Testing Strategy

For components:

-   Test rendering with different props
-   Test user interactions
-   Test conditional rendering

For hooks:

-   Test initialization
-   Test state changes
-   Test error handling

For utilities:

-   Test all edge cases
-   Test error handling

For API:

-   Create mocks for external services
-   Test success and error paths

## Recent Improvements

-   Added test attributes to LoadingSpinner and ErrorMessage components
-   Created comprehensive tests for EventDetails and EventList components
-   Fixed failing tests in debug.test.ts and location.test.ts
-   Added tests for findLargestCity function in location utilities
-   Improved test coverage for date utilities
-   Created comprehensive tests for EventFilters component, covering search functionality, date range selection, and filter reset
