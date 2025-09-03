# Test Coverage

This document makes it easy to see test coverage and compare against the [Directory Structure in Implementation.md](Implementation.md#directory-structure)

```
npm test && date
> calendar-map-filter@0.2.9 test
> jest --coverage
...
----------------------------|---------|----------|---------|---------|----------------------------------------
File                        | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------------------------|---------|----------|---------|---------|----------------------------------------
All files                   |   81.38 |     72.2 |   82.19 |   82.16 |
 components/common          |     100 |      100 |     100 |     100 |
  ErrorMessage.tsx          |     100 |      100 |     100 |     100 |
  LoadingSpinner.tsx        |     100 |      100 |     100 |     100 |
 components/events          |   83.68 |    71.25 |   81.39 |   84.15 |
  DateAndSearchFilters.tsx  |   72.41 |       52 |   66.66 |   74.07 | 80-102,162-219
  DateQuickButtons.tsx      |   97.87 |    81.81 |     100 |   97.87 | 82
  EventDetails.tsx          |     100 |      100 |     100 |     100 |
  EventList.tsx             |   82.05 |    78.04 |   80.95 |   81.57 | 38-39,134-136,161-163,188-190,217-219
 components/home            |   88.37 |    66.66 |     100 |    87.8 |
  EventSourceSelector.tsx   |   88.37 |    66.66 |     100 |    87.8 | 35-39
 components/layout          |     100 |      100 |     100 |     100 |
  Footer.tsx                |     100 |      100 |     100 |     100 |
  Header.tsx                |     100 |      100 |     100 |     100 |
 components/map             |   93.05 |    83.33 |   96.42 |   94.61 |
  MapContainer.tsx          |   91.66 |    84.84 |   94.44 |    92.5 | 88-90,134,160-162
  MapMarker.tsx             |   94.44 |    81.81 |     100 |     100 | 15,35
  MapPopup.tsx              |   95.23 |    81.81 |     100 |   97.36 | 50
 components/ui              |   94.11 |    66.66 |      90 |     100 |
  button.tsx                |     100 |    66.66 |     100 |     100 | 45
  calendar.tsx              |    87.5 |       75 |   85.71 |     100 | 71,138-148
  slider.tsx                |     100 |    33.33 |     100 |     100 | 13
 lib                        |     100 |      100 |     100 |     100 |
  utils.ts                  |     100 |      100 |     100 |     100 |
 lib/api                    |   91.76 |    83.33 |   94.73 |   92.94 |
  geocoding.ts              |   91.76 |    83.33 |   94.73 |   92.94 | 50,81,119,153,284,312-314,358,383,425
 lib/api/eventSources/plura |   75.64 |    76.92 |      60 |   75.34 |
  types.ts                  |     100 |      100 |     100 |     100 |
  utils.ts                  |      75 |    76.92 |      60 |      75 | 71,91-92,100,148,157-191
 lib/events                 |   70.83 |    68.75 |   54.54 |   71.11 |
  FilterEventsManager.ts    |   67.74 |    72.72 |      50 |   68.85 | 41-43,57-73,98-100,105,125,144,195-213
  examples.ts               |     100 |      100 |     100 |     100 |
  filters.ts                |      75 |    64.51 |   66.66 |      75 | 9-10,47,58,84-88,105
 lib/hooks                  |   68.29 |    41.17 |   76.59 |   68.75 |
  useEventsManager.ts       |   62.65 |       40 |   76.47 |   61.72 | 53,57,61,108-124,136-158,189
  useMap.ts                 |   74.07 |    44.44 |   76.66 |   77.77 | 21-28,120-126,137-141,151-155,177
 lib/utils                  |   78.83 |    75.54 |    84.5 |   79.42 |
  date-constants.ts         |     100 |      100 |     100 |     100 |
  date-parsing.ts           |   88.18 |    83.87 |     100 |   87.96 | 67-81,280-282
  date.ts                   |   71.76 |       80 |   54.54 |    75.3 | 20-21,47,54-55,129-136,142-163,192
  icsParser.ts              |     100 |      100 |     100 |     100 |
  location.ts               |    83.8 |    78.26 |   92.59 |   83.73 | 232,277,355-386
  logr.ts                   |   71.18 |    67.44 |   91.66 |   70.17 | 39,68-93,113,159
  timezones.ts              |   90.38 |    61.53 |   85.71 |   93.18 | 75,114-115
  umami.ts                  |   52.63 |     37.5 |     100 |   52.94 | 13-17,30-33
  utils-client.ts           |   52.94 |     64.7 |      60 |   53.06 | 10-41,59,63,94,113-114
  utils-shared.ts           |   85.29 |    72.72 |     100 |    87.5 | 27,46,48,50
 types                      |      75 |      100 |     100 |     100 |
  events.ts                 |      75 |      100 |     100 |     100 |
----------------------------|---------|----------|---------|---------|----------------------------------------

Test Suites: 1 skipped, 25 passed, 25 of 26 total
Tests:       2 skipped, 286 passed, 288 total
Snapshots:   0 total
Time:        2.47 s
Ran all test suites.
Tue Sep  2 23:14:16 PDT 2025
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
-   Enhanced DateAndSearchFilters component with proper data-testid attributes for more robust testing
-   Updated CalendarSelector test to use the actual example calendar name "Geocaching in Spain"
-   Added proper null checks in the MapPopup component to prevent errors when selectedEventId is undefined
-   Improved the handling of optional props throughout components for better error resilience
-   All components now properly handle edge cases and optional properties
