# Implementation

Implementation choices and reasoning are included here based on the [Product Spec](product.md) document.

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

MapLibre is good to start due to React and Typescript support.

## Outstanding questions

1. **Redux Usage Decision**:

    - **Recommendation**: For this application, Redux is likely unnecessary and would add complexity.
    - **Reasoning**: The application state can be effectively managed using React's Context API and hooks (useState, useReducer) for most components. The map state and event filtering can be handled with local component state and context providers. Next.js's built-in data fetching methods (getServerSideProps, SWR, or React Query) can handle API data without Redux.
    - **Alternative**: If we anticipate complex state interactions or need for middleware, we could use Redux Toolkit which simplifies Redux implementation.

2. **CSS Approach**:

    - **Recommendation**: Use CSS Modules with a minimal set of Tailwind utilities.
    - **Reasoning**: This combines the modularity and scoping of CSS Modules with the utility-first approach of Tailwind for common patterns. Global CSS variables can be defined in a base stylesheet for theming.
    - **Implementation**: Create a `styles` directory with component-specific modules and a `globals.css` for variables and reset styles.

3. **Geocoding Cache Storage**:

    - **Recommendation**: Use a combination of Redis for production and filesystem cache for development.
    - **Reasoning**: Redis provides fast in-memory access with persistence options, ideal for production. For development, a simple JSON file cache is sufficient.
    - **Implementation**: Create an abstraction layer for the cache that can switch between implementations based on environment.

4. **Handling Recurring Events**:

    - **Recommendation**: Expand recurring events server-side within the requested date range.
    - **Reasoning**: This simplifies client-side logic and ensures consistent filtering behavior.
    - **Implementation**: When fetching events, expand recurring events into individual instances before sending to the client.

5. **Error Handling Strategy**:
    - **Recommendation**: Implement graceful degradation with user-friendly error messages.
    - **Reasoning**: API calls to Google Calendar or geocoding services may fail, and the application should handle these failures without breaking.
    - **Implementation**: Create error boundaries for critical components and fallback UI states.

## Architecture Choices and Reasoning

### Overall Architecture

The application will follow a hybrid architecture with:

1. **Server Components**:

    - API routes for fetching calendar data
    - Server-side rendering for initial page load
    - Geocoding and caching logic

2. **Client Components**:
    - Interactive map (MapLibre)
    - Event filtering and display
    - UI interactions

### Directory Structure

```
/src
  /app                  # Next.js App Router structure
    /api                # API routes
      /calendar         # Calendar API endpoints
    /page.tsx           # Main application page
    /layout.tsx         # Root layout
  /components           # React components
    /map                # Map-related components
    /events             # Event list and filtering components
    /ui                 # Reusable UI components
  /lib                  # Shared utilities
    /api                # API client functions
    /geocoding          # Geocoding utilities
    /calendar           # Calendar data processing
  /types                # TypeScript type definitions
  /styles               # Global styles and CSS modules
/public                 # Static assets
```

### Data Flow

1. User requests the application with a calendar ID
2. Server fetches calendar data from Google Calendar API
3. Server geocodes event locations (using cached results when available)
4. Server renders initial HTML with preloaded data
5. Client hydrates the application and initializes the map
6. User interactions trigger client-side filtering and map updates
7. Additional data is fetched as needed via API routes

## Tech Stack Choices and reasoning

### Core Technologies

1. **Next.js**:

    - **Reasoning**: Provides server-side rendering, API routes, and optimized client-side navigation in one framework.
    - **Benefits**: Simplified deployment, built-in performance optimizations, and seamless integration of server and client code.

2. **TypeScript**:

    - **Reasoning**: Adds type safety and improves developer experience.
    - **Benefits**: Catches errors at compile time, improves code documentation, and enhances IDE support.

3. **React**:

    - **Reasoning**: Industry standard for building component-based UIs.
    - **Benefits**: Large ecosystem, excellent performance, and familiar to most developers.

4. **MapLibre GL JS**:
    - **Reasoning**: Open-source map rendering library with good TypeScript support.
    - **Benefits**: No usage restrictions, customizable styling, and good performance.
    - **Integration**: Will use `react-map-gl` which provides React bindings for MapLibre.

### State Management

1. **React Context + Hooks**:

    - **Reasoning**: Sufficient for this application's state management needs without Redux complexity.
    - **Implementation**: Create context providers for map state, event data, and filter state.

2. **SWR for Data Fetching**:
    - **Reasoning**: Provides caching, revalidation, and optimistic updates for API data.
    - **Benefits**: Reduces unnecessary refetching and improves perceived performance.

### Styling

1. **CSS Modules + Custom Properties**:

    - **Reasoning**: Provides component-scoped styles with global theming capabilities.
    - **Implementation**: Each component has its own `.module.css` file that imports variables from a global stylesheet.

2. **Minimal Tailwind Utilities**:
    - **Reasoning**: Speeds up development for common patterns without full framework overhead.
    - **Implementation**: Include only the utility classes we need rather than the full Tailwind framework.

### Server-Side

1. **Next.js API Routes**:

    - **Reasoning**: Simplifies server-side logic without requiring a separate backend.
    - **Implementation**: Create API routes for calendar data fetching and processing.

2. **Redis for Caching**:
    - **Reasoning**: Fast, in-memory data store with persistence options.
    - **Implementation**: Cache geocoded locations to reduce API calls and improve performance.

## Deployment Options Compared

### Vercel

-   **Pros**:

    -   Native Next.js support with optimal performance
    -   Automatic preview deployments for PRs
    -   Serverless functions included
    -   Edge functions for global performance
    -   Simple GitHub integration

-   **Costs**:

    -   Free tier: 100GB bandwidth, 100 serverless function executions per day
    -   Pro tier: $20/month (includes 1TB bandwidth, unlimited serverless function executions)

-   **Best for**: Next.js applications with moderate API usage

### Netlify

-   **Pros**:

    -   Easy deployment workflow
    -   Good CI/CD integration
    -   Serverless functions support

-   **Costs**:

    -   Free tier: 100GB bandwidth, 125K serverless function executions per month
    -   Pro tier: $19/month (includes 1TB bandwidth, 2M serverless function executions)

-   **Limitations**: Not as optimized for Next.js as Vercel

### AWS Amplify

-   **Pros**:

    -   Full AWS ecosystem integration
    -   Scalable infrastructure
    -   Flexible configuration options

-   **Costs**:

    -   Pay-as-you-go model, typically $0.01 per build minute, $0.15 per GB served
    -   Additional costs for Lambda functions, API Gateway, etc.

-   **Limitations**: More complex setup and management

### Digital Ocean App Platform

-   **Pros**:

    -   Predictable pricing
    -   Good performance
    -   More control than Vercel/Netlify

-   **Costs**:

    -   Starting at $5/month for static sites
    -   $10-15/month for apps with server components

-   **Limitations**: Less integrated with Next.js development workflow

### Recommendation

**Vercel** is the recommended deployment platform for this project because:

1. It's specifically optimized for Next.js applications
2. The serverless functions are well-suited for our API routes
3. The free tier is sufficient for development and initial production use
4. Deployment and CI/CD are seamless with GitHub integration
5. Edge functions can improve performance for global users

If cost becomes a concern as usage grows, we can reevaluate based on actual usage patterns and consider alternatives like self-hosting on Digital Ocean or AWS.
