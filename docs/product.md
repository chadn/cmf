
# Calendar Map Filter (CMF) Specification

## 1. Product Overview
CMF uses a map as a filter for calendar events. This visualization tool displays events on both an interactive map and a list, allowing users to spatially browse and filter events based on geographic location.

### Use Cases

- Dora is exploring a neighborhood, and wants to see what events occur in that neighborhood.
She uses the map to jump to that neighborhood, and the map change triggers events list and markers to update
- Amanda is attending a specific event, and wants to see what else is nearby.
She uses the text box to filter to her event, clicks on event in events results list to highlight event, which triggers map to center on event
- Paul the Promoter wants to show where his band (or book tour, historic buildings seminar, archeological dig, etc.) has events across the country on different dates. 
- Quinn cares about quality and wants to make sure all the events in a calendar have a real address.  He enters his calendar and notes how many of his events have known vs unknown locations.


## 2. Data Model

### Events
- **Name**: Event title/summary (max display: 60 characters)
- **Date**: Start and end datetime
- **Location**: Text description of event location
- **Description**: Event notes/details (truncated to 2,000 characters)
- **Description_URLs**: Array of all URLs extracted from the description
- **Original_Event_URL**: Link to the original event in the calendar system
- **Support for recurring events**

### Locations
- **Original Location**: Raw location text from calendar event
- **Resolved Address**: Geocoded address from location text
- **Fallback Behavior**: For unresolvable locations, use largest city visible in "Map of All Events" view

### Data Structure
- All event data should be stored in a JSON structure called `cmf_events`
- Structure should be clean, simple, and contain only data needed for CMF functionality
- The `cmf_events` object must be accessible via browser console for debugging

## 3. User Interface

### Map Component
- Interactive map canvas using industry-standard controls (zoom, pan, etc.)
- Event markers placed at resolved locations
- Marker click reveals popup with event details
- Multiple events at same location use paginated popup
- Events with markers that move off the map canvas are filtered out of the results list

### Sidebar Component
- **Desktop**: Approximately 50% of screen width
- **Mobile**: Collapsible between minimized state and full-screen
- Header showing: "Map showing <filtered_count> of <total_count> events"
- Calendar Name (when clicked opens original calendar in new window)
- Date range display with change option
- Filterable and sortable results list

### Results List
- Tabular format with sortable columns:
  - Event Name (truncated to 60 chars)
  - Start Date (MM/DD Day hh:mm am/pm format)
  - Duration (formatted as "X hrs" or "X days")
  - Location (truncated to 40 chars, expandable on interaction)

### Filter Controls
- Active filters always visible with removal option
- Map area filter (implicit when panning/zooming)
- Date range filter with slider controls
- Text search filter for event names

## 4. Core Functionality

### Location Resolution
- Geocode original location text to mappable addresses using Google Maps Geocoding API
- Handle unknown (ambiguous or unmappable) locations gracefully. 
- Display "<unknown_count> of <total_count> have unknown locations" or "All <total_count> have known locations". Make the "<unknown_count>" clickable, and when clicked the results list should only show events that have unknown locations 

### Filtering Mechanisms
- **Map Filter**: Automatically filters to visible map canvas area
- **Date Filter**: Adjustable time window (default: 1 month prior to 3 months ahead)
- **Text Filter**: Matches event names
- **Unknown Locations Filter**: only shows events with unknown locations (so they can be fixed).

### Event Interaction
- Click/tap on map marker or list item shows event details
- Details view shows all event info stored in cmf_events

### Map Behavior
- Initial map focus is on the first address received from the geocoder as the calendar event feed is being loaded
- Eventually arrives at "Map of All Events" state, which is after all events have been geocoded, map automatically adjusts to show all events.
- When user moves 
- When map filter is removed, map returns to "Map of All Events" state

## 5. Responsive Behavior
- **Desktop**: Side-by-side map and sidebar
- **Mobile**: 
  - Collapsed state: "Map showing <X> of <Y> events" 
  - Expanded state: Full-screen sidebar with all functionality

## 6. Calendar Integration
- Google Calendar as default and primary calendar source.
- Calendar source can be supplied as URL parameter 'gc' with Google Calendar ID format:
  - Example: geocachingspain@gmail.com
  - Example: aabe6c219ee2af5b791ea6719e04a92990f9ccd1e68a3ff0d89bacd153a0b36d@group.calendar.google.com
- Developer must provide two separate API keys:
  1. Google Calendar API key (for fetching events via https://developers.google.com/calendar/api/v3/reference/events/list)
  2. Google Maps API key (for geocoding via https://developers.google.com/maps/documentation/geocoding/requests-geocoding)
- Support for additional calendar sources:
  - Microsoft Outlook
  - Apple Calendar (ICS file import)
- Calendar source change via URL parameter

## 7. Map Integration
-  Need to have basic functionality - pan, zoom, and text box to enter a location which the map should go to.  Optionally can show different layers or views like satellite view or street view.
- Map used should be abstracted so can switch map providers.  Initially consider using OpenLayers or MapLibre

## Assumptions and Technical Considerations

1. **API Keys**: Both Google Calendar API and Google Maps API keys must be provisioned by the developer
2. **Authentication**: API Keys are sufficient for CMF code to fetch events using Calendar API and geocode locations
3. **Geocoding**: Google Maps Geocoding API will be used for location resolution
4. **Performance**: For large event sets, pagination or lazy loading may be required
5. **Accessibility**: Standard accessibility practices will be followed for core functionality but not necessarily all features. 
6. **Data Privacy**: Event data processing complies with relevant privacy regulations
7. **Refresh Rate**: Calendar event data is only reloaded when dates change.
8. **Time Zones**: All times displayed in user's local timezone
9. **Error Handling**: Unresolvable locations will use fallback approach described above
11. **Mobile Support**: Responsive design works across common mobile and desktop devices
12. **URL Extraction**: Logic required to parse and extract URLs from description text
13. **Data Structure**: The `cmf_events` JSON structure serves as the single source of truth for the application's UI
14. **Map State Management**: System must track and restore "Map of All Events" state when filters are removed


