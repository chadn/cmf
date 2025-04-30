'use client'

import { useState, useEffect, useCallback, Suspense, useRef, useReducer } from 'react'
import MapContainer from '@/components/map/MapContainer'
import EventList from '@/components/events/EventList'
import EventFilters from '@/components/events/EventFilters'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import EventSourceSelector from '@/components/home/EventSourceSelector'
import { useEventsManager } from '@/lib/hooks/useEventsManager'
import { useMap, genMarkerId } from '@/lib/hooks/useMap'
import { MapBounds } from '@/types/map'
import { logr } from '@/lib/utils/logr'
import ActiveFilters from '@/components/events/ActiveFilters'
import { viewportUrlToViewport, parseAsEventSource, parseAsZoom, parseAsLatLon } from '@/lib/utils/location'
import { parseAsCmfDate, parseAsDateQuickFilter } from '@/lib/utils/date'
import { parseAsInteger, parseAsFloat, useQueryState, useQueryStates } from 'nuqs'
import ErrorMessage from '@/components/common/ErrorMessage'
import { useRouter } from 'next/navigation'

// quiet window.cmf_events build error - https://stackoverflow.com/questions/56457935/typescript-error-property-x-does-not-exist-on-type-window
declare const window: any

// Application state machine types
type AppState = 'uninitialized' | 'events-init' | 'map-init' | 'main-prep' | 'main-state' | 'menu-shown'
// Actions that can be dispatched to change or transition state
type AppAction =
    | { type: 'RESET_STATE' }
    | { type: 'EVENTS_LOADING' }
    | { type: 'EVENTS_LOADED'; hasEvents: boolean }
    | { type: 'INIT_MAP_WITH_ALL_EVENTS' }
    | { type: 'MAP_INITIALIZED' }
    | { type: 'SHOW_MENU' }
    | { type: 'HIDE_MENU' }

// Application state machine, appState.
// uninitialized - first initial state, nothing is known. Initial URL params are stored.
// events-init - fetching events from eventSource based on initial URL params
// map-init - update map based on initial URL params and updated eventSource events
// main-prep - apply filters based on url parameters (IS THIS NEEDED?)
// main-state - respond to user interactions, updates some url parameters
// menu-shown - map and filters on pause, user can view info about CMF - link to GitHub, blog, stats on current eventSource and filter
function appReducer(state: AppState, action: AppAction): AppState {
    let newState = state
    switch (action.type) {
        case 'RESET_STATE':
            newState = 'uninitialized'
            break
        case 'EVENTS_LOADING':
            newState = 'events-init'
            break
        case 'EVENTS_LOADED':
            // type guard added to quiet build error
            if (action.type === 'EVENTS_LOADED') {
                // Only proceed if we have events
                newState = action.hasEvents ? 'map-init' : state
            }
            break
        case 'MAP_INITIALIZED':
            newState = 'main-state'
            break
        case 'SHOW_MENU':
            newState = 'menu-shown'
            break
        case 'HIDE_MENU':
            newState = 'main-state'
            break
    }
    if (newState !== state) {
        logr.info('app', `action=${action.type} making appState=${newState}, oldState=${state}`)
    } else {
        logr.info('app', `action=${action.type} no change in appState=${newState}`)
    }
    return newState
}

