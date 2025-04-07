import { CalendarEvent } from './events'

/**
 * Represents the current view state of the map
 * Controls which part of the map is visible to the user
 */
export interface MapViewport {
    latitude: number    // Center latitude of the map view
    longitude: number   // Center longitude of the map view
    zoom: number        // Zoom level (higher values = more zoomed in)
    bearing: number     // Map rotation in degrees (0 = north up)
    pitch: number       // Map tilt in degrees (0 = looking straight down)
}

/**
 * Represents the geographical bounds of the current map view
 * Used for filtering events that are within the visible area
 */
export interface MapBounds {
    north: number   // Northern-most latitude visible on the map
    south: number   // Southern-most latitude visible on the map
    east: number    // Eastern-most longitude visible on the map
    west: number    // Western-most longitude visible on the map
}

/**
 * Represents a marker on the map that can contain multiple events at the same location
 * Used to cluster events that occur at the exact same coordinates
 */
export interface MapMarker {
    id: string              // Unique identifier for the marker, typically based on coordinates
    latitude: number        // Latitude position of the marker
    longitude: number       // Longitude position of the marker
    events: CalendarEvent[] // Array of events that occur at this location
    // TODO: Consider adding a color or icon property to distinguish different types of events
}

/**
 * Represents the complete state of the map component
 */
export interface MapState {
    viewport: MapViewport
    bounds: MapBounds | null
    markers: MapMarker[]
    isMapOfAllEvents: boolean
    selectedMarkerId: string | null
}

// NOTE: The MapViewportWithBounds interface has been removed as it was redundant.
// If you need both viewport and bounds together, use:
// { ...viewport, bounds: mapBounds } or type it as MapViewport & { bounds: MapBounds }
