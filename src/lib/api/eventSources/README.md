# Event Sources System

This directory contains the modular event sources system for fetching events from various sources. The system is designed to be extensible, making it easy to add new event sources in the future.

## Architecture

The event sources system consists of:

1. **Base Class** (`index.ts`): Defines the `BaseEventSourceHandler` abstract class that provides common functionality and interfaces for event source handlers
2. **Event Source Handlers**: Separate implementation files for each type of event source
3. **API Endpoint**: A unified `/api/events` endpoint that routes requests to the appropriate handler

## Event Source Format

Event sources are identified using a string with the format: `{prefix}:{id}`

For example:

- `gc:my-google-calendar-id` for Google Calendar
- `fb:my-facebook-event-id` for Facebook Events (when implemented)

## Core Components

### BaseEventSourceHandler

The `BaseEventSourceHandler` abstract class provides the foundation for all event sources:

```typescript
export abstract class BaseEventSourceHandler {
    abstract type: EventsSourceType
    abstract fetchEvents(params: EventsSourceParams): Promise<EventsSourceResponse>

    // Common utility methods
    extractUrls(text: string): string[] { ... }
}
```

### EventsSourceType

Defines the metadata for an event source:

```typescript
export interface EventsSourceType {
    prefix: string // must be unique, eg 'gc' for 'gc:1234567890'
    name: string // display name
}
```

### EventsSourceParams

Parameters passed to the `fetchEvents` method:

```typescript
export interface EventsSourceParams {
    id: string
    timeMin?: string
    timeMax?: string
    [key: string]: string | undefined
}
```

### EventsSourceResponse

The response format for all event sources:

```typescript
export interface EventsSourceResponse {
    events: CmfEvent[]
    source: EventsSource
}
```

## Adding a New Event Source

To add a new event source:

1. Create a new file in this directory (e.g., `myNewSource.ts`)
2. Extend the `BaseEventSourceHandler` class
3. Implement the required abstract methods
4. Register your handler using `registerEventsSource`

### Example:

```typescript
import { BaseEventSourceHandler, EventsSourceParams, EventsSourceResponse, EventsSource, registerEventtodSource } from './index';
import { CmfEvent } from '@/types/events';

export class MyNewEventsSource extends BaseEventSourceHandler {
    public readonly type: EventsSource = {
        prefix: 'ns',
        name: 'New Source',
        url: 'https://homepage.com',
    };

    async fetchEvents(params: EventsSourceParams): Promise<EventsSourceResponse> {
        // Implement fetching logic
        // Transform source-specific events to CmfEvent format
        const events: CmfEvent[] = [...];

        return {
            events,
            source: {
                ...this.type,
                id: params.id,
                totalCount: events.length,
                unknownLocationsCount: 0
            },
            httpStatus: 200
        };
    }
}

// Register your handler
const myNewEventsSource = new MyNewEventsSource();
registerEventsSource(myNewEventsSource);

export default myNewEventsSource;
```

## Geocoding

Geocoding is handled separately from event sources. The `/api/events` endpoint takes care of geocoding event locations after receiving them from the event source.

This separation allows for:

1. Consistent geocoding regardless of event source
2. Caching of geocoded locations
3. Reuse of geocoding logic across different parts of the application

## Best Practices

1. **Error Handling**: Always include proper error handling in your `fetchEvents` implementation
2. **Logging**: Use the `logr` utility for consistent logging across the application
3. **Type Safety**: Ensure all events conform to the `CmfEvent` interface
4. **URL Extraction**: Use the built-in `extractUrls` method for consistent URL extraction
5. **Testing**: Add unit tests for your event source implementation
