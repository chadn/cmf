# Test Coverage

This document makes it easy to see test coverage and compare against the [Directory Structure in Implementation.md](Implementation.md#directory-structure)

```
npm test && date
> calendar-map-filter@0.2.12 test
> jest --coverage
----------------------------|---------|----------|---------|---------|------------------------------------------
File                        | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------------------------|---------|----------|---------|---------|------------------------------------------
All files                   |   78.36 |    67.59 |   77.81 |   79.35 |
 components/common          |     100 |      100 |     100 |     100 |
  ErrorMessage.tsx          |     100 |      100 |     100 |     100 |
  LoadingSpinner.tsx        |     100 |      100 |     100 |     100 |
 components/events          |   83.68 |    71.25 |   81.39 |   84.15 |
  DateAndSearchFilters.tsx  |   72.41 |       52 |   66.66 |   74.07 | 80-102,162-219
  DateQuickButtons.tsx      |   97.87 |    81.81 |     100 |   97.87 | 82
  EventDetails.tsx          |     100 |      100 |     100 |     100 |
  EventList.tsx             |   82.05 |    78.04 |   80.95 |   81.57 | 38-39,134-136,161-163,188-190,217-219
 components/home            |   82.92 |    64.28 |     100 |   82.05 |
  EventsSourceSelector.tsx  |   82.92 |    64.28 |     100 |   82.05 | 35-39,46-47
 components/layout          |     100 |      100 |     100 |     100 |
  Footer.tsx                |     100 |      100 |     100 |     100 |
  Header.tsx                |     100 |      100 |     100 |     100 |
 components/map             |   91.72 |    80.28 |    93.1 |   93.12 |
  MapContainer.tsx          |   89.41 |    78.94 |   89.47 |   90.12 | 88-89,134,160-162,253-255
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
 lib/events                 |   71.57 |    68.25 |   54.54 |   71.91 |
  FilterEventsManager.ts    |   68.85 |    71.87 |      50 |      70 | 41-43,57-73,95-96,105,126,145,199-217
  examples.ts               |     100 |      100 |     100 |     100 |
  filters.ts                |      75 |    64.51 |   66.66 |      75 | 9-10,47,58,84-88,105
 lib/hooks                  |    59.7 |    35.29 |   68.96 |   58.62 |
  useEventsManager.ts       |   49.19 |    34.95 |   56.66 |   47.36 | 82-86,98,103-122,130-178,196-218,230-246
  useMap.ts                 |   76.62 |     37.5 |   82.14 |      80 | 18-25,122-128,139-143,170
 lib/utils                  |   75.25 |    70.89 |   75.94 |   76.68 |
  date-constants.ts         |     100 |      100 |     100 |     100 |
  date-parsing.ts           |   88.18 |    83.87 |     100 |   87.96 | 67-81,280-282
  date.ts                   |   71.76 |       80 |   54.54 |    75.3 | 20-21,47,54-55,129-136,142-163,192
  icsParser.ts              |     100 |      100 |     100 |     100 |
  location.ts               |   70.52 |    62.06 |   71.42 |   72.78 | 232,277,334-358,367,382-391,407-438
  logr.ts                   |   71.18 |    67.44 |   91.66 |   70.17 | 39,68-93,113,160
  timezones.ts              |   90.38 |    61.53 |   85.71 |   93.18 | 75,114-115
  umami.ts                  |   52.63 |     37.5 |     100 |   52.94 | 13-17,30-33
  utils-client.ts           |   52.94 |     64.7 |      60 |   53.06 | 10-41,59,63,94,113-114
  utils-shared.ts           |   85.29 |    72.72 |     100 |    87.5 | 27,46,48,50
 types                      |      75 |      100 |     100 |     100 |
  events.ts                 |      75 |      100 |     100 |     100 |
----------------------------|---------|----------|---------|---------|------------------------------------------

Test Suites: 1 skipped, 25 passed, 25 of 26 total
Tests:       2 skipped, 284 passed, 286 total
Snapshots:   0 total
Time:        2.209 s
Ran all test suites.
Mon Sep  8 12:41:30 PDT 2025
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
