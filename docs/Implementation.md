# Implementation

Implementation choices and reasoning are included here based on the [Product Spec](product.md) document.

## Table of Contents

-   [Quick Reference](#quick-reference)
-   [Architecture Overview](#architecture-overview)
-   [Directory Structure Summary](#directory-structure-summary)
-   [Key Architectural Decisions](#key-architectural-decisions)
    -   [State Management Without Redux](#1-state-management-without-redux)
    -   [CSS Implementation](#2-css-implementation)
    -   [Geocoding Cache Storage](#3-geocoding-cache-storage)
    -   [Map Filter Architecture](#4-map-filter-architecture-single-persisted-bounds--transient-viewport)
-   [Key Data Structures and Data Flow](#key-data-structures-and-data-flow)
-   [Complete Directory Structure](#directory-structure)
-   [Troubleshooting](#troubleshooting)
-   [Deployment Options](#deployment-options)

## Quick Reference

**Key Files for Development:**

-   `src/app/page.tsx` - Main application logic and state management
-   `src/lib/hooks/useEventsManager.ts` - Event data fetching and filtering
-   `src/lib/hooks/useMap.ts` - Map interactions and viewport management
-   `src/lib/events/FilterEventsManager.ts` - Core filtering logic
-   `src/components/map/MapContainer.tsx` - Map rendering and interaction

More in [Development Doc](development.md)

## Architecture Overview

The application follows a hybrid architecture with:

1. **Server Components**:

    - API routes for fetching calendar data
    - Server-side rendering for initial page load
    - Geocoding and caching logic using Upstash for Redis

2. **Client Components**:
    - Interactive map (MapLibre)
    - Event filtering and display
    - UI interactions

## Directory Structure Summary

Below are important files, for complete list see [Directory Structure](#directory-structure) below.

```
/docs                     # Documentation
/src
  /app                    # Next.js App Router structure
    /api                  # API routes
      /events             # Events API endpoint
        /route.ts         # API route handler for events data fetching
      /geocode            # Geocoding API endpoint
      /info               # Info API endpoints
    /page.tsx             # Main application page
  /components             # React components (organized by domain)
    /map                  # Map-related components
    /events               # Event list and filtering components
    /ui                   # UI component library (shadcn/ui based)
  /lib                    # Shared utilities and business logic
    /api                  # API client functions
      /geocoding.ts       # Geocoding API client with caching support
      /eventSources/      # Event source API integrations (19hz, Google Calendar, etc)
    /events               # Event management and filtering
      /FilterEventsManager.ts # Core event filtering logic
    /hooks                # Custom React hooks
      /useEventsManager.ts # Hook for event data fetching and filtering
      /useMap.ts          # Hook for map interactions and state management
    /utils                # Utility functions
    /cache                # Cache abstraction layer
      /upstash.ts         # Upstash Redis implementation for production
      /filesystem.ts      # Filesystem implementation for development
  /types                  # TypeScript type definitions
```

[View detailed test coverage](tests.md) of the codebase.

Note: Test files (`__tests__` directories) are intentionally omitted from this directory structure for clarity, though they exist throughout the codebase. Additional utility files, type definitions, and specialized components may exist but are not listed to maintain a clear overview of the primary architecture.

## Key Architectural Decisions

### 1. State Management Without Redux

**Decision**: Use React Context + Hooks instead of Redux

**Reasoning**:

-   The application state can be effectively managed using React's Context API and hooks
-   Map state and event filtering can be handled with local component state and context providers
-   Next.js's data fetching methods can handle API data effectively
-   Reduces complexity and bundle size

### 2. CSS Implementation

**Decision**: CSS Modules with minimal Tailwind utilities

**Reasoning**:

-   Combines the modularity and scoping of CSS Modules with utility-first approach
-   Global CSS variables for consistent theming
-   Component-specific styling with shared design system

### 3. Geocoding Cache Storage

**Decision**: Upstash for Redis (production) and filesystem cache (development)

**Reasoning**:

-   Upstash for Redis integrates seamlessly with Next.js and Vercel
-   Free tier (256MB) is sufficient for our expected cache size (~0.5MB for 1,000 locations)
-   Filesystem cache provides simple development experience
-   Abstraction layer enables easy switching between implementations

### 4. Map Filter Architecture (Single persisted bounds + transient viewport)

**Goals**:

-   Single concept: Map filter equals the current viewport (user or programmatic: init, fit‑to‑all, select event).
-   "Filtered by" Chip count semantics (independent per filter):
    -   Map chip = totalEvents − mapVisible. Aka events outside current viewport, independent of other filters
    -   Date chip = totalEvents − datePass
    -   Search chip = totalEvents − searchPass
    -   Unknown‑locations chip = totalEvents − unknownPass
-   Showing banner: “Showing X of Y events” where X = |mapVisible ∩ datePass ∩ searchPass ∩ unknownPass| and Y = totalEvents.
-   View updates: Any viewport change (user or programmatic) updates markers, visible list, Showing, and Map chip immediately.
-   Programmatic moves (init, fit-to-all, select event) should also update map viewport and everything else that relies on filtered events.
-   User-initiated map moves should update everything that relies on filtered events (markers, list, showing count, chips) without causing circular updates
-   Map filter has two modes: "Show All" (no viewport filtering) and "Viewport Filtering" (bounds applied as filter). User interactions switch to viewport filtering mode.

**Current Implementation**:

**Architecture Overview**:
The map filtering system uses a single-stage filtering model where domain filters (date, search, location type) and viewport filtering are applied independently to provide accurate chip counts while maintaining UI synchronization.

**Key Components**:

1. **FilterEventsManager** (`src/lib/events/FilterEventsManager.ts`):

    - Stores only domain filters: `dateRange`, `searchQuery`, `showUnknownLocationsOnly`
    - Does NOT store viewport bounds to prevent circular updates
    - Method signature: `getFilteredEvents(currentViewport?: MapBounds): FilteredEvents`
    - Applies viewport filter as parameter, not stored state

2. **Page State Management** (`src/app/page.tsx`):

    - Maintains local state: `const [currentViewportBounds, setCurrentViewportBounds] = useState<MapBounds | null>(null)`
    - **Show-All Mode Flag**: `const [isShowingAllEvents, setIsShowingAllEvents] = useState<boolean>(true)`
    - Passes conditional viewport: `currentViewport: isShowingAllEvents ? null : currentViewportBounds`
    - Synchronizes bounds between useMap and FilterEventsManager
    - Distinguishes between "show all" vs "viewport filtering" modes

3. **Map Hook** (`src/lib/hooks/useMap.ts`):
    - Manages transient viewport state and markers
    - Critical bounds synchronization in `resetMapToAllEvents()`:
        ```typescript
        if (bounds) {
            setBounds(bounds) // IMPORTANT: Notify parent component about the new bounds for filtering
        }
        ```

**Data Flow and Synchronization**:

```
User Action → Map Viewport Change → useMap.setBounds() → page.handleBoundsChangeForFilters(bounds, fromUserInteraction)
            → setCurrentViewportBounds(bounds) + setIsShowingAllEvents(false if user interaction)
            → useEventsManager(currentViewport: isShowingAllEvents ? null : currentViewportBounds)
            → FilterEventsManager.getFilteredEvents(viewport) → Filtered Events → UI Updates
```

**Critical Synchronization Points**:

1. **User Map Interaction**:

    - MapContainer `onBoundsChange(bounds, fromUserInteraction=true)` → useMap.setBounds → page.handleBoundsChangeForFilters
    - Sets `currentViewportBounds` and switches to viewport filtering mode (`isShowingAllEvents=false`)
    - New bounds passed to FilterEventsManager for viewport filtering
    - Immediate UI updates without circular loops

2. **Programmatic Map Reset** (resetMapToAllEventsAndShowAll):

    - Sets `isShowingAllEvents=true` to enter "Show All" mode
    - useMap calculates optimal bounds from all events
    - **Must call `setBounds(bounds)`** to notify parent component
    - Parent updates `currentViewportBounds` but viewport filtering is disabled due to show-all mode
    - All events shown regardless of viewport

3. **App Initialization**:
    - Events loaded → Markers generated → Optimal bounds calculated
    - Map positioned → Bounds synchronized → "Show All" mode active (shows all events)

**Chip Count Logic**:
Each filter calculates counts independently against ALL events:

-   Map chip = events outside current viewport (regardless of other filters)
-   Date chip = events outside date range (regardless of other filters)
-   Search chip = events not matching search (regardless of other filters)
-   Unknown locations chip = events with unresolved locations (regardless of other filters)

**Debugging Flow**:

When events don't appear on map, check this sequence:

1. Are events loaded? (`evts.allEvents.length`)
2. Are domain filters working? (`evts.filteredEvents` should be small)
3. Is viewport bounds correct? (Bay Area: `north: ~40.87, south: ~36.73`)
4. Is bounds synchronization working? (useMap.setBounds called and page.setCurrentViewportBounds updated)
5. Are final shown events populated? (`evts.shownEvents.length`)

Common failures:

-   `resetMapToAllEvents` calculates correct bounds but fails to call `setBounds(bounds)`, causing viewport filter to use wrong bounds and filter out all events.
-   Date/search filters not updating UI: Check that `filterVersion` counter is incremented in useEventsManager when filter setters are called.

**Benefits of Current Architecture**:

-   No circular update loops (viewport never stored in filter state)
-   Independent chip counts provide accurate user feedback
-   **Show-all mode flag** distinguishes user intent (show all vs filter by viewport)
-   Programmatic and user-initiated viewport changes handled uniformly
-   Single source of truth for filtering logic in FilterEventsManager
-   Clear separation between domain filters (persistent) and viewport filtering (transient)

## Key Data Structures and Data Flow

### Core Data Structures

1. **Events Pipeline**

    - `CmfEvent[]` → `MapMarker[]` → Map Rendering
    - Events at identical coordinates grouped into single markers with event lists

2. **State Machine**

    - `AppState`: Controls initialization sequence ('uninitialized' → 'events-init' → 'map-init' → 'main-state')
    - Prevents race conditions between events loading and map initialization

3. **Viewport & Bounds**
    - `MapViewport`: Controls map center (lat & lon) and zoom level
    - `MapBounds`: Represents visible map area for filtering events
        - sometimes calculated from markers then used along with width + height to create proper viewport for markers.
        - calculated from viewport (map moves) then used to filter markers
    - Map dimensions (width/height) captured after load to calculate optimal zoom level

### Data Flow

1. **Initialization Flow**

    - URL params loaded → Events fetched → Markers generated → Optimal bounds calculated → Map rendered

2. **User Interaction Flow**

    - Filter changes (date, search) → Update filtered events → Update markers/bounds → Update UI
    - Map interactions (zoom, pan) → Update bounds → Filter visible events → Update event list
    - Event selection via click → Find marker → Center map → Display popup

3. **Filter System**

    - Filter state managed by methods: `setSearchQuery()`, `setDateRange()`, `setMapBounds()`
    - Filters applied independently then combined for final event list
    - URL parameters maintain state for sharing and bookmarking

4. **Component Synchronization**

    - Event list updates when map bounds change
    - Map updates when filters or selected events change
    - URL updates reflect current application state
    - Event selection in list or on map keeps components in sync

5. **setViewport**

    - hooks/useMap.tsx - authoritative source for viewport and setViewport, used by app/page.ts
    - app/page.ts - handleEventSelect(), useEffect() when parsing url params on map-init, and passes to MapContainer.tsx
    - MapContainer.tsx - can setViewport via onViewportChange when use drags map around, aka Map onMove

## Directory Structure

```
/src
  /app                    # Next.js App Router structure
    /api                  # API routes
      /events             # Events API endpoint
        /route.ts         # API route handler for events data fetching
      /geocode            # Geocoding API endpoint
      /info               # Info API endpoints
    /home                 # Home page route
    /privacy              # Privacy policy page
    /terms                # Terms of service page
    /page.tsx             # Main application page
    /layout.tsx           # Root layout
    /globals.css          # Global styles
  /components             # React components (organized by domain)
    /map                  # Map-related components
      /MapContainer.tsx   # Main map component with MapLibre integration
      /MapMarker.tsx      # Event marker component with clustering support
      /MapPopup.tsx       # Popup for map markers with event details
    /events               # Event list and filtering components
      /EventList.tsx      # List of events with filtering
      /EventDetails.tsx   # Detailed view of an event
      /DateAndSearchFilters.tsx   # Filtering controls
      /ActiveFilters.tsx  # Component to display active filters
      /DateQuickButtons.tsx  # Quick date selection buttons
    /layout               # Layout components
      /Header.tsx         # Application header with navigation
      /Footer.tsx         # Application footer with links
    /home                 # Home page components
      /EventSourceSelector.tsx  # Event source selection component with examples
    /common               # Reusable UI components
      /LoadingSpinner.tsx  # Loading indicator with customizable size
      /ErrorMessage.tsx   # Error display component with retry option
    /ui                   # UI component library (shadcn/ui based)
      /button.tsx         # Button component
      /input.tsx          # Input component
      /slider.tsx         # Slider component for date ranges
      /calendar.tsx       # Calendar component
      /card.tsx           # Card component
  /lib                    # Shared utilities and business logic
    /api                  # API client functions
      /geocoding.ts       # Geocoding API client with caching support
      /eventSources/      # Event source API integrations
        /index.ts         # Export aggregator for event sources
        /19hz.ts          # 19hz.info electronic music events integration
        /dissent-google-sheets.ts # WeThePeopleDissent Google Sheets integration
        /facebookEvents.ts # Facebook Events integration
        /googleCalendar.ts # Google Calendar integration
        /plura.ts         # Plura community events integration
        /protests.ts      # Protests data source integration
        /plura/           # Plura-specific utilities and scraper
          /index.ts       # Plura main export
          /scraper.ts     # Web scraper for Plura events
          /utils.ts       # Plura-specific utility functions
          /types.ts       # Plura type definitions
          /cache.ts       # Plura caching utilities
    /events               # Event management and filtering
      /FilterEventsManager.ts # Core event filtering logic
      /filters.ts         # Individual filter functions (date, search, map, location type)
      /examples.ts        # Example event data for testing
    /hooks                # Custom React hooks
      /useEventsManager.ts # Hook for event data fetching and filtering
      /useMap.ts          # Hook for map interactions and state management
    /utils                # Utility functions
      /date.ts            # Date formatting and calculation utilities
      /date-constants.ts  # Date-related constants
      /date-parsing.ts    # Date parsing utilities for various formats
      /icsParser.ts       # ICS file parsing utilities
      /location.ts        # Location processing and filtering utilities
      /logr.ts            # Logging utility with rate limiting
      /timezones.ts       # Timezone handling utilities
      /umami.ts           # Umami analytics integration
      /utils-client.ts    # Client-side utility functions
      /utils-server.ts    # Server-side utility functions
      /utils-shared.ts    # Shared utility functions
      /utils.ts           # General utility functions and helpers (legacy)
    /cache                # Cache abstraction layer
      /index.ts           # Cache interface and provider selection
      /upstash.ts         # Upstash Redis implementation for production
      /filesystem.ts      # Filesystem implementation for development
  /scripts                # Utility scripts
      /upstash-redis.ts   # Redis setup and management script
  /types                  # TypeScript type definitions
    /events.ts            # Event-related type definitions
    /map.ts               # Map-related type definitions
    /googleApi.ts         # Google API type definitions
    /error.ts             # Error type definitions
    /umami.d.ts           # Umami analytics type definitions
    /urlparams.d.ts       # URL parameter type definitions
/public                   # Static assets
  /images                 # Image assets
  /icons                  # Icon assets
/docs                     # Documentation
  /product.md             # Product specification with requirements
  /Implementation.md      # Implementation details and architecture decisions (this file)
  /tests.md               # Test coverage details
  /usage.md               # User documentation and usage instructions
  /todo.md                # ToDo list and future enhancements
  /build_history.md       # Build history and changelog
  /development.md         # Development setup and guidelines
  /refactor.md            # Recent refactoring notes and lessons learned
  /prompts.txt            # AI prompt templates
/next.config.js           # Next.js configuration
/tsconfig.json            # TypeScript configuration
/package.json             # Project dependencies and scripts
/package-lock.json        # Locked dependency versions
/postcss.config.js        # PostCSS configuration
/tailwind.config.js       # Tailwind CSS configuration
/components.json          # shadcn/ui configuration
/.env.example             # Example environment variables
/README.md                # Project documentation
/AGENT.md                 # AI agent guidance (symlinked as CLAUDE.md and .cursorrules)
/jest.config.js           # Jest configuration for testing
/jest.setup.js            # Jest setup file with testing utilities
/jest-resolver.js         # Jest module resolver configuration
/.eslintrc.json           # ESLint configuration
/.github                  # GitHub workflows
  /workflows
    /ci.yml               # CI pipeline configuration
```

## Troubleshooting

### Common Issues and Solutions

**🔍 Events Not Loading**

1. Check API endpoint: Open browser dev tools → Network tab
2. Verify environment variables in `.env.local`
3. Check event source configuration in `src/lib/api/eventSources/index.ts`
4. Review server logs for API errors

**🗺️ Map Issues**

-   **Events not appearing on map**: Check the debugging flow in [Map Filter Architecture](#debugging-flow)
-   **Map bounds incorrect**: Verify `setBounds()` is called in `useMap.ts:resetMapToAllEvents()`
-   **"96 of 100" instead of "100 of 100"**: Ensure `isShowingAllEvents` flag is properly set

**🔍 Filter Issues**

-   **Date filters not working**: Check `filterVersion` counter increments in `useEventsManager.ts`
-   **Search not working**: Verify `filters.setSearchQuery()` updates filter state
-   **Map filter stuck**: Clear with "Clear Map Filter" or check viewport bounds synchronization

**🧪 Test Issues**

-   **Tests failing**: Run `npm test` to see detailed errors
-   **Coverage issues**: Check if new files need test coverage
-   **Build failing**: Run `npm run build` and check for TypeScript errors

**🚀 Development Setup**

-   **Port 3000 in use**: Next.js will automatically use 3001
-   **Environment variables**: Copy `.env.example` to `.env.local` and configure
-   **Redis cache issues**: Check Upstash configuration or use filesystem cache in development

### Debug Tools

**Browser Console Access:**

```javascript
// Access events data for debugging
window.eventsDebug.allEvents // All loaded events
window.eventsDebug.filteredEvents // Currently filtered events
window.eventsDebug.shownEvents // Events shown on UI
```

**Logging Levels:**

-   Set `LOG_LEVEL=DEBUG` in `.env.local` for detailed logs
-   Use `logr.info()`, `logr.warn()`, `logr.debug()` in code

## Deployment Options

### Recommended: Vercel

**Pros**:

-   Native Next.js support with optimal performance
-   Automatic preview deployments
-   Serverless functions included
-   Simple GitHub integration
-   Easy integration with Upstash for Redis

**Costs** (Hobby/Free tier):

-   Up to 1,000,000 Edge requests
-   Serverless functions with 10s maximum duration
-   6,000 build execution minutes
-   No team collaboration features

**Implementation Notes**:

-   Optimize geocoding operations to stay within serverless function duration limit
-   Implement request batching for efficient Edge request usage
-   Monitor build minutes during development

### Alternatives Considered

1. **Netlify**: Good deployment workflow but requires separate Redis service
2. **AWS Amplify**: Full AWS ecosystem but more complex setup
3. **Digital Ocean App Platform**: Predictable pricing but less integrated with Next.js

## Performance Optimizations

1. **Event Filtering**:

    - Memoized filter calculations
    - Efficient data structures
    - Separation of UI and data state

2. **Map Rendering**:

    - Optimized marker creation with unique IDs
    - Controlled viewport updates
    - Efficient marker filtering

3. **Data Loading**:
    - SWR for caching and revalidation
    - Parallel geocoding of locations
    - Progressive loading pattern

## Recent Improvements

1. **API Redesign**:

    - Structured hook return values
    - Intuitive naming conventions
    - Backward compatibility layer

2. **Error Handling**:

    - Comprehensive error handling
    - Fallbacks for missing data
    - Fixed binding issues

3. **Debugging**:

    - Rate-limited logging system (logr utility)
    - Context-aware error reporting
    - Improved debugging workflows

4. **Testing**:
    - Improved test coverage for key components
    - Fixed flaky tests with proper mocking
    - Focus on behavior rather than implementation

## Direction

As much as possible, the code, the files, and directory structure should be concise, modular, simple, and maintainable. Files and directories organized for easy understanding and easy to add or remove features.
In general, choose technologies that are stable, modular, and provide flexibility with common use cases made easy.

I would like to use React, Next.js and typescript. If redux makes sense then use it, explain why it may or may not be a good choice.
Whether use tailwind or not, create CSS modules per component, with global CSS variables that the modules read for global theming (e.g. colours or paddings).

API Keys are secret and cannot be stored on client side, so there must be code that runs on server. Make sure the server and client code are separated in different files and structured in src directories so that it is obvious.

Initially only provide support for google calendar, but code in a way that it will be easy to add support for microsoft outlook calendar in the future.
Geocoding Fallback should be simple - Find biggest city once in "Map of All Events" state.
Only the latest and most popular browsers for desktop and mobile should be supported.

Most calendars used will have less than 1,000 events, most of the time less than 100, so plan for that.
Performance does matter, should be quick to load as possible, take advantage of geocoding asynchrounously in parallel when initially processing calendar event feed.

Does not need to meet WCAG standards, it should be optimized for peformance, features, and code maintainability. If not extra work, make WCAG 2.2 Level A compliant.
Do not try to make map interactions WCAG compliant if it creates any nontrivial challenges.

In order to prevent abuse, do not provide server side API endpoint for geocoding.
Server should cache geocoded results - recommend best way to store.
The server code should just provide feed to cmf_events json, which can be streamed.
UPDATE: cmf_events json is not required.

MapLibre is good to start due to React and Typescript support.

### Latest Pricing

**March 2025 notes**:
Vercel KV is deprecated, instead use "Upstash for Redis" from Vercel Marketplace (https://vercel.com/marketplace/upstash)

**Pricing for "Upstash for Redis"** (as of March 2025):
https://upstash.com/docs/redis/overall/pricing

| Plan              | Free  | Pay-as-you-go | Fixed 250MB | Fixed 1GB |
| ----------------- | ----- | ------------- | ----------- | --------- |
| Price             | $0    | $0            | $10         | $20       |
| Read Region Price | $0    | $0            | $5          | $10       |
| Max Data Size     | 256MB | 100GB         | 250MB       | 1GB       |
| Max Bw GB Monthly | 10G   | Unlimited     | 50GB        | 100GB     |
| Max Req Per Sec   | 100   | 1000          | 1000        | 1000      |
| Max Request Size  | 1MB   | 1MB           | 1MB         | 1MB       |
| Max Record        | 100MB | 100MB         | 100MB       | 100MB     |
| Max Connections   | 100   | 1000          | 256         | 1000      |

**Pricing for Vercel** (as of March 2025):

Hobby is the Free tier, Pro is the cheapest paid tier.
https://vercel.com/docs/plans/hobby
Below is on a per month basis.

| Feature                                                                             | Hobby                                                                                                                                | Pro                                                                                                                                                                                                                                                                                                                                                                                                              |
| :---------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Edge Middleware Invocations                                                         | Up to 1,000,000 Invocations                                                                                                          | 1,000,000 Invocations included                                                                                                                                                                                                                                                                                                                                                                                   |
| ISR Reads                                                                           | Up to 1,000,000 Reads                                                                                                                | 10,000,000 included                                                                                                                                                                                                                                                                                                                                                                                              |
| ISR Writes                                                                          | Up to 200,000                                                                                                                        | 2,000,000 included                                                                                                                                                                                                                                                                                                                                                                                               |
| Edge Requests                                                                       | Up to 1,000,000 requests                                                                                                             | 10,000,000 requests included                                                                                                                                                                                                                                                                                                                                                                                     |
| Projects                                                                            | 200                                                                                                                                  | Unlimited                                                                                                                                                                                                                                                                                                                                                                                                        |
| Serverless Function maximum duration                                                | 10s (default) \- [configurable up to 60s](https://vercel.com/docs/functions/configuring-functions/duration)                          | 15s (default) \- [configurable up to 300s](https://vercel.com/docs/functions/configuring-functions/duration)                                                                                                                                                                                                                                                                                                     |
| Build execution minutes                                                             | 6,000                                                                                                                                | 24,000                                                                                                                                                                                                                                                                                                                                                                                                           |
| Team collaboration features                                                         | \-                                                                                                                                   | Yes                                                                                                                                                                                                                                                                                                                                                                                                              |
| Domains per project                                                                 | 50                                                                                                                                   | Unlimited                                                                                                                                                                                                                                                                                                                                                                                                        |
| Deployments per day                                                                 | 100                                                                                                                                  | 6,000                                                                                                                                                                                                                                                                                                                                                                                                            |
| Analytics                                                                           | \-                                                                                                                                   | Limited                                                                                                                                                                                                                                                                                                                                                                                                          |
| Email support                                                                       | \-                                                                                                                                   | Yes                                                                                                                                                                                                                                                                                                                                                                                                              |
| [Vercel AI Playground models](https://sdk.vercel.ai/)                               | Llama, GPT 3.5, Mixtral                                                                                                              | GPT-4, Claude, Mistral Large, Code Llama                                                                                                                                                                                                                                                                                                                                                                         |
| [RBAC](https://vercel.com/docs/rbac/access-roles) available                         | N/A                                                                                                                                  | [Owner](https://vercel.com/docs/rbac/access-roles#owner-role), [Member](https://vercel.com/docs/rbac/access-roles#member-role), [Billing](https://vercel.com/docs/rbac/access-roles#billing-role)                                                                                                                                                                                                                |
| [Comments](https://vercel.com/docs/comments)                                        | Available                                                                                                                            | Available for team collaboration                                                                                                                                                                                                                                                                                                                                                                                 |
| Log Drains                                                                          | \-                                                                                                                                   | [Configurable](https://vercel.com/docs/log-drains/configure-log-drains) (not on a trial)                                                                                                                                                                                                                                                                                                                         |
| Spend Management                                                                    | N/A                                                                                                                                  | [Configurable](https://vercel.com/docs/spend-management)                                                                                                                                                                                                                                                                                                                                                         |
| [Vercel Toolbar](https://vercel.com/docs/vercel-toolbar)                            | Available for certain features                                                                                                       | Available                                                                                                                                                                                                                                                                                                                                                                                                        |
| [Storage](https://vercel.com/docs/storage)                                          | Blob (Beta)                                                                                                                          | Blob (Beta)                                                                                                                                                                                                                                                                                                                                                                                                      |
| [Activity Logs](https://vercel.com/docs/observability/activity-log)                 | Available                                                                                                                            | Available                                                                                                                                                                                                                                                                                                                                                                                                        |
| [Runtime Logs](https://vercel.com/docs/runtime-logs)                                | 1 hour of logs and up to 4000 rows of log data                                                                                       | 1 day of logs and up to 100,000 rows of log data                                                                                                                                                                                                                                                                                                                                                                 |
| [DDoS Mitigation](https://vercel.com/docs/security/ddos-mitigation)                 | On by default. Optional [Attack Challenge Mode](https://vercel.com/docs/attack-challenge-mode).                                      | On by default. Optional [Attack Challenge Mode](https://vercel.com/docs/attack-challenge-mode).                                                                                                                                                                                                                                                                                                                  |
| [Vercel WAF IP Blocking](https://vercel.com/docs/security/vercel-waf/ip-blocking)   | Up to 10                                                                                                                             | Up to 100                                                                                                                                                                                                                                                                                                                                                                                                        |
| [Vercel WAF Custom Rules](https://vercel.com/docs/security/vercel-waf/custom-rules) | Up to 3                                                                                                                              | Up to 40                                                                                                                                                                                                                                                                                                                                                                                                         |
| Deployment Protection                                                               | [Vercel Authentication](https://vercel.com/docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication) | [Vercel Authentication](https://vercel.com/docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication), [Password Protection](https://vercel.com/docs/security/deployment-protection/methods-to-protect-deployments/password-protection) (Add-on), [Sharable Links](https://vercel.com/docs/security/deployment-protection/methods-to-bypass-deployment-protection/sharable-links) |
| [Deployment Retention](https://vercel.com/docs/security/deployment-retention)       | Unlimited by default.                                                                                                                |                                                                                                                                                                                                                                                                                                                                                                                                                  |
