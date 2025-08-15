# CMF AI Agent Guide

Project-level guidance for AI assistants working with the Calendar Map Filter (CMF) codebase.

## Project Overview

CMF displays calendar events on an interactive map with real-time filtering. Key technologies:
- **Frontend**: Next.js, React, TypeScript, MapLibre GL, Tailwind CSS
- **Backend**: Next.js API routes with Redis caching
- **Testing**: Jest with React Testing Library

Architecture: Client-side event filtering with server-side API integration and geocoding cache.

## Development Commands

```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Build for production  
npm run lint         # Run ESLint
npm test             # Run Jest tests with coverage
```

## Code Style

- 2 spaces indentation
- 120 character line limit
- Single quotes, trailing commas
- TypeScript strict mode enabled
- NEVER use `@ts-ignore` without strong justification

## Testing

- Use Jest + React Testing Library
- Test files: `__tests__/*.test.tsx` or `*.test.ts`
- Always add tests for new functionality
- Focus on behavior over implementation details
- Mock external dependencies (APIs, map components)

## Security

- API keys stored in environment variables only
- Server-side geocoding to prevent API key exposure
- Input validation on both client and server
- Redis cache for geocoding results

## Project-Specific Patterns

### Event Sources System
- Modular event source handlers in `src/lib/api/eventSources/`
- Each source extends `BaseEventSourceHandler`
- Format: `{prefix}:{id}` (e.g., `gc:calendar@gmail.com`)

### Map Integration
- MapLibre GL with react-map-gl wrapper
- Markers grouped by location coordinates
- Real-time filtering based on map viewport bounds

### State Management
- React Context + hooks (no Redux)
- URL parameters for shareable state
- `useEventsManager` for event data and filtering
- `useMap` for map state and interactions

### Data Flow
1. URL params → Event fetching → Geocoding → Map markers
2. User interactions → Filter updates → Event list + map sync
3. Map viewport changes → Event filtering → UI updates

### Key Components
- `MapContainer.tsx`: Main map with markers and popups
- `EventList.tsx`: Sortable event table with filtering
- `DateAndSearchFilters.tsx`: Date range and search controls
- Event source handlers: Google Calendar, Facebook, custom scrapers

### Debugging
- Use `logr` utility for rate-limited logging
- Debug mode via environment variable
- Browser console access to event data

### Performance Notes
- Events geocoded in parallel batches
- Redis caching for geocoding results
- Client-side data fetching with caching
- Designed for moderate event volumes

### Common Tasks
- Adding event sources: Extend `BaseEventSourceHandler` in `eventSources/`
- Map changes: Update `useMap` hook and `MapContainer`
- Filtering: Modify `FilterEventsManager` or filter components
- UI: Tailwind CSS with custom components in `components/ui/`