function HomeContent() {
    const router = useRouter()
    // URL query state parameters
    const [eventSourceId, setEventSourceId] = useQueryState('es', parseAsEventSource) // replaced gc calendarId
    const [selectedEventIdUrl, setSelectedEventIdUrl] = useQueryState('se', { defaultValue: '' })
    const [viewportUrl, setViewportUrl] = useQueryStates({
        z: parseAsZoom,
        lat: parseAsLatLon,
        lon: parseAsLatLon,
    })
    const [searchQueryUrl, setSearchQueryUrl] = useQueryState('sq', { defaultValue: '' }) // search query
    const [datesUrl, setDatesUrl] = useQueryStates({
        sd: parseAsCmfDate.withDefault('-1m'), // app start date
        ed: parseAsCmfDate.withDefault('3m'), // app end date
        //fsd: parseAsCmfDate.withDefault('0d'), // filter start date  - not using, qf is good enough. leaving for future reference.
        //fed: parseAsCmfDate, // filter end date
    })
    // quick filter (today, next3days, future, past, etc)
    const [dateQuickFilterUrl, setDateQuickFilterUrl] = useQueryState('qf', parseAsDateQuickFilter)
    const initialUrlParams = {
        es: eventSourceId,
        se: selectedEventIdUrl,
        z: viewportUrl.z,
        lat: viewportUrl.lat,
        lon: viewportUrl.lon,
        sq: searchQueryUrl,
        sd: datesUrl.sd,
        ed: datesUrl.ed,
        //fsd: datesUrl.fsd,
        //fed: datesUrl.fed,
        qf: dateQuickFilterUrl,
    }
    logr.info('app', `HomeContent initialUrlParams=${JSON.stringify(initialUrlParams)}`)

    const [appState, dispatch] = useReducer(appReducer, 'uninitialized')
    const [headerName, setHeaderName] = useState('Calendar Map Filter')

    // Ref for the events sidebar container
    const eventsSidebarRef = useRef<HTMLDivElement>(null)

    // Local state for filters
    const [dateSliderRange, setDateSliderRange] = useState<{ start: string; end: string } | undefined>(undefined)

    // Use our new EventsManager hook to get events and filter methods
    const { eventsFn, evts, filters, eventSource, apiIsLoading, apiError } = useEventsManager({
        eventSourceId,
        sd: datesUrl.sd,
        ed: datesUrl.ed,
    })

    // Map state - now uses events with locations instead of filtered events
    const {
        viewport,
        setViewport,
        markers,
        selectedMarkerId,
        setSelectedMarkerId,
        resetMapToAllEvents,
        isMapOfAllEvents,
    } = useMap(eventsFn())

    // Reset when we get new eventSourceId
    // Handle transition when eventSourceId changes,
    useEffect(() => {
        logr.info('app', `uE: Event Src changed es=${eventSourceId}, changing appState`)
        if (!eventSourceId) {
            setHeaderName('Calendar Map Filter')
            dispatch({ type: 'RESET_STATE' })
        } else {
            setHeaderName('Loading Event Source...')
            dispatch({ type: 'EVENTS_LOADING' })
        }
        if (typeof umami !== 'undefined') {
            umami.track('LoadCalendar', { es: eventSourceId ?? 'null', numEvents: evts.allEvents.length })
        }
    }, [eventSourceId])

    // Handle transition from events-init via EVENTS_LOADED action to map-init
    useEffect(() => {
        if (appState !== 'events-init') return

        const k = evts.shownEvents.length
        const all = evts.allEvents ? evts.allEvents.length : 0
        const msg = `uE: appState:events-init, apiIsLoading=${apiIsLoading}, evnts.shown=${k}, evnts.all=${all}`
        logr.debug('app', msg)
        // Initialize if API loaded and we have events
        if (!apiIsLoading && all > 0) {
            setHeaderName(eventSource?.name ?? 'Calendar Map Filter')
            dispatch({ type: 'EVENTS_LOADED', hasEvents: all > 0 })
        }
    }, [apiIsLoading, appState, evts, eventSource])

    // Handle transition from map-init via MAP_INITIALIZED action to main-state
    useEffect(() => {
        if (appState !== 'map-init') return

        if (selectedEventIdUrl) {
            logr.info('app', 'uE: map-init: selectedEventIdUrl is set, resetMapToAllEvents')
            handleEventSelect(selectedEventIdUrl)
        } else if (viewportUrl.z === null) {
            logr.info('app', 'uE: map-init: zoom is null (not set), resetMapToAllEvents')
            resetMapToAllEvents()
        } else {
            logr.info('app', `uE: map-init: zoom=${viewportUrl.z}, setViewport from URL`)
            setViewport(viewportUrlToViewport(viewportUrl.lat, viewportUrl.lon, viewportUrl.z))
        }
        logr.info('app', 'uE: map-init done (url params)')
        dispatch({ type: 'MAP_INITIALIZED' })
    }, [appState, filters, selectedEventIdUrl, setViewport, resetMapToAllEvents])

    // Apply search filter when appState changes to main-state
    useEffect(() => {
        if (appState !== 'main-state') return
        if (searchQueryUrl) {
            logr.info('app', 'uE: main-state: applying search filter from URL', { searchQueryUrl })
            filters.setSearchQuery(searchQueryUrl)
        }
    }, [appState])

    // Handle search query changes
    const handleSearchChange = useCallback(
        (query: string) => {
            logr.info('app', 'Search filter changed', { query })
            setSearchQueryUrl(query)
            filters.setSearchQuery(query)
        },
        [filters]
    )

    // Handle date range changes
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

    // Handle map bounds change
    const handleBoundsChange = useCallback(
        (bounds: MapBounds) => {
            // Ignore bounds changes during initialization
            if (appState !== 'main-state') {
                logr.info('app', 'Ignoring bounds change during initialization')
                return
            }
            logr.info('app', 'Map bounds changed', bounds)
            filters.setMapBounds(bounds)
        },
        [filters, appState]
    )

    // Handle map filter removal
    const handleClearMapFilter = () => {
        if (appState !== 'main-state') {
            logr.info('app', 'Ignoring handleClearMapFilter during initialization')
            return
        }
        logr.info('app', 'Map filter cleared')
        filters.setMapBounds(undefined)
        setSelectedMarkerId(null)
        setSelectedEventIdUrl('') // match default value for param to clear from URL
        // Call resetMapToAllEvents to properly reset the map to show all events
        logr.info('app', 'calling resetMapToAllEvents after Clearing URL for zoom, latitude, and longitude')
        resetMapToAllEvents()
    }

    // Handle unknown locations filter toggle
    const handleUnknownLocationsToggle = useCallback(() => {
        filters.setShowUnknownLocationsOnly(true)
        logr.info('app', 'Unknown locations filter toggled')
    }, [filters])

    // Reset all filters
    const handleResetFilters = useCallback(() => {
        logr.info('app', 'Resetting all filters')
        setSearchQueryUrl('')
        setDateSliderRange(undefined)
        filters.resetAll()
        resetMapToAllEvents()
    }, [filters, resetMapToAllEvents])

    const handleEventSelect = (eventId: string | null) => {
        logr.info('app', `handleEventSelect() selectedEventIdUrl from ${selectedEventIdUrl} to ${eventId}`)
        setSelectedEventIdUrl(eventId)

        // If event is null, clear marker selection
        if (!eventId) {
            setSelectedMarkerId(null)
            return
        }

        // Find the event and its marker
        const event = evts.allEvents.find((e) => e.id === eventId)
        if (
            !event ||
            event.resolved_location?.status !== 'resolved' ||
            !event.resolved_location.lat ||
            !event.resolved_location.lng
        ) {
            if (event?.original_event_url) {
                logr.info('app', `handleEventSelect() no resolved location, opening url=${event.original_event_url}`)
                window.open(event.original_event_url, '_blank')
            }
            return
        }
        const markerId = genMarkerId(event)
        if (!markerId) return

        // Set marker and update viewport
        setSelectedMarkerId(markerId)

        // Calculate the offset based on the current zoom level
        // Higher zoom levels need smaller offsets
        const zoomFactor = Math.max(1, viewport.zoom / 10)
        const latOffset = -0.003 / zoomFactor // Adjust this value as needed

        // Update viewport with adjusted latitude to ensure popup is fully visible
        setViewport({
            ...viewport,
            latitude: (event.resolved_location.lat || 0) - latOffset, // Move map down slightly
            longitude: event.resolved_location.lng || 0,
            zoom: 14,
        })

        logr.info('app', 'Adjusted viewport for popup visibility', {
            originalLat: event.resolved_location.lat,
            adjustedLat: (event.resolved_location.lat || 0) - latOffset,
            offset: latOffset,
            zoom: viewport.zoom,
        })
    }
    // Handler for selecting an event from the list
    const handleEventSelectCb = useCallback(handleEventSelect, [
        evts.allEvents,
        setSelectedMarkerId,
        setViewport,
        viewport,
    ])
    // Expose events data to window for debugging
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // window.cmf_events is FilteredEvents + eventSource name
            window.cmf_events = { ...evts, eventSource: eventSource }
        }
    }, [evts, eventSource])

    // Function to scroll the events list to the top
    const scrollEventsToTop = useCallback(() => {
        if (eventsSidebarRef.current) {
            eventsSidebarRef.current.scrollTop = 0
        }
    }, [])

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
        } else {
            setViewportUrl({
                lat: viewport.latitude,
                lon: viewport.longitude,
                z: viewport.zoom,
            })
        }
        logr.info('app', `Updated URL parameters, selectedEventIdUrl=${selectedEventIdUrl}, zoom=${viewport.zoom}`)
    }, [viewport, appState, selectedEventIdUrl, setViewportUrl])

    // If no eventSourceId is provided, show the eventSource selector
    if (!eventSourceId) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header headerName={headerName} />
                <main className="flex-grow flex items-center justify-center">
                    <EventSourceSelector />
                </main>
                <Footer />
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col h-screen">
            <Header
                headerName={headerName}
                eventCount={{ shown: evts.shownEvents.length, total: evts.allEvents.length }}
                onInfoClick={scrollEventsToTop}
            />

            <main className="flex-grow flex flex-col md:flex-row h-[calc(100vh-64px)]">
                {/* Sidebar with filters and event list */}
                <div
                    ref={eventsSidebarRef}
                    className="w-full md:w-1/2 lg:w-2/5 h-[40vh] md:h-full overflow-auto p-1 border-r"
                >
                    <ActiveFilters
                        evts={evts}
                        isMapOfAllEvents={isMapOfAllEvents}
                        onClearMapFilter={handleClearMapFilter}
                        onClearSearchFilter={() => handleSearchChange('')}
                        onClearDateFilter={() => {
                            handleDateRangeChange(undefined)
                            setDateQuickFilterUrl('')
                        }}
                    />

                    <EventFilters
                        searchQuery={searchQueryUrl}
                        onSearchChange={handleSearchChange}
                        dateSliderRange={dateSliderRange}
                        onDateRangeChange={handleDateRangeChange}
                        dateQuickFilterUrl={dateQuickFilterUrl}
                        onDateQuickFilterChange={setDateQuickFilterUrl}
                        onReset={handleResetFilters}
                        appState={appState}
                        sd={datesUrl.sd}
                        ed={datesUrl.ed}
                    />

                    {apiError ? (
                        <div className="p-4">
                            <ErrorMessage
                                message={apiError.message}
                                className="mb-4"
                            />
                        </div>
                    ) : (
                        <EventList
                            evts={evts}
                            selectedEventId={selectedEventIdUrl}
                            onEventSelect={handleEventSelectCb}
                            apiIsLoading={apiIsLoading}
                        />
                    )}
                </div>

                {/* Map */}
                <div className="w-full md:w-1/2 lg:w-3/5 h-[60vh] md:h-full">
                    <MapContainer
                        viewport={viewport}
                        onViewportChange={setViewport}
                        markers={markers}
                        selectedMarkerId={selectedMarkerId}
                        onMarkerSelect={(markerId) => {
                            setSelectedMarkerId(markerId)

                            // If markerId is null, clear event selection too
                            if (!markerId) {
                                setSelectedEventIdUrl('')
                            }
                        }}
                        onBoundsChange={handleBoundsChange}
                        onResetView={resetMapToAllEvents}
                        selectedEventId={selectedEventIdUrl}
                        onEventSelect={setSelectedEventIdUrl}
                        isMapOfAllEvents={isMapOfAllEvents}
                    />
                </div>
            </main>
        </div>
    )
}

export default function Home() {
    const router = useRouter()
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <HomeContent />
        </Suspense>
    )
}
