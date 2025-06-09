# How To Use CMF

Calendar Map Filter (CMF) is a web application that allows users to view and filter events on an interactive map. It supports various calendar sources and provides powerful real-time filtering capabilities.

## Overview

CMF combines calendar event data with geographic visualization, allowing users to:

-   View events from multiple sources on a map
-   Filter events by date range (date filter), search terms (search filter), and geographic area (map filter)
-   Share filtered views via URL parameters - just copy paste the URL!
-   Navigate between events with an integrated list view

(\*) One of the most unique features is how all the data updates real time as you interact with the map.
For example, as you adjust the date slider, you can see the real-time changes on what markers are showing in the map
and changes on the numbers of how many events are showing and filtered by date.

## Key Features

### Real-Time Data Updates

-   Instantly updates as you interact with map, search, or date changes. This encourages interactivity.
-   Enable user to have some control in "too much" or "not enough" data type experiences.
-   The events list and map markers stay synchronized, as well as the count of events showing on the map.
-   Filter counts update in real-time as you interact

### Map and Event List Integration

-   The map and list views are always synchronized
-   Clicking a marker highlights via blue background the corresponding event in the list
-   The list shows only events visible on the current map view
-   Use "Filtered by map" button to show all events regardless of map view

### Location Requirements

-   Events must have a valid location to appear on the map
-   Locations can be addresses, coordinates, or unique place names
-   Events without locations will only appear in the list view
-   Invalid locations may cause events to be filtered out

### Troubleshooting

-   If events don't appear, check if they have valid locations
-   If the map is empty, try removing filters or zooming out
-   For Google Calendar issues, verify the calendar ID and sharing settings
-   Clear browser cache if the app behaves unexpectedly

## Mobile vs Desktop

### Desktop Experience

