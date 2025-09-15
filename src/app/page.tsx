'use client'

import { useState, useEffect, useCallback, Suspense, useRef, useReducer, MutableRefObject } from 'react'
import MapContainer from '@/components/map/MapContainer'
import EventList from '@/components/events/EventList'
import DateAndSearchFilters from '@/components/events/DateAndSearchFilters'
import Footer from '@/components/layout/Footer'
import EventsSourceSelector from '@/components/home/EventsSourceSelector'
import { useEventsManager } from '@/lib/hooks/useEventsManager'
import { useMap, genMarkerId } from '@/lib/hooks/useMap'
import { useBreakpoint } from '@/lib/hooks/useBreakpoint'
import { MapBounds } from '@/types/map'
import { FilteredEvents, EventsSource } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import ActiveFilters from '@/components/events/ActiveFilters'
import { llzToViewport, parseAsEventsSource, parseAsZoom, parseAsLatLon, checkForZipCode } from '@/lib/utils/location'
import { parseAsCmfDate, parseAsDateQuickFilter } from '@/lib/utils/date-nuqs'
import { useQueryState, useQueryStates } from 'nuqs'
import ErrorMessage from '@/components/common/ErrorMessage'
import { umamiTrack } from '@/lib/utils/umami'
import Sidebar from '@/components/layout/Sidebar'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import { ExampleEventsSources } from '@/lib/events/examples'
import { appStateReducer, appActions, INITIAL_APP_STATE, isViewportSet, isReadyForViewportSetting } from '@/lib/state/appStateReducer'
import { determineHeaderName } from '@/lib/utils/headerNames'

declare global {
    interface Window {
        cmf_evts: FilteredEvents
        cmf_evts_sources: Array<EventsSource> | null
    }
}

