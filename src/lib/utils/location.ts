import { MapBounds, MapViewport, MapMarker } from '@/types/map'
import { Location, CalendarEvent } from '@/types/events'
import { logr } from '@/lib/utils/logr'

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
export function genMarkerId(event: CalendarEvent): string {
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
 * Generate map markers from events
 * @param events - Array of calendar events to generate markers from
 * @returns Array of map markers, with events at the same location grouped together
 */
export function generateMapMarkers(events: CalendarEvent[]): MapMarker[] {
    const markersMap = new Map<string, MapMarker>()
    let eventsWithLocation = 0
    let eventsWithoutLocation = 0

    // Ensure events is an array before iterating
    if (!events || !Array.isArray(events)) {
        logr.info('map', 'No events provided to generate markers', { events })
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
            eventsWithoutLocation++
        }
    })

    const markers = Array.from(markersMap.values())

    logr.info(
        'map',
        `Generated ${markers.length} markers from ${eventsWithLocation} events with locations, ` +
            `skipped ${eventsWithoutLocation} events without resolvable location`
    )

    return markers
}

/**
 * Calculates both map bounds and viewport settings for a set of markers
 * @param markers - Array of map markers to calculate bounds and viewport for
 * @returns Object containing bounds and viewport settings
 */
export function calculateMapBoundsAndViewport(markers: MapMarker[]): {
    bounds: MapBounds | null
    viewport: MapViewport
} {
    if (markers.length === 0) {
        return {
            bounds: null,
            viewport: {
                latitude: 0,
                longitude: 0,
                zoom: 1,
                bearing: 0,
                pitch: 0,
            },
        }
    }

    // Calculate bounds
    const bounds = calculateBoundsFromMarkers(markers)

    // Calculate viewport
    const viewport = calculateViewportFromBounds(bounds)

    return {
        bounds,
        viewport,
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
    let north = markers[0].latitude
    let south = markers[0].latitude
    let east = markers[0].longitude
    let west = markers[0].longitude

    // Find the min/max coordinates
    markers.forEach((marker) => {
        north = Math.max(north, marker.latitude)
        south = Math.min(south, marker.latitude)
        east = Math.max(east, marker.longitude)
        west = Math.min(west, marker.longitude)
    })

    return {
        north,
        south,
        east,
        west,
    }
}

/**
 * Calculates viewport settings from map bounds
 * @param bounds - MapBounds object to calculate viewport from
 * @returns MapViewport object with appropriate settings
 */
export function calculateViewportFromBounds(bounds: MapBounds): MapViewport {
    // Calculate center
    const latitude = (bounds.north + bounds.south) / 2
    const longitude = (bounds.east + bounds.west) / 2

    // Calculate appropriate zoom level based on bounds size
    const latDiff = bounds.north - bounds.south
    const lonDiff = bounds.east - bounds.west
    const maxDiff = Math.max(latDiff, lonDiff)

    // Determine zoom level based on the size of the bounds
    // This is a simplified calculation and may need adjustment
    let zoom = 1
    if (maxDiff > 0) {
        // Logarithmic scale for zoom level
        zoom = Math.floor(16 - Math.log2(maxDiff * 10))
        // Clamp zoom level
        zoom = Math.max(1, Math.min(zoom, 20))
    }

    return {
        latitude,
        longitude,
        zoom,
        bearing: 0,
        pitch: 0,
    }
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
    // Higher zoom levels show less area
    const zoomFactor = Math.pow(2, 20 - viewport.zoom) // 20 is max zoom
    const latDelta = 180 / zoomFactor
    const lonDelta = 360 / zoomFactor

    // Calculate bounds
    return {
        north: viewport.latitude + latDelta / 2,
        south: viewport.latitude - latDelta / 2,
        east: viewport.longitude + lonDelta / 2,
        west: viewport.longitude - lonDelta / 2,
    }
}
