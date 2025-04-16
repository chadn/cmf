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

    if (markers.length === 1) {
        const marker = markers[0]
        return {
            bounds: {
                north: marker.latitude,
                south: marker.latitude,
                east: marker.longitude,
                west: marker.longitude,
            },
            viewport: {
                latitude: marker.latitude,
                longitude: marker.longitude,
                zoom: 14,
                bearing: 0,
                pitch: 0,
            },
        }
    }

    const latitudes = markers.map((m) => m.latitude)
    const longitudes = markers.map((m) => m.longitude)
    const minLat = Math.min(...latitudes)
    const maxLat = Math.max(...latitudes)
    const minLng = Math.min(...longitudes)
    const maxLng = Math.max(...longitudes)

    // Add 10% padding to bounds
    const latPadding = (maxLat - minLat) * 0.1
    const lngPadding = (maxLng - minLng) * 0.1

    // Calculate center point
    const centerLat = (minLat + maxLat) / 2
    const centerLng = (minLng + maxLng) / 2

    // Calculate zoom level to fit all markers
    const latZoom = Math.log2(360 / (maxLat - minLat + 2 * latPadding)) - 1
    const lngZoom = Math.log2(360 / (maxLng - minLng + 2 * lngPadding)) - 1
    const zoom = Math.min(Math.max(Math.min(latZoom, lngZoom), 1), 15)

    return {
        bounds: {
            north: maxLat + latPadding,
            south: minLat - latPadding,
            east: maxLng + lngPadding,
            west: minLng - lngPadding,
        },
        viewport: {
            latitude: centerLat,
            longitude: centerLng,
            zoom,
            bearing: 0,
            pitch: 0,
        },
    }
}
