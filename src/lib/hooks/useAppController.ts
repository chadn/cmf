/**
 * Smart Container Hook - useAppController
 *
 * Contains ALL business logic extracted from page.tsx
 * Delegates to services for pure business logic
 * Returns clean interface for dumb components
 */

import { useState, useEffect, useCallback, useReducer, useRef, MutableRefObject, useMemo } from 'react'
import { useQueryState, useQueryStates } from 'nuqs'
import { CmfEvents, EventsSource, DateRangeIso } from '@/types/events'
import { CurrentUrlState, DateConfig } from '@/types/urlProcessing'
import { MapBounds, MapViewport, MapMarker } from '@/types/map'
import { INITIAL_APP_STATE, appStateReducer, appActions, AppState, AppAction } from '@/lib/state/appStateReducer'
import { useEventsManager } from '@/lib/hooks/useEventsManager'
import { useMap, genMarkerId } from '@/lib/hooks/useMap'
import { useBreakpoint } from '@/lib/hooks/useBreakpoint'
import { useUrlProcessor } from '@/lib/hooks/useUrlProcessor'
import { ExampleEventsSources } from '@/lib/events/examples'
import { env } from '@/lib/config/env'
import { logr } from '@/lib/utils/logr'
import { parseAsCmfDate, parseAsDateQuickFilter, parseAsEventsSource, parseAsLlz } from '@/lib/utils/url-utils'
import { checkForZipCode, calculateBoundsFromMarkers } from '@/lib/utils/location'
import { determineHeaderName } from '@/lib/utils/headerNames'
import { stringify } from '@/lib/utils/utils-shared'
import { urlDateToIsoString } from '@/lib/utils/date'

/**
 * Event data interface for components
 */
export interface EventData {
    cmfEvents: CmfEvents
    eventSources: Array<EventsSource> | null
    apiIsLoading: boolean
    apiError: Error | null
}

/**
 * Map data interface for components
 */
export interface MapData {
    viewport: MapViewport
    markers: MapMarker[]
    selectedMarkerId: string | null
    currentBounds: MapBounds | null
    isShowingAllEvents: boolean
    llzChecked: boolean
    preferQfChecked: boolean
}

/**
 * Handler functions interface for components
 */
export interface AppHandlers {
    // Event handlers
    onEventSelect: (eventId: string | null) => void
    onSearchChange: (query: string) => Promise<void>
    onDateRangeChange: (range: DateRangeIso | undefined) => void
    onDateQuickFilterChange: (value: string | null) => void

    // Map handlers
    onViewportChange: (viewport: MapViewport) => void
    onBoundsChange: (bounds: MapBounds, fromUserInteraction?: boolean) => void
    onMarkerSelect: (markerId: string | null) => void
    onWidthHeightChange: (dimensions: { w: number; h: number }) => void

    // Filter handlers
    onClearMapFilter: () => void
    onClearSearchFilter: () => void
    onClearDateFilter: () => void
    onResetMapToVisibleEvents: () => void

    // Settings handlers
    onLlzCheckedChange: (checked: boolean) => void
    onPreferQfCheckedChange: (checked: boolean) => void
}

/**
 * App controller state interface
 */
export interface AppControllerState {
    appState: AppState
    headerName: string
    dateSliderRange: DateRangeIso | undefined
    split: number[]
    isDesktop: boolean
    currentUrlState: CurrentUrlState
    dateConfig: DateConfig
}

/**
 * Complete app controller return interface
 */
export interface UseAppControllerReturn {
    // State
    state: AppControllerState

    // Data for components
    eventData: EventData
    mapData: MapData

    // Handlers for components
    handlers: AppHandlers

    // State Management
    dispatch: React.Dispatch<AppAction>

    // Utilities
    hasEventSource: boolean
}

/**
 * Smart Container Hook - Contains all business logic from page.tsx
 */
