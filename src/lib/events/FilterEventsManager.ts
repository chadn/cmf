'use client'

import { CmfEvent, EventsFilter, FilteredEvents, FilterStats } from '@/types/events'
import { MapBounds } from '@/types/map'
import { logr } from '@/lib/utils/logr'
import { calculateAggregateCenter } from '@/lib/utils/location'

/**
 * Class for managing calendar events and applying filters
 */
export class FilterEventsManager {
    private allEvents: CmfEvent[]
    private filters: EventsFilter
    private aggregateCenter: { lat: number; lng: number } | null = null

    constructor(events: CmfEvent[] = []) {
        this.allEvents = events
        this.filters = {
            dateRange: undefined,
            searchQuery: undefined,
            mapBounds: undefined,
            showUnknownLocationsOnly: undefined,
        }
        this.updateAggregateCenter()
        logr.info('fltr_evts_mgr', 'FilterEventsManager initialized', {
            eventsCount: events.length,
        })
    }

    /**
     * Update all events
     * @param events - List of calendar events
     */
    setEvents(events: CmfEvent[]) {
        this.allEvents = events
        this.updateAggregateCenter()
        logr.info('fltr_evts_mgr', `setEvents(${events.length}) set eventsManager.allEvents=${this.allEvents.length}`)
    }

    /**
     * Update the aggregate center when events change
     */
    private updateAggregateCenter() {
        this.aggregateCenter = calculateAggregateCenter(this.allEvents)
    }

    /**
     * Get all events (unfiltered)
     */
    get cmf_events_all(): CmfEvent[] {
        return this.allEvents
    }

    /**
     * Check if an event has a resolved location
     */
    private hasResolvedLocation(event: CmfEvent): boolean {
        return !!(
            event.resolved_location?.status === 'resolved' &&
            event.resolved_location.lat &&
            event.resolved_location.lng
        )
    }

    /**
     * Get events with resolved locations
     */
    get cmf_events_locations(): CmfEvent[] {
        return this.allEvents.filter(this.hasResolvedLocation)
    }

    /**
     * Get events with unknown or unresolved locations
     */
    get cmf_events_unknown_locations(): CmfEvent[] {
        return this.allEvents.filter((event) => !this.hasResolvedLocation(event))
    }

    /**
     * Apply date range filter to an event
     */
    private applyDateFilter(event: CmfEvent): boolean {
        if (!this.filters.dateRange) return true

        const eventStart = new Date(event.start)
        const eventEnd = new Date(event.end)
        const rangeStart = new Date(this.filters.dateRange.start)
        const rangeEnd = new Date(this.filters.dateRange.end)

        return !(eventEnd < rangeStart || eventStart > rangeEnd)
    }