function HomeContent() {
    // URL query state parameters - described in CmfUrlParams
    const [eventSourceId] = useQueryState('es', parseAsEventsSource) // replaced gc calendarId
    const [selectedEventIdUrl, setSelectedEventIdUrl] = useQueryState('se', { defaultValue: '' })
    const [searchQueryUrl, setSearchQueryUrl] = useQueryState('sq', { defaultValue: '' }) // search query
    const [dateQuickFilterUrl, setDateQuickFilterUrl] = useQueryState('qf', parseAsDateQuickFilter)
    const [viewportUrl, setViewportUrl] = useQueryStates({
        z: parseAsZoom,
        lat: parseAsLatLon,
        lon: parseAsLatLon,
    })
    const [datesUrl] = useQueryStates({
        sd: parseAsCmfDate.withDefault('-1m'), // app start date
        ed: parseAsCmfDate.withDefault('3m'), // app end date
        //fsd: parseAsCmfDate.withDefault('0d'), // filter start date  - not using, qf is good enough. leaving for future reference.
        //fed: parseAsCmfDate, // filter end date
    })
    const [appState, dispatch] = useReducer(appStateReducer, INITIAL_APP_STATE)
    const [headerName, setHeaderName] = useState('Calendar Map Filter')
    const [mapHookWidthHeight, setMapHookWidthHeight] = useState({ w: 999, h: 999 }) // in pixels
    const [llzChecked, setLlzChecked] = useState(false) // TODO: finish implementing checkbox from todo.md

    // Ref for the events sidebar container
    const eventsSidebarRef = useRef<HTMLDivElement>(null)

    // Auto-resize tracking removed - now handled by AppState machine

    // Local state for filters
    const [dateSliderRange, setDateSliderRange] = useState<{ start: string; end: string } | undefined>(undefined)

    // Local state for current viewport bounds (from map)
    const [currentViewportBounds, setCurrentViewportBounds] = useState<MapBounds | null>(null)
    const [isShowingAllEvents, setIsShowingAllEvents] = useState<boolean>(true)

    // Use our new EventsManager hook to get events and filter methods
    // Only apply viewport filtering when not in "show all" mode
    const { evts, filters, eventSources, apiIsLoading, apiError, fltrEvtMgr } = useEventsManager({
        eventSourceId: eventSourceId,
        currentViewport: isShowingAllEvents ? null : currentViewportBounds,
        sd: datesUrl.sd,
        ed: datesUrl.ed,
    })

    // Handle map bounds change
    const handleBoundsChangeForFilters = useCallback(
        (bounds: MapBounds, fromUserInteraction: boolean = false) => {
            // Update current viewport bounds for filtering (always, not just in main-state)
            setCurrentViewportBounds(bounds)

            // If this is from user interaction (pan/zoom), switch to viewport filtering mode
            if (fromUserInteraction) {
                setIsShowingAllEvents(false)
            }
            const logBounds = `north=${bounds.north} south=${bounds.south} east=${bounds.east} west=${bounds.west}`
            logr.info('app', `handleBoundsChangeForFilters: ${logBounds}`, { fromUserInteraction, isShowingAllEvents })
        },
        [isShowingAllEvents]
    )

    const { viewport, setViewport, markers, selectedMarkerId, setSelectedMarkerId, resetMapToVisibleEvents } = useMap(
        appState,
        dispatch,
        evts,
        fltrEvtMgr,
        mapHookWidthHeight.w,
        mapHookWidthHeight.h,
        handleBoundsChangeForFilters,
    )

    // Ref for zip code mapping (must be mutable)
    const zipLatLonRef = useRef<{ [zip: string]: string } | null>(null) as MutableRefObject<{
        [zip: string]: string
    } | null>

    // Shared state for split position (percent)
    const mapPanelPercent = 60
    const [split, setSplit] = useState<number[]>([100 - mapPanelPercent, mapPanelPercent])
    const isDesktop = useBreakpoint('(min-width: 1024px)')

    // Reset when we get new eventSourceId
    // Handle transition when eventSourceId changes,
    useEffect(() => {
        logr.info('app', `uE: Event Src changed es=${eventSourceId}, changing appState`)
        if (!eventSourceId) {
            setHeaderName('Calendar Map Filter')
            // No reset needed - will just stay in events-init
        } else {
            setHeaderName('Loading Event Source...')
            dispatch(appActions.eventsLoading())
        }
        // TODO move this somewhere else - perhaps umami has own file to track appState changes?
        /*
        umamiTrack('LoadCalendar', {
            es: Array.isArray(eventSourceId) ? eventSourceId.join(',') : eventSourceId ?? 'null',
            numEvents: evts.allEvents.length,
        })
        */
    }, [eventSourceId])

    // Handle transition from events-init via EVENTS_LOADED action to events-loaded
    useEffect(() => {
        if (appState !== 'events-init') return

        const k = evts.visibleEvents.length
        const all = evts.allEvents ? evts.allEvents.length : 0
        const msg = `uE: appState:events-init, apiIsLoading=${apiIsLoading}, evnts.shown=${k}, evnts.all=${all}`
        logr.info('app', msg)
        // Initialize if API loaded and we have events
        if (!apiIsLoading && all > 0) {
            const headerName = determineHeaderName(eventSourceId, eventSources, ExampleEventsSources)
            setHeaderName(headerName)
            dispatch(appActions.eventsLoaded(all > 0))
        }
    }, [apiIsLoading, appState, evts, eventSources, eventSourceId])

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
        (newDateRange: { start: string; end: string } | undefined) => {
            logr.info('app', 'Date filter changed', {
                start: newDateRange?.start,
                end: newDateRange?.end,
            })
            setDateSliderRange(newDateRange)
            filters.setDateRange(newDateRange)
        },
        [filters]
    )

    // Handle map filter removal
    const handleClearMapFilter = () => {
        if (appState !== 'main-state') {
            logr.info('app', 'handleClearMapFilter: Ignoring when appState is not main-state')
            return
        }
        logr.info('app', 'handleClearMapFilter - clearing filters, selected events and markers')
        setCurrentViewportBounds(null) // Clear viewport filter
        setSelectedMarkerId(null)
        setSelectedEventIdUrl('') // match default value for param to clear from URL

        // Use resetMapToVisibleEvents to properly reset the map to show all domain-filtered events
        resetMapToVisibleEvents()
    }

    const handleShowAllDomainFltrdEvnts = () => {
        logr.info('app', 'handleShowAllDomainFltrdEvnts - calling resetMapToVisibleEvents')
        // Use resetMapToVisibleEvents to properly reset the map to show all domain-filtered events
        resetMapToVisibleEvents()
    }

    // Properly memoize to avoid recreating function on each render
    // TODO: move this to another file, maybe new file like src/lib/utils/eventSelection.ts
    const handleEventSelect = useCallback(
        (eventId: string | null) => {
            logr.info('app', `handleEventSelect() selectedEventIdUrl from ${selectedEventIdUrl} to ${eventId}`)
            setSelectedEventIdUrl(eventId)

            // If event is null, clear marker selection
            if (!eventId) {
                setSelectedMarkerId(null)
                return
            }

            // Find the event
            const event = evts.allEvents.find((e) => e.id === eventId)
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
        [evts.allEvents, markers, selectedEventIdUrl, setSelectedEventIdUrl, setSelectedMarkerId, setViewport, viewport]
    )


    // Removed confusing useEffect - DateAndSearchFilters handles URL filter application directly

    // Handle URL parsing steps 3-6 after domain filters are applied
    useEffect(() => {
        if (!isReadyForViewportSetting(appState)) return

        // Step 3: Handle selected event (se parameter)
        if (selectedEventIdUrl) {
            logr.info('app', 'URL parsing step 3: selectedEventIdUrl is set, checking if valid')
            
            // Step 4: Validate event ID 
            // If se and valid event id: act like user clicked on event 
            // If se and not valid: act like se wasn't present, remove from url, console log warning, and continue)
            const event = evts.allEvents.find((e) => e.id === selectedEventIdUrl)
            if (!event) {
                logr.warn('app', `URL parsing step 4: Invalid event ID '${selectedEventIdUrl}', treating as if se wasn't present`)
                // Continue to step 5/6 as if se wasn't present
                // TODO: Clear invalid se from URL
            } else {
                logr.info('app', 'URL parsing step 3-4: Valid event ID, selecting event (no more URL parsing)')
                handleEventSelect(selectedEventIdUrl)
                dispatch(appActions.viewportSet())
                return // Stop URL parsing here per rules
            }
        }

        // Step 5: If llz and es only: update map based on llz coordinates
        if (viewportUrl.z !== null) {
            logr.info('app', `URL parsing step 5: Setting viewport from llz coordinates (z=${viewportUrl.z})`)
            setViewport(llzToViewport(viewportUrl.lat, viewportUrl.lon, viewportUrl.z))
            setLlzChecked(true)
            dispatch(appActions.viewportSet())
            return
        }

        // Step 6: Auto-resize map based on domain-filtered events
        logr.info('app', 'URL parsing step 6: Auto-resizing map to show domain-filtered events')
        resetMapToVisibleEvents()
        // resetMapToVisibleEvents will dispatch VIEWPORT_SET
    }, [appState, selectedEventIdUrl, handleEventSelect, viewportUrl, resetMapToVisibleEvents, setViewport, evts.allEvents])

    // Final transition to main-state
    useEffect(() => {
        if (isViewportSet(appState)) {
            logr.info('app', 'uE: viewport-set -> main-state')
            dispatch(appActions.readyForInteraction())
        }
    }, [appState])

    // Expose events data to window for debugging
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.cmf_evts = evts
            window.cmf_evts_sources = eventSources
        }
    }, [evts, eventSources])

    // Update URL parameters when viewport changes
    useEffect(() => {
        // Skip during initialization
        if (appState !== 'main-state') return

        // Because we want to only have url params when needed,
        // and because when selectedEventIdUrl is set the map will zoom to that,
        // we don't need zoom, lat, or lon when selectedEventIdUrl is set.
        if (selectedEventIdUrl && selectedEventIdUrl !== '') {
            // Remove viewport parameters and just keep the selected event ID
            setViewportUrl({ lat: null, lon: null, z: null })
            logr.info('app', `Updated URL parameter se only, selectedEventIdUrl=${selectedEventIdUrl}, no zoom=${viewport.zoom}`)
        } else if (llzChecked) {
            setViewportUrl({
                lat: viewport.latitude,
                lon: viewport.longitude,
                z: viewport.zoom,
            })
            logr.info('app', `Updated llz URL parameters, no selectedEventIdUrl and llzChecked, zoom=${viewport.zoom}`)
        } else {
            // Clear llz URL parameters when checkbox is unchecked
            setViewportUrl({ lat: null, lon: null, z: null })
            logr.info('app', `Cleared llz URL parameters, llzChecked=${llzChecked}`)
        }
    }, [viewport, appState, selectedEventIdUrl, llzChecked, setViewportUrl])

    // If no eventSourceId is provided, show the eventSource selector
    if (!eventSourceId) {
        return (
            <div className="min-h-screen flex flex-col">
                <main className="flex-grow flex items-center justify-center">
                    <EventsSourceSelector />
                </main>
                <Footer />
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col">
            <main className="h-screen">
                <PanelGroup
                    direction={isDesktop ? 'horizontal' : 'vertical'}
                    className="h-full w-full"
                    onLayout={setSplit}
                >
                    <Panel minSize={20} maxSize={80} defaultSize={split[0]}>
                        <Sidebar
                            headerName={headerName}
                            eventCount={{ shown: evts.visibleEvents.length, total: evts.allEvents.length }}
                            eventSources={eventSources}
                            onShowAllDomainFltrdEvnts={handleShowAllDomainFltrdEvnts}
                            llzChecked={llzChecked}
                            onLlzCheckedChange={setLlzChecked}
                            ref={eventsSidebarRef}
                            className="h-full"
                        >
                            <ActiveFilters
                                evts={evts}
                                onClearMapFilter={handleClearMapFilter}
                                onClearSearchFilter={() => handleSearchChange('')}
                                onClearDateFilter={() => {
                                    handleDateRangeChange(undefined)
                                    setDateQuickFilterUrl('')
                                }}
                            />
                            <DateAndSearchFilters
                                searchQuery={searchQueryUrl}
                                onSearchChange={handleSearchChange}
                                dateSliderRange={dateSliderRange}
                                onDateRangeChange={handleDateRangeChange}
                                onDateQuickFilterChange={setDateQuickFilterUrl}
                                appState={appState}
                                searchQueryFromUrl={searchQueryUrl}
                                dateQuickFilterFromUrl={dateQuickFilterUrl}
                                dateRangeFromUrl={{ sd: datesUrl.sd, ed: datesUrl.ed }}
                                dispatch={dispatch}
                            />
                            {apiError ? (
                                <div className="p-4">
                                    <ErrorMessage message={apiError.message} className="mb-4" />
                                </div>
                            ) : (
                                <EventList
                                    evts={evts}
                                    selectedEventId={selectedEventIdUrl}
                                    onEventSelect={handleEventSelect}
                                    apiIsLoading={apiIsLoading}
                                />
                            )}
                        </Sidebar>
                    </Panel>
                    <PanelResizeHandle
                        className={
                            isDesktop ? 'bg-gray-200 w-2 cursor-col-resize' : 'bg-gray-200 h-2 cursor-row-resize'
                        }
                    />
                    <Panel minSize={20} maxSize={80} defaultSize={split[1]}>
                        <div className="h-full w-full">
                            <MapContainer
                                viewport={viewport}
                                onViewportChange={setViewport}
                                markers={markers}
                                selectedMarkerId={selectedMarkerId}
                                onMarkerSelect={(markerId) => {
                                    setSelectedMarkerId(markerId)
                                    if (!markerId) {
                                        setSelectedEventIdUrl('')
                                    }
                                }}
                                onBoundsChange={handleBoundsChangeForFilters}
                                onWidthHeightChange={setMapHookWidthHeight}
                                selectedEventId={selectedEventIdUrl}
                                onEventSelect={setSelectedEventIdUrl}
                                eventSources={eventSources || undefined}
                            />
                        </div>
                    </Panel>
                </PanelGroup>
            </main>
        </div>
    )
}

export default function Home() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <HomeContent />
        </Suspense>
    )
}
