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
    // rename filtrEvtMgr to filterEventsMgr
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

    // Determine if we have single or multiple sources
    const isMultipleSources = Array.isArray(eventSourceId)

    // Memoize timeMin and timeMax to avoid repeated calls to getDateFromUrlDateString
    const { timeMin, timeMax } = useMemo(() => {
        return {
            timeMin: urlDateToIsoString(sd || '-1m'),
            timeMax: urlDateToIsoString(ed || '3m'),
        }
    }, [sd, ed])

    // For single sources, use the original SWR pattern. For multiple sources, use custom fetcher
    const singleApiUrl = useMemo(() => {
        if (!eventSourceId || isMultipleSources) return null
        // timeMin and timeMax must be RFC3339 date strings
        return (
            `/api/events?id=${encodeURIComponent(eventSourceId)}` +
            `&timeMin=${encodeURIComponent(timeMin || '')}` +
            `&timeMax=${encodeURIComponent(timeMax || '')}`
        )
    }, [eventSourceId, isMultipleSources, timeMin, timeMax])

    // Memoize the API URLs construction for multiple sources only
    const multiApiUrls = useMemo(() => {
        if (!isMultipleSources || !Array.isArray(eventSourceId)) return null
        // timeMin and timeMax must be RFC3339 date strings
        return eventSourceId.map(
            (sourceId) =>
                `/api/events?id=${encodeURIComponent(sourceId)}` +
                `&timeMin=${encodeURIComponent(timeMin || '')}` +
                `&timeMax=${encodeURIComponent(timeMax || '')}`
        )
    }, [eventSourceId, isMultipleSources, timeMin, timeMax])

    // Log the API URLs being used
    useEffect(() => {
        if (singleApiUrl) {
            logr.info('use_evts_mgr', `uE: Single API URL for events data: "${singleApiUrl}"`)
        }
        if (multiApiUrls) {
            logr.info('use_evts_mgr', `uE: Multiple API URLs for events data (${multiApiUrls.length}):`, multiApiUrls)
        }
    }, [singleApiUrl, multiApiUrls])

    // Handle non-200 HTTP responses
    const dispatchNot200 = (msg: string) => {
        logr.warn('use_evts_mgr', `❌ not HTTP 200, data:`, msg)
        // Format user-friendly error message
        let userMessage = 'Failed to fetch events'
        if (msg.includes('HTTP 404')) {
            const hasGoogleCalendar = Array.isArray(eventSourceId)
                ? eventSourceId.some((id) => id.startsWith('gc:'))
                : eventSourceId?.startsWith('gc:')
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
        aggregatedData: EventsSourceResponse
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
        let totalCount = 0
        let totalUnknownLocations = 0

        results.forEach((result: EventsSourceResponse, index: number) => {
            const eventsWithSrc = isMultipleSources
                ? result.events.map((event) => ({ ...event, src: index + 1 }))
                : result.events

            allEvents.push(...eventsWithSrc)
            totalCount += result.source.totalCount || 0
            totalUnknownLocations += result.source.unknownLocationsCount || 0

            sources.push({
                prefix: result.source.prefix,
                name: result.source.name,
                totalCount: result.source.totalCount || 0,
                unknownLocationsCount: result.source.unknownLocationsCount || 0,
                id: result.source.id || '',
                url: result.source.url,
            })
        })

        // Create aggregated source data
        const allSourceIds = results.map((result) => result.source.id || '')
        const aggregatedSource = {
            prefix: results[0].source.prefix,
            name: allSourceIds.length > 1 ? 'Multiple Event Sources' : results[0].source.name,
            url: results[0].source.url,
            id: allSourceIds.length > 1 ? allSourceIds.join(',') : allSourceIds[0],
            totalCount,
            unknownLocationsCount: totalUnknownLocations,
        }

        return {
            aggregatedData: {
                events: allEvents,
                source: aggregatedSource,
                httpStatus: 200,
            },
            sources,
        }
    }

    // SWR for single source (original behavior)
    const {
        data: singleApiData,
        error: singleApiError,
        isLoading: singleApiIsLoading,
    } = useSWR(shouldFetchData ? singleApiUrl : null, fetcherLogr, {
        revalidateOnFocus: false,
        onSuccess: (data: EventsSourceResponse) => {
            if (!(data && data.httpStatus)) {
                dispatchNot200(`HTTP 500: onSuccess should have data.httpStatus`)
                return
            }
            if (data.httpStatus !== 200) {
                logr.info('use_evts_mgr', 'httpStatus !== 200', data)
                dispatchNot200(`HTTP ${data.httpStatus}:`)
                return
            }
            logr.info('use_evts_mgr', `Single source events data fetched: "${data.source.name || 'Unknown Source'}"`, {
                sourceId: data.source.id || 'unknown',
                sourceType: data.source.prefix || 'unknown',
                totalEvents: data.source.totalCount || 0,
                unknownLocations: data.source.unknownLocationsCount || 0,
            })
            logr.debug('use_evts_mgr', `Before filtrEvtMgr.cmf_events_all=${filtrEvtMgr.cmf_events_all.length}`)
            logr.info('use_evts_mgr', `Calling filtrEvtMgr.setEvents(${data.events.length})`)
            // DEBUG: Track event loading completion
            logr.info('debug-flow', `Events loaded: ${data.events.length} events, SWR loading complete`)
            filtrEvtMgr.setEvents(data.events)
            // Events are now managed by FilterEventsManager only
            logr.debug('use_evts_mgr', `After filtrEvtMgr.cmf_events_all=${filtrEvtMgr.cmf_events_all.length}`)
        },
        onError: (err) => {
            dispatchNot200(err)
        },
    })

    // SWR for multiple sources
    const {
        data: multiSwrData,
        error: multiApiError,
        isLoading: multiApiIsLoading,
    } = useSWR(
        shouldFetchData && multiApiUrls ? `multi:${multiApiUrls.join('|')}` : null,
        multiApiUrls ? () => multiSourceFetcher(multiApiUrls) : null,
        {
            revalidateOnFocus: false,
            onSuccess: ({ aggregatedData, sources }) => {
                const data = aggregatedData
                logr.info('use_evts_mgr', `Multiple sources events data fetched: "${data.source.name}"`, {
                    sourceId: data.source.id,
                    sourceType: data.source.prefix,
                    totalEvents: data.source.totalCount,
                    unknownLocations: data.source.unknownLocationsCount,
                    numSources: sources.length,
                })
                // DEBUG: Track multi-source event loading completion
                logr.info(
                    'debug-flow',
                    `Multi-source events loaded: ${data.source.totalCount} events, SWR loading complete`
                )

                logr.debug('use_evts_mgr', `Before filtrEvtMgr.cmf_events_all=${filtrEvtMgr.cmf_events_all.length}`)
                logr.info('use_evts_mgr', `Calling filtrEvtMgr.setEvents(${data.events.length})`)
                filtrEvtMgr.setEvents(data.events)
                // Events are now managed by FilterEventsManager only
                logr.debug('use_evts_mgr', `After filtrEvtMgr.cmf_events_all=${filtrEvtMgr.cmf_events_all.length}`)
            },
            onError: (err) => {
                dispatchNot200(err.message || err)
            },
        }
    )

    // Determine which data to use
    const apiData = isMultipleSources ? multiSwrData?.aggregatedData : singleApiData
    const eventSources = isMultipleSources
        ? multiSwrData?.sources
        : singleApiData
          ? [
                {
                    prefix: singleApiData.source.prefix,
                    name: singleApiData.source.name,
                    totalCount: singleApiData.source.totalCount || 0,
                    unknownLocationsCount: singleApiData.source.unknownLocationsCount || 0,
                    id: singleApiData.source.id || '',
                    url: singleApiData.source.url,
                },
            ]
          : null
    const apiError = singleApiError || multiApiError
    const apiIsLoading = singleApiIsLoading || multiApiIsLoading

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
    // apiData: needed to trigger recalculation when new events are loaded
    // filterVersion: needed to trigger recalculation when filters change
    const currentCmfEvents = useMemo(
        () => filtrEvtMgr.getCmfEvents(currentBounds || undefined),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [filtrEvtMgr, apiData, currentBounds, filterVersion]
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
        eventSources: eventSources || null,
        apiIsLoading: apiIsLoading,
        apiError: apiError || error,
        filtrEvtMgr,
    }
}
