import { ViewState as ViewStateType } from 'react-map-gl/maplibre'
import WebMercatorViewport from '@math.gl/web-mercator'
import { MapBounds, MapViewport, MapMarker } from '@/types/map'
import { CmfEvent } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import { fetcherLogr } from '@/lib/utils/utils-client'
import { stringify } from './utils-shared'

/**
 * Check if an event has a resolved location
 * @param event - The event to check
 * @returns Boolean indicating if the event has a resolved location
 */
export function hasResolvedLocation(event: CmfEvent): boolean {
    return !!(
        event.resolved_location?.status === 'resolved' &&
        event.resolved_location.lat &&
        event.resolved_location.lng
    )
}

/**
 * Truncates a location string to a maximum length
 * @param location - The location string to truncate
 * @param maxLength - Maximum length (default: 40)
 * @returns Truncated location string with ellipsis if needed
 */
export function truncateLocation(location: string, maxLength: number = 40): string {
    if (!location) return ''
    if (location.length <= maxLength) return location
    return `${location.substring(0, maxLength - 3)}...`
}

/**
 * Generates a unique ID for a marker based on its coordinates
 * @param event - The calendar event to generate an ID for
 * @returns A unique ID string based on the event's coordinates
 */
export function genMarkerId(event: CmfEvent): string {
    if (
        event.resolved_location?.status !== 'resolved' ||
        !event.resolved_location?.lat ||
        !event.resolved_location?.lng
    ) {
        return ''
    }
    try {
        // Use toFixed to ensure consistent precision for ID generation
        return `${event.resolved_location.lat.toFixed(6)},${event.resolved_location.lng.toFixed(6)}`
    } catch (error) {
        logr.error('location', `genMarkerId error: ${error} ${event.id} ${stringify(event.resolved_location, 299)}`)
        return ''
    }
}

/**
 * Calculates the center point of a set of events with resolved locations
 * @param events - Array of events to calculate center from
 * @returns Object containing latitude and longitude of the center point
 */
export function calculateAggregateCenter(events: CmfEvent[]): { lat: number; lng: number } {
    const resolvedEvents = events.filter(
        (e) => e.resolved_location?.status === 'resolved' && e.resolved_location.lat && e.resolved_location.lng
    )

    if (resolvedEvents.length === 0) {
        return { lat: 37.7749, lng: -122.4194 } // Default to San Francisco
    }

    const sumLat = resolvedEvents.reduce((sum, e) => sum + (e.resolved_location?.lat || 0), 0)
    const sumLng = resolvedEvents.reduce((sum, e) => sum + (e.resolved_location?.lng || 0), 0)

    return {
        lat: sumLat / resolvedEvents.length,
        lng: sumLng / resolvedEvents.length,
    }
}

/**
 * Generate map markers from events
 * @param events - Array of calendar events to generate markers from
 * @returns Array of map markers, with events at the same location grouped together
 */
export function generateMapMarkers(events: CmfEvent[]): MapMarker[] {
    const markersMap = new Map<string, MapMarker>()
    const unresolvedEvents: CmfEvent[] = []

    // Ensure events is an array before iterating
    if (!events || !Array.isArray(events)) {
        logr.info('location', 'No events provided to generate markers', events)
        return []
    }

    events.forEach((event) => {
        if (
            event.resolved_location?.status === 'resolved' &&
            event.resolved_location.lat &&
            event.resolved_location.lng
        ) {
            // Create a unique ID for the marker based on coordinates
            const id = genMarkerId(event)

            if (markersMap.has(id)) {
                // Add event to existing marker
                markersMap.get(id)?.events.push(event)
            } else {
                // Create new marker
                markersMap.set(id, {
                    id,
                    latitude: event.resolved_location.lat,
                    longitude: event.resolved_location.lng,
                    events: [event],
                })
            }
        } else {
            unresolvedEvents.push(event)
        }
    })

    // If we have unresolved events, create a single marker at the aggregate center
    if (unresolvedEvents.length > 0) {
        const center = calculateAggregateCenter(events)
        markersMap.set('unresolved', {
            id: 'unresolved',
            latitude: center.lat,
            longitude: center.lng,
            events: unresolvedEvents,
        })
    }

    const markers = Array.from(markersMap.values())

    // Sort markers so that unresolved location marker is first, making it appear beneath other markers
    markers.sort((a, b) => {
        if (a.id === 'unresolved') return -1
        if (b.id === 'unresolved') return 1
        return 0
    })

    logr.info('location', `generateMapMarkers(${events.length}) ${markers.length} markers`)

    return markers
}

