/**
 * URL Processing Hook - useUrlProcessor
 *
 * Centralized URL processing logic extracted from components
 * Contains all three phases of URL processing as separate useEffect blocks
 */

import { useEffect, useMemo, useState } from 'react'
import { differenceInCalendarDays, parseISO, subMonths, addMonths } from 'date-fns'
import { CmfEvents, DateRangeIso } from '@/types/events'
import { MapBounds, MapViewport } from '@/types/map'
import { AppState, AppAction, appActions } from '@/lib/state/appStateReducer'
import { CurrentUrlState, DateConfig } from '@/types/urlProcessing'
import { processDomainFilters } from '@/lib/services/urlProcessingService'
import { logr } from '@/lib/utils/logr'
import { llzObjectToViewport, calculateBoundsFromViewport } from '@/lib/utils/location'
import { stringify } from '@/lib/utils/utils-shared'
import { getDateFromUrlDateString } from '@/lib/utils/date'

/**
 * Configuration for URL processor hook using consolidated types
 */
export interface UrlProcessorConfig {
    // App state and dispatch
    appState: AppState
    dispatch: React.Dispatch<AppAction>

    // URL parameters (using existing CurrentUrlState type for consolidation)
    urlParams: CurrentUrlState

    // URL setters (structured object to match urlParams)
    setUrlParams: {
        setSelectedEventId: (id: string) => void
        setSearchQuery: (query: string) => void
        setLlzUrl: (llz: { lat: number; lon: number; zoom: number } | null) => void
    }

    // Event and map data
    cmfEvents: CmfEvents
    viewport: MapViewport
    llzChecked: boolean
    mapHookWidthHeight: { w: number; h: number }

    // Handler functions
    handlers: {
        onSearchChange: (query: string) => Promise<void>
        onDateRangeChange: (range: DateRangeIso | undefined) => void
        onEventSelect: (eventId: string | null) => void
        setViewport: (viewport: MapViewport) => void
        setLlzChecked: (checked: boolean) => void
        setIsShowingAllEvents: (showing: boolean) => void
        setCurrentBounds: (bounds: MapBounds | null) => void
        resetMapToVisibleEvents: (options: { useBounds: boolean; mapBounds?: MapBounds }) => void
        setStartDays: (days: number) => void
        setEndDays: (days: number) => void
    }
}

/**
 * Return type for useUrlProcessor hook
 */
export interface UrlProcessorResult {
    /** Date configuration for components that need it */
    dateConfig: DateConfig
}

/**
 * Smart URL Processing Hook - Strategy 2 (Conservative) with Structured Parameters
 * Contains all URL processing logic but doesn't own URL state (no useQueryState calls)
 * Uses existing CurrentUrlState type for consolidation and type reuse
 */
