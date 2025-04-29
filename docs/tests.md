# Test Coverage

This document makes it easy to see test coverage and compare against the [Directory Structure in Implementation.md](Implementation.md#directory-structure)

```
npm test
> calendar-map-filter@0.2.0 test
> jest
...
--------------------------|---------|----------|---------|---------|---------------------------------------------
File                      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
--------------------------|---------|----------|---------|---------|---------------------------------------------
All files                 |   80.52 |    65.05 |   81.29 |   81.25 |
 components/common        |     100 |      100 |     100 |     100 |
  ErrorMessage.tsx        |     100 |      100 |     100 |     100 |
  LoadingSpinner.tsx      |     100 |      100 |     100 |     100 |
 components/events        |    75.8 |    45.78 |   71.87 |    75.4 |
  DateQuickButtons.tsx    |   92.59 |    54.54 |     100 |   92.59 | 67,69
  DateRangeSelector.tsx   |    87.5 |    85.71 |   85.71 |    87.5 | 56-59
  EventDetails.tsx        |     100 |      100 |     100 |     100 |
  EventFilters.tsx        |      75 |      100 |   66.66 |      75 | 24-25
  EventList.tsx           |      56 |    33.89 |   46.15 |    55.1 | 50,55-64,69-73,93,101-148,198-199
 components/home          |     100 |      100 |     100 |     100 |
  EventSourceSelector.tsx |     100 |      100 |     100 |     100 |
 components/layout        |     100 |      100 |     100 |     100 |
  Footer.tsx              |     100 |      100 |     100 |     100 |
  Header.tsx              |     100 |      100 |     100 |     100 |
 components/map           |   82.17 |    83.58 |   84.61 |   80.86 |
  MapContainer.tsx        |   71.05 |    76.92 |   76.47 |   70.42 | 91-92,139-157,181,187-203
  MapMarker.tsx           |     100 |      100 |     100 |     100 |
  MapPopup.tsx            |   97.14 |    89.47 |     100 |   96.87 | 50
 lib/api                  |   88.37 |    74.35 |   88.88 |   89.65 |
  geocoding.ts            |   88.37 |    74.35 |   88.88 |   89.65 | 39,52,90,124,178-179,222-224,253,268,285
 lib/hooks                |   80.32 |    33.33 |    90.9 |   85.41 |
  useMap.ts               |   80.32 |    33.33 |    90.9 |   85.41 | 20-27,93-96
 lib/utils                |   74.83 |     65.6 |   75.47 |   76.42 |
  date.ts                 |   63.04 |    91.66 |   42.85 |    65.9 | 18-19,53-54,71-72,82-90,96-102
  location.ts             |   68.31 |    44.89 |      50 |   73.62 | 165,191,217-225,236,249-261,267-273,279-287
  logr.ts                 |   70.58 |     64.7 |     100 |   69.38 | 38,60-85
  url.ts                  |   87.09 |    77.41 |   94.73 |   86.04 | 65-69,156-158,195-196,232-236
  utils.ts                |     100 |      100 |     100 |     100 |
--------------------------|---------|----------|---------|---------|---------------------------------------------

Test Suites: 20 passed, 20 total
Tests:       152 passed, 152 total
Snapshots:   0 total
Time:        2.377 s
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
