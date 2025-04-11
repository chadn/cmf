# Implementation

Implementation choices and reasoning are included here based on the [Product Spec](product.md) document.

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

## Directory Structure

```
/src
  /app                    # Next.js App Router structure
    /api                  # API routes
      /calendar           # Calendar API endpoints
        /route.ts         # API route handler for calendar data fetching and geocoding
      /info               # Info API endpoints
    /home                 # Home page route
    /privacy              # Privacy policy page
    /terms                # Terms of service page
    /page.tsx             # Main application page
    /layout.tsx           # Root layout
    /globals.css          # Global styles
    /error.tsx            # Global error boundary component
    /not-found.tsx        # Custom 404 page
    /loading.tsx          # Global loading state component
  /components             # React components (organized by domain)
    /map                  # Map-related components
      /MapContainer.tsx   # Main map component with MapLibre integration
      /MapMarker.tsx      # Event marker component with clustering support
      /MapPopup.tsx       # Popup for map markers with event details
    /events               # Event list and filtering components
      /EventList.tsx      # List of events with filtering
      /EventDetails.tsx   # Detailed view of an event
      /EventFilters.tsx   # Filtering controls
      /ActiveFilters.tsx  # Component to display active filters
      /DateQuickButtons.tsx  # Quick date selection buttons
      /DateRangeSelector.tsx # Date range selection component
    /layout               # Layout components
      /Header.tsx         # Application header with navigation
      /Footer.tsx         # Application footer with links
    /home                 # Home page components
      /CalendarSelector.tsx  # Calendar selection component with examples
    /common               # Reusable UI components
      /LoadingSpinner.tsx  # Loading indicator with customizable size
      /ErrorMessage.tsx   # Error display component with retry option
  /lib                    # Shared utilities and business logic
    /api                  # API client functions
      /calendar.ts        # Calendar API client for Google Calendar integration
      /geocoding.ts       # Geocoding API client with caching support
    /events               # Events
      /FilterEventsManager.ts   # FilterEventsManager Class managing logic, state, and functions
    /hooks                # Custom React hooks
      /useEventsManager.ts # Hook for event data fetching and filtering
      /useMap.ts          # Hook for map interactions and state management
    /utils                # Utility functions
      /date.ts            # Date formatting and calculation utilities
      /location.ts        # Location processing and filtering utilities
      /logr.ts            # Logging utility with rate limiting
    /cache                # Cache abstraction layer
      /index.ts           # Cache interface and provider selection
      /upstash.ts         # Upstash Redis implementation for production
      /filesystem.ts      # Filesystem implementation for development
  /types                  # TypeScript type definitions
    /events.ts            # Event-related types and interfaces
    /map.ts               # Map-related types for viewport and markers
    /api.ts               # API request and response types
  /middleware.ts          # Next.js middleware for request handling
  /styles
    /variables.css        # Global CSS variables for theming
/public                   # Static assets
  /images                 # Image assets
  /icons                  # Icon assets
/docs                     # Documentation
  /product.md             # Product specification with requirements
  /Implementation.md      # Implementation details and architecture decisions
  /tests.md               # Test coverage details
/next.config.js           # Next.js configuration
/tsconfig.json            # TypeScript configuration
/package.json             # Project dependencies
/postcss.config.js        # PostCSS configuration
/tailwind.config.js       # Tailwind CSS configuration
/.env.example             # Example environment variables
/README.md                # Project documentation
/jest.config.js           # Jest configuration for testing
/jest.setup.js            # Jest setup file with testing utilities
/.eslintrc.json           # ESLint configuration
/.prettierrc              # Prettier code formatting rules
/.github                  # GitHub workflows
  /workflows
    /ci.yml               # CI pipeline configuration
```

[View detailed test coverage](tests.md) of the codebase.

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

### 4. Server-Side Handling of Recurring Events

**Decision**: Expand recurring events server-side

**Reasoning**:

-   Simplifies client-side logic
-   Ensures consistent filtering behavior
-   Calendar API abstraction handles the complexity

## Event Filtering Implementation

The event filtering system uses a class-based architecture with clearly defined responsibilities:

### FilterEventsManager Class

A central class that encapsulates all event filtering logic and state:

**Event Collections**:

-   `events.all`: All events from the calendar (unfiltered)
-   `events.withLocations`: Events with successfully resolved locations
-   `events.withoutLocations`: Events with unresolved or unknown locations
-   `events.filtered`: Events that match all current filters (date, search, map bounds)

**Filter Methods**:

-   `setDateRange`: Apply date filtering
-   `setSearchQuery`: Apply text-based search filtering
-   `setMapBounds`: Apply geographic bounds filtering
-   `setShowUnknownLocationsOnly`: Toggle filtering for events with unknown locations
-   `resetAllFilters`: Clear all filter criteria

### useEventsManager Hook

A custom React hook that:

