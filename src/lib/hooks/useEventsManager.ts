'use client'
import { useState, useEffect, useMemo, useReducer } from 'react'
import useSWR from 'swr'
import { EventsState, EventsAction, FilteredEvents, EventSourceResponse } from '@/types/events'
import { MapBounds } from '@/types/map'
import { FilterEventsManager } from '@/lib/events/FilterEventsManager'
import { logr } from '@/lib/utils/logr'
import { fetcherLogr } from '@/lib/utils/utils-client'
import { getDateFromUrlDateString } from '@/lib/utils/date'

interface UseEventsManagerProps {
    eventSourceId?: string | null
    dateRange?: { start: string; end: string }
    searchQuery?: string
    currentViewport?: MapBounds | null
    showUnknownLocationsOnly?: boolean
    sd?: string // Start date from URL
    ed?: string // End date from URL
}

interface UseEventsManagerResult {
    evts: FilteredEvents
    filters: {
        setDateRange: (dateRange: { start: string; end: string } | undefined) => void
        setSearchQuery: (query: string) => void
        setShowUnknownLocationsOnly: (show: boolean) => void
        resetAll: () => void
    }
    eventSource: {
        name: string
        totalCount: number
        unknownLocationsCount: number // TODO: remove
    }
    apiIsLoading: boolean
    apiError: Error | null
    fltrEvtMgr: FilterEventsManager
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
            return { ...state, filters: { ...state.filters, ...action.payload } }
        case 'SET_ERROR':
            return { ...state, error: action.payload }
        case 'CLEAR_ERROR':
            return { ...state, error: null }
        default:
            return state
    }
}

