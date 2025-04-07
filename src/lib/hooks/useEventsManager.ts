'use client'
import { useState, useEffect, useMemo, useReducer } from 'react'
import useSWR from 'swr'
import { CalendarEvent, EventsState, EventsAction, EventFilters } from '@/types/events'
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
    events: {
        all: CalendarEvent[]
        withLocations: CalendarEvent[]
        withoutLocations: CalendarEvent[]
        filtered: CalendarEvent[]
        filteredWithLocations: CalendarEvent[]
        rawData: CalendarEvent[]
        shown: () => CalendarEvent[]
    }
    filters: {
        setDateRange: (dateRange: { start: string; end: string } | undefined) => void
        setSearchQuery: (query: string) => void
        setMapBounds: (bounds: MapBounds | undefined) => void
        setShowUnknownLocationsOnly: (show: boolean) => void
        resetAll: () => void
        getStats: () => { mapFilteredCount: number; searchFilteredCount: number; dateFilteredCount: number }
    }
    calendar: {
        name: string
        totalCount: number
        unknownLocationsCount: number
    }
    apiIsLoading: boolean
    apiError: Error | null
    fltrEvtMgr: FilterEventsManager
    // For backward compatibility
    filteredEvents: CalendarEvent[]
    totalCount: number
    filteredCount: number
    unknownLocationsCount: number
    calendarName: string
}

// Initial state
const initialState: EventsState = {
    events: [],
    filters: {},
    selectedEventId: null,
    isLoading: false,
    error: null,
}

// Reducer function
function eventsReducer(state: EventsState, action: EventsAction): EventsState {
    switch (action.type) {
        case 'SET_EVENTS':
            return { ...state, events: action.payload }
        case 'SET_FILTERS':
            return { ...state, filters: action.payload }
        case 'SELECT_EVENT':
            return { ...state, selectedEventId: action.payload }
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload }
        case 'SET_ERROR':
            return { ...state, error: action.payload }
        default:
            return state
    }
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

