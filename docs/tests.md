# Test Coverage

This document makes it easy to see test coverage and compare against the [Directory Structure in Implementation.md](Implementation.md#directory-structure)

```
npm test && date
> calendar-map-filter@0.2.2 test
> jest --coverage
...
----------------------------|---------|----------|---------|---------|----------------------------------------------------
File                        | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------------------------|---------|----------|---------|---------|----------------------------------------------------
All files                   |   78.65 |    72.32 |   84.92 |   79.25 |
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
 components/map             |   94.92 |    90.16 |   96.29 |    95.2 |
  MapContainer.tsx          |   94.11 |     90.9 |   94.44 |   93.82 | 88-90,160-162
  MapMarker.tsx             |   94.44 |    88.88 |     100 |     100 | 14
  MapPopup.tsx              |   97.14 |    89.47 |     100 |   96.87 | 49
 lib/api                    |   91.76 |    83.33 |   94.73 |   92.94 |
  geocoding.ts              |   91.76 |    83.33 |   94.73 |   92.94 | 50,81,119,153,284,312-314,358,383,425
 lib/api/eventSources       |   30.76 |        0 |      20 |   33.33 |
  index.ts                  |   30.76 |        0 |      20 |   33.33 | 17-20,34-38,47-70
 lib/api/eventSources/plura |   61.13 |    44.82 |   65.38 |   61.62 |
  index.ts                  |   96.92 |    78.94 |     100 |   96.82 | 24,115
  scraper.ts                |   32.53 |    21.66 |    37.5 |   33.88 | 28-127,150-151,160,163,170,199,208,215,223,238-299
  types.ts                  |     100 |      100 |     100 |     100 |
  utils.ts                  |   73.86 |    64.86 |      60 |   74.11 | 71,95-96,100-101,107,165-166,175-210
 lib/events                 |     100 |      100 |     100 |     100 |
  examples.ts               |     100 |      100 |     100 |     100 |
 lib/hooks                  |      80 |    38.46 |    90.9 |    85.1 |
  useMap.ts                 |      80 |    38.46 |    90.9 |    85.1 | 20-27,95-98
 lib/utils                  |   77.39 |    80.13 |    85.1 |   78.45 |
  date.ts                   |   69.76 |       76 |      50 |      75 | 19-20,46-47,121-128,134-155,168-169
  icsParser.ts              |     100 |      100 |     100 |     100 |
  location.ts               |      98 |    97.91 |     100 |   98.83 | 189
  logr.ts                   |      70 |     64.7 |     100 |   68.75 | 38,60-85
  umami.ts                  |    64.7 |     37.5 |     100 |   66.66 | 12,27-30
  utils-client.ts           |   31.03 |        0 |      50 |   32.14 | 9-38,56,60
  utils-shared.ts           |   85.71 |       80 |     100 |   85.18 | 25,44,46,48
----------------------------|---------|----------|---------|---------|----------------------------------------------------

Test Suites: 1 skipped, 23 passed, 23 of 24 total
Tests:       5 skipped, 248 passed, 253 total
Snapshots:   0 total
Time:        1.716 s, estimated 2 s
Ran all test suites.
Fri May 16 13:25:19 PDT 2025
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
