'use client'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { CalendarEvent, CMFEvents } from '@/types/events'
import { MapBounds } from '@/types/map'
import { EventsManager } from '@/lib/events/EventsManager'
import { debugLog, clientDebug } from '@/lib/utils/debug'

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
    }
    // Filter methods
    filters: {
        setDateRange: (dateRange?: { start: string; end: string }) => void
        setSearchQuery: (searchQuery: string) => void
        setMapBounds: (mapBounds?: MapBounds) => void
        setShowUnknownLocationsOnly: (show: boolean) => void
        resetAll: () => void
        getStats: () => ReturnType<EventsManager['getFilterStats']>
    }
    // Calendar metadata
    calendar: {
        name: string
        totalCount: number
        unknownLocationsCount: number
    }
    // Loading state
    isLoading: boolean
    error: Error | null
    // Manager access
    eventsManager: EventsManager
    // For backward compatibility with useEvents
    filteredEvents: CalendarEvent[]
    totalCount: number
    filteredCount: number
    unknownLocationsCount: number
    calendarName: string
}

// Custom fetcher function that logs API requests and responses
// TODO: move this to a separate file
const fetcher = async (url: string) => {
    clientDebug.log('api', `Request to: ${url}`)
    try {
        const response = await fetch(url)
        const data = await response.json()
        clientDebug.log('api', `Response from: ${url} (${response.status})`, data)
        return data
    } catch (error) {
        clientDebug.error('api', `Error from: ${url}`, error)
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
    showUnknownLocationsOnly
}: UseEventsManagerProps = {}): UseEventsManagerResult {
    // Create EventsManager instance
    const [eventsManager] = useState(() => new EventsManager())
    
    // Reset EventsManager when calendar ID changes
    useEffect(() => {
        debugLog('events', `EventsManager reset due to calendar ID change to: "${calendarId || 'none'}"`)
        eventsManager.reset()
    }, [calendarId, eventsManager])

    // Construct the API URL
    const apiUrl = calendarId ? `/api/calendar?id=${encodeURIComponent(calendarId)}` : null
    
    // Log the API URL being used
    useEffect(() => {
        if (apiUrl) {
            debugLog('events', `API URL for calendar data: "${apiUrl}"`)
        }
    }, [apiUrl])
    
    // Fetch events from API
    const { data, error, isLoading } = useSWR<CMFEvents>(apiUrl, fetcher, {
        revalidateOnFocus: false,
        onSuccess: (data) => {
            if (!data) return
            // TODO: Chad refactor debugLog vs clientDebug - both of these log to browser console, only one is needed
            debugLog('events', `✅ Calendar data fetched: "${data.calendar_name || 'Unknown Calendar'}"`, {
                calendarId: data.calendar_id || 'unknown',
                totalEvents: data.total_count || 0,
                unknownLocations: data.unknown_locations_count || 0,
            })
            clientDebug.log('events', 'Calendar data fetched successfully', {
                calendarName: data.calendar_name || 'Unknown Calendar',
                totalEvents: data.total_count || 0,
            })
        },
        onError: (err) => {
            debugLog('events', `❌ Error fetching calendar data for ID: "${calendarId || 'unknown'}"`, {
                error: err.message,
                apiUrl,
            })
            clientDebug.error(
                'events',
                `Error fetching calendar data for ID: "${
                    calendarId || 'unknown'
                }"`,
                err
            )
        },
    })

    // Update events in EventsManager when data changes
    useEffect(() => {
        if (data?.events) {
            eventsManager.setEvents(data.events)
        }
    }, [data?.events, eventsManager])

    // Apply initial filters if provided
    useEffect(() => {
        if (dateRange) {
            eventsManager.setDateRange(dateRange)
        }
        if (searchQuery) {
            eventsManager.setSearchQuery(searchQuery)
        }
        if (mapBounds) {
            eventsManager.setMapBounds(mapBounds)
        }
        if (showUnknownLocationsOnly !== undefined) {
            eventsManager.setShowUnknownLocationsOnly(showUnknownLocationsOnly)
        }
    }, [dateRange, searchQuery, mapBounds, showUnknownLocationsOnly, eventsManager])

    // Log when the return values change
    useEffect(() => {
        if (data && !isLoading && data.events) {
            debugLog('events', 'Events hook return values updated', {
                totalEvents: data.events?.length || 0,
                filteredEvents: eventsManager.cmf_events_active.length,
                calendarName: data.calendar_name || '',
            })
        }
    }, [data, isLoading, eventsManager])

    // Create a streamlined interface for the hook
    return {
        events: {
            all: eventsManager.cmf_events_all,
            withLocations: eventsManager.cmf_events_locations,
            withoutLocations: eventsManager.cmf_events_unknown_locations,
            filtered: eventsManager.cmf_events_active,
        },
        filters: {
            setDateRange: (range) => eventsManager.setDateRange(range),
            setSearchQuery: (query) => eventsManager.setSearchQuery(query),
            setMapBounds: (bounds) => eventsManager.setMapBounds(bounds),
            setShowUnknownLocationsOnly: (show) => eventsManager.setShowUnknownLocationsOnly(show),
            resetAll: () => eventsManager.resetAllFilters(),
            getStats: () => eventsManager.getFilterStats(),
        },
        calendar: {
            name: data?.calendar_name || '',
            totalCount: data?.total_count || 0,
            unknownLocationsCount: data?.unknown_locations_count || 0,
        },
        isLoading,
        error: error || null,
        eventsManager, // Expose the manager for advanced use cases
        
        // For backward compatibility with useEvents
        filteredEvents: eventsManager.cmf_events_active,
        totalCount: data?.total_count || 0,
        filteredCount: eventsManager.cmf_events_active.length,
        unknownLocationsCount: data?.unknown_locations_count || 0,
        calendarName: data?.calendar_name || '',
    }
}