export function useEventsManager({
    calendarId,
    dateRange,
    searchQuery,
    mapBounds,
    showUnknownLocationsOnly,
}: UseEventsManagerProps = {}): UseEventsManagerResult {
    // Create FilterEventsManager instance
    const [fltrEvtMgr] = useState(() => new FilterEventsManager())

    // Use reducer for state management
    const [state, dispatch] = useReducer(eventsReducer, initialState)

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
    const {
        data: apiData,
        error: apiError,
        isLoading: apiIsLoading,
    } = useSWR(apiUrl, fetcher, {
        revalidateOnFocus: false,
        onSuccess: (data) => {
            if (!data) return
            logr.info('use_evts_mgr', `✅ Calendar data fetched: "${data.calendar.name || 'Unknown Calendar'}"`, {
                calendarId: data.calendar.id || 'unknown',
                totalEvents: data.calendar.totalCount || 0,
                unknownLocations: data.calendar.unknownLocationsCount || 0,
            })
            logr.debug('use_evts_mgr', `Before fltrEvtMgr.cmf_events_all=${fltrEvtMgr.cmf_events_all.length}`)
            logr.info('use_evts_mgr', `Calling fltrEvtMgr.setEvents(${data.events.length})`)
            fltrEvtMgr.setEvents(data.events)
            dispatch({ type: 'SET_EVENTS', payload: data.events })
            logr.debug('use_evts_mgr', `After fltrEvtMgr.cmf_events_all=${fltrEvtMgr.cmf_events_all.length}`)
        },
        onError: (err) => {
            logr.info('use_evts_mgr', `❌ Error fetching calendar data for ID: "${calendarId || 'unknown'}"`, {
                error: err.message,
                apiUrl,
            })
            logr.info('use_evts_mgr', `Error fetching calendar data for ID: "${calendarId || 'unknown'}"`, err)
            dispatch({ type: 'SET_ERROR', payload: err })
        },
    })

    useEffect(() => {
        logr.info('use_evts_mgr', `uE: isLoading changed to ${apiIsLoading}`)
    }, [apiIsLoading])

    // Update events in FilterEventsManager when data changes
    useEffect(() => {
        if (apiData?.events) {
            logr.info('use_evts_mgr', `uE: Calling fltrEvtMgr.setEvents(${apiData.events.length})`)
            fltrEvtMgr.setEvents(apiData.events)
            dispatch({ type: 'SET_EVENTS', payload: apiData.events })
        }
    }, [apiData?.events, fltrEvtMgr])

    // Apply initial filters if provided
    useEffect(() => {
        if (dateRange) {
            fltrEvtMgr.setDateRange(dateRange)
            dispatch({ type: 'SET_FILTERS', payload: { ...state.filters, dateRange } })
        }
        if (searchQuery) {
            fltrEvtMgr.setSearchQuery(searchQuery)
            dispatch({ type: 'SET_FILTERS', payload: { ...state.filters, searchQuery } })
        }
        if (mapBounds) {
            fltrEvtMgr.setMapBounds(mapBounds)
            dispatch({ type: 'SET_FILTERS', payload: { ...state.filters, mapBounds } })
        }
        if (showUnknownLocationsOnly !== undefined) {
            fltrEvtMgr.setShowUnknownLocationsOnly(showUnknownLocationsOnly)
            dispatch({ type: 'SET_FILTERS', payload: { ...state.filters, showUnknownLocationsOnly } })
        }
    }, [dateRange, searchQuery, mapBounds, showUnknownLocationsOnly, fltrEvtMgr])

    // Memoize derived data
    const filteredEvents = useMemo(() => {
        return fltrEvtMgr.cmf_events_shown
    }, [fltrEvtMgr])

    const eventsWithLocations = useMemo(() => {
        return state.events.filter(
            (event) =>
                event.resolved_location?.status === 'resolved' &&
                event.resolved_location.lat &&
                event.resolved_location.lng
        )
    }, [state.events])

    // Log when the return values change
    useEffect(() => {
        if (apiData && !apiIsLoading && apiData.events) {
            logr.info('use_evts_mgr', 'Events hook return values updated', {
                totalEvents: apiData.events.length,
                filteredEvents: filteredEvents.length,
                calendarName: apiData.calendar.name || '',
            })
        }
    }, [apiData, apiIsLoading, filteredEvents])

    return {
        events: {
            all: state.events,
            withLocations: eventsWithLocations,
            withoutLocations: state.events.filter(
                (event) => !event.resolved_location || event.resolved_location.status !== 'resolved'
            ),
            filtered: filteredEvents,
            filteredWithLocations: filteredEvents.filter(
                (event) =>
                    event.resolved_location?.status === 'resolved' &&
                    event.resolved_location.lat &&
                    event.resolved_location.lng
            ),
            rawData: apiData?.events || [],
            shown: () => {
                // Get events that pass all filters (already includes resolved locations)
                return fltrEvtMgr.cmf_events_shown
            },
        },
        filters: {
            setDateRange: (dateRange) => {
                fltrEvtMgr.setDateRange(dateRange)
                dispatch({ type: 'SET_FILTERS', payload: { ...state.filters, dateRange } })
            },
            setSearchQuery: (searchQuery) => {
                fltrEvtMgr.setSearchQuery(searchQuery)
                dispatch({ type: 'SET_FILTERS', payload: { ...state.filters, searchQuery } })
            },
            setMapBounds: (mapBounds) => {
                fltrEvtMgr.setMapBounds(mapBounds)
                dispatch({ type: 'SET_FILTERS', payload: { ...state.filters, mapBounds } })
            },
            setShowUnknownLocationsOnly: (show) => {
                fltrEvtMgr.setShowUnknownLocationsOnly(show)
                dispatch({ type: 'SET_FILTERS', payload: { ...state.filters, showUnknownLocationsOnly: show } })
            },
            resetAll: () => {
                fltrEvtMgr.resetAllFilters()
                dispatch({ type: 'SET_FILTERS', payload: {} })
            },
            getStats: () => fltrEvtMgr.getFilterStats(),
        },
        calendar: {
            name: apiData?.calendar?.name || '',
            totalCount: apiData?.calendar?.totalCount || 0,
            unknownLocationsCount: apiData?.calendar?.unknownLocationsCount || 0,
        },
        apiIsLoading: apiIsLoading || state.isLoading,
        apiError: apiError || state.error,
        fltrEvtMgr,
        // For backward compatibility
        filteredEvents: filteredEvents,
        totalCount: apiData?.calendar?.totalCount || 0,
        filteredCount: filteredEvents.length,
        unknownLocationsCount: apiData?.calendar?.unknownLocationsCount || 0,
        calendarName: apiData?.calendar?.name || '',
    }
}
