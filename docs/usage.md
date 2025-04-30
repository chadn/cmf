# How To Use CMF

Calendar Map Filter (CMF) is a web application that allows users to view and filter events on an interactive map. It supports various calendar sources and provides powerful real-time filtering capabilities.

## Overview

CMF combines calendar event data with geographic visualization, allowing users to:

-   View events from multiple sources on a map
-   Filter events by date range, search terms, and geographic area
-   Share filtered views via URL parameters - just copy paste the URL!
-   Navigate between events with an integrated list view

(\*) One of the most unique features is how all the data updates real time as you interact with the map.
For example, as you adjust the date slider, you can see the real-time changes on what markers are showing in the map
and changes on the numbers of how many events are showing and filtered by date.

## URL Parameters

CMF supports several URL parameters that allow for deep linking and sharing specific views:

### Event Source Parameters

| Parameter | Description     | Example                           |
| --------- | --------------- | --------------------------------- |
| `es`      | Event source ID | `es=gc:geocachingspain@gmail.com` |

### Map Viewport Parameters

| Parameter | Description                        | Example         |
| --------- | ---------------------------------- | --------------- |
| `z`       | Map zoom level (0-22)              | `z=12`          |
| `lat`     | Map center latitude (-90 to 90)    | `lat=45.5231`   |
| `lon`     | Map center longitude (-180 to 180) | `lon=-122.6765` |

### Date Range Parameters

| Parameter | Description                   | Example                              |
| --------- | ----------------------------- | ------------------------------------ |
| `sd`      | Start date for event fetching | `sd=-1m` (1 month ago, default)      |
| `ed`      | End date for event fetching   | `ed=3m` (3 months from now, default) |

### Filter Parameters

| Parameter | Description                   | Example        |
| --------- | ----------------------------- | -------------- |
| `sq`      | Search query to filter events | `sq=beat`      |
| `qf`      | Quick filter for date ranges  | `qf=next7days` |

### Selection Parameters

| Parameter | Description       | Example        |
| --------- | ----------------- | -------------- |
| `se`      | Selected event ID | `se=event_123` |

## Date Formats

The application supports various date formats for the `sd` and `ed` parameters:

-   **ISO 8601**: `2023-05-15`
-   **Relative dates**:
    -   `-1m`: 1 month ago
    -   `3m`: 3 months from now
    -   `-7d`: 7 days ago
    -   `14d`: 14 days from now
    -   `-2w`: 2 weeks ago
    -   `1y`: 1 year from now

## Quick Filter Options

The `qf` parameter is set when user clicks the corresponding button under the Date sliders.
It supports the following values:

-   `past`: Events from the past up to today
-   `future`: Events from today into the future
-   `today`: Events happening today
-   `next3days`: Events in the next 3 days
-   `next7days`: Events in the next 7 days
-   `weekend`: Events happening this weekend (Friday to Sunday)

## Example URLs

https://cmf-chad.vercel.app/?es=gc:aabe6c219ee2af5b791ea6719e04a92990f9ccd1e68a3ff0d89bacd153a0b36d@group.calendar.google.com&lat=37.80722&lon=-122.29074&z=14

-   View events from a specific calendar: `?es=google_calendar_123`
-   View events in Portland: `?es=google_calendar_123&lat=45.5231&lon=-122.6765&z=12`
-   View concerts in the next week: `?es=google_calendar_123&qf=next7days&sq=concert`
-   View a specific event: `?es=google_calendar_123&se=event_123`

## Application States

The application goes through several states during initialization:

1. **uninitialized**: Initial state, nothing is known
2. **events-init**: Fetching events from event source based on initial URL params
3. **map-init**: Updating map based on initial URL params and event source events
4. **main-state**: Responding to user interactions, updating URL parameters

## Filtering Mechanism

CMF uses a `FilterEventsManager` class to apply multiple filters to events:

-   **Date filters**: Filter events by date range
-   **Search filters**: Filter events by text in name, location, or description
-   **Map filters**: Filter events by geographic bounds

Filters can be combined, and the application maintains the filtered state in the URL for sharing.

## Event Sources

The code is written to make it easy to add different type of event sources, custom ones that do not have to be a calendar.
