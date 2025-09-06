# Changelog

All notable changes to Calendar Map Filter (CMF) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.11] - 2025-09-05

### Added

-   Type system consolidation and simplification
-   Unified EventSource interface replacing multiple type representations
-   Simplified FilteredEvents structure from 7 arrays to 2 + metadata
-   Comprehensive refactoring documentation in docs/refactor.md
-   Architecture Decision Records (ADR) in docs/adr/ following MADR template

### Changed

-   Removed complex useReducer pattern in favor of direct state management
-   Consolidated EventSourceType + EventSourceResponseMetadata into EventSource
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

-   Comprehensive event filtering system refactor
-   New FilterEventsManager architecture for better performance
-   Enhanced map bounds synchronization system
-   Extensive test coverage for filtering components

### Changed

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
