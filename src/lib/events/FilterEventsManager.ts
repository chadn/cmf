'use client'

import { CmfEvent, EventsFilter, FilteredEvents, FilterStats } from '@/types/events'
import { MapBounds } from '@/types/map'
import { logr } from '@/lib/utils/logr'
import { calculateAggregateCenter } from '@/lib/utils/location'
import {
    hasResolvedLocation,
    applyDateFilter,
    applySearchFilter,
    applyMapFilter,
    applyUnknownLocationsFilter,
} from './filters'

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

    // Note: hasResolvedLocation is now imported from ./filters as a pure function

    /**
     * Get events with resolved locations
     */
    get cmf_events_locations(): CmfEvent[] {
        return this.allEvents.filter(hasResolvedLocation)
    }

    /**
     * Get events with unknown or unresolved locations
     */
    get cmf_events_unknown_locations(): CmfEvent[] {
        return this.allEvents.filter((event) => !hasResolvedLocation(event))
    }

    // Note: Filter methods are now imported from ./filters as pure functions

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

        // Ensure aggregate center is available for map filtering
        if (!this.aggregateCenter) {
            this.updateAggregateCenter()
        }

        this.allEvents.forEach((event) => {
            let filtered = false
            if (
                !applyMapFilter(event, this.filters.mapBounds, this.aggregateCenter || undefined) &&
                this.filters.mapBounds
            ) {
                filteredEvents.mapFilteredEvents.push(event)
                filtered = true
            }
            if (!applySearchFilter(event, this.filters.searchQuery) && this.filters.searchQuery) {
                filteredEvents.searchFilteredEvents.push(event)
                filtered = true
            }
            if (!applyDateFilter(event, this.filters.dateRange) && this.filters.dateRange) {
                filteredEvents.dateFilteredEvents.push(event)
                filtered = true
            }
            if (
                !applyUnknownLocationsFilter(event, this.filters.showUnknownLocationsOnly) &&
                this.filters.showUnknownLocationsOnly
            ) {
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
