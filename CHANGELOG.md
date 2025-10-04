# Changelog

All notable changes to Calendar Map Filter (CMF) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.8] - 2025-10-6

### Added

- **Mobilize Event Source** - New event source handler for Mobilize.us API supporting multiple organizations
    - Supports filtering by organization ID (e.g., `es=mobilize:nokings` for Oct 18 No Kings organization 42198)
    - Events include resolved locations from Mobilize API (latitude/longitude)
- **No Kings Event Source** - Direct event source `es=nokings:all` for No Kings protest events via Mobilize cache
    - Fetches from mobilize-feed-cache.vercel.app as defined in nokings.org
    - Alternative to using `mobilize:nokings`, mobilize has more fresh data

### Changed

- Skip geocoding for events that already have resolved locations
- Latitude/longitude should be limited to 6 decimal places (±4.3 inches precision)

### Technical

- Added `axios-curlirize` dependency for HTTP request debugging in development
- Enhanced logging to show geocoded/unique/total event counts

## [0.3.7] - 2025-10-3

### Changed

- Events Sources popup now has scroll bar, needed for es=19hz
- Festival support: Duration can be in mins
- Timezones - better organized and explained in docs, special temporary timezone constants UNKNOWN_TZ, CONVERT_UTC_TO_LOCAL are more clear.
- Fixed headerNames, enforced max length of 22 chars on event sources (can still click to view full length)
- date slider on mobile was too close to edge, gave a little padding (mx-2)
- better error logging if axios.isAxiosError() when fetching from event sources

### Added

- `es=dissent:oct18nokings` for Oct 18 No Kings WeThePeopleDissent.net
- `update-location` to `npm run cache` in order to edit lat/lng (and more) for a location.  

## [0.3.6] - 2025-10-1

### Changed

- es=19hz now defaults to all north american cities. 
- fixed e2e tests to always pass.
- include version on homepage, bottom left.

### Technical

- **Performance monitoring** - Removed PerformanceMonitor from 0.3.5, Updated code to not impact performance, kept some improvements and put monitoring behind env.ENABLE_PERFORMANCE_MONITORING
- **Performance testing** - Added comparative testing framework to prove optimizations before keeping them
    - Kept valuable optimizations: single-pass filtering in getCmfEvents, conditional performance monitoring, state change detection

## [0.3.5] - 2025-10-1

### Technical

- Added Performance improvements and monitoring, see [adr/2025-10-01-single-pass-filtering-optimization.md](docs/adr/2025-10-01-single-pass-filtering-optimization.md)
- Updated to latest `npx update-browserslist-db@latest`
- Improved latLongIsInBounds() to work correctly near antimeridian (new zealand), used by isInBounds() used by isInBounds() used by applyMapFilter()

## [0.3.4] - 2025-10-1

### Fixed

- Improved 19hz defaultState logic so Cambrige Mass is chosen over Cambrige Great Britain.
- Made foopee stable - parsing event improved, date times are fixed, and /api/events for foopee now properly supports timeMin, timeMax.
- "Skipping duplicate events", like when 19hz has same event under multiple cities. Fixes warnings in chrome.

### Added

- Ability to "Report Incorrect Location" in the marker popup's "Add To Cal" mini popup
- `react-toastify` to replace alert() with non-blocking alerts.

## [0.3.3] - 2025-09-29

### Fixed

- Timezones and times are now being proplerly managed in 19hz.
- Example event sources properly processed.

### Added

- **testSource** - New Event Source with fake test events for E2E testing
- Marker Popup with event details now shows Timezone (PST/PDT) next to time.

## [0.3.2] - 2025-09-25

### Added

- **foopee** - New Event Source for music in SF Bay area
- support for `skipCache=1` parameter to `/api/events` to bypass redis cache

## [0.3.1] - 2025-09-25

### Fixed

- **Date Filter Display Bug** - Fixed date filters from URL parameters (qf, fsd, fed) not updating calendar UI properly
- **Performance Issues** - Optimized expensive date formatting and parsing operations that were causing forced reflows
- **Test Interface Compatibility** - Updated DateQuickButtons and DateAndSearchFilters tests to match current component interfaces
- **State Synchronization** - Resolved redundant state management between URL processing and user interactions

### Changed

