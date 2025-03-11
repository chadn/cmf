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

    - **Recommendation**: Use Upstash for Redis (via Vercel Marketplace) for production and filesystem cache for development.
    - **Reasoning**:
        - Vercel KV is deprecated before March 2025, replaced by Upstash for Redis in the Vercel Marketplace
        - Upstash for Redis integrates seamlessly with Next.js and Vercel deployment
        - Free tier includes 256MB storage and 10GB monthly bandwidth (sufficient for our needs)
        - No additional service to configure or manage
        - For development, a simple JSON file cache is sufficient
    - **Implementation**: Create an abstraction layer for the cache that can switch between implementations based on environment.
    - **Cost Analysis** (as of March 2025, per provided information):
        - Estimated cache size for 1,000 unique locations: ~0.5MB
        - Estimated monthly operations: <100,000
        - Upstash for Redis free tier (256MB) is sufficient for our needs
        - No additional cost beyond Vercel hosting

4. **Handling Recurring Events**:

    - **Recommendation**: Expand recurring events server-side within the requested date range.
    - **Reasoning**: This simplifies client-side logic and ensures consistent filtering behavior.
    - **Implementation**: When fetching events, expand recurring events into individual instances before sending to the client.

5. **Error Handling Strategy**:
    - **Recommendation**: Implement graceful degradation with user-friendly error messages.
    - **Reasoning**: API calls to Google Calendar or geocoding services may fail, and the application should handle these failures without breaking.
    - **Implementation**: Create error boundaries for critical components and fallback UI states.

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

## Architecture Choices and Reasoning

### Overall Architecture

The application will follow a hybrid architecture with:

1. **Server Components**:

    - API routes for fetching calendar data
    - Server-side rendering for initial page load
    - Geocoding and caching logic using Upstash for Redis

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
    /cache              # Cache abstraction (Vercel KV for prod, filesystem for dev)
  /types                # TypeScript type definitions
  /styles               # Global styles and CSS modules
/public                 # Static assets
```

### Data Flow

1. User requests the application with a calendar ID
2. Server fetches calendar data from Google Calendar API
3. Server geocodes event locations (using cached results from Upstash for Redis when available)
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

2. **Upstash for Redis**:
    - **Reasoning**: Redis-based key-value store available through Vercel Marketplace.
    - **Benefits**: Seamless integration with Next.js, free tier available, serverless-friendly.
    - **Implementation**: Use the Upstash client library to interact with the Redis store from API routes.

## Deployment Options Compared

### Vercel

-   **Pros**:

    -   Native Next.js support with optimal performance
    -   Automatic preview deployments for PRs
    -   Serverless functions included
    -   Edge functions for global performance
    -   Simple GitHub integration
    -   Easy integration with Upstash for Redis via Marketplace

-   **Costs** (as of March 2025, per provided information):

    -   **Hobby (Free) tier**:
        -   Up to 1,000,000 Edge Middleware invocations
        -   Up to 1,000,000 Edge requests
        -   Serverless functions with 10s maximum duration (configurable up to 60s)
        -   6,000 build execution minutes
        -   100 deployments per day
        -   1 hour of runtime logs retention
        -   No team collaboration features
    -   **Pro tier** (pricing not specified, but typically around $20/month):
        -   10,000,000 Edge requests included
        -   Serverless functions with 15s maximum duration (configurable up to 300s)
        -   24,000 build execution minutes
        -   Team collaboration features
        -   Email support
        -   1 day of runtime logs retention
    -   **Upstash for Redis**: Free tier (256MB) available, paid tiers start at $10/month

-   **Implementation Considerations**:

    -   Our application should work well within the Hobby tier limits for initial development and testing
    -   Build code so that it works without any caching, but will use Upstash if setup correctly.
    -   Serverless function duration limit of 10s may require optimization for geocoding operations
    -   Consider implementing request batching for geocoding to stay within Edge request limits
    -   Monitor build minutes usage, especially during development with frequent deployments

-   **Best for**: Next.js applications with moderate API usage

### Netlify

-   **Pros**:

    -   Easy deployment workflow
    -   Good CI/CD integration
    -   Serverless functions support

-   **Costs** (as of June 2024, verify current pricing at https://www.netlify.com/pricing/):

    -   Free tier: 100GB bandwidth, 125K serverless function executions per month
    -   Pro tier: $19/month (includes 1TB bandwidth, 2M serverless function executions)
    -   Would require separate Redis service (additional cost)

-   **Limitations**: Not as optimized for Next.js as Vercel, requires external caching solution

### AWS Amplify

-   **Pros**:

    -   Full AWS ecosystem integration
    -   Scalable infrastructure
    -   Flexible configuration options

-   **Costs** (as of June 2024, verify current pricing at https://aws.amazon.com/amplify/pricing/):

    -   Pay-as-you-go model, typically $0.01 per build minute, $0.15 per GB served
    -   Additional costs for Lambda functions, API Gateway, ElastiCache (Redis)
    -   More complex pricing structure

-   **Limitations**: More complex setup and management, higher learning curve

### Digital Ocean App Platform

-   **Pros**:

    -   Predictable pricing
    -   Good performance
    -   More control than Vercel/Netlify

-   **Costs** (as of June 2024, verify current pricing at https://www.digitalocean.com/pricing):

    -   Starting at $5/month for static sites
    -   $10-15/month for apps with server components
    -   Additional $15/month for managed Redis

-   **Limitations**: Less integrated with Next.js development workflow, requires more configuration

### Recommendation

**Vercel** is the recommended deployment platform for this project because:

1. It's specifically optimized for Next.js applications
2. The serverless functions are well-suited for our API routes
3. Easy integration with Upstash for Redis via the Vercel Marketplace
4. The Hobby (free) tier is sufficient for development and initial production use with the following considerations:
    - Optimize geocoding operations to stay within the 10s serverless function duration limit
    - Implement request batching to efficiently use the Edge request allocation
    - Monitor build minutes during development
5. Deployment and CI/CD are seamless with GitHub integration
6. Edge functions can improve performance for global users

This recommendation provides the best balance of cost, performance, and developer experience for the CMF application.

> **Note**: The pricing information is based on March 2025 data provided. Verify current pricing and limitations before making deployment decisions.
