'use client'
import { useState, useEffect, useMemo } from 'react'
import useSWR from 'swr'
import { CmfEvent, CmfEvents, DateRangeIso, EventsSource, EventsSourceResponse } from '@/types/events'
import { MapBounds } from '@/types/map'
import { AppState } from '@/lib/state/appStateReducer'
import { FilterEventsManager } from '@/lib/events/FilterEventsManager'
import { logr } from '@/lib/utils/logr'
import { fetcherLogr } from '@/lib/utils/utils-client'
import { urlDateToIsoString } from '@/lib/utils/date'
import { stringify } from '@/lib/utils/utils-shared'

interface UseEventsManagerProps {
    appState: AppState
    eventSourceId?: string | string[] | null
    dateRange?: DateRangeIso
    searchQuery?: string
    currentBounds?: MapBounds | null
    showUnknownLocationsOnly?: boolean
    sd?: string // Start date from URL
    ed?: string // End date from URL
}

interface UseEventsManagerResult {
    cmfEvents: CmfEvents
    filters: {
        setDateRange: (dateRange: DateRangeIso | undefined) => void
        setSearchQuery: (query: string) => void
        setShowUnknownLocationsOnly: (show: boolean) => void
        resetAll: () => void
    }
    eventSources: Array<EventsSource> | null
    apiIsLoading: boolean
    apiError: Error | null
    filtrEvtMgr: FilterEventsManager
}

