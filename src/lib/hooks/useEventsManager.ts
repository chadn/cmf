'use client'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { CalendarEvent, CMFEvents } from '@/types/events'
import { MapBounds } from '@/types/map'
import { FilterEventsManager } from '@/lib/events/FilterEventsManager'
import { logr } from '@/lib/utils/logr'

interface UseEventsManagerProps {
    calendarId?: string
    dateRange?: { start: string; end: string }
    searchQuery?: string
    mapBounds?: MapBounds
    showUnknownLocationsOnly?: boolean
}

interface UseEventsManagerResult {
    // Core event collections
    events: {
        all: CalendarEvent[]
        withLocations: CalendarEvent[]
        withoutLocations: CalendarEvent[]
        filtered: CalendarEvent[]
        filteredWithLocations: CalendarEvent[]
        rawData: any[]
    }
    // Filter methods
    filters: {
        setDateRange: (dateRange?: { start: string; end: string }) => void
        setSearchQuery: (searchQuery: string) => void
        setMapBounds: (mapBounds?: MapBounds) => void
        setShowUnknownLocationsOnly: (show: boolean) => void
        resetAll: () => void
        getStats: () => ReturnType<FilterEventsManager['getFilterStats']>
    }
    // Calendar metadata
    calendar: {
        name: string
        totalCount: number
        unknownLocationsCount: number
    }
    // Loading state
    apiIsLoading: boolean
    apiError: Error | null
    // Manager access
    fltrEvtMgr: FilterEventsManager
    // For backward compatibility with useEvents
    filteredEvents: CalendarEvent[]
    totalCount: number
    filteredCount: number
    unknownLocationsCount: number
    calendarName: string
}

// Custom fetcher function, basically a wrapper to log API requests and responses
// TODO: move this to a separate file
const fetcher = async (url: string) => {
    logr.info('browser', `Request to url: ${url}`)
    try {
        const response = await fetch(url)
        const data = await response.json()
        logr.info('browser', `Response from url: ${url} (${response.status})`, data)
        return data
    } catch (error) {
        logr.info('browser', `Error from url: ${url}`, error)
        throw error
    }
}

/**
 * Custom hook for managing calendar events with filtering capabilities
 */
