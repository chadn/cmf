import { CmfEvent } from '@/types/events'
import { MapBounds } from '@/types/map'

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
 * Apply date range filter to an event
 * @param event - The event to filter
 * @param dateRange - The date range to filter by (optional)
 * @returns Boolean indicating if the event passes the date filter
 */
export function applyDateFilter(event: CmfEvent, dateRange?: { start: string; end: string }): boolean {
    if (!dateRange) return true

    const eventStart = new Date(event.start)
    const eventEnd = new Date(event.end)
    const rangeStart = new Date(dateRange.start)
    const rangeEnd = new Date(dateRange.end)

    return !(eventEnd < rangeStart || eventStart > rangeEnd)
}

/**
 * Apply search query filter to an event
 * @param event - The event to filter
 * @param searchQuery - The search query to filter by (optional)
 * @returns Boolean indicating if the event passes the search filter
 */
export function applySearchFilter(event: CmfEvent, searchQuery?: string): boolean {
    if (!searchQuery || searchQuery.trim() === '') return true

    const query = searchQuery.toLowerCase().trim()

    // Special case for "unresolved" search term
    if (query === 'unresolved') {
        return event.resolved_location?.status !== 'resolved'
    }

    if (query.match(/^\d{5}$/)) {
        // zoom map to zip code
    }

    return !!(
        event.name?.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query) ||
        event.resolved_location?.formatted_address?.toLowerCase().includes(query) ||
        event.resolved_location?.types?.some((type) => type.toLowerCase().includes(query)) || // bars, night_club, point_of_interest, restaurant, etc.
        event.description?.toLowerCase().includes(query)
    )
}

/**
 * Apply map bounds filter to an event
 * @param event - The event to filter
 * @param mapBounds - The map bounds to filter by (optional)
 * @param aggregateCenter - The aggregate center for unresolved events (optional)
 * @returns Boolean indicating if the event passes the map bounds filter
 */
export function applyMapFilter(
    event: CmfEvent,
    mapBounds?: MapBounds,
    aggregateCenter?: { lat: number; lng: number }
): boolean {
    if (!mapBounds) return true

    if (event.resolved_location?.status === 'resolved' && event.resolved_location.lat && event.resolved_location.lng) {
        return (
            event.resolved_location.lat >= mapBounds.south &&
            event.resolved_location.lat <= mapBounds.north &&
            event.resolved_location.lng >= mapBounds.west &&
            event.resolved_location.lng <= mapBounds.east
        )
    }

    // For unresolved events, check if their marker (at aggregate center) is within bounds
    if (!aggregateCenter) {
        return true // If no aggregate center provided, don't filter unresolved events
    }

    return (
        aggregateCenter.lat >= mapBounds.south &&
        aggregateCenter.lat <= mapBounds.north &&
        aggregateCenter.lng >= mapBounds.west &&
        aggregateCenter.lng <= mapBounds.east
    )
}

/**
 * Apply unknown locations filter to an event
 * @param event - The event to filter
 * @param showUnknownLocationsOnly - Whether to show only events with unknown locations (optional)
 * @returns Boolean indicating if the event passes the unknown locations filter
 */
export function applyUnknownLocationsFilter(event: CmfEvent, showUnknownLocationsOnly?: boolean): boolean {
    if (!showUnknownLocationsOnly) return true

    return !hasResolvedLocation(event)
}