/**
 * Calculates map bounds and viewport settings from an array of markers
 * @param markers - Array of map markers
 * @param width - Width of the viewport in pixels
 * @param height - Height of the viewport in pixels
 * @returns Object containing bounds and viewport settings
 */
export function calculateMapBoundsAndViewport(
    markers: MapMarker[],
    width: number,
    height: number
): {
    bounds: MapBounds | null
    viewport: MapViewport
} {
    const bounds = calculateBoundsFromMarkers(markers)

    // Calculate viewport
    const viewport = calculateViewportFromBounds(bounds, width, height)

    logr.info('location', 'calculateMapBoundsAndViewport return:', { bounds, viewport })
    return {
        bounds,
        viewport,
    }
}

/**
 * Rounds all values in a MapBounds object to 6 decimal places, 10 cm or 4 inches accuracy.
 * 6 decimal places is a common standard for applications like mapping, GIS, and navigation, where 10 cm accuracy is generally sufficient.
 * @param bounds - The MapBounds object to round
 * @returns A new MapBounds object with rounded values
 */
export function roundMapBounds(bounds: MapBounds): MapBounds {
    return {
        north: Number(bounds.north.toFixed(6)),
        south: Number(bounds.south.toFixed(6)),
        east: Number(bounds.east.toFixed(6)),
        west: Number(bounds.west.toFixed(6)),
    }
}

/**
 * Converts a ViewState object to a MapViewport object, basically
 *  - dropping padding from the ViewStateType. Not sure this matters?
 *  - rounding latitude and longitude to 6 decimal places, 10 cm or 4 inches accuracy.
 * @param viewport - The ViewState object to convert, basically
 * @returns A new MapViewport object with the converted values
 */
export function viewstate2Viewport(viewport: ViewStateType): MapViewport {
    return {
        latitude: Number(viewport.latitude.toFixed(6)),
        longitude: Number(viewport.longitude.toFixed(6)),
        zoom: Number(viewport.zoom.toFixed(1)),
        bearing: viewport.bearing,
        pitch: viewport.pitch,
    }
}

/**
 * Returns true if latitude/longitude is inside map bounds
 * @param lat - Latitude to check
 * @param lng - Longitude to check
 * @param mapBounds - Map bounds to check against
 * @returns Boolean indicating if location is inside map bounds
 */
export function latLongIsInBounds(lat: number, lng: number, mapBounds: MapBounds): boolean {
    const { north, south, east, west } = mapBounds
    // TODO: use WebMercatorViewport? Not now cuz its 10x heavier.
    // 🚀 When to use WebMercatorViewport.contains()
    // If you need to be pixel-accurate (e.g. polygons, tilted projections, non-rectangular clipping),
    // then yes, use Deck.gl’s WebMercatorViewport. That converts lat/lng to screen XY and checks inside bounds.
    // But that’s ~10x heavier than this simple math, and usually unnecessary unless you’re doing advanced viewport logic.

    // Latitude check (simple)
    if (lat < south || lat > north) return false

    // Longitude check (handle wraparound at ±180°)
    if (west <= east) {
        // Normal case (no wraparound)
        return lng >= west && lng <= east
    } else {
        // Bounds cross the antimeridian (e.g. west=170, east=-170), aka International Date Line.
        return lng >= west || lng <= east
    }
}

/**
 * Returns true if location of event or marker is inside map bounds
 * @param params - Object containing mapBounds, and either cmfEvent, mapMarker, or latitude/longitude
 * @returns Boolean indicating if location is inside map bounds
 */
