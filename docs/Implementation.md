# Implementation

This document covers the technical implementation details for Calendar Map Filter (CMF). For architectural decisions and rationale, see [Architecture Decision Records (ADR)](adr/README.md).

## Table of Contents

-   [Quick Reference](#quick-reference)
-   [Architecture Overview](#architecture-overview)
-   [Directory Structure](#directory-structure)
-   [Key Data Structures and Data Flow](#key-data-structures-and-data-flow)
-   [Troubleshooting](#troubleshooting)
-   [Deployment Options](#deployment-options)

## Quick Reference

**Key Files for Development:**

-   `src/app/page.tsx` - Main application logic and state management
-   `src/lib/hooks/useEventsManager.ts` - Event data fetching and filtering
-   `src/lib/hooks/useMap.ts` - Map interactions and viewport management
-   `src/lib/events/FilterEventsManager.ts` - Core filtering logic
-   `src/components/map/MapContainer.tsx` - Map rendering and interaction

**Architecture Decisions:** See [ADR Index](adr/README.md)

More details in [Development Guide](development.md).

## Architecture Overview

The application follows a hybrid Next.js architecture:

**Server Components:**

-   API routes (`/api/events`, `/api/geocode`) for data fetching
-   Server-side rendering for initial page load
-   Geocoding cache using Upstash Redis (production) or filesystem (development)

**Client Components:**

-   Interactive MapLibre GL map with react-map-gl wrapper
-   Real-time event filtering via FilterEventsManager
-   UI interactions with shadcn/ui components

**Data Flow:**

```
URL Parameters → API Routes → Event Sources → Geocoding Cache → FilterEventsManager → UI Components
```

**Filtering Architecture:**

-   **Two-stage filtering**: Domain filters (date, search) → Viewport filter (map bounds)
-   **Domain filters** determine core event set, applied in FilterEventsManager
-   **Viewport filter** determines what's visible on map, applied separately
-   **Independent chip counts**: Each filter chip shows events hidden by that filter alone
-   **Map bounds interaction**: Setting bounds to `null` shows all domain-filtered events

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
    /events                     # Event management logic
      /FilterEventsManager.ts   # Core event filtering and counting
      /filters.ts               # Filter utility functions
      /examples.ts              # Example event sources and shortIds
    /hooks                      # Custom React hooks
      /useEventsManager.ts      # Event fetching, filtering, and state
      /useMap.ts                # Map viewport and marker management
      /useBreakpoint.ts         # Responsive breakpoint detection hook
    /state                      # State management
      /appStateReducer.ts       # Application state machine and actions
    /utils                      # Utility functions
      /date.ts                  # Date formatting and calculations
      /date-19hz-parsing.ts     # Date parsing for 19hz event source
      /date-constants.ts        # Date-related constants
      /date-nuqs.ts             # Date utilities for nuqs URL state management
      /headerNames.ts           # Dynamic header name determination utilities
      /icsParser.ts             # iCalendar format parsing
      /location.ts              # Location utilities and map bounds
      /logr.ts                  # Logging utility with rate limiting
      /quickFilters.ts          # Quick filter utilities for date ranges
      /timezones.ts             # Timezone detection and conversion
      /umami.ts                 # Analytics integration
      /utils-client.ts          # Client-side utilities
      /utils-shared.ts          # Shared utilities
    /utils.ts                   # Core utility functions

  /types                        # TypeScript type definitions
    /events.ts                  # Event, EventsSource, and filtering types
    /map.ts                     # Map-related types (viewport, bounds, markers)

/public                         # Static assets
  /favicon.ico                  # Site favicon

/__tests__                      # Test files throughout codebase
  # Test files mirror source structure with *.test.tsx pattern
```

**Test Coverage:** See [tests.md](tests.md) for current coverage statistics.

## Key Data Structures and Data Flow

### Core Data Structures

**CmfEvent** - Represents a calendar event with resolved location:

```typescript
interface CmfEvent {
    id: string
    name: string
    start: string // ISO datetime
    end: string // ISO datetime
    location: string
    resolved_location?: Location // Geocoded location data
    // ... additional fields
}
```

**EventsSource** - Unified event source configuration:

```typescript
interface EventsSource {
    prefix: string // Unique identifier (e.g., 'gc', '19hz')
    name: string // Display name
    url: string // Source URL
    id?: string // Runtime: specific source ID
    totalCount?: number // Runtime: event count
}
```

**FilteredEvents** - Event filtering results:

```typescript
interface FilteredEvents {
    allEvents: CmfEvent[]
    visibleEvents: CmfEvent[] // Events passing all filters
    hiddenCounts: {
        // Independent filter counts
        byMap: number
        bySearch: number
        byDate: number
        byLocationFilter: number
    }
}
```

### Data Flow

**1. Initial Load:**

```
URL params → useEventsManager → API /events → Event Sources → Raw events
→ Geocoding (with cache) → CmfEvents → FilterEventsManager → FilteredEvents
→ useMap → Map markers → UI render
```

**2. User Interactions:**

```
Map interaction → useMap.setBounds → page.handleBoundsChange
→ FilterEventsManager.getFilteredEvents(viewport) → UI updates

Filter change → useEventsManager → FilterEventsManager.setFilter
→ getFilteredEvents → UI updates

Event selection → useMap.setSelectedMarkerId → Map highlight + popup
```

**3. Event Source Integration:**

```
Event Source Handler → API endpoint (/api/events?id=source:id)
→ Fetch events → Transform to CmfEvent format → Geocode locations
→ Cache results → Return EventsSourceResponse
```

## URL Parsing

Note llz is short for lat,lon,zoom. For details on all URL Params, see [types/urlparams.d.ts](../src/types/urlparams.d.ts)

App parses URL in the following order:
1. `es` triggers event load on map page. No es, or invalid es, goes to home page.
1. Apply any domain filters: search `sq`, date `qf` (soon: `fsd` + `fed`, which overwrites qf if qf also present)
1. If se and valid event id: act like user clicked on event (highlight on event list, show marker, zoom in).  No more parsing.
1. If se and not valid: act like se wasn't present, remove from url, console log warning, and continue.
1. If llz and es only: update map based on llz coordinates, check the llz checkbox.
1. Update map based on events visible. If domain filters leave only 2 markers, zoom to those 2 markers. If no domain filters, zoom to fit all events.

URL Parsing and Updating Guidelines and Reasoning
- Prioritize map to be useful for finding events over using map to share map-specific stuff.
- llz in URL is not ideal, since llz can lead to different map for different devices, since devices have different map sizes
- llz is still cool, so show in URL if llz checkbox checked
- if qf=next7days or sq=berkeley reduces events to a few, map will zoom in to those - makes map useful.
- when map has se, qf, or sq, the lat/lon/zoom will not be in URL - 
 

## Troubleshooting

### Common Issues and Solutions

**Map not loading:**

-   Check `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` in environment variables
-   Verify MapLibre GL CSS is loaded in layout.tsx
-   Check browser console for WebGL support

**Events not appearing:**

-   Verify API keys in `.env.local` (Google Calendar, Maps)
-   Check `/api/events` endpoint in Network tab
-   Verify event source format: `prefix:id` (e.g., `gc:calendar@gmail.com`)

**Geocoding failures:**

-   Check `GOOGLE_MAPS_API_KEY` has Geocoding API enabled
-   Monitor quotas in Google Cloud Console
-   Check cache hit rates in server logs

**Filter not working:**

-   Verify FilterEventsManager state in React DevTools
-   Check viewport bounds are being passed correctly
-   Ensure filter dependencies in useMemo are correct

**Performance issues:**

-   Check event count - optimize for <1000 events per source
-   Monitor map marker rendering performance
-   Verify useMemo dependencies are stable

### Debug Tools

**Client-side debugging:**

```javascript
// In browser console - access event data
window.cmfDebug = {
    events: filteredEvents.allEvents,
    visible: filteredEvents.visibleEvents,
    bounds: currentViewportBounds,
}
```

**Server-side logging:**

-   Set `NODE_ENV=development` for detailed logs
-   Check Vercel function logs for API issues
-   Monitor Upstash Redis usage in dashboard

**React DevTools:**

-   Inspect `useEventsManager` and `useMap` hook states
-   Check component re-render causes
-   Profile performance with React Profiler

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
