'use client'

import { CmfEvent, CmfEvents, DateRangeIso, DomainFilters } from '@/types/events'
import { MapBounds } from '@/types/map'
import { logr } from '@/lib/utils/logr'
import { stringify } from '@/lib/utils/utils-shared'
import { hasResolvedLocation, calculateAggregateCenter } from '@/lib/utils/location'
import {
    applyDateFilter,
    applySearchFilter,
    applyMapFilter,
    applyUnknownLocationsFilter,
    applyDomainFilters,
} from './filters'

/**
 * Class for managing filters for events
 */
export class FilterEventsManager {
    private allEvents: CmfEvent[]
    private filters: DomainFilters
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
     * @param mapBounds - Current map bounds for map filtering. If not provided, no map filtering will be applied.
     *
     * Single-stage filtering model:
     * - Domain filters: dateRange, searchQuery, showUnknownLocationsOnly determine core result set
     * - Map Bounds filter: mapBounds (passed as parameter) determines what's currently visible
     * - Map chip count = total events - events located in current viewport (including those they may be filtered out)
     */
    getCmfEvents(mapBounds?: MapBounds): CmfEvents {
        const result: CmfEvents = {
            allEvents: this.allEvents,
            visibleEvents: this.allEvents,
            hiddenCounts: {
                byMap: 0,
                bySearch: 0,
                byDate: 0,
                byLocationFilter: 0,
            },
        }
        const debugHidden = {
            byMap: [] as string[],
            bySearch: [] as string[],
            byDate: [] as string[],
            byLocationFilter: [] as string[],
        }

        // Check if any filters have actual values (not just undefined)
        const hasActiveFilters = Object.values(this.filters).some((value) => value !== undefined)
        if (!hasActiveFilters && !mapBounds) {
            logr.info('fltr_evts_mgr', `getCmfEvents return counts ${stringify(result)} no filters no bounds`)
            return result
        }

        // Ensure aggregate center is available for map filtering
        if (!this.aggregateCenter) {
            this.updateAggregateCenter()
        }

        // Calculate independent chip counts - each filter checks against ALL events
        this.allEvents.forEach((event) => {
            if (!applySearchFilter(event, this.filters.searchQuery) && this.filters.searchQuery) {
                result.hiddenCounts.bySearch++
                debugHidden.bySearch.push(event.id)
            }
            if (!applyDateFilter(event, this.filters.dateRange) && this.filters.dateRange) {
                result.hiddenCounts.byDate++
                debugHidden.byDate.push(event.id)
            }
            if (
                !applyUnknownLocationsFilter(event, this.filters.showUnknownLocationsOnly) &&
                this.filters.showUnknownLocationsOnly
            ) {
                result.hiddenCounts.byLocationFilter++
                debugHidden.byLocationFilter.push(event.id)
            }
            if (mapBounds && !applyMapFilter(event, mapBounds, this.aggregateCenter || undefined)) {
                result.hiddenCounts.byMap++
                debugHidden.byMap.push(event.id)
            }
        })

        // Apply domain filters to get events that pass all domain filters
        const domainFilteredEvents = this.allEvents.filter((event) => applyDomainFilters(event, this.filters))
        logr.info('fltr_evts_mgr', `getCmfEvents ${domainFilteredEvents.length} visibleEvents before map`, mapBounds)

        // Apply map filter to determine what's currently visible
        if (mapBounds) {
            result.visibleEvents = domainFilteredEvents.filter((event) =>
                applyMapFilter(event, mapBounds, this.aggregateCenter || undefined)
            )
        } else {
            // No map filter, show all domain-filtered events
            result.visibleEvents = domainFilteredEvents
        }
        logr.info('fltr_evts_mgr', `getCmfEvents return counts ${stringify(result)}`)
        logr.debug('fltr_evts_mgr', `getCmfEvents debug hidden events ${stringify(debugHidden)}`)

        return result
    }

    /**
     * Set filter and log once
     * @param filterName Name of the filter being updated
     * @param value New filter value
     */
    private setFilter<K extends keyof DomainFilters>(filterName: K, value: DomainFilters[K]) {
        this.filters[filterName] = value
        const fValue =
            filterName === 'dateRange' && value && typeof value === 'object' && 'startIso' in value
                ? `${value.startIso} to ${value.endIso}`
                : `${value}`
        logr.info('fltr_evts_mgr', `setFilter: ${filterName}: ${fValue}`)
    }

    // Set date range filter
    setDateRange(dateRange?: DateRangeIso) {
        this.setFilter('dateRange', dateRange)
    }

    // Set search query filter
    setSearchQuery(searchQuery: string) {
        this.setFilter('searchQuery', searchQuery)
    }

    // Note: Map bounds are now passed as parameter to getCmfEvents()
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
