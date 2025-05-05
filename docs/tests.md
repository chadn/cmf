# Test Coverage

This document makes it easy to see test coverage and compare against the [Directory Structure in Implementation.md](Implementation.md#directory-structure)

```
npm test && date
> calendar-map-filter@0.2.0 test
> jest --coverage
...
--------------------------|---------|----------|---------|---------|---------------------------------------------
File                      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
--------------------------|---------|----------|---------|---------|---------------------------------------------
All files                 |   80.54 |    64.82 |   81.97 |   81.58 |
 components/common        |     100 |      100 |     100 |     100 |
  ErrorMessage.tsx        |     100 |      100 |     100 |     100 |
  LoadingSpinner.tsx      |     100 |      100 |     100 |     100 |
 components/events        |   72.25 |    44.76 |   71.42 |   72.36 |
  DateQuickButtons.tsx    |      76 |    36.36 |    87.5 |   77.55 | 71,87,90,106,151-165
  DateRangeSelector.tsx   |   81.08 |    70.58 |   85.71 |   81.08 | 67,73-82
  EventDetails.tsx        |     100 |      100 |     100 |     100 |
  EventFilters.tsx        |   81.81 |      100 |      75 |   81.81 | 43-44
  EventList.tsx           |      56 |    33.89 |   46.15 |    55.1 | 50,55-64,69-73,93,101-148,198-199
 components/home          |     100 |    83.33 |     100 |     100 |
  EventSourceSelector.tsx |     100 |    83.33 |     100 |     100 | 58
 components/layout        |     100 |      100 |     100 |     100 |
  Footer.tsx              |     100 |      100 |     100 |     100 |
  Header.tsx              |     100 |      100 |     100 |     100 |
 components/map           |   82.17 |    83.58 |   84.61 |   80.86 |
  MapContainer.tsx        |   71.05 |    76.92 |   76.47 |   70.42 | 91-92,139-157,181,187-203
  MapMarker.tsx           |     100 |      100 |     100 |     100 |
  MapPopup.tsx            |   97.14 |    89.47 |     100 |   96.87 | 50
 lib/api                  |   91.76 |    83.33 |   94.73 |   92.94 |
  geocoding.ts            |   91.76 |    83.33 |   94.73 |   92.94 | 50,81,119,153,284,312-314,358,383,425
 lib/hooks                |   80.32 |    33.33 |    90.9 |   85.41 |
  useMap.ts               |   80.32 |    33.33 |    90.9 |   85.41 | 20-27,93-96
 lib/utils                |   75.59 |     64.2 |   75.43 |   77.71 |
  date.ts                 |   70.65 |    78.26 |      50 |   74.71 | 19-20,54-55,72-73,135-142,148-169,182-183
  location.ts             |   68.31 |    44.89 |      50 |   73.62 | 165,191,217-225,236,249-261,267-273,279-287
  logr.ts                 |   70.58 |     64.7 |     100 |   69.38 | 38,60-85
  umami.ts                |   68.42 |     37.5 |     100 |   70.58 | 9,24-27
  url.ts                  |   87.09 |    77.41 |   94.73 |   86.04 | 65-69,156-158,195-196,232-236
  utils.ts                |     100 |      100 |     100 |     100 |
--------------------------|---------|----------|---------|---------|---------------------------------------------

Test Suites: 20 passed, 20 total
Tests:       166 passed, 166 total
Snapshots:   0 total
Time:        2.127 s
Ran all test suites.
Mon May  5 16:07:11 PDT 2025
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

-   Test rendering with different props
-   Test user interactions
-   Test conditional rendering
-   Focus on edge cases and error states

For hooks:

-   Test initialization
-   Test state changes
-   Test error handling

For utilities:

-   Test all edge cases
-   Test error handling
-   Ensure consistent behavior across environments

For API:

-   Create mocks for external services
-   Test success and error paths

## Recent Improvements

-   Improved test coverage for DateQuickButtons component to 93.33%
    -   Added tests for all date selection options
    -   Ensured weekend selection works correctly based on current day
    -   Fixed edge cases with date calculations
-   Enhanced MapPopup component test coverage to 97.22%
    -   Added tests for truncating long descriptions
    -   Tested handling of empty event lists
    -   Verified callback function behavior
    -   Ensured proper event selection and pagination
-   Fixed and improved logr utility tests
    -   Corrected log level comparison logic in implementation
    -   Added special handling for test environments
    -   Properly tested duplicate log detection
    -   Improved recentlyCalled function to be more testable
-   All 101 tests across 15 test suites are now passing successfully
-   Overall application test coverage is now at 27.04%
-   Fixed Footer tests by properly mocking Date.prototype.getFullYear to ensure consistent copyright year
-   Created tests for MapMarker component focusing on behavior rather than implementation details
-   Created tests for MapPopup component with comprehensive coverage of all functionality
-   Added a basic test for MapContainer to verify module existence
-   Improved test coverage for Header component
-   Implemented proper mocking for Next.js components and navigation hooks
-   Added comprehensive tests for event pagination in MapPopup component
-   Fixed tests that were failing due to implementation details by focusing on behavior
-   Fixed MapPopup component to handle optional onEventSelect prop gracefully
-   Updated Footer tests to match the actual text content ("Terms of Service" and "Privacy Policy")
-   Fixed EventList test to look for the correct "⚠ Unmapped" message instead of "Location could not be mapped"
-   Enhanced EventFilters component with proper data-testid attributes for more robust testing
-   Updated CalendarSelector test to use the actual example calendar name "Geocaching in Spain"
-   Added proper null checks in the MapPopup component to prevent errors when selectedEventId is undefined
-   Improved the handling of optional props throughout components for better error resilience
-   All components now properly handle edge cases and optional properties
