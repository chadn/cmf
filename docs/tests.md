# Test Coverage

This document makes it easy to see test coverage and compare against the [Directory Structure in Implementation.md](Implementation.md#directory-structure)

```
npm test && date
> calendar-map-filter@0.2.15 test
> jest --coverage
----------------------------|---------|----------|---------|---------|---------------------------------------------
File                        | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s                           
----------------------------|---------|----------|---------|---------|---------------------------------------------
All files                   |   79.63 |    67.98 |    80.6 |   80.56 |                                             
 components/common          |     100 |      100 |     100 |     100 |                                             
  ErrorMessage.tsx          |     100 |      100 |     100 |     100 |                                             
  LoadingSpinner.tsx        |     100 |      100 |     100 |     100 |                                             
 components/events          |   75.54 |    67.56 |   80.48 |    75.7 |                                             
  DateAndSearchFilters.tsx  |   61.84 |    48.21 |   69.23 |    62.5 | 67-95,122-144,204-261                       
  DateQuickButtons.tsx      |    91.3 |       75 |     100 |    91.3 | 47-48                                       
  EventDetails.tsx          |     100 |      100 |     100 |     100 |                                             
  EventList.tsx             |   82.05 |    78.04 |   80.95 |   81.57 | 38-39,134-136,161-163,188-190,217-219       
 components/home            |   80.55 |    66.66 |     100 |      80 |                                             
  EventsSourceSelector.tsx  |   80.55 |    66.66 |     100 |      80 | 35-39,46-47                                 
 components/layout          |     100 |      100 |     100 |     100 |                                             
  Footer.tsx                |     100 |      100 |     100 |     100 |                                             
  Header.tsx                |     100 |      100 |     100 |     100 |                                             
 components/map             |   91.35 |    79.51 |   93.75 |   93.79 |                                             
  MapContainer.tsx          |   89.41 |    78.94 |   89.47 |   90.12 | 91-92,137,163-165,256-258                   
  MapMarker.tsx             |   94.44 |    81.81 |     100 |     100 | 15,35                                       
  MapPopup.tsx              |   93.22 |    79.41 |     100 |   98.07 | 77                                          
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
 lib/events                 |   74.22 |    70.76 |   56.52 |   74.44 |                                             
  FilterEventsManager.ts    |   73.01 |    76.47 |   52.94 |   73.77 | 41-43,57-73,107,128,147,201-219             
  examples.ts               |     100 |      100 |     100 |     100 |                                             
  filters.ts                |      75 |    64.51 |   66.66 |      75 | 9-10,47,58,84-88,105                        
 lib/hooks                  |    59.7 |    35.29 |   68.96 |   58.28 |                                             
  useEventsManager.ts       |   49.19 |    34.95 |   56.66 |   46.95 | 82-87,99,104-123,133-181,199-225,236-256    
  useMap.ts                 |   76.62 |     37.5 |   82.14 |      80 | 18-25,122-128,139-143,170                   
 lib/utils                  |   80.07 |    71.67 |   85.26 |   81.32 |                                             
  calendar.ts               |   85.52 |     72.5 |     100 |   85.52 | 28-29,45,55,75,81,127-128,133-134,150       
  date-19hz-parsing.ts      |   88.18 |    83.87 |     100 |   87.96 | 68-82,281-283                               
  date-constants.ts         |     100 |      100 |     100 |     100 |                                             
  date.ts                   |   90.27 |    88.88 |     100 |   91.54 | 18-19,45,52-53,147                          
  icsParser.ts              |     100 |      100 |     100 |     100 |                                             
  location.ts               |   67.55 |    55.23 |   71.42 |      70 | 232,277,334-363,372-373,377,393-407,427-458 
  logr.ts                   |   71.18 |    67.44 |   91.66 |   70.17 | 39,68-93,113,160                            
  quickFilters.ts           |     100 |      100 |     100 |     100 |                                             
  timezones.ts              |   90.38 |    61.53 |   85.71 |   93.18 | 75,114-115                                  
  umami.ts                  |   52.63 |     37.5 |     100 |   52.94 | 13-17,30-33                                 
  utils-client.ts           |   52.94 |     64.7 |      60 |   53.06 | 10-41,59,63,94,113-114                      
  utils-shared.ts           |   85.29 |    72.72 |     100 |    87.5 | 27,46,48,50                                 
  venue-parsing.ts          |     100 |    86.66 |     100 |     100 | 19,56,82,139-143                            
 types                      |      75 |      100 |     100 |     100 |                                             
  events.ts                 |      75 |      100 |     100 |     100 |                                             
----------------------------|---------|----------|---------|---------|---------------------------------------------

Test Suites: 1 skipped, 28 passed, 28 of 29 total
Tests:       2 skipped, 344 passed, 346 total
Snapshots:   0 total
Time:        2.366 s
Ran all test suites.
Tue Sep  9 18:20:38 PDT 2025
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
