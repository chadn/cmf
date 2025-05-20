import { MapBounds, MapViewport, MapMarker } from '@/types/map'
import { CmfEvent } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import { createParser } from 'nuqs'
import { ExampleEventSources } from '@/lib/events/examples'
import { ViewState as ViewStateType } from 'react-map-gl'
import WebMercatorViewport from '@math.gl/web-mercator'

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
    return `${event.resolved_location.lat.toFixed(6)},${event.resolved_location.lng.toFixed(6)}`
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
    let eventsWithLocation = 0
    const unresolvedEvents: CmfEvent[] = []

    // Ensure events is an array before iterating
    if (!events || !Array.isArray(events)) {
        logr.info('location', 'No events provided to generate markers', { events })
        return []
    }

    events.forEach((event) => {
        if (
            event.resolved_location?.status === 'resolved' &&
            event.resolved_location.lat &&
            event.resolved_location.lng
        ) {
            eventsWithLocation++
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

    logr.info(
        'location',
        `Generated ${markers.length} markers from ${eventsWithLocation} events with locations, ` +
            `${unresolvedEvents.length} events without resolvable location`
    )

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
 * Converts a ViewState object to a MapViewport object, rounding latitude and longitude to 6 decimal places, 10 cm or 4 inches accuracy.
 * @param viewport - The ViewState object to convert
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
 * Calculates map bounds from a set of markers
 * @param markers - Array of map markers to calculate bounds for
 * @returns MapBounds object representing the bounds of all markers
 */
export function calculateBoundsFromMarkers(markers: MapMarker[]): MapBounds {
    if (markers.length === 0) {
        return {
            north: 0,
            south: 0,
            east: 0,
            west: 0,
        }
    }
    // Initialize with the first marker's coordinates
    const ret = {
        north: markers[0].latitude,
        south: markers[0].latitude,
        east: markers[0].longitude,
        west: markers[0].longitude,
    }
    // Find the min/max coordinates
    markers.forEach((marker) => {
        ret.north = Math.max(ret.north, marker.latitude)
        ret.south = Math.min(ret.south, marker.latitude)
        ret.east = Math.max(ret.east, marker.longitude)
        ret.west = Math.min(ret.west, marker.longitude)
    })

    logr.info('location', 'calculateBoundsFromMarkers return:', ret)

    return roundMapBounds(ret)
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
    const ret = viewportUrlToViewport(bound.latitude, bound.longitude, bound.zoom)

    logr.info('location', `calculateViewportFromBounds(w=${width},h=${height}) MapViewport:`, ret)
    return ret
}

/**
 * Calculates approximate map bounds from a viewport
 * This is a simplified calculation that creates a bounding box around the viewport center
 * based on the zoom level
 *
 * @param viewport - The map viewport
 * @returns MapBounds object representing the approximate bounds
 */
export function calculateBoundsFromViewport(viewport: MapViewport): MapBounds {
    // Calculate the approximate degrees of latitude/longitude visible at this zoom level
    // Higher zoom levels show less area (zoom 1 = whole world, zoom 20 = building level)
    const zoomFactor = Math.pow(2, viewport.zoom) // Higher zoom = larger factor
    const latDelta = 180 / zoomFactor // Smaller delta at higher zoom
    const lonDelta = 360 / zoomFactor // Smaller delta at higher zoom

    // Calculate bounds
    return roundMapBounds({
        north: viewport.latitude + latDelta / 2,
        south: viewport.latitude - latDelta / 2,
        east: viewport.longitude + lonDelta / 2,
        west: viewport.longitude - lonDelta / 2,
    })
}

// Return a valid MapViewport, with default values if invalid
// url params have a value of  null if they do not or should not exist.
export const viewportUrlToViewport = (lat: number | null, lon: number | null, z: number | null): MapViewport => {
    return {
        latitude: lat !== null && lat <= 180 && lat >= -180 ? Number(lat.toFixed(6)) : 0,
        longitude: lon !== null && lon <= 180 && lon >= -180 ? Number(lon.toFixed(6)) : 0,
        zoom: z !== null && z <= 22 && z > 0 ? z : 0,
        bearing: 0,
        pitch: 0,
    }
}

// Custom parsers to read and write values to the URL
// url params have a value of  null if they do not or should not exist.
export const parseAsZoom = createParser({
    // parse: a function that takes a string and returns the parsed value, or null if invalid.
    parse(queryValue) {
        const val = parseFloat(queryValue)
        if (isNaN(val) || val < 1 || val > 22) return null
        return val
    },
    // serialize: a function that takes the parsed value and returns a string used in the URL.
    serialize(value) {
        logr.debug('location', `serialize zoom:${value}`)
        // if the value is an integer, return it as a string no decimal places
        if (value === parseInt(value.toString())) {
            return value.toString()
        }
        // otherwise, return it as a string with 1 decimal place
        return value.toFixed(1)
    },
})
export const parseAsLatLon = createParser({
    // parse: a function that takes a string and returns the parsed value, or null if invalid.
    parse(queryValue) {
        const val = parseFloat(queryValue)
        if (isNaN(val) || val < -180 || val > 180) return null
        return val
    },
    // serialize: a function that takes the parsed value and returns a string used in the URL.
    serialize(value) {
        return value.toFixed(5)
    },
})
export const parseAsEventSource = createParser({
    // parse: a function that takes a string and returns the parsed value, or null if invalid.
    parse(queryValue) {
        if (typeof queryValue !== 'string') return null

        // check for example event sources first
        const example = ExampleEventSources.find((es) => es.shortId === queryValue)
        if (example) return example.id

        // match any string that starts with ascii chars or digits then a colon then any number of digits
        const regex = /^[a-zA-Z0-9]+:/
        if (regex.test(queryValue)) return queryValue
        return null
    },
    // serialize: a function that takes the parsed value and returns a string used in the URL.
    serialize(value) {
        // Check for example event sources first
        const example = ExampleEventSources?.find?.((es) => es.id === value && es.shortId)
        if (example) return example.shortId as string

        return value
    },
})
