# Changelog

All notable changes to Calendar Map Filter (CMF) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.14] - 2025-09-09

### Fixed

-   Quick filter URL parameters (`qf=next7days`, `qf=today`, etc.) now work correctly on page load
-   `qf=today` filter now correctly shows events for today instead of returning zero results
-   Date filtering now uses proper day boundaries (4:01am - 11:59pm), excludes late-night events from previous day

### Technical

-   Moved URL parameter handling from DateQuickButtons to DateAndSearchFilters component for proper timing during app initialization, see [adr](docs/adr/2025-09-09-fix-quick-filter-url-parameter-timing.md)
-   Refactored duplicate date boundary helper functions into shared utilities in `src/lib/utils/date.ts`
-   Updated test assertions to reflect new time boundary behavior (4:01am start instead of midnight)

## [0.2.13] - 2025-09-08

### Added

-   "Add To Cal" button in map popups to add events to Google Calendar or download .ics files for Apple Calendar
-   Support for 19hz events in many cities: LA, Chicago, Vegas, etc. (previously only SF Bay Area)
-   Facebook event links extracted and displayed in map popups as "FB Event" when available

### Changed

-   Date format now shows single digits without leading zeros (e.g., "9/5 Fri" instead of "09/05 Fri")
-   Home page examples now use direct links instead of buttons for easier navigation
-   "Show Only These" links in sidebar only appear when they would change the current view
-   Version info in About popover now includes git commit hash

### Fixed

-   Event list sorting by start date now works correctly
-   19hz events with ambiguous city names (like "Highland Park") now use regional context for proper geocoding

## [0.2.12] - 2025-09-08

### Added

-   "Show Only These" feature in Sidebar for quick filtering to specific event sources
    -   Direct links to filter to individual event sources (e.g., `/?es=gc:calendar123`)
    -   Improves user workflow for exploring events from specific sources

### Changed

-   EventSource renamed to EventsSource to resolve TypeScript conflict with browser's built-in EventSource interface
-   Updated type system throughout codebase to use unified EventsSource interface
-   Improved type safety with proper prefix property handling

### Fixed

-   TypeScript compilation errors related to EventSource type conflicts
-   Test expectations updated to match new EventsSource interface

### Documentation

-   Major restructure of Implementation.md - streamlined from 608 to 303 lines
    -   Removed redundant architectural decision details (moved to ADR)
    -   Simplified directory structure with cleaner formatting
    -   Updated data structure examples to reflect EventsSource changes
    -   Enhanced quick reference section with ADR links
-   Updated ADR index with improved organization and new entries
    -   Added historical ADRs for foundational decisions
    -   Reordered entries chronologically for better navigation
-   Cleaned up docs/README.md by removing outdated refactor.md references

## [0.2.11] - 2025-09-05

### Added

-   Comprehensive refactoring documentation in docs/refactor.md
-   Architecture Decision Records (ADR) in docs/adr/ following MADR template

### Changed

-   Type system consolidation and simplification
-   Unified EventsSource (orig EventSource) interface replacing multiple type representations
-   Simplified FilteredEvents structure from 7 arrays to 2 + metadata
-   Removed complex useReducer pattern in favor of direct state management
-   Consolidated EventSourceType + EventSourceResponseMetadata into EventsSource
-   Updated API responses from `metadata` to `source` field structure
-   Improved type consistency across 15 files in codebase

### Fixed

-   Resolved type system redundancy causing maintenance issues
-   Fixed test failures from type mismatches
-   Eliminated "Cannot read properties of undefined" errors in tests

## [0.2.10] - 2025-09-05

### Added

-   Support for multiple event sources via comma-separated URLs (es=A,B)
-   Event source popup showing detailed source information
-   Shorthand event source IDs for easier URL sharing
-   Clickable header name to display event sources popup

### Changed

-   Enhanced event source system with multiple source handling
-   Improved event source metadata display and management
-   Updated documentation for multiple event source usage

### Fixed

-   Minor code refactoring and cleanup for better maintainability

## [0.2.9] - 2025-09-03

### Added

-   Extensive test coverage for filtering components

### Changed

-   Comprehensive event filtering system refactor
-   New FilterEventsManager architecture for better performance
-   Enhanced map bounds synchronization system
-   Major refactor of filters, events list, and map bounds storage
-   Simplified event filtering logic for better maintainability
-   Improved performance through optimized data structures
-   Updated comprehensive documentation for new architecture

### Fixed

-   Fixed "96 of 100 events" bug on initial page load
-   Resolved map bounds synchronization issues
-   Fixed circular update loops in filtering system

## [0.2.8] - 2025-08-31

### Added

-   Support for 19hz.info electronic music events

### Fixed

-   Minor issues with new 19hz event integration
-   Improved event source handling

## [0.2.7] - 2025-08-15

### Added

-   About Popover showing app information, links, and timezone
-   ZIP code support in search box for map navigation
-   React resizable panels for adjustable UI layout
-   ShadCN UI components integration

### Changed

-   Major UI improvements with better spacing and layout
-   Enhanced calendar picker with larger fonts and horizontal quick buttons
-   Updated event list to remember previous sort preferences
-   Improved responsive design up to 1024px breakpoint

### Removed

-   UTC offset from map popover (now in About Popover)

## [0.2.6] - 2025-06-17

### Added

-   About Popover showing app information, links, and timezone
-   ZIP code support in search box for map navigation
-   React resizable panels for adjustable UI layout
-   Enhanced calendar picker with larger fonts and horizontal quick buttons
-   Event list remembers previous sort preferences

### Changed

-   Major UI improvements with better spacing and layout
-   Improved responsive design up to 1024px breakpoint
-   Updated event list to remember previous sort preferences

### Fixed

-   Removed UTC offset from map popover (now in About Popover)

## [0.2.5] - 2025-06-05

### Added

-   Support for dissent-google-sheets event source
-   Enhanced event source system architecture
-   Improved error handling with HttpError type

### Changed

-   Better handling of event sources with custom scrapers
-   Improved date and time parsing for various event formats

## [0.2.0] - 2025-05-20

### Added

-   Initial release of Calendar Map Filter
-   Google Calendar integration
-   Interactive map with MapLibre GL
-   Event filtering by date, search, and map viewport
-   Responsive design for desktop and mobile
-   Real-time event synchronization between map and list
-   Geocoding with Redis caching
-   URL parameter support for sharing filtered views

### Features

-   MapLibre GL interactive map with event markers
-   Sortable event list with multiple columns
-   Date range filtering with sliders and quick buttons
-   Search functionality across event names, descriptions, and locations
-   Map viewport filtering with automatic event updates
-   Event source system supporting multiple calendar types
-   Comprehensive test coverage with Jest and React Testing Library
-   Production deployment on Vercel with Upstash Redis caching

## [Unreleased]

### Planned

-   Favorite events with local storage
-   Additional protest event sources integration
-   Client-side event caching improvements
-   Map search box for location jumping
-   Festival mode with hourly time sliders
-   Event database with independent scraping tasks

For backlog, see [docs/todo](docs/todo.md)
