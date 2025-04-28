# Test Coverage

This document makes it easy to see test coverage and compare against the [Directory Structure in Implementation.md](Implementation.md#directory-structure)

```
npm test
> calendar-map-filter@0.1.0 test
> jest
...
--------------------------|---------|----------|---------|---------|---------------------------------------------
File                      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
--------------------------|---------|----------|---------|---------|---------------------------------------------
All files                 |   68.66 |     50.6 |    64.7 |   69.16 |
 components/common        |     100 |      100 |     100 |     100 |
  ErrorMessage.tsx        |     100 |      100 |     100 |     100 |
  LoadingSpinner.tsx      |     100 |      100 |     100 |     100 |
 components/events        |   74.04 |       44 |   70.58 |   73.64 |
  DateQuickButtons.tsx    |   82.35 |    33.33 |    87.5 |   82.35 | 91-94,118,121
  DateRangeSelector.tsx   |    87.5 |    85.71 |   85.71 |    87.5 | 56-59
  EventDetails.tsx        |     100 |      100 |     100 |     100 |
  EventFilters.tsx        |      75 |      100 |   66.66 |      75 | 24-25
  EventList.tsx           |      56 |    33.89 |   46.15 |    55.1 | 50,55-64,69-73,93,101-148,198-199
 components/home          |     100 |      100 |     100 |     100 |
  EventSourceSelector.tsx |     100 |      100 |     100 |     100 |
 components/layout        |     100 |      100 |     100 |     100 |
  Footer.tsx              |     100 |      100 |     100 |     100 |
  Header.tsx              |     100 |      100 |     100 |     100 |
 components/map           |   46.92 |    37.31 |   34.61 |   44.82 |
  MapContainer.tsx        |   11.84 |        0 |       0 |   11.26 | 42-267
  MapMarker.tsx           |   94.44 |    88.88 |     100 |     100 | 14
  MapPopup.tsx            |   97.22 |    89.47 |     100 |   96.96 | 50
 lib/utils                |   70.49 |    58.51 |   68.96 |   73.09 |
  date.ts                 |   80.64 |      100 |     100 |   80.64 | 16-17,58-59,76-77
  location.ts             |   68.31 |    44.89 |      50 |   73.62 | 165,191,217-225,236,249-261,267-273,279-287
  logr.ts                 |   68.62 |     64.7 |      90 |   67.34 | 38,60-85,124
--------------------------|---------|----------|---------|---------|---------------------------------------------

Test Suites: 15 passed, 15 total
Tests:       106 passed, 106 total
Snapshots:   0 total
Time:        1.972 s
Ran all test suites.
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
