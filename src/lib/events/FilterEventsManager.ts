'use client'

import { CalendarEvent } from '@/types/events'
import { MapBounds } from '@/types/map'
import { logr } from '@/lib/utils/logr'

export interface EventsFilter {
    dateRange?: { start: string; end: string }
    searchQuery?: string
    mapBounds?: MapBounds
    showUnknownLocationsOnly?: boolean
}

export interface FilterStats {
    mapFilteredCount: number
    searchFilteredCount: number
    dateFilteredCount: number
    totalFilteredCount: number
}

/**
 * Class for managing calendar events and applying filters
 */
export class FilterEventsManager {
    private allEvents: CalendarEvent[]
    private filters: EventsFilter

    constructor(events: CalendarEvent[] = []) {
        this.allEvents = events
        this.filters = {}
        logr.info('fltr_evts_mgr', 'FilterEventsManager initialized', {
            eventsCount: events.length,
        })
    }

    /**
     * Update all events
     * @param events - List of calendar events
     */
    setEvents(events: CalendarEvent[]) {
        this.allEvents = events
        logr.info('fltr_evts_mgr', `setEvents(${events.length}) set eventsManager.allEvents`, {
            eventsCount: events.length,
        })
    }

    /**
     * Get all events (unfiltered)
     */
    get cmf_events_all(): CalendarEvent[] {
        return this.allEvents
    }

    /**
     * Check if an event has a resolved location
     */
    private hasResolvedLocation(event: CalendarEvent): boolean {
        return !!(
            event.resolved_location?.status === 'resolved' &&
            event.resolved_location.lat &&
            event.resolved_location.lng
        )
    }

    /**
     * Get events with resolved locations
     */
    get cmf_events_locations(): CalendarEvent[] {
        return this.allEvents.filter(this.hasResolvedLocation)
    }

    /**
     * Get events with unknown or unresolved locations
     */
    get cmf_events_unknown_locations(): CalendarEvent[] {
        return this.allEvents.filter((event) => !this.hasResolvedLocation(event))
    }

    /**
     * Apply date range filter to an event
     */
    private applyDateFilter(event: CalendarEvent): boolean {
        if (!this.filters.dateRange) return true

        const eventStart = new Date(event.startDate)
        const eventEnd = new Date(event.endDate)
        const rangeStart = new Date(this.filters.dateRange.start)
        const rangeEnd = new Date(this.filters.dateRange.end)

        return !(eventEnd < rangeStart || eventStart > rangeEnd)
    }

    /**
     * Apply search query filter to an event
     */
    private applySearchFilter(event: CalendarEvent): boolean {
        if (!this.filters.searchQuery || this.filters.searchQuery.trim() === '') return true

        const query = this.filters.searchQuery.toLowerCase()
        return !!(
            event.name?.toLowerCase().includes(query) ||
            event.location?.toLowerCase().includes(query) ||
            event.description?.toLowerCase().includes(query)
        )
    }

    /**
     * Apply map bounds filter to an event
     * This filter checks if the event's location falls within the specified map bounds.
     */
    private applyBoundsFilter(event: CalendarEvent): boolean {
        if (!this.filters.mapBounds) return true
        if (!this.hasResolvedLocation(event)) return false

        const { lat, lng } = event.resolved_location!

        if (lat && lng) {
            return (
                lat >= this.filters.mapBounds.south &&
                lat <= this.filters.mapBounds.north &&
                lng >= this.filters.mapBounds.west &&
                lng <= this.filters.mapBounds.east
            )
        } else {
            return false
        }
    }

    /**
     * Apply unknown locations filter to an event
     */
    private applyUnknownLocationsFilter(event: CalendarEvent): boolean {
        if (!this.filters.showUnknownLocationsOnly) return true

        return !this.hasResolvedLocation(event)
    }

    /**
     * Apply all filters and return filtered events (not filtered out)
     * TODO: Consider splitting this into 2 function differentiate between events with and without resolved locations (filteredWithLocations)
     * and show them in different lists.  This would be useful for showing events with unknown locations
     * in the filtered results.  Events list could show with and without resolved locations, map show just with.
     */
    get cmf_events_filtered(): CalendarEvent[] {
        // If no filters are applied, return all events
        if (Object.keys(this.filters).length === 0) {
            return this.allEvents
        }

        const filterCounts = {
            dateFiltered: 0,
            searchFiltered: 0,
            boundsFiltered: 0,
            unknownLocationsFiltered: 0,
        }

        const filtered = this.allEvents.filter((event) => {
            // Apply all filters sequentially
            if (!this.applyDateFilter(event)) {
                filterCounts.dateFiltered++
                return false
            }

            if (!this.applySearchFilter(event)) {
                filterCounts.searchFiltered++
                return false
            }

            if (!this.applyBoundsFilter(event)) {
                filterCounts.boundsFiltered++
                return false
            }

            if (!this.applyUnknownLocationsFilter(event)) {
                filterCounts.unknownLocationsFiltered++
                return false
            }

            return true
        })
        //console.log(`get cmf_events_filtered ${this.allEvents.length} events, ${filtered.length} filtered events`)

        logr.info('fltr_evts_mgr', 'get cmf_events_filtered', {
            originalCount: this.allEvents.length,
            filteredCount: filtered.length,
            ...filterCounts,
        })

        return filtered
    }

    /**
     * Set filter and log once
     * @param filterName Name of the filter being updated
     * @param value New filter value
     */
    private setFilter(filterName: keyof EventsFilter, value: any) {
        this.filters[filterName] = value
        logr.info('fltr_evts_mgr', `Filter updated: ${filterName}`, { [filterName]: value })
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
        this.filters = {}
        logr.info('fltr_evts_mgr', 'All filters reset')
    }

    // Reset everything - both events and filters
    reset() {
        this.allEvents = []
        this.filters = {}
        logr.info('fltr_evts_mgr', 'FilterEventsManager fully reset (events and filters)')
    }

    // Get filter stats - for displaying filter chips, etc.
    getFilterStats(): FilterStats {
        let mapFilteredCount = 0
        let searchFilteredCount = 0
        let dateFilteredCount = 0

        this.allEvents.forEach((event) => {
            if (!this.applyBoundsFilter(event) && this.filters.mapBounds) {
                mapFilteredCount++
            }

            if (!this.applySearchFilter(event) && this.filters.searchQuery) {
                searchFilteredCount++
            }

            if (!this.applyDateFilter(event) && this.filters.dateRange) {
                dateFilteredCount++
            }
        })

        const totalFilteredCount = mapFilteredCount + searchFilteredCount + dateFilteredCount

        return {
            mapFilteredCount,
            searchFilteredCount,
            dateFilteredCount,
            totalFilteredCount,
        }
    }
}