    /**
     * Apply search query filter to an event
     */
    private applySearchFilter(event: CmfEvent): boolean {
        if (!this.filters.searchQuery || this.filters.searchQuery.trim() === '') return true

        const query = this.filters.searchQuery.toLowerCase().trim()

        // Special case for "unresolved" search term
        if (query === 'unresolved') {
            return event.resolved_location?.status !== 'resolved'
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
     * This filter checks if the event's location falls within the specified map bounds.
     * For unresolved events, checks if their marker's location is within bounds.
     */
    private applyMapFilter(event: CmfEvent): boolean {
        if (!this.filters.mapBounds) return true

        if (
            event.resolved_location?.status === 'resolved' &&
            event.resolved_location.lat &&
            event.resolved_location.lng
        ) {
            return (
                event.resolved_location.lat >= this.filters.mapBounds.south &&
                event.resolved_location.lat <= this.filters.mapBounds.north &&
                event.resolved_location.lng >= this.filters.mapBounds.west &&
                event.resolved_location.lng <= this.filters.mapBounds.east
            )
        }

        // For unresolved events, check if their marker (at aggregate center) is within bounds
        if (!this.aggregateCenter) {
            this.updateAggregateCenter()
        }
        return (
            this.aggregateCenter!.lat >= this.filters.mapBounds.south &&
            this.aggregateCenter!.lat <= this.filters.mapBounds.north &&
            this.aggregateCenter!.lng >= this.filters.mapBounds.west &&
            this.aggregateCenter!.lng <= this.filters.mapBounds.east
        )
    }

    /**
     * Apply unknown locations filter to an event
     */
    private applyUnknownLocationsFilter(event: CmfEvent): boolean {
        if (!this.filters.showUnknownLocationsOnly) return true

        return !this.hasResolvedLocation(event)
    }

    /**
     * Get filtered events
     */
    getFilteredEvents(): FilteredEvents {
        const filteredEvents: FilteredEvents = {
            mapFilteredEvents: [],
            searchFilteredEvents: [],
            dateFilteredEvents: [],
            unknownLocationsFilteredEvents: [],
            filteredEvents: [],
            shownEvents: [],
            allEvents: this.allEvents,
        }

        if (Object.keys(this.filters).length === 0) {
            logr.debug('fltr_evts_mgr', 'getFilteredEvents returning all events, no filters exist')
            filteredEvents.shownEvents = this.allEvents
            return filteredEvents
        }

        this.allEvents.forEach((event) => {
            let filtered = false
            if (!this.applyMapFilter(event) && this.filters.mapBounds) {
                filteredEvents.mapFilteredEvents.push(event)
                filtered = true
            }
            if (!this.applySearchFilter(event) && this.filters.searchQuery) {
                filteredEvents.searchFilteredEvents.push(event)
                filtered = true
            }
            if (!this.applyDateFilter(event) && this.filters.dateRange) {
                filteredEvents.dateFilteredEvents.push(event)
                filtered = true
            }
            if (!this.applyUnknownLocationsFilter(event) && this.filters.showUnknownLocationsOnly) {
                filteredEvents.unknownLocationsFilteredEvents.push(event)
                filtered = true
            }
            if (filtered) {
                filteredEvents.filteredEvents.push(event)
            } else {
                filteredEvents.shownEvents.push(event)
            }
        })
        logr.debug('fltr_evts_mgr', 'getFilteredEvents returning filteredEvents:', filteredEvents)

        return filteredEvents
    }

    /**
     * Set filter and log once
     * @param filterName Name of the filter being updated
     * @param value New filter value
     */
    private setFilter<K extends keyof EventsFilter>(filterName: K, value: EventsFilter[K]) {
        this.filters[filterName] = value
        logr.info('fltr_evts_mgr', `Filter updated: ${filterName}`, value)
    }

    // Set date range filter
    setDateRange(dateRange?: { start: string; end: string }) {
        this.setFilter('dateRange', dateRange)
    }

    // Set search query filter
    setSearchQuery(searchQuery: string) {
        this.setFilter('searchQuery', searchQuery)
    }

    // Set map bounds filter
    setMapBounds(mapBounds?: MapBounds) {
        this.setFilter('mapBounds', mapBounds)
    }

    // Set unknown locations filter
    setShowUnknownLocationsOnly(show: boolean) {
        this.setFilter('showUnknownLocationsOnly', show)
    }

    // Reset all filters
    resetAllFilters() {
        this.filters = {
            dateRange: undefined,
            searchQuery: undefined,
            mapBounds: undefined,
            showUnknownLocationsOnly: undefined,
        }
        logr.info('fltr_evts_mgr', 'All filters reset')
    }

    // Reset everything - both events and filters
    reset() {
        this.allEvents = []
        this.aggregateCenter = null
        this.resetAllFilters()
        logr.info('fltr_evts_mgr', 'FilterEventsManager fully reset (events and filters)')
    }

    // Get filter stats - for displaying filter chips, etc.
    getFilterStats(): FilterStats {
        const filteredEvents = this.getFilteredEvents()
        const stats: FilterStats = {
            mapFilteredCount: filteredEvents.mapFilteredEvents.length,
            searchFilteredCount: filteredEvents.searchFilteredEvents.length,
            dateFilteredCount: filteredEvents.dateFilteredEvents.length,
            unknownLocationsFilteredCount: filteredEvents.unknownLocationsFilteredEvents.length,
            totalFilteredCount: filteredEvents.filteredEvents.length,
            totalShownCount: filteredEvents.shownEvents.length,
            totalEventsCount: this.allEvents.length,
        }
        logr.debug('fltr_evts_mgr', 'getFilterStats:', stats)
        return stats
    }
}
