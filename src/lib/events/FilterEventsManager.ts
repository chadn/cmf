'use client'

import { CmfEvent, EventsFilter, FilteredEvents } from '@/types/events'
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
     *
     * Single-stage filtering model:
     * - Domain filters: dateRange, searchQuery, showUnknownLocationsOnly determine core result set
     * - Viewport filter: currentViewport (passed as parameter) determines what's currently visible
     * - Map chip count = total events - events located in current viewport (including those they may be filtered out)
     */
    getFilteredEvents(currentViewport?: MapBounds): FilteredEvents {
        const hiddenCounts = {
            byMap: 0,
            bySearch: 0,
            byDate: 0,
            byLocationFilter: 0,
        }

        // Check if any filters have actual values (not just undefined)
        const hasActiveFilters = Object.values(this.filters).some((value) => value !== undefined)
        if (!hasActiveFilters && !currentViewport) {
            logr.debug('fltr_evts_mgr', 'getFilteredEvents returning all events, no active filters and no viewport')
            return {
                allEvents: this.allEvents,
                visibleEvents: this.allEvents,
                hiddenCounts,
            }
        }

        // Ensure aggregate center is available for map filtering
        if (!this.aggregateCenter) {
            this.updateAggregateCenter()
        }

        // Apply domain filters (date, search, location type) and viewport filter independently
        const domainFilteredEvents: CmfEvent[] = []

        this.allEvents.forEach((event) => {
            let domainFiltered = false

            // Calculate independent chip counts - each filter checks against ALL events
            // Count events hidden by each filter (checking against ALL events for accurate counts)
            if (!applySearchFilter(event, this.filters.searchQuery) && this.filters.searchQuery) {
                hiddenCounts.bySearch++
            }
            if (!applyDateFilter(event, this.filters.dateRange) && this.filters.dateRange) {
                hiddenCounts.byDate++
            }
            if (
                !applyUnknownLocationsFilter(event, this.filters.showUnknownLocationsOnly) &&
                this.filters.showUnknownLocationsOnly
            ) {
                hiddenCounts.byLocationFilter++
            }

            // Count events hidden by viewport filter independently
            if (currentViewport && !applyMapFilter(event, currentViewport, this.aggregateCenter || undefined)) {
                hiddenCounts.byMap++
            }

            // Check if event passes all domain filters
            if (!applySearchFilter(event, this.filters.searchQuery) && this.filters.searchQuery) {
                domainFiltered = true
            }
            if (!applyDateFilter(event, this.filters.dateRange) && this.filters.dateRange) {
                domainFiltered = true
            }
            if (
                !applyUnknownLocationsFilter(event, this.filters.showUnknownLocationsOnly) &&
                this.filters.showUnknownLocationsOnly
            ) {
                domainFiltered = true
            }

            if (!domainFiltered) {
                domainFilteredEvents.push(event)
            }
        })

        // Apply viewport filter to determine what's currently visible
        const visibleEvents: CmfEvent[] = []
        if (currentViewport) {
            domainFilteredEvents.forEach((event) => {
                const passesViewportFilter = applyMapFilter(event, currentViewport, this.aggregateCenter || undefined)
                if (passesViewportFilter) {
                    visibleEvents.push(event)
                }
            })
        } else {
            // No viewport filter, show all domain-filtered events
            visibleEvents.push(...domainFilteredEvents)
        }

        return {
            allEvents: this.allEvents,
            visibleEvents,
            hiddenCounts,
        }
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

    // Note: Map bounds are now passed as parameter to getFilteredEvents()
    // No longer stored in filter state

    // Set unknown locations filter
    setShowUnknownLocationsOnly(show: boolean) {
        this.setFilter('showUnknownLocationsOnly', show)
    }

    // Reset all filters
    resetAllFilters() {
        this.filters = {
            dateRange: undefined,
            searchQuery: undefined,
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
}