export function isInBounds(params: {
    mapBounds: MapBounds
    cmfEvent?: CmfEvent
    mapMarker?: MapMarker
    lat?: number
    lng?: number
}): boolean {
    if (
        params.cmfEvent &&
        params.cmfEvent.resolved_location?.status === 'resolved' &&
        params.cmfEvent.resolved_location.lat &&
        params.cmfEvent.resolved_location.lng
    ) {
        return latLongIsInBounds(
            params.cmfEvent.resolved_location.lat,
            params.cmfEvent.resolved_location.lng,
            params.mapBounds
        )
    }
    if (params.mapMarker && params.mapMarker.latitude && params.mapMarker.longitude) {
        return latLongIsInBounds(params.mapMarker.latitude, params.mapMarker.longitude, params.mapBounds)
    }
    if (params.lat && params.lng) {
        return latLongIsInBounds(params.lat, params.lng, params.mapBounds)
    }
    return false
}

/**
 * Calculates map bounds from a set of markers.
 * @param markers - Array of map markers to calculate bounds for
 * @returns MapBounds object representing the bounds of all markers
 */
export function calculateBoundsFromMarkers(markers: MapMarker[]): MapBounds {
    // TODO: use WebMercatorViewport to calculateBoundsFromMarkers
    let ret = {
        north: 72,
        south: -8,
        east: -80,
        west: -156,
    }
    if (markers.length > 0) {
        ret.north = markers[0].latitude
        ret.south = markers[0].latitude
        ret.east = markers[0].longitude
        ret.west = markers[0].longitude
    }
    // Find the min/max coordinates
    markers.forEach((marker) => {
        ret.north = Math.max(ret.north, marker.latitude)
        ret.south = Math.min(ret.south, marker.latitude)
        ret.east = Math.max(ret.east, marker.longitude)
        ret.west = Math.min(ret.west, marker.longitude)
    })

    // Add padding to ensure markers on exact boundaries are included after rounding
    // Plus it looks better to not have markers touching the edges.
    // Increased padding to 0.03 to prevent race condition where map adjustments during load
    // cause events to fall outside bounds (especially for tightly clustered events)
    const PADDING_SINGLE = 0.02 // 0.03 is about ~2km buffer  
    const PADDING_MULTIPLE = 0.001 
    const PADDING = markers.length === 1 ? PADDING_SINGLE : PADDING_MULTIPLE
    ret.north += PADDING
    ret.south -= PADDING
    ret.east += PADDING
    ret.west -= PADDING

    ret = roundMapBounds(ret)
    logr.info('location', 'calculateBoundsFromMarkers return:', ret)

    return ret
}

/**
 * Calculates viewport settings from map bounds
 * @param bounds - MapBounds object to calculate viewport from
 * @param width - Width of the viewport
 * @param height - Height of the viewport
 * @returns MapViewport object with appropriate settings
 */
export function calculateViewportFromBounds(bounds: MapBounds, width: number, height: number): MapViewport {
    // https://visgl.github.io/math.gl/docs/modules/web-mercator
    // https://visgl.github.io/math.gl/docs/modules/web-mercator/api-reference/web-mercator-viewport#fitboundsbounds-options-object
    // TODO: figure out the ideal width and height - seems ok using mapRef.current.getMap().getContainer()
    const viewport = new WebMercatorViewport({ width, height })
    const bound = viewport.fitBounds(
        [
            [bounds.west, bounds.south],
            [bounds.east, bounds.north],
        ],
        { padding: 30, offset: [0, -20] }
    )
    // => bounds: instance of WebMercatorViewport
    // {longitude: -73.48760000000007, latitude: 41.268014439447484, zoom: 7.209231188444142}
    const ret = llzToViewport(bound.latitude, bound.longitude, bound.zoom)

    logr.info('location', `calculateViewportFromBounds(w=${width},h=${height}) MapViewport:`, ret)
    return ret
}

