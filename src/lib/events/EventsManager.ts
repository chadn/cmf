'use client'

import { CalendarEvent } from '@/types/events'
import { MapBounds } from '@/types/map'
import { debugLog } from '@/lib/utils/debug'

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
export class EventsManager {
    private allEvents: CalendarEvent[]
    private filters: EventsFilter

    constructor(events: CalendarEvent[] = []) {
        this.allEvents = events
        this.filters = {}
        debugLog('events_manager', 'EventsManager initialized', {
            eventsCount: events.length,
        })
    }

    /**
     * Update all events
     * @param events - List of calendar events
     */
    setEvents(events: CalendarEvent[]) {
        this.allEvents = events
        debugLog('events_manager', 'Events updated', {
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
        return this.allEvents.filter(event => !this.hasResolvedLocation(event))
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
     * Apply all filters and return filtered events
     */
    get cmf_events_active(): CalendarEvent[] {
        // If no filters are applied, return all events
        if (Object.keys(this.filters).length === 0) {
            return this.allEvents
        }

        const filterCounts = {
            dateFiltered: 0,
            searchFiltered: 0,
            boundsFiltered: 0,
            unknownLocationsFiltered: 0
        }

        const filtered = this.allEvents.filter(event => {
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

        debugLog('events_manager', 'Filters applied', {
            originalCount: this.allEvents.length,
            filteredCount: filtered.length,
            ...filterCounts
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
        debugLog('events_manager', `Filter updated: ${filterName}`, { [filterName]: value })
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
        debugLog('events_manager', 'All filters reset')
    }

    // Reset everything - both events and filters
    reset() {
        this.allEvents = []
        this.filters = {}
        debugLog('events_manager', 'EventsManager fully reset (events and filters)')
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
            totalFilteredCount
        }
    }
}