export function useUrlProcessor(config: UrlProcessorConfig): UrlProcessorResult {
    const {
        appState,
        dispatch,
        urlParams,
        setUrlParams,
        cmfEvents,
        viewport,
        llzChecked,
        mapHookWidthHeight,
        handlers,
    } = config

    // State for initial URL filter processing (from quick filters like 'weekend' during page load)
    // ONLY used during 'applying-url-filters' state, ignored during 'user-interactive'
    const [initialUrlFilterRange, setInitialUrlFilterRange] = useState<{ start: Date; end: Date } | null>(null)

    // Memoize parsed dateSliderRange to avoid expensive parseISO calls on every dateConfig calculation
    const parsedDateSliderRange = useMemo(() => {
        if (!urlParams.dateSliderRange) return null
        return {
            start: parseISO(urlParams.dateSliderRange.startIso),
            end: parseISO(urlParams.dateSliderRange.endIso),
        }
    }, [urlParams.dateSliderRange])

    const dateConfig = useMemo(() => {
        const now = new Date()
        const min = getDateFromUrlDateString(urlParams.sd) || subMonths(now, 1)
        const max = getDateFromUrlDateString(urlParams.ed) || addMonths(now, 3)

        // State-aware priority: initialization vs user-interactive
        let activeStart: Date, activeEnd: Date
        let source: string

        if (appState === 'applying-url-filters') {
            if (initialUrlFilterRange) {
                // URL processing: use initial filter results (like qf=weekend)
                activeStart = initialUrlFilterRange.start
                activeEnd = initialUrlFilterRange.end
                source = 'initialUrlFilterRange'
            } else {
                // URL processing fallback: fsd/fed params or defaults
                activeStart = urlParams.fsd ? getDateFromUrlDateString(urlParams.fsd) || min : min
                activeEnd = urlParams.fed ? getDateFromUrlDateString(urlParams.fed) || max : max
                source = 'URL params'
            }
        } else {
            // user-interactive state
            if (parsedDateSliderRange) {
                // User interactions: use pre-parsed slider range
                activeStart = parsedDateSliderRange.start
                activeEnd = parsedDateSliderRange.end
                source = 'dateSliderRange'
            } else {
                // Default to full range if no user interactions yet
                activeStart = min
                activeEnd = max
                source = 'defaults'
            }
        }

        const totalDays = differenceInCalendarDays(max, min)
        const isFiltered = activeStart.getTime() !== min.getTime() || activeEnd.getTime() !== max.getTime()

        const result = {
            minDate: min,
            maxDate: max,
            totalDays,
            activeRange: {
                start: activeStart,
                end: activeEnd,
            },
            isFiltered,
        }
        logr.debug('url_filters', `dateConfig useMemo source: ${source}`, result)

        return result
    }, [
        urlParams.sd,
        urlParams.ed,
        urlParams.fsd,
        urlParams.fed,
        parsedDateSliderRange,
        initialUrlFilterRange,
        appState,
    ])

    // URL parameter processing is now tracked via app state transitions:
    // 'applying-url-filters' → 'parsing-remaining-url' → 'user-interactive'
    // No need for separate tracking refs

    // PHASE 1: During init, Handle filter URL parameters (domain filters: date and search)
    // Copied from DateAndSearchFilters.tsx:86-167
    useEffect(() => {
        if (appState !== 'applying-url-filters') return

        // Enhanced debug logging - Track raw URL parameters received
        logr.info('url_filters', `Raw URL parameters received during ${appState}: ${stringify(urlParams)}`)
        logr.info('url_filters', `calculated dateConfig: ${stringify(dateConfig)}`)

        // Use urlProcessingService to process domain filters
        const domainFilterResult = processDomainFilters({
            searchQuery: urlParams.sq,
            dateQuickFilter: urlParams.qf,
            filterDateRange:
                urlParams.fsd || urlParams.fed
                    ? {
                          fsd: urlParams.fsd || undefined,
                          fed: urlParams.fed || undefined,
                      }
                    : undefined,
            minDate: dateConfig.minDate,
            totalDays: dateConfig.totalDays,
        })

        let filtersApplied = false

        // Apply date range filter if one was processed
        if (domainFilterResult.dateRange) {
            logr.info('url_filters', `Service processed date range: ${stringify(domainFilterResult.dateRange)}`)

            // Set initial URL filter range (only used during applying-url-filters state)
            const start = parseISO(domainFilterResult.dateRange.startIso)
            const end = parseISO(domainFilterResult.dateRange.endIso)
            setInitialUrlFilterRange({ start, end })

            /* Commented out for performance reasons
            logr.debug('url_filters', `Set initial URL filter range`, {
                start: start.toISOString(),
                end: end.toISOString()
            })
            */
            handlers.onDateRangeChange(domainFilterResult.dateRange)
            filtersApplied = true
        }

        // Apply search filter from URL
        if (domainFilterResult.searchQuery) {
            logr.info('url_filters', `applying search filter "${domainFilterResult.searchQuery}" during ${appState}`)
            handlers.onSearchChange(domainFilterResult.searchQuery)
            logr.info('url_filters', `Applied search filter: "${domainFilterResult.searchQuery}"`)
            filtersApplied = true
        }

        // Log any errors from the service
        if (domainFilterResult.errors && domainFilterResult.errors.length > 0) {
            domainFilterResult.errors.forEach((error) => {
                logr.warn('url_filters', `URL processing error: ${error}`)
            })
        }

        // Notify parent about URL filters completion (auto-resize will be handled separately in step 6)
        if (filtersApplied || (!urlParams.qf && !urlParams.sq)) {
            dispatch(appActions.urlFiltersApplied())
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        urlParams.qf,
        urlParams.sq,
        urlParams.fsd,
        urlParams.fed,
        appState,
        dateConfig.minDate,
        dateConfig.totalDays,
        handlers.onDateRangeChange,
        handlers.onSearchChange,
        dispatch,
    ])

    // PHASE 2: During init, Handle page load URL parsing steps 3-7 (from Implementation.md) after domain filters are applied
    // Copied from useAppController.ts:380-438
    useEffect(() => {
        if (appState !== 'parsing-remaining-url') return

        // Step 3: Handle selected event (se parameter)
        if (urlParams.se) {
            logr.info('app', 'URL parsing: selectedEventIdUrl is set, checking if valid')

            // Step 4: Validate event ID
            // If se and valid event id: act like user clicked on event
            // If se and not valid: act like se wasn't present, remove from url, console log warning, and continue)
            const event = cmfEvents.allEvents.find((e) => e.id === urlParams.se)
            if (!event) {
                logr.warn('app', `URL parsing: invalid event ID '${urlParams.se}', treating as if se wasn't present`)
                // Clear invalid se from URL and continue as if se wasn't present
                setUrlParams.setSelectedEventId('')
            } else {
                logr.info('app', 'URL parsing: Valid event ID, selecting event (no more URL parsing)')
                handlers.onEventSelect(urlParams.se)
                dispatch(appActions.remainingUrlParsed())
                return // Stop URL parsing here per rules
            }
        }
        // Step 5. If llz: update map based on llz coordinates, check the llz checkbox, update events visible
        if (urlParams.llz !== null) {
            logr.info('app', `URL parsing step 5: Setting viewport from llz coordinates (z=${urlParams.llz.zoom})`)
            const vp = llzObjectToViewport(urlParams.llz)
            handlers.setViewport(vp)
            handlers.setLlzChecked(true)
            handlers.setIsShowingAllEvents(false)
            const bounds = calculateBoundsFromViewport(vp, mapHookWidthHeight.w, mapHookWidthHeight.h)
            logr.info(
                'app',
                `URL parsing step 5: calculated bounds ${stringify(bounds)} from ${JSON.stringify(urlParams.llz)}`
            )
            handlers.resetMapToVisibleEvents({ useBounds: true, mapBounds: bounds })
            handlers.setCurrentBounds(bounds) // updates counts in sidebar
            dispatch(appActions.remainingUrlParsed())
            return
        }

        // Step 6. If no llz and domain filters: zoom to visible events (e.g., if only 2 markers remain, zoom to those 2 markers)
        // Step 7. If no llz and no domain filters: zoom to fit all events
        logr.info('app', 'URL parsing step 6 & 7 Auto-resizing map to show visible events')
        handlers.resetMapToVisibleEvents({ useBounds: true })
        dispatch(appActions.remainingUrlParsed())
    }, [
        appState,
        urlParams.se,
        urlParams.llz,
        mapHookWidthHeight.w,
        mapHookWidthHeight.h,
        cmfEvents.allEvents,
        dispatch,
        handlers,
        setUrlParams,
    ])

    // PHASE 3a: After init, Update URL parameters when viewport (llz) changes, or selected event changes
    // Copied from useAppController.ts:462-485
    useEffect(() => {
        // Skip during initialization
        if (appState !== 'user-interactive') return

        // Because we want to only have url params when needed,
        // and because when urlParams.se is set the map will zoom to that,
        // we don't need llz when urlParams.se is set.
        if (urlParams.se && urlParams.se !== '') {
            // Remove llz parameter and just keep the selected event ID
            if (urlParams.llz?.lat) {
                // Only update llz if current llz value is not already null
                setUrlParams.setLlzUrl(null)
                logr.info('app', `Updated URL parameter to remove llz, skip when se is set, se=${urlParams.se}`)
            }
        } else if (llzChecked) {
            // Only update llz if current llz values are not same or llz is null
            if (
                !urlParams.llz ||
                viewport.latitude !== urlParams.llz.lat ||
                viewport.longitude !== urlParams.llz.lon ||
                viewport.zoom !== urlParams.llz.zoom
            ) {
                setUrlParams.setLlzUrl({
                    lat: viewport.latitude,
                    lon: viewport.longitude,
                    zoom: viewport.zoom,
                })
                logr.info('app', `Updated llz URL parameter, since no urlParams.se and llzChecked=true`)
            }
        } else {
            // Clear llz URL parameter when checkbox is unchecked
            setUrlParams.setLlzUrl(null)
            logr.info('app', `Cleared llz URL parameter, llzChecked=${llzChecked}`)
        }
    }, [viewport, appState, urlParams.se, urlParams.llz, llzChecked, setUrlParams])

    // PHASE 3b: After init, Update URL parameters when date and search filters change
    // TODO: CHAD Implement HERE?
    useEffect(() => {
        if (appState !== 'user-interactive') return
    }, [appState])

    // Return date configuration for components that need it
    return { dateConfig }
}