export function useEventsManager({
    calendarId,
    dateRange,
    searchQuery,
    mapBounds,
    showUnknownLocationsOnly,
}: UseEventsManagerProps = {}): UseEventsManagerResult {
    // Create FilterEventsManager instance
    const [fltrEvtMgr] = useState(() => new FilterEventsManager())

    // Reset FilterEventsManager when calendar ID changes
    useEffect(() => {
        logr.info(
            'use_evts_mgr',
            `uE: FilterEventsManager reset due to calendar ID change to: "${calendarId || 'none'}"`
        )
        fltrEvtMgr.reset()
    }, [calendarId, fltrEvtMgr])

    // Construct the API URL
    const apiUrl = calendarId ? `/api/calendar?id=${encodeURIComponent(calendarId)}` : null

    // Log the API URL being used
    useEffect(() => {
        if (apiUrl) {
            logr.info('use_evts_mgr', `uE: API URL for calendar data: "${apiUrl}"`)
        }
    }, [apiUrl])

    // Fetch events from API
    // understand this better: https://swr.vercel.app/docs/getting-started
    // TODO: Chad - do we need useSWR here? apiIsLoading does not change in swr.vercel.app
    const { data, error, isLoading } = useSWR<CMFEvents>(apiUrl, fetcher, {
        revalidateOnFocus: false,
        onSuccess: (apiData) => {
            if (!apiData) return
            logr.info('use_evts_mgr', 'Calendar data fetched successfully', {
                calendarName: apiData.calendar_name || 'Unknown Calendar',
                totalEvents: apiData.total_count || 0,
            })
            // Note this gets called when the data is fetched, but useEffect monitoriing apiData does not trigger
            logr.debug(
                // fltrEvtMgr.cmf_events_filtered
                'use_evts_mgr',
                `Before fltrEvtMgr.cmf_events_all=${fltrEvtMgr.cmf_events_all.length}`
            )
            logr.info('use_evts_mgr', `Calling fltrEvtMgr.setEvents(${apiData.events.length})`)
            fltrEvtMgr.setEvents(apiData.events)
            logr.debug(
                // fltrEvtMgr.cmf_events_filtered
                'use_evts_mgr',
                `After fltrEvtMgr.cmf_events_all=${fltrEvtMgr.cmf_events_all.length}`
            )
        },
        onError: (apiError) => {
            logr.info('use_evts_mgr', `❌ Error fetching calendar data for ID: "${calendarId || 'unknown'}"`, {
                apiError: apiError.message,
                apiUrl,
            })
            logr.info('use_evts_mgr', `Error fetching calendar data for ID: "${calendarId || 'unknown'}"`, apiError)
        },
    })

    useEffect(() => {
        logr.info('use_evts_mgr', `uE: isLoading changed to ${isLoading}`)
    }, [isLoading])

    // Update events in FilterEventsManager when data changes
    useEffect(() => {
        if (data?.events) {
            logr.info('use_evts_mgr', `uE: Calling fltrEvtMgr.setEvents(${data.events.length})`)
            fltrEvtMgr.setEvents(data.events)
        }
    }, [data?.events, fltrEvtMgr])

    // Apply initial filters if provided
    useEffect(() => {
        if (dateRange) {
            fltrEvtMgr.setDateRange(dateRange)
        }
        if (searchQuery) {
            fltrEvtMgr.setSearchQuery(searchQuery)
        }
        if (mapBounds) {
            fltrEvtMgr.setMapBounds(mapBounds)
        }
        if (showUnknownLocationsOnly !== undefined) {
            fltrEvtMgr.setShowUnknownLocationsOnly(showUnknownLocationsOnly)
        }
    }, [dateRange, searchQuery, mapBounds, showUnknownLocationsOnly, fltrEvtMgr])

    // Log when the return values change
    useEffect(() => {
        if (data && !isLoading && data.events) {
            logr.info('use_evts_mgr', 'uE: Events hook return values updated', {
                dataEventsLength: data.events?.length || 0,
                filteredEventsLength: fltrEvtMgr.cmf_events_filtered.length,
                calendarName: data.calendar_name || '',
            })
        }
    }, [data, isLoading, fltrEvtMgr])

    // Create a streamlined interface for the hook
    return {
        events: {
            all: fltrEvtMgr.cmf_events_all,
            withLocations: fltrEvtMgr.cmf_events_locations,
            withoutLocations: fltrEvtMgr.cmf_events_unknown_locations,
            filtered: fltrEvtMgr.cmf_events_filtered,
            filteredWithLocations: fltrEvtMgr.cmf_events_filtered,
            rawData: data?.events || [],
        },
        filters: {
            setDateRange: (range) => fltrEvtMgr.setDateRange(range),
            setSearchQuery: (query) => fltrEvtMgr.setSearchQuery(query),
            setMapBounds: (bounds) => fltrEvtMgr.setMapBounds(bounds),
            setShowUnknownLocationsOnly: (show) => fltrEvtMgr.setShowUnknownLocationsOnly(show),
            resetAll: () => fltrEvtMgr.resetAllFilters(),
            getStats: () => fltrEvtMgr.getFilterStats(),
        },
        calendar: {
            name: data?.calendar_name || '',
            totalCount: data?.total_count || 0,
            unknownLocationsCount: data?.unknown_locations_count || 0,
        },
        apiIsLoading: isLoading,
        apiError: error || null,
        fltrEvtMgr, // Expose the manager for advanced use cases

        // For backward compatibility with useEvents
        filteredEvents: fltrEvtMgr.cmf_events_filtered,
        totalCount: data?.total_count || 0,
        filteredCount: fltrEvtMgr.cmf_events_filtered.length,
        unknownLocationsCount: data?.unknown_locations_count || 0,
        calendarName: data?.calendar_name || '',
    }
}