-   Initializes the FilterEventsManager instance
-   Fetches calendar data from the API
-   Returns structured event collections and filter methods
-   Provides metadata about the calendar and events

### Filter Types Implemented

1. **Date Filtering**: Events within a selected date range
2. **Text Search**: Case-insensitive search across event fields
3. **Map Bounds**: Events within the visible map viewport
4. **Unknown Locations**: Events with unresolved locations

### UI Integration

-   **EventFilters Component**: Provides UI controls for search and dates
-   **MapContainer**: Controls geographic bounds filtering
-   **ActiveFilters**: Shows applied filters with removal options

## Data Flow

1. User requests the application with a calendar ID
2. Server fetches calendar data and geocodes locations (using cache when available)
3. Server renders initial HTML with preloaded data
4. Client hydrates and initializes the map
5. User interactions trigger client-side filtering
6. Additional data fetched as needed via API routes

## Testing Strategy

Current test coverage: **27.04%** statements, **25.40%** branches, **29.25%** functions

### Well-Tested Components (>90%)

-   **MapPopup**: 97.22% line coverage
-   **DateQuickButtons**: 93.33% line coverage
-   **MapMarker**: 94.44% line coverage
-   **Layout components**: 100% line coverage
-   **Common components**: 100% line coverage

### Components Needing Coverage

-   **MapContainer**: 11.68% line coverage
-   **EventList**: 56% line coverage
-   **ActiveFilters**: 0% coverage

### Testing Priorities

1. Improve Map Component Testing (particularly MapContainer)
2. Complete Hook Testing (useMap and useEventsManager)
3. Add API and Cache Testing
4. Improve Event Components Testing
5. Add App Pages Testing

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
| Feature | Hobby | Pro |
| :---- | :---- | :---- |
| Edge Middleware Invocations | Up to 1,000,000 Invocations | 1,000,000 Invocations included |
| ISR Reads | Up to 1,000,000 Reads | 10,000,000 included |
| ISR Writes | Up to 200,000 | 2,000,000 included |
| Edge Requests | Up to 1,000,000 requests | 10,000,000 requests included |
| Projects | 200 | Unlimited |
| Serverless Function maximum duration | 10s (default) \- [configurable up to 60s](https://vercel.com/docs/functions/configuring-functions/duration) | 15s (default) \- [configurable up to 300s](https://vercel.com/docs/functions/configuring-functions/duration) |
| Build execution minutes | 6,000 | 24,000 |
| Team collaboration features | \- | Yes |
| Domains per project | 50 | Unlimited |
| Deployments per day | 100 | 6,000 |
| Analytics | \- | Limited |
| Email support | \- | Yes |
| [Vercel AI Playground models](https://sdk.vercel.ai/) | Llama, GPT 3.5, Mixtral | GPT-4, Claude, Mistral Large, Code Llama |
| [RBAC](https://vercel.com/docs/rbac/access-roles) available | N/A | [Owner](https://vercel.com/docs/rbac/access-roles#owner-role), [Member](https://vercel.com/docs/rbac/access-roles#member-role), [Billing](https://vercel.com/docs/rbac/access-roles#billing-role) |
| [Comments](https://vercel.com/docs/comments) | Available | Available for team collaboration |
| Log Drains | \- | [Configurable](https://vercel.com/docs/log-drains/configure-log-drains) (not on a trial) |
| Spend Management | N/A | [Configurable](https://vercel.com/docs/spend-management) |
| [Vercel Toolbar](https://vercel.com/docs/vercel-toolbar) | Available for certain features | Available |
| [Storage](https://vercel.com/docs/storage) | Blob (Beta) | Blob (Beta) |
| [Activity Logs](https://vercel.com/docs/observability/activity-log) | Available | Available |
| [Runtime Logs](https://vercel.com/docs/runtime-logs) | 1 hour of logs and up to 4000 rows of log data | 1 day of logs and up to 100,000 rows of log data |
| [DDoS Mitigation](https://vercel.com/docs/security/ddos-mitigation) | On by default. Optional [Attack Challenge Mode](https://vercel.com/docs/attack-challenge-mode). | On by default. Optional [Attack Challenge Mode](https://vercel.com/docs/attack-challenge-mode). |
| [Vercel WAF IP Blocking](https://vercel.com/docs/security/vercel-waf/ip-blocking) | Up to 10 | Up to 100 |
| [Vercel WAF Custom Rules](https://vercel.com/docs/security/vercel-waf/custom-rules) | Up to 3 | Up to 40 |
| Deployment Protection | [Vercel Authentication](https://vercel.com/docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication) | [Vercel Authentication](https://vercel.com/docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication), [Password Protection](https://vercel.com/docs/security/deployment-protection/methods-to-protect-deployments/password-protection) (Add-on), [Sharable Links](https://vercel.com/docs/security/deployment-protection/methods-to-bypass-deployment-protection/sharable-links) |
| [Deployment Retention](https://vercel.com/docs/security/deployment-retention) | Unlimited by default. | |