export function useEventsManager({
    eventSourceId,
    dateRange,
    searchQuery,
    currentViewport,
    showUnknownLocationsOnly,
    sd,
    ed,
}: UseEventsManagerProps = {}): UseEventsManagerResult {
    const [fltrEvtMgr] = useState(() => new FilterEventsManager())

    // Use reducer for state management
    const [state, dispatch] = useReducer(eventsReducer, initialState)
    
    // Track filter changes to force useMemo recalculation
    const [filterVersion, setFilterVersion] = useState(0)

    // Reset FilterEventsManager when event source changes
    useEffect(() => {
        logr.info('use_evts_mgr', `uE: FilterEventsManager reset, new eventSourceId: "${eventSourceId}"`)
        dispatch({ type: 'CLEAR_ERROR' })

        fltrEvtMgr.reset()
    }, [eventSourceId, fltrEvtMgr])

    // Memoize the API URL construction
    const apiUrl = useMemo(() => {
        if (!eventSourceId) return null
        // timeMin and timeMax must be RFC3339 date strings
        const timeMin = getDateFromUrlDateString(sd || '-1m')?.toISOString()
        const timeMax = getDateFromUrlDateString(ed || '3m')?.toISOString()
        return (
            `/api/events?id=${encodeURIComponent(eventSourceId)}` +
            `&timeMin=${encodeURIComponent(timeMin || '')}` +
            `&timeMax=${encodeURIComponent(timeMax || '')}`
        )
    }, [eventSourceId, sd, ed])

    // Log the API URL being used
    useEffect(() => {
        if (apiUrl) {
            logr.info('use_evts_mgr', `uE: API URL for events data: "${apiUrl}"`)
        }
    }, [apiUrl])

    const dispatchNot200 = (msg: string) => {
        logr.warn('use_evts_mgr', `❌ not HTTP 200, data:`, msg)
        // Format user-friendly error message
        let userMessage = 'Failed to fetch events'
        if (msg.includes('HTTP 404')) {
            if (eventSourceId?.startsWith('gc:')) {
                userMessage = `Google Calendar not found - confirm source and try again`
            } else {
                userMessage = `Event source not found - confirm source and try again`
            }
        } else if (msg.includes('HTTP 403')) {
            userMessage = 'Access denied - please check your permissions'
        } else if (msg.includes('HTTP 401')) {
            userMessage = 'Authentication failed - please check your credentials'
        } else if (msg.includes('HTTP 429')) {
            userMessage = 'Too many requests - please try again later'
        }
        dispatch({ type: 'SET_ERROR', payload: new Error(userMessage) })
    }

    // understand this better: https://swr.vercel.app/docs/getting-started
    // Fetch events from API using SWR
    const {
        data: apiData,
        error: apiError,
        isLoading: apiIsLoading,
    } = useSWR(apiUrl, fetcherLogr, {
        revalidateOnFocus: false,
        onSuccess: (data: EventSourceResponse) => {
            if (!(data && data.httpStatus)) {
                dispatchNot200(`HTTP 500: onSuccess should have data.httpStatus`)
                return
            }
            if (data.httpStatus !== 200) {
                logr.info('use_evts_mgr', 'httpStatus !== 200', data)
                dispatchNot200(`HTTP ${data.httpStatus}:`)
                return
            }
            logr.info('use_evts_mgr', `✅ Events data fetched: "${data.metadata.name || 'Unknown Source'}"`, {
                sourceId: data.metadata.id || 'unknown',
                sourceType: data.metadata.type || 'unknown',
                totalEvents: data.metadata.totalCount || 0,
                unknownLocations: data.metadata.unknownLocationsCount || 0,
            })
            logr.debug('use_evts_mgr', `Before fltrEvtMgr.cmf_events_all=${fltrEvtMgr.cmf_events_all.length}`)
            logr.info('use_evts_mgr', `Calling fltrEvtMgr.setEvents(${data.events.length})`)
            fltrEvtMgr.setEvents(data.events)
            dispatch({ type: 'SET_EVENTS', payload: data.events })
            logr.debug('use_evts_mgr', `After fltrEvtMgr.cmf_events_all=${fltrEvtMgr.cmf_events_all.length}`)
        },
        onError: (err) => {
            dispatchNot200(err)
        },
    })

    useEffect(() => {
        logr.info('use_evts_mgr', `uE: isLoading changed to ${apiIsLoading}`)
    }, [apiIsLoading])

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
        if (showUnknownLocationsOnly !== undefined) {
            fltrEvtMgr.setShowUnknownLocationsOnly(showUnknownLocationsOnly)
            dispatch({ type: 'SET_FILTERS', payload: { ...state.filters, showUnknownLocationsOnly } })
        }
    }, [dateRange, searchQuery, showUnknownLocationsOnly, fltrEvtMgr])

    // Memoize filtered events to avoid unnecessary recalculations, but keep it updated with the latest state and apiData
    const currentFilteredEvents = useMemo(
        () => fltrEvtMgr.getFilteredEvents(currentViewport || undefined),
        [fltrEvtMgr, apiData, currentViewport, filterVersion]
    )

    return {
        evts: currentFilteredEvents,
        filters: {
            setDateRange: (dateRange) => {
                fltrEvtMgr.setDateRange(dateRange)
                dispatch({ type: 'SET_FILTERS', payload: { ...state.filters, dateRange } })
                setFilterVersion(prev => prev + 1)
            },
            setSearchQuery: (searchQuery) => {
                fltrEvtMgr.setSearchQuery(searchQuery)
                dispatch({ type: 'SET_FILTERS', payload: { ...state.filters, searchQuery } })
                setFilterVersion(prev => prev + 1)
            },
            setShowUnknownLocationsOnly: (show) => {
                fltrEvtMgr.setShowUnknownLocationsOnly(show)
                dispatch({ type: 'SET_FILTERS', payload: { ...state.filters, showUnknownLocationsOnly: show } })
                setFilterVersion(prev => prev + 1)
            },
            resetAll: () => {
                fltrEvtMgr.resetAllFilters()
                dispatch({ type: 'SET_FILTERS', payload: {} })
                setFilterVersion(prev => prev + 1)
            },
        },
        eventSource: apiData?.metadata,
        apiIsLoading: apiIsLoading || state.isLoading,
        apiError: apiError || state.error,
        fltrEvtMgr,
    }
}
