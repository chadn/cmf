# ADR: Upstash Redis for Geocoding Cache

## Status

Accepted ✅ (2025-05-20)

## Context

The application requires caching for geocoding API results to:

- Reduce Google Maps API calls and costs
- Improve response times for repeated location requests
- Handle development and production environments differently
- Support deployment on Vercel with minimal configuration

Cache storage options included in-memory, filesystem, traditional Redis, or Upstash Redis.

## Decision

Use Upstash Redis for production geocoding cache with filesystem fallback for development.

## Alternatives Considered

1. **In-memory cache** - Fast but not persistent, doesn't scale across deployments
2. **Filesystem cache** - Simple for development, not suitable for serverless
3. **Traditional Redis** - Requires infrastructure management
4. **Upstash Redis** - Chosen for serverless-friendly Redis solution

## Consequences

### Positive
- Serverless-native Redis that integrates seamlessly with Vercel
- HTTP-based API eliminates connection pooling complexity
- Free tier (256MB) sufficient for expected cache size (~0.5MB for 1,000 locations)
- Filesystem cache provides simple development experience
- Abstraction layer enables easy switching between implementations

### Negative
- HTTP-based access has slightly higher latency than connection-based Redis
- Vendor lock-in to Upstash for production cache
- Additional service dependency

### Implementation Architecture
- Cache abstraction layer in `src/lib/cache/`
- Production: Upstash Redis via HTTP API
- Development: Filesystem cache in `.cache/` directory
- Automatic cache key generation and TTL management
- Graceful degradation if cache unavailable

### Affected Components
- `src/lib/cache/upstash.ts` - Upstash Redis implementation
- `src/lib/cache/filesystem.ts` - Development filesystem cache
- `src/lib/api/geocoding.ts` - Geocoding service with cache integration
- Environment variables: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`