export function useEventsManager({
    appState,
    eventSourceId,
    dateRange,
    searchQuery,
    currentBounds,
    showUnknownLocationsOnly,
    sd,
    ed,
}: UseEventsManagerProps): UseEventsManagerResult {
    // Always initialize hooks in the same order (React rules)

    // TODO: rename filtrEvtMgr to filterEventsMgr or eventsFilterManager
    const [filtrEvtMgr] = useState(() => new FilterEventsManager())

    // Check if we should skip data fetching
    const shouldFetchData = appState !== 'starting-app' && !!eventSourceId

    // Direct state management (replaced reducer pattern)
    const [error, setError] = useState<Error | null>(null)

    // Track filter changes to force useMemo recalculation
    const [filterVersion, setFilterVersion] = useState(0)

    // Reset FilterEventsManager when event source changes
    useEffect(() => {
        logr.info('use_evts_mgr', `uE: FilterEventsManager reset, new eventSourceId: "${eventSourceId}"`)
        setError(null)

        filtrEvtMgr.reset()
    }, [eventSourceId, filtrEvtMgr])

    // Normalize eventSourceId to array for internal use
    const sourceIds = useMemo(() => {
        if (!eventSourceId) return []
        return Array.isArray(eventSourceId) ? eventSourceId : [eventSourceId]
    }, [eventSourceId])

    // Memoize timeMin and timeMax to avoid repeated calls to getDateFromUrlDateString
    const { timeMin, timeMax } = useMemo(() => {
        return {
            timeMin: urlDateToIsoString(sd || '-1m'),
            timeMax: urlDateToIsoString(ed || '3m'),
        }
    }, [sd, ed])

    const apiUrls = useMemo(() => {
        if (sourceIds.length === 0) return null

        let shouldSkip = false
        if (typeof window !== 'undefined') {
            shouldSkip = /[?&]skipcache=1/i.test(window.location.search)
        }
        return sourceIds.map(
            (sourceId) =>
                `/api/events?id=${encodeURIComponent(sourceId)}` +
                `&timeMin=${encodeURIComponent(timeMin || '')}` +
                `&timeMax=${encodeURIComponent(timeMax || '')}` +
                `&skipCache=${shouldSkip ? '1' : '0'}`
        )
    }, [sourceIds, timeMin, timeMax])

    // Log the API URLs being used
    useEffect(() => {
        if (apiUrls) {
            logr.info('use_evts_mgr', `uE: API URLs for events data: ${JSON.stringify(apiUrls)}`)
        }
    }, [apiUrls])

    // Handle non-200 HTTP responses
    const dispatchNot200 = (msg: string) => {
        logr.warn('use_evts_mgr', `❌ not HTTP 200, data:`, msg)
        // Format user-friendly error message
        let userMessage = 'Failed to fetch events'
        if (msg.includes('HTTP 404')) {
            const hasGoogleCalendar = sourceIds.some((s) => s.startsWith('gc:') || s.startsWith('gc.'))
            if (hasGoogleCalendar) {
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
        setError(new Error(userMessage))
    }

    // Custom fetcher for multiple sources that uses Promise.all
    const multiSourceFetcher = async (
        urls: string[]
    ): Promise<{
        allEvents: CmfEvent[]
        sources: Array<EventsSource>
    }> => {
        const results = await Promise.all(urls.map((url) => fetcherLogr(url)))

        // Validate all responses
        for (const result of results) {
            if (!(result && result.httpStatus)) {
                throw new Error('HTTP 500: Response missing httpStatus')
            }
            if (result.httpStatus !== 200) {
                throw new Error(`HTTP ${result.httpStatus}`)
            }
        }

        // Aggregate all events and add src field for multiple sources
        const allEvents: CmfEvent[] = []
        const sources: Array<EventsSource> = []

        results.forEach((result: EventsSourceResponse, index: number) => {
            const eventsWithSrc =
                results.length > 1 ? result.events.map((event) => ({ ...event, src: index + 1 })) : result.events

            // Check for duplicates by comparing event IDs
            const existingIds = new Set(allEvents.map((e) => e.id))
            const duplicates = eventsWithSrc.filter((event) => existingIds.has(event.id))
            const eventsNoDuplicates = eventsWithSrc.filter((event) => !existingIds.has(event.id))
            if (duplicates.length > 0) {
                const evtSrc = result.source.prefix + ':' + result.source.id
                logr.info(
                    'use_evts_mgr',
                    `Skipping duplicate events, ${duplicates.length} in source ${index + 1} (${evtSrc}):`,
                    duplicates.map((e) => e.id)
                    //duplicates.map((e) => ({ id: e.id, title: e.title }))
                )
            }
            allEvents.push(...eventsNoDuplicates)

            sources.push({
                prefix: result.source.prefix,
                name: result.source.name,
                totalCount: result.source.totalCount || 0,
                unknownLocationsCount: result.source.unknownLocationsCount || 0,
                id: result.source.id || '',
                url: result.source.url,
            })
        })
        return {
            allEvents,
            sources,
        }
    }

    // SWR for all sources (single or multiple)
    const {
        data: swrData,
        error: apiError,
        isLoading: apiIsLoading,
    } = useSWR(
        shouldFetchData && apiUrls ? `events:${apiUrls.join('|')}` : null,
        apiUrls ? () => multiSourceFetcher(apiUrls) : null,
        {
            revalidateOnFocus: false,
            onSuccess: ({ allEvents, sources }) => {
                logr.info(
                    'use_evts_mgr',
                    `Loaded ${allEvents.length} events from ${sources.length} sources: ${JSON.stringify(sources)}`
                )
                // DEBUG: Track multi-source event loading completion
                logr.info(
                    'debug-flow',
                    `Loaded ${allEvents.length} events from ${sources.length} sources, SWR loading complete`
                )
                logr.debug('use_evts_mgr', `Before filtrEvtMgr.cmf_events_all=${filtrEvtMgr.cmf_events_all.length}`)
                logr.info('use_evts_mgr', `Calling filtrEvtMgr.setEvents(${allEvents.length})`)
                filtrEvtMgr.setEvents(allEvents)
                // Events are now managed by FilterEventsManager only
                logr.debug('use_evts_mgr', `After filtrEvtMgr.cmf_events_all=${filtrEvtMgr.cmf_events_all.length}`)
            },
            onError: (err) => {
                dispatchNot200(err.message || err)
            },
        }
    )

    useEffect(() => {
        logr.info('use_evts_mgr', `uE: isLoading changed to ${apiIsLoading}`)
    }, [apiIsLoading])

    // Apply initial filters if provided
    useEffect(() => {
        if (dateRange) {
            filtrEvtMgr.setDateRange(dateRange)
        }
        if (searchQuery) {
            filtrEvtMgr.setSearchQuery(searchQuery)
        }
        if (showUnknownLocationsOnly !== undefined) {
            filtrEvtMgr.setShowUnknownLocationsOnly(showUnknownLocationsOnly)
        }
    }, [dateRange, searchQuery, showUnknownLocationsOnly, filtrEvtMgr])

    // Memoize filtered events to avoid unnecessary recalculations
    // swrData?.allEvents: needed to trigger recalculation when new events are loaded
    // filterVersion: needed to trigger recalculation when filters change
    const currentCmfEvents = useMemo(
        () => filtrEvtMgr.getCmfEvents(currentBounds || undefined),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [filtrEvtMgr, swrData?.allEvents, currentBounds, filterVersion]
    )
    useEffect(() => {
        logr.info('use_evts_mgr', `uE: currentBounds now ${stringify(currentBounds)}`)
    }, [currentBounds])

    useEffect(() => {
        logr.info('use_evts_mgr', `uE: cmfEvents.visibleEvents now ${currentCmfEvents.visibleEvents.length}`)
    }, [currentCmfEvents.visibleEvents.length])

    return {
        cmfEvents: currentCmfEvents,
        filters: {
            setDateRange: (dateRange) => {
                filtrEvtMgr.setDateRange(dateRange)
                setFilterVersion((prev) => prev + 1)
            },
            setSearchQuery: (searchQuery) => {
                filtrEvtMgr.setSearchQuery(searchQuery)
                setFilterVersion((prev) => prev + 1)
            },
            setShowUnknownLocationsOnly: (show) => {
                filtrEvtMgr.setShowUnknownLocationsOnly(show)
                setFilterVersion((prev) => prev + 1)
            },
            resetAll: () => {
                filtrEvtMgr.resetAllFilters()
                setFilterVersion((prev) => prev + 1)
            },
        },
        eventSources: swrData?.sources || null,
        apiIsLoading,
        apiError: apiError || error,
        filtrEvtMgr,
    }
}