-   Map and event list appear side by side
-   Larger map view for better navigation
-   Responsive Deisgn - Subtle optimizations for desktop >768px, >1024px, >1536px via [tailwind](https://tailwindcss.com/docs/responsive-design)

### Mobile Experience

-   Map and event list stack vertically (map on bottom)
-   Touch-friendly interface
-   Responsive design adapts to screen size
-   Swipe gestures for map navigation
-   Collapsible sections to maximize screen space

### Cross-Device Features

-   Same URL sharing works on all devices
-   Real-time updates work consistently
-   All filters available on both platforms
-   Calendar integration works the same way

## Definitions

1. Event Source - this could be a google calendar or non calendar event sources like pol-rev.com
1. Event – contains name, location, date, and description. More than one event can be at same location or same time. Can be repeating.
1. Map canvas – the area of the map you can see on the browser. If an event location is not on the map canvas, it will not be shown on the events list. See Map Filter.
1. Location – 'where' the event is. This should be an address, coordinates, or something unique enough for geolocation. Otherwise it can't put it on a map. Example of a location that are not addresses: "Mom's house"
1. Marker – an icon at a location on the map canvas. When clicked, reveals details on events at that address (may be more than one event at same location)
1. Event list – above the map (mobile) or next to the map (desktop), list (in table format) of matching events that are on map. The events listed are filtered and sortable by name, date, duration, location. Click on header to sort. When filtered, it may be a subset of all the events.
1. Map Filter - The map itself will filter out events when moved or zoomed in, only showing events whose location is on the current map canvas. To zoom out or change map canvas to show all events, remove the map filter by clicking "Filtered by map" button.
1. Search Filter - type any characters and the events will be filtered to match. The number of events filtered by search will be shown in the "Filtered by Search" count.
1. Date Filter - date sliders are hidden initially, click on CHANGE next to the dates to filter the events.
1. Filters – appears above events list. Currently there are just 2 filters – map and date. Existing filters are always listed, and can be removed by clicking them. When all filters are removed, all events are displayed in events list (map will change if necessary to show all events, too).

## Initial View - Pick Event Source

Here you can choose an example event source or type in your own.  
To use examples, click on the grey buttons then click the blue "View Events" button.

### Find your Google Calendar Id

1. Go to Google Calendar in your browser, https://calendar.google.com/
2. Find the calendar you want to use in the left sidebar
3. Click the three dots next to the calendar name
4. Select "Settings and sharing"
5. Scroll down to "Integrate calendar" section
6. Copy the "Calendar ID" - it will look like `example@gmail.com` or `example@group.calendar.google.com`

### Find your Facebook Events iCal URL

1. On Desktop, go to https://www.facebook.com/events/calendar in your browser, log in
2. Find the "Add to calendar" button near the top right of the Events page
3. Right Click the "Add to calendar" button, then select "Copy Link Address"
   Ex: `https://www.facebook.com/events/ical/upcoming/?uid=123456789&key=ABCDEFGHIJK`
4. Paste this URL directly in the event source field in CMF
5. The app will automatically convert it to the proper format (`fb:123456789-ABCDEFGHIJK`)

Note

-   Facebook events only include your upcoming events that you've marked as "Going" or "Interested".
-   Facebook events only include the past month and the next 3 months

## Viewing Events

After you select "View Events" with a valid event source like google calendar,
The app may take a few seconds to fetch all the events and put them on the map.

When it is ready, you will see

-   A map with markers, where each marker has one or more events.
-   The event list with names, dates, and location info of current events
-   Search box to find events
-   Date ranges that you can CHANGE to limit events to a smaller window

It is meant for you to play around!

## Map

The map will have markers for each location where there are one or more events.  
Click on a marker to see the events at that location, including a link back to original event.

The map canvas shows where events are AND acts as a filter. When you zoom in so that markers go off the map, the events
at that location will be filtered out and not appear on the events list.

## Event List

The event list is basically a table listing the events that are currently shown on the map.
It has the following sortable columns - click on column name to sort or reverse sort by that column:

-   Event Name - Name as appears in original event.
-   Start Date - Date and time the event starts. Time is based on your browser's timezone, which may differ from local time of event.
-   Duration - number of hours or days
-   Location - address as listed in event. If address is online or otherwise unresolvable by google maps api, it will say "Unresolved location" as well.

## Search Box

The search box is primarily used to find specific events. When you start typing part of a word, the events will be filtered
out so that the only ones shown are ones matching the letters you type. Matching includes partial matches against name, description and location (via [applySearchFilter](https://github.com/search?q=repo%3Achadn%2Fcmf%20applySearchFilter&type=code)).

Search box also allows for special searching.

-   **unresolved** - typing `unresolved` will show all events with [Incorrect and Unresolved Locations](#incorrect-and-unresolved-locations)
-   **zip codes** - typing a zip code (5 numbers) and hitting enter will update map to go to that zip code (NOT IMPLEMENTED YET, COMING SOON)

### Incorrect and Unresolved Locations

If an event's location looks incorrect on the map, it probably got incorrectly geocoded, maybe due to lack of location details.
Note this is different than unresolved locations, which are events with either blank location or unresolvable (online, zoom, etc).  
All unresolved locations share a special marker. You can see them with special search term "unresolved". Ex: [?sq=unresolved&es=sf](https://cmf-chad.vercel.app/?sq=unresolved&es=sf)

## Date Ranges

Similar to search box, you can filter events based on date ranges. Use the sliders, quick filters, or calendar to select start and end days you would like. Only events that occur in that window will show up on the map and event list.

### Quick Filter Options

The `qf` parameter is set when user clicks the corresponding button under the Date sliders.
It supports the following values:

-   `past`: Events from the past up to today
-   `future`: Events from today into the future
-   `today`: Events happening today
-   `next3days`: Events in the next 3 days
-   `next7days`: Events in the next 7 days
-   `weekend`: Events happening this weekend (Friday to Sunday)

## URL Parameters

CMF supports several URL parameters that allow for deep linking and sharing specific views:

### Event Source Parameters

| Parameter | Description     | Example                           |
| --------- | --------------- | --------------------------------- |
| `es`      | Event source ID | `es=gc:geocachingspain@gmail.com` |
|           |                 | `es=fb:123456789-ABCDEFGHIJK`     |

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

| Parameter | Description                                       | Example         |
| --------- | ------------------------------------------------- | --------------- |
| `sq`      | Search query to filter events                     | `sq=beat`       |
| `sq`      | &nbsp; Special query to list unresolved locations | `sq=unresolved` |
| `qf`      | Quick filter for date ranges                      | `qf=next7days`  |

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

## Example URLs

Here are some example URLs showing different parameter combinations:

-   Basic Google Calendar view: [?es=gc:geocachingspain@gmail.com](https://cmf-chad.vercel.app/?es=gc:geocachingspain@gmail.com)
-   View Facebook events: [?es=fb:123456789-ABCDEFGHIJK](https://cmf-chad.vercel.app/?es=fb:123456789-ABCDEFGHIJK)
-   View events in a specific location: [?lat=41.38233&lon=2.15997&z=9&es=gc:geocachingspain@gmail.com](https://cmf-chad.vercel.app/?lat=41.38233&lon=2.15997&z=9&es=gc:geocachingspain@gmail.com)
-   View events happening over the next week: [?qf=next7days&es=gc:geocachingspain@gmail.com](https://cmf-chad.vercel.app/?qf=next7days&es=gc:geocachingspain@gmail.com)
-   Search for specific events: [?sq=meet&es=gc:geocachingspain@gmail.com](https://cmf-chad.vercel.app/?sq=meet&es=gc:geocachingspain@gmail.com)
-   View events up to 9 months from now: [?ed=9m&es=gc:geocachingspain@gmail.com](https://cmf-chad.vercel.app/?ed=9m&es=gc:geocachingspain@gmail.com)
-   View events that have unresolved locations (then fix those locations!): [?sq=unresolved&es=sf](https://cmf-chad.vercel.app/?sq=unresolved&es=sf)

Note: Replace `geocachingspain@gmail.com` with your actual Google Calendar ID.

## Event Sources

The code is written to make it easy to add different type of event sources, custom ones that do not have to be a calendar.
Read more about the [Event Sources System](../src/lib/api/eventSources)

How to fix incorrect locations - This is for admins only

1.  On map, Click on it, in event popup, hover over "View Original Event" to get location key (k1) (or look at html and copy title). ex: `location:Asiento`
1.  Figure out what location it should be, and store in geolocation cache, noting the key name (k2). ex:
    `curl 'https://cmf-chad.vercel.app/api/geocode?a=Asiento,sf,ca'`
1.  Update value for location key using [upstash-redis.ts](../src/scripts/upstash-redis.ts) `fix-location <k1> <k2>`
    `node upstash-redis.ts fix-location 'location:Asiento' 'location:Asiento,sf,ca'`

## More

Read more about this project and how it was built in the [README.md](../README.md)

Found a bug or want a feature? Let me know by [Creating a new issue in github](https://github.com/chadn/cmf/issues/new)
