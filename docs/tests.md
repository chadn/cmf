# Test Coverage

This document makes it easy to see test coverage and compare against the [Directory Structure in Implementation.md](Implementation.md#directory-structure)

```
npm test && date
> calendar-map-filter@0.2.2 test
> jest --coverage
...
----------------------------|---------|----------|---------|---------|---------------------------------------
File                        | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------------------------|---------|----------|---------|---------|---------------------------------------
All files                   |   78.13 |    74.38 |   84.12 |   78.63 |
 components/common          |     100 |      100 |     100 |     100 |
  ErrorMessage.tsx          |     100 |      100 |     100 |     100 |
  LoadingSpinner.tsx        |     100 |      100 |     100 |     100 |
 components/events          |    86.9 |    81.15 |   87.17 |   86.66 |
  DateQuickButtons.tsx      |      98 |    81.81 |     100 |   97.95 | 86
  DateRangeSelector.tsx     |   81.08 |    70.58 |   85.71 |   81.08 | 67,73-82
  EventDetails.tsx          |     100 |      100 |     100 |     100 |
  EventFilters.tsx          |     100 |      100 |     100 |     100 |
  EventList.tsx             |   78.78 |    81.52 |   77.77 |   78.46 | 64,93,119-121,146-148,173-175,201-203
 components/home            |   88.37 |    66.66 |     100 |    87.8 |
  EventSourceSelector.tsx   |   88.37 |    66.66 |     100 |    87.8 | 35-39
 components/layout          |   78.57 |       50 |      75 |      75 |
  Footer.tsx                |     100 |      100 |     100 |     100 |
  Header.tsx                |    62.5 |       25 |   66.66 |   57.14 | 32-34
 components/map             |    94.2 |     87.3 |   96.29 |    94.4 |
  MapContainer.tsx          |   92.85 |    87.87 |   94.44 |    92.5 | 88-90,134,160-162
  MapMarker.tsx             |   94.44 |    81.81 |     100 |     100 | 15,35
  MapPopup.tsx              |   97.22 |    89.47 |     100 |   96.96 | 50
 lib/api                    |   91.76 |    83.33 |   94.73 |   92.94 |
  geocoding.ts              |   91.76 |    83.33 |   94.73 |   92.94 | 50,81,119,153,284,312-314,358,383,425
 lib/api/eventSources/plura |    6.45 |        0 |       0 |    6.81 |
  types.ts                  |      50 |      100 |     100 |     100 |
  utils.ts                  |    4.49 |        0 |       0 |    4.65 | 21-212
 lib/events                 |     100 |      100 |     100 |     100 |
  examples.ts               |     100 |      100 |     100 |     100 |
 lib/hooks                  |   77.92 |       40 |   82.75 |   81.66 |
  useMap.ts                 |   77.92 |       40 |   82.75 |   81.66 | 20-27,117-123,134-138
 lib/utils                  |   77.91 |    79.35 |   86.27 |   78.82 |
  date.ts                   |   69.76 |       76 |      50 |      75 | 19-20,46-47,121-128,134-155,168-169
  icsParser.ts              |     100 |      100 |     100 |     100 |
  location.ts               |   97.32 |    92.98 |     100 |   97.91 | 42,223
  logr.ts                   |      70 |     64.7 |     100 |   68.75 | 38,60-85
  umami.ts                  |    64.7 |     37.5 |     100 |   66.66 | 12,27-30
  utils-client.ts           |   31.03 |        0 |      50 |   32.14 | 9-38,56,60
  utils-shared.ts           |   85.71 |       80 |     100 |   85.18 | 27,46,48,50
 types                      |     100 |      100 |     100 |     100 |
  events.ts                 |     100 |      100 |     100 |     100 |
----------------------------|---------|----------|---------|---------|---------------------------------------

Test Suites: 2 skipped, 21 passed, 21 of 23 total
Tests:       26 skipped, 212 passed, 238 total
Snapshots:   0 total
Time:        1.869 s, estimated 2 s
Ran all test suites.
Tue May 20 13:33:52 PDT 2025
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