- **Smart Hook Architecture** - Improved useUrlProcessor with state-aware priority logic separating initialization from user-interactive states
- **Date Operations Optimization** - Memoized date formatting and pre-parsed date objects to eliminate render-blocking operations
- **Component Interface Cleanup** - Simplified DateQuickButtons interface by removing deprecated setStartValue/setEndValue props

## [0.3.0] - 2025-09-24

### Added

- **Playwright E2E Testing Infrastructure** - Complete browser testing with console log monitoring covering all URL parsing scenarios
- **Smart Hook/Dumb Component Architecture** - New `useAppController` hook with complete business logic separation
- **Centralized URL Processing Hook** - New `useUrlProcessor` smart hook handles all URL parameter processing across three phases
- **8-State Application State Machine** - Comprehensive state management with automatic transitions from `events-init` to `user-interactive`
- **Services Layer Architecture** - New `urlProcessingService.ts` and `appStateService.ts` with pure business logic functions
- [Selected Events Exception](docs/usage.md#selected-events-exception) creates a better user experience, introduces tricky logic
- Enhanced date filtering and quick filter system - added `fsd` and `fed` that behave like `qf` url parameter
- Comprehensive manual tests and improved test coverage
- Enhanced date timezone utilities in `src/lib/utils/timezones.ts`
- New `src/lib/config/env.ts` for centralized environment configuration
- New comprehensive URL utilities in `src/lib/utils/url-utils.ts` with extensive test coverage

### Changed

- **BREAKING**: Major architectural refactor - `page.tsx` reduced from 440 lines to 50 lines with complete business logic extraction
- **BREAKING**: Major refactor focusing on URL parsing and visible events functionality. `llz` replaces `lat`, `lon`, and `z`
- **State Management Overhaul** - Replaced scattered useRef flags with centralized 8-state machine and Redux-style patterns
- **Component Architecture** - All components transformed to pure rendering with props-only interfaces
- **Type System Improvements** - New `appState.ts` and `urlProcessing.ts` types with consolidated interfaces
- **URL Parameter Consolidation** - Components now receive `CurrentUrlState` objects instead of individual URL parameters
- Improved URL parameter handling with better parsing and validation
- Renamed type `FilteredEvents` to `CmfEvents`, and instance of that is now usually `cmfEvents` (was `evts`, `cmf_evts`, etc)
- Updated `DomainFilters` to have `DateRangeIso` type with `startIso` and `endIso` to reinforce these should be ISO strings in UTC
- Use date-fns/format everywhere to display in user's local timezone, or to compute day boundaries
- Fixed bug where iso-like string was created with date-fns/format (in local timezone) but had Z on end, implying UTC
- Refactored location utilities for better performance and maintainability
- Updated sidebar layout and event filtering interface
- Consolidated utilities across client, server, and shared modules
- Added params to function `resetMapToVisibleEvents({ useBounds: true, mapBounds: mapBounds })` to handle map reset in different scenarios

### Removed

- Removed `src/lib/utils/date-nuqs.ts` (functionality moved to other modules)
- Removed `docs/build_history.md` (details of using AI to build initially are not relevant to current state)

### Technical

- **Major Performance Improvements** - 2.5 second load time with complete state machine progression
- **Testing Infrastructure Expansion** - 750+ test cases for date utilities, comprehensive E2E test coverage
- **Architecture Quality** - Perfect separation of concerns with services → smart hook → dumb components pattern
- **Build System Enhancement** - All TypeScript strict mode compliance, clean compilation
- Significant improvements to test coverage with new URL utilities tests and Manual Testing guidance
- Enhanced error handling and type safety throughout the application
- Improved documentation in Implementation.md, tests.md, usage.md and other files
- Better separation of concerns in utility modules
- More robust date and timezone handling
- Using function modules instead of classes
- Standardizing on using `prettier` to prettify, aka format programmatically, all files. See `src/scripts/setup-hooks.sh` for example pre-commit hook

### Notes

- All tests pass (unit and E2E) with comprehensive URL parsing scenario coverage
- Major milestone achieved with complete architectural transformation while preserving 100% functionality

## [0.2.17] - 2025-09-15

### Added

- "Add llz in URL" checkbox in CMF popover menu to control latitude/longitude/zoom URL parameters

### Technical

- Change scripts/upstash-redis to make it easier to fix locations
- Minor tweaks to formatting, etc.

## [0.2.16] - 2025-09-12

### Added

- Added `resetMapToVisibleEvents()` function to zoom map to show only currently filtered events
- Added `appStateReducer.ts`, for AppState machine with proper Redux-style patterns with reducer, action creators and type guards
- Added `useBreakpoint.ts` hook extracted from page.tsx for reusability
- Added `headerNames.ts` utility for determining dynamic header names
- Added URL Parsing rules to Implementation.md to guide code and make it more understandable

### Changed

- **BREAKING**: Major refactor of application state management from scattered useRef flags to centralized AppState machine
- Improved URL parameter processing with consistent timing for date and search filters
- Simplified component interfaces by consolidating URL parameter handling
- Enhanced type safety with proper TypeScript types for URL parameters and actions
- Refactored `DateAndSearchFilters` component to handle both date and search URL parameters during initialization

### Technical

- URL parsing now follows documented 6-step sequence with proper state transitions
- Eliminated race conditions between domain filters (date/search) and viewport handling
- Added comprehensive test coverage for new `useMap` hook functionality
- Updated Jest configuration to include coverage reporting
- Improved code maintainability by simplifying 500+ line page.tsx and moving functionality to other files, some new.

## [0.2.15] - 2025-09-09

### Fixed

- Fixed critical bug where shared URLs with filters showed 0 results due to invalid map bounds at zoom level 0
- Map now uses minimum zoom level 1 instead of 0 to prevent MapLibre GL from generating invalid viewport bounds
- Default map bounds for empty marker sets now cover a reasonable world area instead of invalid (0,0,0,0) coordinates
- Re-enabled Umami analytics tracking after restoring auto-paused supabase db

### Technical

- Updated `viewportUrlToViewport` (0.2.16 renamed `llzToViewport`) to use zoom 1 as minimum instead of problematic zoom 0
- Modified `calculateBoundsFromMarkers` to return reasonable world bounds when no markers exist

## [0.2.14] - 2025-09-09

### Fixed

- Quick filter URL parameters (`qf=next7days`, `qf=today`, etc.) now work correctly on page load
- `qf=today` filter now correctly shows events for today instead of returning zero results
- Date filtering now uses proper day boundaries (4:01am - 11:59pm), excludes late-night events from previous day

### Technical

- Moved URL parameter handling from DateQuickButtons to DateAndSearchFilters component for proper timing during app initialization, see [adr](docs/adr/2025-09-09-fix-quick-filter-url-parameter-timing.md)
- Refactored duplicate date boundary helper functions into shared utilities in `src/lib/utils/date.ts`
- Updated test assertions to reflect new time boundary behavior (4:01am start instead of midnight)

## [0.2.13] - 2025-09-08

### Added

- "Add To Cal" button in map popups to add events to Google Calendar or download .ics files for Apple Calendar
- Support for 19hz events in many cities: LA, Chicago, Vegas, etc. (previously only SF Bay Area)
- Facebook event links extracted and displayed in map popups as "FB Event" when available

### Changed

- Date format now shows single digits without leading zeros (e.g., "9/5 Fri" instead of "09/05 Fri")
- Home page examples now use direct links instead of buttons for easier navigation
- "Show Only These" links in sidebar only appear when they would change the current view
- Version info in About popover now includes git commit hash

### Fixed

- Event list sorting by start date now works correctly
- 19hz events with ambiguous city names (like "Highland Park") now use regional context for proper geocoding

## [0.2.12] - 2025-09-08

### Added

- "Show Only These" feature in Sidebar for quick filtering to specific event sources
    - Direct links to filter to individual event sources (e.g., `/?es=gc:calendar123`)
    - Improves user workflow for exploring events from specific sources

### Changed

- EventSource renamed to EventsSource to resolve TypeScript conflict with browser's built-in EventSource interface
- Updated type system throughout codebase to use unified EventsSource interface
- Improved type safety with proper prefix property handling

### Fixed

- TypeScript compilation errors related to EventSource type conflicts
- Test expectations updated to match new EventsSource interface

### Documentation

- Major restructure of Implementation.md - streamlined from 608 to 303 lines
    - Removed redundant architectural decision details (moved to ADR)
    - Simplified directory structure with cleaner formatting
    - Updated data structure examples to reflect EventsSource changes
    - Enhanced quick reference section with ADR links
- Updated ADR index with improved organization and new entries
    - Added historical ADRs for foundational decisions
    - Reordered entries chronologically for better navigation
- Cleaned up docs/README.md by removing outdated refactor.md references

## [0.2.11] - 2025-09-05

### Added

- Comprehensive refactoring documentation in docs/refactor.md
- Architecture Decision Records (ADR) in docs/adr/ following MADR template

### Changed

- Type system consolidation and simplification
- Unified EventsSource (orig EventSource) interface replacing multiple type representations
- Simplified FilteredEvents (now called CmfEvents) structure from 7 arrays to 2 + metadata
- Removed complex useReducer pattern in favor of direct state management
- Consolidated EventSourceType + EventSourceResponseMetadata into EventsSource
- Updated API responses from `metadata` to `source` field structure
- Improved type consistency across 15 files in codebase

### Fixed

- Resolved type system redundancy causing maintenance issues
- Fixed test failures from type mismatches
- Eliminated "Cannot read properties of undefined" errors in tests

## [0.2.10] - 2025-09-05

### Added

- Support for multiple event sources via comma-separated URLs (es=A,B)
- Event source popup showing detailed source information
- Shorthand event source IDs for easier URL sharing
- Clickable header name to display event sources popup

### Changed

- Enhanced event source system with multiple source handling
- Improved event source metadata display and management
- Updated documentation for multiple event source usage

### Fixed

- Minor code refactoring and cleanup for better maintainability

## [0.2.9] - 2025-09-03

### Added

- Extensive test coverage for filtering components

### Changed

- Comprehensive event filtering system refactor
- New FilterEventsManager architecture for better performance
- Enhanced map bounds synchronization system
- Major refactor of filters, events list, and map bounds storage
- Simplified event filtering logic for better maintainability
- Improved performance through optimized data structures
- Updated comprehensive documentation for new architecture

### Fixed

- Fixed "96 of 100 events" bug on initial page load
- Resolved map bounds synchronization issues
- Fixed circular update loops in filtering system

## [0.2.8] - 2025-08-31

### Added

- Support for 19hz.info electronic music events

### Fixed

- Minor issues with new 19hz event integration
- Improved event source handling

## [0.2.7] - 2025-08-15

### Added

- About Popover showing app information, links, and timezone
- ZIP code support in search box for map navigation
- React resizable panels for adjustable UI layout
- ShadCN UI components integration

### Changed

- Major UI improvements with better spacing and layout
- Enhanced calendar picker with larger fonts and horizontal quick buttons
- Updated event list to remember previous sort preferences
- Improved responsive design up to 1024px breakpoint

### Removed

- UTC offset from map popover (now in About Popover)

## [0.2.6] - 2025-06-17

### Added

- About Popover showing app information, links, and timezone
- ZIP code support in search box for map navigation
- React resizable panels for adjustable UI layout
- Enhanced calendar picker with larger fonts and horizontal quick buttons
- Event list remembers previous sort preferences

### Changed

- Major UI improvements with better spacing and layout
- Improved responsive design up to 1024px breakpoint
- Updated event list to remember previous sort preferences

### Fixed

- Removed UTC offset from map popover (now in About Popover)

## [0.2.5] - 2025-06-05

### Added

- Support for dissent-google-sheets event source
- Enhanced event source system architecture
- Improved error handling with HttpError type

### Changed

- Better handling of event sources with custom scrapers
- Improved date and time parsing for various event formats

## [0.2.0] - 2025-05-20

### Added

- Initial release of Calendar Map Filter
- Google Calendar integration
- Interactive map with MapLibre GL
- Event filtering by date, search, and map viewport
- Responsive design for desktop and mobile
- Real-time event synchronization between map and list
- Geocoding with Redis caching
- URL parameter support for sharing filtered views

### Features

- MapLibre GL interactive map with event markers
- Sortable event list with multiple columns
- Date range filtering with sliders and quick buttons
- Search functionality across event names, descriptions, and locations
- Map viewport filtering with automatic event updates
- Event source system supporting multiple calendar types
- Comprehensive test coverage with Jest and React Testing Library
- Production deployment on Vercel with Upstash Redis caching

## [Unreleased]

### Planned

- Favorite events with local storage
- Additional protest event sources integration
- Client-side event caching improvements
- Map search box for location jumping
- Festival mode with hourly time sliders
- Event database with independent scraping tasks

For backlog, see [docs/todo](docs/todo.md)