/**
 * Calculates accurate map bounds from a viewport using WebMercatorViewport
 * This provides precise bounds calculation based on actual map dimensions
 * @param viewport - The map viewport
 * @param mapWidth - Width of the map container in pixels
 * @param mapHeight - Height of the map container in pixels
 * @returns MapBounds object representing the accurate bounds
 */
export function calculateBoundsFromViewport(viewport: MapViewport, mapWidth: number, mapHeight: number): MapBounds {
    // Use WebMercatorViewport to calculate accurate bounds
    const mercatorViewport = new WebMercatorViewport({
        ...viewport,
        width: mapWidth,
        height: mapHeight,
    })

    // getBounds returns [[west, south], [east, north]]
    const bounds = mercatorViewport.getBounds()
    const [[west, south], [east, north]] = bounds

    const result = roundMapBounds({
        north,
        south,
        east,
        west,
    })

    logr.info('location', `calculateBoundsFromViewport(w=${mapWidth},h=${mapHeight}) MapBounds:`, result)
    return result
}

/**
 * Converts lat/lon/zoom parameters to MapViewport object with validation
 * @param lat - Latitude (-180 to 180) or null
 * @param lon - Longitude (-180 to 180) or null
 * @param z - Zoom level (1-22) or null
 * @returns Valid MapViewport object with defaults for invalid values
 */
export const llzToViewport = (lat: number | null, lon: number | null, z: number | null): MapViewport => {
    return {
        // TODO: log if lat or lon is out of bounds
        latitude: lat !== null && lat <= 180 && lat >= -180 ? Number(lat.toFixed(6)) : 0,
        longitude: lon !== null && lon <= 180 && lon >= -180 ? Number(lon.toFixed(6)) : 0,
        zoom: z !== null && z <= 22 && z > 0 ? Number(z.toFixed(2)) : 1, // Use zoom 1 as minimum instead of 0
        bearing: 0,
        pitch: 0,
    }
}

/**
 * Converts llz object to MapViewport
 * @param llz - Object with lat, lon, zoom properties or null
 * @returns MapViewport object
 */
export const llzObjectToViewport = (llz: { lat: number; lon: number; zoom: number } | null): MapViewport => {
    if (!llz) return llzToViewport(null, null, null)
    return llzToViewport(llz.lat, llz.lon, llz.zoom)
}

// Custom parsers to read and write values to the URL
/**
 * Checks if the input query is a valid ZIP code and returns its lat/lon coordinates if found.
 * @param query - The input string to check, typically from user input
 * @param zipLatLonRef - A reference to the ZIP code to lat/lon mapping
 * @returns An object containing lat/lon coordinates or null if not found
 */
export const checkForZipCode = async (
    query: string,
    zipLatLonRef: React.MutableRefObject<Record<string, string> | null>
): Promise<{ lat: number; lon: number } | null> => {
    // --- Helper: Lazy load ZIP → lat/lon map ---
    const loadZipLatLon = async (): Promise<void> => {
        try {
            const jsonData = await fetcherLogr('/data/zip-codes-to-lat-long.json')
            if (jsonData && typeof jsonData === 'object') {
                zipLatLonRef.current = jsonData
            } else {
                logr.warn('app', 'Invalid JSON format for zip-codes-to-lat-long.json')
            }
        } catch (error) {
            logr.warn('app', 'Error fetching zip-codes-to-lat-long.json', error)
        }
    }

    // --- Early exit: only process numeric input ---
    if (!/^\d+$/.test(query)) return null

    // --- Lazy-load dataset (non-blocking on partial input) ---
    if (!zipLatLonRef.current) {
        if (query.length < 5) {
            // Preload in background
            loadZipLatLon()
            return null
        }
        // Wait for data before lookup
        await loadZipLatLon()
    }

    // --- 5-digit lookup ---
    if (query.length === 5 && zipLatLonRef.current?.[query]) {
        const [lat, lon] = zipLatLonRef.current[query].split(',').map(Number)
        if (Number.isFinite(lat) && Number.isFinite(lon)) {
            return { lat, lon }
        }
        logr.warn('app', `Invalid lat/lon for ZIP ${query}: ${zipLatLonRef.current[query]}`)
    }

    return null
}