export function useAppController(): UseAppControllerReturn {
    const renderCountRef = useRef(0)
    const lastRenderTime = useRef(performance.now())

    // URL query state parameters - consolidated in CurrentUrlState
    const [eventSourceId] = useQueryState('es', parseAsEventsSource) // replaced gc calendarId
    const [selectedEventIdUrl, setSelectedEventIdUrl] = useQueryState('se', { defaultValue: '' })
    const [searchQueryUrl, setSearchQueryUrl] = useQueryState('sq', { defaultValue: '' }) // search query
    const [dateQuickFilterUrl, setDateQuickFilterUrl] = useQueryState('qf', parseAsDateQuickFilter)
    const [llzUrl, setLlzUrl] = useQueryState('llz', parseAsLlz)
    const [datesUrl] = useQueryStates({
        // all dates must use urlDateToIsoString to convert to ISO string
        sd: parseAsCmfDate.withDefault('-1m'), // app start date
        ed: parseAsCmfDate.withDefault('3m'), // app end date
        fsd: parseAsCmfDate,
        fed: parseAsCmfDate,
    })

    // Performance monitoring (conditional)
    if (env.ENABLE_PERFORMANCE_MONITORING) {
        renderCountRef.current++
        const currentRenderTime = performance.now()
        const timeSinceLastRender = currentRenderTime - lastRenderTime.current
        if (renderCountRef.current > 1) {
            logr.info(
                'performance',
                `useAppController render #${renderCountRef.current} (+${timeSinceLastRender.toFixed(0)}ms)`
            )
        }
        lastRenderTime.current = currentRenderTime
    }

    const [appState, dispatch] = useReducer(appStateReducer, INITIAL_APP_STATE)
    const [headerName, setHeaderName] = useState('Calendar Map Filter')
    const [mapHookWidthHeight, setMapHookWidthHeight] = useState({ w: 999, h: 999 }) // in pixels, set 1001 elsewhere
    const [llzChecked, setLlzChecked] = useState(false)
    const [preferQfChecked, setPreferQfChecked] = useState(true) // Prefer qf over fsd & fed (default checked)
    // Ref for the events sidebar container - currently unused but available for future use
    // const eventsSidebarRef = useRef<HTMLDivElement>(null)

    // Auto-resize tracking removed - now handled by AppState machine

    // Local state for filters
    const [dateSliderRange, setDateSliderRange] = useState<DateRangeIso | undefined>(undefined)

    /* Commented out for performance reasons
    // Track when dateSliderRange changes
    useEffect(() => {
        logr.debug('app', 'STATE CHANGE: dateSliderRange updated', {
            dateSliderRange,
            appState
        })
    }, [dateSliderRange, appState])
    */

    // Local state for current viewport bounds (from map)
    const [currentBounds, setCurrentBounds] = useState<MapBounds | null>(null)
    const [isShowingAllEvents, setIsShowingAllEvents] = useState<boolean>(true)

    // Use our new EventsManager hook to get events and filter methods
    // Only apply map filtering when not in "show all" mode
    // Memoize dateRange to prevent unnecessary re-creation and setFilter calls
    const memoizedDateRange = useMemo(
        () => ({
            startIso: urlDateToIsoString(datesUrl.fsd ? datesUrl.fsd : datesUrl.sd),
            endIso: urlDateToIsoString(datesUrl.fed ? datesUrl.fed : datesUrl.ed),
        }),
        [datesUrl.fsd, datesUrl.sd, datesUrl.fed, datesUrl.ed]
    )

    const { cmfEvents, filters, eventSources, apiIsLoading, apiError, filtrEvtMgr } = useEventsManager({
        appState,
        eventSourceId,
        currentBounds: isShowingAllEvents ? null : currentBounds,
        sd: datesUrl.sd, // TODO: should use urlDateToIsoString to convert to ISO string, rename sdIso?
        ed: datesUrl.ed, // TODO: should use urlDateToIsoString to convert to ISO string, rename edIso?
        dateRange: memoizedDateRange,
    })

    // Handle map bounds change
    // TODO: should setIsShowingAllEvents=true if bounds is null? it is same effect since useEventsManager
    const handleBoundsChangeForFilters = useCallback(
        (bounds: MapBounds, fromUserInteraction: boolean = false) => {
            // Update viewport bounds for filtering if this is from user interaction
            // OR if we're not showing all events (e.g., after llz URL parsing)
            if (fromUserInteraction || !isShowingAllEvents) {
                // Check if bounds actually changed to avoid unnecessary state updates
                const boundsChanged =
                    !currentBounds ||
                    currentBounds.north !== bounds.north ||
                    currentBounds.south !== bounds.south ||
                    currentBounds.east !== bounds.east ||
                    currentBounds.west !== bounds.west

                if (boundsChanged) {
                    if (env.ENABLE_PERFORMANCE_MONITORING) {
                        logr.info('performance', `Bounds actually changed, updating setCurrentBounds`)
                    }
                    setCurrentBounds(bounds)
                    if (isShowingAllEvents) {
                        setIsShowingAllEvents(false)
                    }
                } else {
                    if (env.ENABLE_PERFORMANCE_MONITORING) {
                        logr.info('performance', `Bounds unchanged, skipping setCurrentBounds`)
                    }
                    // Still need to disable "show all" mode if it was on
                    if (isShowingAllEvents) {
                        setIsShowingAllEvents(false)
                    }
                }
            }
            logr.info('app', `handleBoundsChangeForFilters: ${stringify(bounds)}`, {
                fromUserInteraction,
                isShowingAllEvents,
            })
        },
        [isShowingAllEvents, currentBounds]
    )

    const { viewport, setViewport, markers, selectedMarkerId, setSelectedMarkerId, resetMapToVisibleEvents } = useMap(
        appState,
        cmfEvents,
        filtrEvtMgr,
        mapHookWidthHeight.w,
        mapHookWidthHeight.h,
        handleBoundsChangeForFilters
    )

    // Ref for zip code mapping (must be mutable)
    const zipLatLonRef = useRef<{ [zip: string]: string } | null>(null) as MutableRefObject<{
        [zip: string]: string
    } | null>

    // Shared state for split position (percent)
    const mapPanelPercent = 60
    const [split] = useState<number[]>([100 - mapPanelPercent, mapPanelPercent])
    const isDesktop = useBreakpoint('(min-width: 1024px)')

    // Handle transition when eventSourceId changes,
    useEffect(() => {
        logr.info('app', `uE: Event Src changed es=${eventSourceId}, changing appState`)
        if (!eventSourceId) {
            setHeaderName('Calendar Map Filter')
            // No reset needed - will just stay in starting-app
        } else {
            setHeaderName('Loading Event Source...')
            dispatch(appActions.startFetchingEvents())
        }
        // TODO move this somewhere else - perhaps umami has own file to track appState changes?
        /*
        umamiTrack('LoadCalendar', {
            es: Array.isArray(eventSourceId) ? eventSourceId.join(',') : eventSourceId ?? 'null',
            numEvents: cmfEvents.allEvents.length,
        })
        */
    }, [eventSourceId])

    // Handle transition from fetching-events and to processing-events
    useEffect(() => {
        if (appState !== 'fetching-events') return
        if (apiIsLoading) return

        const k = cmfEvents.visibleEvents.length
        const all = cmfEvents.allEvents ? cmfEvents.allEvents.length : 0
        logr.info('app', `uE: appState:fetching-events, evnts.shown=${k}, evnts.all=${all}`)
        dispatch(appActions.eventsFetched(all > 0))
    }, [apiIsLoading, appState, cmfEvents, dispatch])

    // Handle transition from processing-events
    useEffect(() => {
        if (appState === 'processing-events' && cmfEvents.allEvents.length > 0) {
            const headerName = determineHeaderName(eventSourceId, eventSources, ExampleEventsSources)
            setHeaderName(headerName)
            logr.info('app', 'Processing events: calling resetMapToVisibleEvents and then transitioning state')
            resetMapToVisibleEvents({ useBounds: false })
            dispatch(appActions.eventsProcessed())
        }
    }, [appState, cmfEvents.allEvents.length, eventSourceId, eventSources, resetMapToVisibleEvents, dispatch])

    // URL filters will be applied by DateAndSearchFilters component
    // DateAndSearchFilters handle applying-url-filters and will dispatch urlFiltersApplied

    // State transitions are now handled above

    // NOTE: Search filter URL application moved to DateAndSearchFilters component
    // to apply during map-init state for consistency with date filters

    // Handle search query changes
    const handleSearchChange = useCallback(
        async (query: string) => {
            logr.info('app', 'Search filter changed', { query })
            setSearchQueryUrl(query)
            filters.setSearchQuery(query)
            const result = await checkForZipCode(query, zipLatLonRef)
            if (result) {
                setViewport({
                    ...viewport,
                    latitude: result.lat,
                    longitude: result.lon,
                    zoom: 12,
                })
            }
        },
        [filters, setSearchQueryUrl, setViewport, viewport]
    )

    // handleDateRangeChange - update date filter and slider
    const handleDateRangeChange = useCallback(
        // start and end iso strings should be getStartOfDay and getEndOfDay results
        (newDateRange: DateRangeIso | undefined) => {
            // logr.debug('app', 'handleDateRangeChange - USER INTERACTION', newDateRange)
            setDateSliderRange(newDateRange)
            filters.setDateRange(newDateRange)
            // TODO: if url has fsd or fed, remove it - we don't keep them updated like qf or se.

            // FIX BUG: when fsd and fed from url are processed, this function gets called.
            // TODO: update fsd/fed days that go to DateAndSearchFilters
        },
        [filters]
    )

    // Handle map filter removal
    const handleClearMapFilter = useCallback(() => {
        if (appState !== 'user-interactive') {
            logr.info('app', 'handleClearMapFilter: Ignoring when appState is not user-interactive')
            return
        }
        logr.info('app', 'handleClearMapFilter - clearing filters, selected events and markers')
        // TODO: wrong approach since bounds reflects map container. Instead, zoom out then click visible events.
        setCurrentBounds(null) // Clear map filter -- TODO: implement proper zoom out

        if (env.FEAT_CLEAR_SE_FROM_MAP_CHIP) {
            setSelectedMarkerId(null)
            setSelectedEventIdUrl('') // match default value for param to clear from URL
        }

        // Use resetMapToVisibleEvents to properly reset the map to show all domain-filtered events
        resetMapToVisibleEvents({ useBounds: false })
    }, [appState, setCurrentBounds, setSelectedMarkerId, setSelectedEventIdUrl, resetMapToVisibleEvents])

    const handleResetMapToVisibleEvents = useCallback(() => {
        logr.info('app', 'handleResetMapToVisibleEvents - calling resetMapToVisibleEvents')
        // Use resetMapToVisibleEvents to properly reset the map to show all domain-filtered events
        const mapBounds = calculateBoundsFromMarkers(markers)
        resetMapToVisibleEvents({ useBounds: true, mapBounds: mapBounds })
    }, [markers, resetMapToVisibleEvents])

    // Properly memoize to avoid recreating function on each render
    // TODO: move this to another file, maybe new file like src/lib/utils/eventSelection.ts
    const handleEventSelect = useCallback(
        (eventId: string | null) => {
            logr.info('app', `handleEventSelect() selectedEventIdUrl from ${selectedEventIdUrl} to ${eventId}`)

            // If event is null, clear marker selection
            if (!eventId) {
                setSelectedMarkerId(null)
                setSelectedEventIdUrl(null)
                return
            }
            setSelectedEventIdUrl(eventId)

            // should we store current viewport before zoom

            // Find the event
            const event = cmfEvents.allEvents.find((e) => e.id === eventId)
            if (!event) return

            // Handle resolved location events
            if (
                event.resolved_location?.status === 'resolved' &&
                event.resolved_location.lat &&
                event.resolved_location.lng
            ) {
                const markerId = genMarkerId(event)
                if (!markerId) return

                setSelectedMarkerId(markerId)
                // Calculate the offset based on the current zoom level for proper UI positioning
                const zoomFactor = Math.max(1, viewport.zoom / 10)
                const latOffset = -0.003 / zoomFactor
                setViewport({
                    ...viewport,
                    latitude: event.resolved_location.lat - latOffset,
                    longitude: event.resolved_location.lng,
                    zoom: 14,
                })
            } else {
                // Handle unresolved location events
                setSelectedMarkerId('unresolved')
                const unresolvedMarker = markers.find((m) => m.id === 'unresolved')
                if (unresolvedMarker) {
                    // Calculate the offset based on the current zoom level for proper UI positioning
                    const zoomFactor = Math.max(1, viewport.zoom / 10)
                    const latOffset = -0.003 / zoomFactor
                    setViewport({
                        ...viewport,
                        latitude: unresolvedMarker.latitude - latOffset,
                        longitude: unresolvedMarker.longitude,
                        zoom: 14,
                    })
                }
                return
            }
        },
        [
            cmfEvents.allEvents,
            markers,
            selectedEventIdUrl,
            setSelectedEventIdUrl,
            setSelectedMarkerId,
            setViewport,
            viewport,
        ]
    )

    // DEBUG: Monitor key state machine dependencies
    useEffect(() => {
        logr.info('debug-flow', `State: ${appState}, Events: ${stringify(cmfEvents)}, Loading: ${apiIsLoading}`)
    }, [appState, cmfEvents, cmfEvents.allEvents, cmfEvents.visibleEvents, apiIsLoading])

    // Build current URL state object (reusing existing CurrentUrlState type)
    const currentUrlState: CurrentUrlState = {
        es: eventSourceId,
        se: selectedEventIdUrl,
        sq: searchQueryUrl,
        qf: dateQuickFilterUrl,
        fsd: datesUrl.fsd,
        fed: datesUrl.fed,
        sd: datesUrl.sd,
        ed: datesUrl.ed,
        llz: llzUrl,
        dateSliderRange: dateSliderRange,
    }

    /* Commented out for performance reasons
    // Track when currentUrlState changes
    useEffect(() => {
        logr.debug('app', 'PASSING currentUrlState to useUrlProcessor:', {
            dateSliderRange: currentUrlState.dateSliderRange,
            fsd: currentUrlState.fsd,
            fed: currentUrlState.fed,
            qf: currentUrlState.qf,
            appState
        })
    }, [currentUrlState.dateSliderRange, currentUrlState.fsd, currentUrlState.fed, currentUrlState.qf, appState])
    */

    // useUrlProcessor handles processing url query params while isInitializing() and during 'user-interactive'

    const { dateConfig } = useUrlProcessor({
        // App state and dispatch
        appState,
        dispatch,

        // URL parameters (using consolidated CurrentUrlState type)
        urlParams: currentUrlState,

        // URL setters (structured object)
        setUrlParams: {
            setSelectedEventId: setSelectedEventIdUrl,
            setSearchQuery: setSearchQueryUrl,
            setLlzUrl: setLlzUrl,
        },

        // Event and map data
        cmfEvents,
        viewport,
        llzChecked,
        mapHookWidthHeight,

        handlers: {
            onSearchChange: handleSearchChange,
            onDateRangeChange: handleDateRangeChange,
            onEventSelect: handleEventSelect,
            setViewport,
            setLlzChecked,
            setIsShowingAllEvents,
            setCurrentBounds,
            resetMapToVisibleEvents,
            setStartDays: () => {}, // Not needed in useAppController context
            setEndDays: () => {}, // Not needed in useAppController context
        },
    })

    // currentUrlState now defined above for useUrlProcessor

    // Final transition to user-interactive
    useEffect(() => {
        if (appState === 'finalizing-setup') {
            dispatch(appActions.setupFinalized())
        }
    }, [appState])

    // Expose events data to window for debugging
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.cmfEvents = cmfEvents
            window.cmfEventSources = eventSources
        }
    }, [cmfEvents, eventSources])

    return {
        // State
        state: {
            appState,
            headerName,
            dateSliderRange,
            split,
            isDesktop,
            currentUrlState,
            dateConfig,
        },

        // Data for components
        eventData: {
            cmfEvents,
            eventSources,
            apiIsLoading,
            apiError,
        },

        mapData: {
            viewport,
            markers,
            selectedMarkerId,
            currentBounds,
            isShowingAllEvents,
            llzChecked,
            preferQfChecked,
        },

        // Handlers for components
        handlers: {
            // Event handlers
            onEventSelect: handleEventSelect,
            onSearchChange: handleSearchChange,
            onDateRangeChange: handleDateRangeChange,
            onDateQuickFilterChange: setDateQuickFilterUrl,

            // Map handlers
            onViewportChange: setViewport,
            onBoundsChange: handleBoundsChangeForFilters,
            onMarkerSelect: setSelectedMarkerId,
            onWidthHeightChange: setMapHookWidthHeight,

            // Filter handlers
            onClearMapFilter: handleClearMapFilter,
            onClearSearchFilter: () => {
                setSearchQueryUrl('')
                filters.setSearchQuery('')
            },
            onClearDateFilter: () => {
                setDateSliderRange(undefined)
                filters.setDateRange(undefined)
                setDateQuickFilterUrl(null)
            },
            onResetMapToVisibleEvents: handleResetMapToVisibleEvents,

            // Settings handlers
            onLlzCheckedChange: setLlzChecked,
            onPreferQfCheckedChange: setPreferQfChecked,
        },

        // State Management
        dispatch,

        // Utilities
        hasEventSource: !!eventSourceId,
    }
}
