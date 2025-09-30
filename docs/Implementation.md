# Implementation

This document covers the technical implementation details for Calendar Map Filter (CMF). For architectural decisions and rationale, see [Architecture Decision Records (ADR)](adr/README.md).

## Table of Contents

- [Quick Reference](#quick-reference)
- [Architecture Overview](#architecture-overview)
    - [Architecture Principles](#architecture-principles)
        - [Pure Functions (Services)](#pure-functions-services)
        - [React Hooks](#react-hooks)
        - [Utility Functions](#utility-functions)
- [Key Data Structures and Data Flow](#key-data-structures-and-data-flow)
    - [Core Data Structures](#core-data-structures)
    - [Data Flow: Application State Machine](#data-flow-application-state-machine)
    - [Data Flow: Server Processing Event Source](#data-flow-server-processing-event-source)
- [URL Parsing](#url-parsing)
    - [URL Parsing Guidelines and Reasoning](#url-parsing-guidelines-and-reasoning)
- [Directory Structure](#directory-structure)
- [Troubleshooting](#troubleshooting)
    - [Common Issues and Solutions](#common-issues-and-solutions)
    - [Debug Tools](#debug-tools)
- [Deployment Configuration](#deployment-configuration)
    - [Environment Variables Required](#environment-variables-required)
    - [Deployment Steps](#deployment-steps)
    - [Build Configuration](#build-configuration)

## Quick Reference

**Key Files for Development:**

- `src/lib/hooks/useAppController.ts` - **Smart Hook** - All business logic and state management (550+ lines)
- `src/app/page.tsx` - **Dumb Component** - Pure rendering with props only (~50 lines)
- `src/lib/services/urlProcessingService.ts` - Pure URL processing business logic
- `src/lib/services/appStateService.ts` - State machine transition validation
- `src/lib/hooks/useEventsManager.ts` - Event data fetching and filtering
- `src/lib/hooks/useMap.ts` - Map interactions and viewport management
- `src/lib/events/FilterEventsManager.ts` - Core filtering logic
- `src/components/map/MapContainer.tsx` - Map rendering and interaction

**Architecture Decisions:** See [ADR Index](adr/README.md)

More details in [Development Guide](development.md).

## Architecture Overview

The application follows a hybrid Next.js architecture.

The trickiest part is how the client React app loads and runs.

**Server Components:**

- API routes (`/api/events`, `/api/geocode`) for data fetching
- Server-side rendering for initial page load
- Geocoding cache using Upstash Redis (production) or filesystem (development)

**Client Components:**

- React app with complex state setup and running
- Interactive MapLibre GL map with react-map-gl wrapper
- Real-time event filtering via FilterEventsManager
- UI interactions with shadcn/ui components

**Filtering Architecture:**

- **Two-stage filtering**: Domain filters (date, search) → Map filter (map bounds)
- **Domain filters** determine core event set, applied in FilterEventsManager
- **Map filter** determines what's visible on map using MapBounds, applied separately
- **Independent chip counts**: Each filter chip shows events hidden by that filter alone

**Test Coverage:** See [tests.md](tests.md) for current coverage statistics.

### Architecture Principles

**Smart Hook / Dumb Component Pattern**

CMF now implements a **complete separation of business logic from UI rendering** using the Smart Hook / Dumb Component architecture pattern:

- **Services Layer** (`lib/services/`, `lib/utils/`) = Pure business logic functions, easily testable, no React dependencies
- **Smart Hook** (`lib/hooks/useAppController.ts`) = **ALL** React state management and business logic orchestration (~550 lines)
- **Dumb Components** (`app/page.tsx`, `components/*/`) = **ONLY** UI rendering with props, zero business logic (~50 lines for main page)
- **Specialized Hooks** (`lib/hooks/useEventsManager.ts`, `useMap.ts`) = Domain-specific React state management
- **Type System** (`types/`) = Consolidated interfaces with clean separation

**Benefits Realized:**

- **Single Source of Truth:** All business logic centralized in useAppController
- **Independent Testing:** Smart hook tested separately from UI components
- **Reusable Services:** Pure functions available to any component/hook
- **Clear Responsibilities:** Each layer has single, well-defined purpose

#### **Pure Functions (Services)**

- **Location:** `src/lib/services/`
- **When to create:** Business logic that needs independent testing
- **Examples:** `processDomainFilters()`, `shouldTransitionTo()`, `getStateRequirements()`

#### **React Hooks**

- **Location:** `src/lib/hooks/`
- **When to create:** React state management that uses services
- **Examples:** `useAppController()`, `useEventsManager()`, `useMap()`

#### **Utility Functions**

- **Location:** `src/lib/utils/`
- **When to use:** General-purpose functions used across the app
- **Examples:** `logr.info()`, `calculateBoundsFromViewport()`, `urlDateToIsoString()`

## Key Data Structures and Data Flow

### Core Data Structures

- **Events** defined in [types/events.ts](../src/types/events.ts), on server and client
    - `CmfEvent` object definiton below. Used on server when transforming from event sources, and on client in lists, map markers, and filters
    - `CmfEvents` object definiton below. Used on client, tracks allEvents and currently visibleEvents along with counts for filters
- **Maps** defined in [types/map.ts](../src/types/map.ts), on client
    - `MapViewport` - latitude, longitude, zoom
    - `MapBounds` - north, south, east, west boundaries in degrees for Map Container
    - `MapMarker` - latitude, longitude, id, events (cmfEvents at that marker's location)
    - `MapState` - viewport, bounds, markers, selectedMarkerId. The complete state of the map component.
- **Filters** defined in [types/events.ts](../src/types/events.ts), on client
    - `DomainFilters` - current date and search filters
    - No separate map filter, just uses `MapBounds` object
- **Timezones** can be tricky since some sources have times for events without timezone information.  In general, your browser knows your timezone, and web site can display times correctly for your timezone.  However, occasionally when scraping event data the event start time is the local time for that location.
    - Note [timezones.ts](../src/lib/utils/timezones.ts) has functions for server, uses luxon for timezones
    - All client date parsing and converting should be done via [date-fns library](https://github.com/date-fns/date-fns) or functions in [date.ts](../src/lib/utils/date.ts), where dates are converted to local timezone when calculating what day an isoTime is.
- **Other** on client
    - URL definitions in [types/urlparams.d.ts](../src/types/urlparams.d.ts) and parsing in [url-utils.ts](../src/lib/utils/url-utils.ts)

```typescript
export interface CmfEvent {
    id: string
    name: string
    original_event_url: string
    description: string // always exists, may be empty
    description_urls: string[] // always exists, may be empty. NOT USED: Consider removing.
    start: string // ISO string
    end: string // ISO string. Hack: if same as start, exact start time is not known. If 1 minute after start, end time is not known.
    tz?: string // ex: 'America/Los_Angeles'; 'UNKNOWN' if location not found, 'LOCAL' as temp timezone till can look up location
    location: string // always exists, may be empty, matches original_location
    src?: number // source index when 2 or more event sources: 1 for first source, 2 for second, etc.
    resolved_location?: Location {
        status: EventStatus
        original_location: string
        // the rest of these are only if status === 'resolved'
        formatted_address?: string
        lat?: number // latitude
        lng?: number // longitude
} }
export interface CmfEvents {
    allEvents: CmfEvent[]
    visibleEvents: CmfEvent[] // events that pass all filters
    hiddenCounts: {
        byMap: number
        bySearch: number
        byDate: number
        byLocationFilter: number
}   }
```

```typescript
export interface MapState {
    viewport: MapViewport // latitude, longitude, zoom
    bounds: MapBounds | null // north, south, east, west
    markers: MapMarker[]
    selectedMarkerId: string | null
}
export interface MapMarker {
    id: string // Unique identifier for the marker, typically based on coordinates
    latitude: number // Latitude position of the marker
    longitude: number // Longitude position of the marker
    events: CmfEvent[] // Array of events that occur at this location
}
```

```typescript
export interface DomainFilters {
    dateRange?: DateRangeIso {
      startIso: string // store as ISO, use date-fns/format to display in user's local timezone
      endIso: string   // store as ISO, use date-fns/format to display in user's local timezone
    }
    searchQuery?: string
    showUnknownLocationsOnly?: boolean
}
```

### Data Flow: Application State Machine

**State Machine Flow:**

```
export type AppState =
    | 'starting-app'          // When successfully parses es, before fetching events, should transition to fetching-events
    | 'fetching-events'       // SWR fetching events from API
    | 'processing-events'     // resetMapToVisibleEvents, header setup
    | 'applying-url-filters'  // DateAndSearchFilters processes date/search URL params
    | 'parsing-remaining-url' // Handle se, llz, auto-resize logic
    | 'finalizing-setup'      // Final transition before interaction (placeholder for tracking)
    | 'user-interactive'      // Normal user interaction mode, was 'main-state'

```

**Performance:** Complete progression from browser request to interactive state in ~2.5 seconds

**Smart Hook Architecture:**

```typescript
// useAppController.ts orchestrates the entire flow
function useAppController() {
  // Manages 8-state progression automatically
  // Delegates business logic to services
  // Returns clean interface for dumb components
  return { state, eventData, mapData, handlers, dispatch, hasEventSource }
}

// page.tsx just renders with props
function HomeContent() {
  const { state, eventData, mapData, handlers } = useAppController()
  return <div>pure rendering only</div>
}
```

### Data Flow: Server Processing Event Source

```
Event Source Handler on Client
  → API endpoint (/api/events?id=source:id)
  → Fetch events
  → Transform to CmfEvent format
  → Geocode locations
  → Cache results
  → Return EventsSourceResponse
```

## URL Parsing

Note: llz is short for lat,long,zoom. For details on all URL params, see [types/urlparams.d.ts](../src/types/urlparams.d.ts)

App parses URL in the following order

| appState                | URL Parsing                                                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `fetching-events`       | 1. `es` triggers event fetching on map page. No es, or invalid es, goes to home page                                                    |
| `applying-url-filters`  | 2. Apply any domain filters: search via `sq` and date via `qf` or `fsd` + `fed`, which override qf if qf is also present.               |
| `parsing-remaining-url` | 3. If `se` and it is a valid event id: act like user clicked on event (highlight on event list, show marker, zoom in). No more parsing. |
| `parsing-remaining-url` | 4. If `se` and not valid: act like se wasn't present, remove from URL, console log warning, and continue.                               |
| `parsing-remaining-url` | 5. If llz: update map based on llz coordinates, check the llz checkbox, update events visible without deviating from llz from URL.      |
| `parsing-remaining-url` | 6. If no llz and domain filters: zoom to visible events (e.g., if only 2 markers remain, zoom to those 2 markers)                       |
| `parsing-remaining-url` | 7. If no llz and no domain filters: zoom to fit all events                                                                              |

### URL Parsing Guidelines and Reasoning

- Prioritize map usefulness for finding events over sharing map-specific details
- llz in URL is not ideal since llz can lead to different map views on different devices due to varying screen sizes
- llz is still useful, so show in URL if llz checkbox is checked
- If qf=next7days or sq=berkeley reduces events to a few, map will zoom to those - makes map useful
- When map has se, qf, or sq active, lat/lon/zoom will not be in URL

## Directory Structure

```
/docs                           # Documentation
  /adr                          # Architecture Decision Records
/src
  /app                          # Next.js App Router
    /api                        # API routes
      /events                   # Events data endpoint
        /route.ts               # Main events API handler
      /geocode                  # Geocoding endpoint
      /info                     # System information endpoints
    /page.tsx                   # Main application page
    /layout.tsx                 # Root layout component
    /globals.css                # Global styles and CSS variables
    /loading.tsx                # Loading UI component
    /not-found.tsx              # 404 page component

  /components                   # React components by domain
    /common                     # Shared components
      /ErrorMessage.tsx         # Error display component
      /LoadingSpinner.tsx       # Loading indicator
    /events                     # Event-related components
      /EventList.tsx            # Sortable event table
      /EventDetails.tsx         # Event detail modal/popup
      /DateAndSearchFilters.tsx # Date range and search controls
      /DateQuickButtons.tsx     # Quick date selection buttons
    /home                       # Homepage-specific components
      /EventsSourceSelector.tsx  # Event source configuration UI
    /layout                     # Layout components
      /Header.tsx               # Application header
      /Footer.tsx               # Application footer
    /map                        # Map-related components
      /MapContainer.tsx         # Main map component (MapLibre integration)
      /MapMarker.tsx            # Custom map marker component
      /MapPopup.tsx             # Event popup on map
    /ui                         # Base UI components (shadcn/ui)
      /button.tsx               # Button component variants
      /calendar.tsx             # Calendar picker component
      /slider.tsx               # Range slider component

  /lib                          # Business logic and utilities
    /api                        # API client functions
      /geocoding.ts             # Google Maps geocoding with cache
      /eventSources/            # Event source integrations
        /19hz.ts                # 19hz.info music events
        /googleCalendar.ts      # Google Calendar integration
        /facebookEvents.ts      # Facebook events (via iCal)
        /protests.ts            # pol-rev.com protest events
        /dissent-google-sheets.ts # WeThePeopleDissent.net events
        /plura/                 # Plura community events (with scraper)
        /BaseEventSourceHandler.ts # Base class for event sources
        /README.md              # Event source development guide
    /cache                      # Cache abstraction layer
      /upstash.ts               # Upstash Redis implementation (production)
      /filesystem.ts            # Filesystem cache (development)
      /index.ts                 # Cache interface and factory
    /config                     # Configuration management
      /env.ts                   # Environment variable validation and types
    /events                     # Event management logic
      /FilterEventsManager.ts   # Core event filtering and counting
      /filters.ts               # Filter utility functions
      /examples.ts              # Example event sources and shortIds
    /hooks                      # Custom React hooks
      /useAppController.ts      # **SMART HOOK** - All business logic (~550 lines)
      /useEventsManager.ts      # Event fetching, filtering, and state
      /useMap.ts                # Map viewport and marker management
      /useBreakpoint.ts         # Responsive breakpoint detection hook
    /services                   # **NEW** - Pure business logic (no React)
      /urlProcessingService.ts  # URL parsing and validation functions
      /appStateService.ts       # State machine transition validation
    /state                      # State management
      /appStateReducer.ts       # Application state machine and actions (8 states)
    /utils                      # Utility functions
      /date.ts                  # Date formatting and calculations
      /date-19hz-parsing.ts     # Date parsing for 19hz event source
      /date-constants.ts        # Date-related constants
      /headerNames.ts           # Dynamic header name determination utilities
      /icsParser.ts             # iCalendar format parsing
      /location.ts              # Location utilities and map bounds
      /logr.ts                  # Logging utility with rate limiting
      /quickFilters.ts          # Quick filter utilities for date ranges
      /timezones.ts             # Timezone detection and conversion
      /umami.ts                 # Analytics integration
      /url-utils.ts             # URL parameter parsing and validation utilities
      /utils-client.ts          # Client-side utilities
      /utils-server.ts          # Server-side utilities
      /utils-shared.ts          # Shared utilities
      /venue-parsing.ts         # Venue parsing utilities
    /utils.ts                   # Core utility functions

  /types                        # TypeScript type definitions
    /events.ts                  # Event, EventsSource, and filtering types
    /map.ts                     # Map-related types (viewport, bounds, markers)
    /urlProcessing.ts           # **NEW** - URL processing and state transition types

/public                         # Static assets
  /favicon.ico                  # Site favicon

/__tests__                      # Test files throughout codebase
  # Test files mirror source structure with *.test.tsx pattern
```

## Troubleshooting

### Common Issues and Solutions

**Map not loading:**

- Check `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` in environment variables
- Verify MapLibre GL CSS is loaded in layout.tsx
- Check browser console for WebGL support

**Events not appearing:**

- Verify API keys in `.env.local` (Google Calendar, Maps)
- Check `/api/events` endpoint in Network tab
- Verify event source format: `prefix:id` (e.g., `gc:calendar@gmail.com`)

**Geocoding failures:**

- Check `GOOGLE_MAPS_API_KEY` has Geocoding API enabled
- Monitor quotas in Google Cloud Console
- Check cache hit rates in server logs

**Filter not working:**

- Verify FilterEventsManager state in React DevTools
- Check viewport bounds are being passed correctly
- Ensure filter dependencies in useMemo are correct

**Performance issues:**

- Check event count - optimize for <1000 events per source
- Monitor map marker rendering performance
- Verify useMemo dependencies are stable

### Debug Tools

**Client-side debugging:**

```javascript
// In browser console - access event data
window.cmfEvents = CmfEvents type
```

**Server-side logging:**

- Set `NODE_ENV=development` for detailed logs
- Check Vercel function logs for API issues
- Monitor Upstash Redis usage in dashboard

**React DevTools:**

- Inspect `useEventsManager` and `useMap` hook states
- Check component re-render causes
- Profile performance with React Profiler

## Deployment Configuration

**Deployment Platform Decision:** See [Vercel Deployment Platform ADR](adr/2025-05-20-vercel-deployment-platform.md) for rationale and alternatives.

### Environment Variables Required

```bash
# Google APIs
GOOGLE_MAPS_API_KEY=your_google_maps_key

# Upstash Redis Cache
UPSTASH_REDIS_REST_URL=your_upstash_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_token

# MapLibre/Mapbox
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token

# Optional: Analytics
NEXT_PUBLIC_UMAMI_WEBSITE_ID=your_umami_id
NEXT_PUBLIC_UMAMI_URL=your_umami_url
```

### Deployment Steps

1. **Connect Repository:** Link GitHub repository to Vercel project
2. **Environment Variables:** Configure secrets in Vercel dashboard
3. **Automatic Deployment:** Push to main branch triggers production deployment
4. **Preview Deployments:** Pull requests get preview URLs automatically

### Build Configuration

Vercel automatically detects Next.js and uses optimal build settings. Custom configuration via `vercel.json` if needed:

```json
{
    "functions": {
        "src/app/api/events/route.ts": {
            "maxDuration": 30
        }
    }
}
```

---

_For development setup and local running, see [development.md](development.md)_
_For user guide and features, see [usage.md](usage.md)_

# TEMP

OLD vs NEW states

```
  export type AppState =
 -    | 'events-init' // Fetching events from eventSource
 -    | 'events-loaded' // Events loaded, map markers can be generated
 -    | 'mapbounds-init' // Map component initialized, ready for domain filter processing
 -    | 'domain-filters-applied' // URL domain filters (date, search) processed and applied
 -    | 'url-processed' // All URL parameters processed (domain + map positioning)
 -    | 'mapbounds-calculated' // Map bounds calculated from filtered events and URL state
 -    | 'mapbounds-set' // Map bounds applied to filtering, ready for user interaction
 -    | 'main-state' // Normal user interaction mode

 +    | 'starting-app' // When successfully parses es, before fetching events, should transition to fetching-events
 +    | 'fetching-events' // SWR fetching events from API
 +    | 'processing-events' // resetMapToVisibleEvents, header setup
 +    | 'applying-url-filters' // DateAndSearchFilters processes date/search URL params
 +    | 'parsing-remaining-url' // Handle se, llz, auto-resize logic
 +    | 'finalizing-setup' // Final transition before interaction (placeholder for tracking)
 +    | 'user-interactive' // Normal user interaction mode
```
