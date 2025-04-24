'use client'

import { useState, useEffect, useCallback, Suspense, useRef } from 'react'
import MapContainer from '@/components/map/MapContainer'
import EventList from '@/components/events/EventList'
import EventFilters from '@/components/events/EventFilters'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import CalendarSelector from '@/components/home/CalendarSelector'
import { useEventsManager } from '@/lib/hooks/useEventsManager'
import { useMap, genMarkerId } from '@/lib/hooks/useMap'
import { MapBounds } from '@/types/map'
import { logr } from '@/lib/utils/logr'
import ActiveFilters from '@/components/events/ActiveFilters'
import { UrlParamsManager } from '@/lib/utils/url'
import { calculateBoundsFromViewport } from '@/lib/utils/location'

// quiet window.cmf_events build error - https://stackoverflow.com/questions/56457935/typescript-error-property-x-does-not-exist-on-type-window
declare const window: any

function HomeContent() {
    const [urlParams] = useState(() => new UrlParamsManager())
    const calendarId = urlParams.get('gc') as string | null

    // Ref for the events sidebar container
    const eventsSidebarRef = useRef<HTMLDivElement>(null)

    // Local state for filters
    const [searchQuery, setLocalSearchQuery] = useState('')
    const [dateRange, setLocalDateRange] = useState<{ start: string; end: string } | undefined>(undefined)

    // Application state machine
    // uninitialized - first initial state, nothing is known. Initial URL params are stored.
    // no-calendar - when there is no url param for calendar, show calendar selector
    // cal-init - fetching events for calendar based on initial URL params
    // map-init - update map based on initial URL params and updated calendar events
    // main-state - respond to user interactions, updates some url parameters
    // menu-shown - map and filters on pause, user can view info about CMF - link to GitHub, blog, stats on current calendar and filter
    type AppInitState = 'uninitialized' | 'no-calendar' | 'cal-init' | 'map-init' | 'main-state' | 'menu-shown'
    const [appInitState, setAppInitState] = useState<AppInitState>('uninitialized')

    // Use our new EventsManager hook to get events and filter methods
    const { eventsFn, evts, filters, calendar, apiIsLoading } = useEventsManager({ calendarId })

    // State for selected event
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

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

    // Reset when we get new calendar
    useEffect(() => {
        // When calendar changes, go back to uninitialized state
        setAppInitState('uninitialized')
        logr.info('app', `uE: Calendar ID gc=${calendarId}, setAppInitState=uninitialized`)
        if (typeof umami !== 'undefined') {
            umami.track('LoadCalendar', { gc: calendarId ?? 'null', numEvents: evts.allEvents.length })
        }
    }, [calendarId])

    // resetMapToAllEvents is called only once after api loads, and again if the calendarId changes
    // Handle state transitions for initialization
    useEffect(() => {
        const l = eventsFn().shownEvents.length
        const k = evts.shownEvents.length
        const all = evts.allEvents ? evts.allEvents.length : 0
        const msg = `uE: appInitState=${appInitState}, apiIsLoading=${apiIsLoading}, evnts.shown=${l}:${k}, evnts.all=${all}`
        logr.debug('app', msg)

        // Initialize if API loaded and we have events
        if (appInitState === 'uninitialized' && !apiIsLoading && all > 0) {
            setAppInitState('map-init')

            // Handle viewport initialization
            if (urlParams.isValidViewport()) {
                logr.info('app', `uE: api loaded, using url params for viewport`)
                const latitude = urlParams.get('lat') as number
                const longitude = urlParams.get('lon') as number
                const zoom = urlParams.get('zoom') as number

                const newViewport = {
                    latitude,
                    longitude,
                    zoom,
                    bearing: 0,
                    pitch: 0,
                }
                setViewport(newViewport)

                // Calculate bounds from the viewport and set them
                const bounds = calculateBoundsFromViewport(newViewport)
                filters.setMapBounds(bounds)

                // Transition to main state after a short delay
                setTimeout(() => {
                    logr.info('app', 'uE: map initialized, transitioning to main-state')
                    setAppInitState('main-state')
                }, 100)
            } else {
                // No valid viewport in URL, use all events to set map bounds
                logr.info('app', `uE: api loaded, no valid viewport in URL, showing all events`)
                setTimeout(() => {
                    logr.info('app', `uE: initializing map with all events (${all} total)`)
                    resetMapToAllEvents()

                    // Transition to main state after a short delay
                    setTimeout(() => {
                        logr.info('app', 'uE: map initialized with all events, transitioning to main-state')
                        setAppInitState('main-state')
                    }, 100)
                }, 100)
            }
        }
    }, [apiIsLoading, appInitState, resetMapToAllEvents, evts, urlParams, filters, eventsFn])

    // Handle search query changes
    const handleSearchChange = useCallback(
        (query: string) => {
            logr.info('app', 'Search filter changed', { query })
            setLocalSearchQuery(query)
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
            setLocalDateRange(newDateRange)
            filters.setDateRange(newDateRange)
        },
        [filters]
    )

    // Handle map bounds change
    const handleBoundsChange = useCallback(
        (bounds: MapBounds) => {
            // Ignore bounds changes during initialization
            if (appInitState !== 'main-state') {
                logr.debug('app', 'Ignoring bounds change during initialization')
                return
            }
            logr.info('app', 'Map bounds changed', bounds)
            filters.setMapBounds(bounds)
        },
        [filters, appInitState]
    )

    // Handle map filter removal
    const handleClearMapFilter = () => {
        logr.info('app', 'Map filter cleared')
        filters.setMapBounds(undefined)
        setSelectedMarkerId(null)
        setSelectedEventId(null)
        // Call resetMapToAllEvents to properly reset the map to show all events
        resetMapToAllEvents()
        urlParams.delete(['zoom', 'lat', 'lon'])
        logr.info('app', 'Cleared URL parameters for zoom, latitude, and longitude')
    }

    // Handle unknown locations filter toggle
    const handleUnknownLocationsToggle = useCallback(() => {
        filters.setShowUnknownLocationsOnly(true)
        logr.info('app', 'Unknown locations filter toggled')
    }, [filters])

    // Reset all filters
    const handleResetFilters = useCallback(() => {
        logr.info('app', 'Resetting all filters')
        setLocalSearchQuery('')
        setLocalDateRange(undefined)
        filters.resetAll()
        resetMapToAllEvents()
    }, [filters, resetMapToAllEvents])

    // Handler for selecting an event from the list
    const handleEventSelect = useCallback(
        (eventId: string | null) => {
            setSelectedEventId(eventId)

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

            logr.info('map', 'Adjusted viewport for popup visibility', {
                originalLat: event.resolved_location.lat,
                adjustedLat: (event.resolved_location.lat || 0) - latOffset,
                offset: latOffset,
                zoom: viewport.zoom,
            })
        },
        [evts.allEvents, setSelectedMarkerId, setViewport, viewport]
    )

    // Expose events data to window for debugging
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // window.cmf_events is FilteredEvents + calendar name
            window.cmf_events = { ...evts, calendar: calendar.name }
        }
    }, [evts, calendar.name])

    // Function to scroll the events list to the top
    const scrollEventsToTop = useCallback(() => {
        if (eventsSidebarRef.current) {
            eventsSidebarRef.current.scrollTop = 0
        }
    }, [])

    // Update URL parameters when viewport changes
    useEffect(() => {
        // Skip during initialization
        if (appInitState !== 'main-state') return

        urlParams.set({
            zoom: Math.round(viewport.zoom),
            lat: viewport.latitude.toFixed(5),
            lon: viewport.longitude.toFixed(5),
        })
        logr.info('map', `Updated URL parameters, zoom=${viewport.zoom}`)
    }, [viewport, urlParams, appInitState])

    // If no calendar ID is provided, show the calendar selector
    if (!calendarId) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-grow flex items-center justify-center">
                    <CalendarSelector />
                </main>
                <Footer />
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col h-screen">
            <Header
                calendarName={calendar.name}
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
                        onClearDateFilter={() => handleDateRangeChange(undefined)}
                    />

                    <EventFilters
                        searchQuery={searchQuery}
                        onSearchChange={handleSearchChange}
                        dateRange={dateRange}
                        onDateRangeChange={handleDateRangeChange}
                        onReset={handleResetFilters}
                    />

                    <EventList
                        evts={evts}
                        selectedEventId={selectedEventId}
                        onEventSelect={handleEventSelect}
                        apiIsLoading={apiIsLoading}
                    />
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
                                setSelectedEventId(null)
                            }
                        }}
                        onBoundsChange={handleBoundsChange}
                        onResetView={resetMapToAllEvents}
                        selectedEventId={selectedEventId}
                        onEventSelect={setSelectedEventId}
                        isMapOfAllEvents={isMapOfAllEvents}
                    />
                </div>
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
