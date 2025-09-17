import { CmfEvent, DateRangeIso, DomainFilters } from '@/types/events'
import { MapBounds } from '@/types/map'
import { hasResolvedLocation, isInBounds } from '@/lib/utils/location'
import { eventInDateRange } from '../utils/date'

// This file is for domain filters and Map filters logic. Map utilities are in location.ts

/**
 * Apply date range filter to an event
 * @param event - The event to filter
 * @param dateRange - The date range to filter by (optional)
 * @returns Boolean indicating if the event passes the date filter
 */
export function applyDateFilter(event: CmfEvent, dateRange?: DateRangeIso): boolean {
    if (!dateRange) return true
    return eventInDateRange(event, dateRange)
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
    cmfEvent: CmfEvent,
    mapBounds?: MapBounds,
    aggregateCenter?: { lat: number; lng: number }
): boolean {
    if (!mapBounds) return true

    if (hasResolvedLocation(cmfEvent)) {
        return isInBounds({ mapBounds, cmfEvent })
    }

    // For unresolved events, check if their marker (at aggregate center) is within bounds
    if (!aggregateCenter) {
        return true // If no aggregate center provided, don't filter unresolved events
    }

    return isInBounds({ mapBounds, lat: aggregateCenter.lat, lng: aggregateCenter.lng })
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

/**
 * Apply all domain filters (search, date, location type) to an event
 * @param event - The event to filter
 * @param filters - The domain filters to apply
 * @returns Boolean indicating if the event passes all domain filters
 */
export function applyDomainFilters(event: CmfEvent, filters: DomainFilters): boolean {
    return (
        applySearchFilter(event, filters.searchQuery) &&
        applyDateFilter(event, filters.dateRange) &&
        applyUnknownLocationsFilter(event, filters.showUnknownLocationsOnly)
    )
}

/**
 * Apply all filters (domain + viewport) to an event
 * @param event - The event to filter
 * @param filters - The domain filters to apply
 * @param viewport - The viewport bounds for map filtering (optional)
 * @param aggregateCenter - The aggregate center for unresolved events (optional)
 * @returns Boolean indicating if the event passes all filters
 */
export function applyAllFilters(
    event: CmfEvent,
    filters: DomainFilters,
    viewport?: MapBounds,
    aggregateCenter?: { lat: number; lng: number }
): boolean {
    return applyDomainFilters(event, filters) && applyMapFilter(event, viewport, aggregateCenter)
}
