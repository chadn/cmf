'use client'

import { useState, useEffect, useCallback, Suspense, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
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

// quiet window.cmf_events build error - https://stackoverflow.com/questions/56457935/typescript-error-property-x-does-not-exist-on-type-window
declare const window: any

function HomeContent() {
    const searchParams = useSearchParams()
    const calendarId = searchParams.get('gc') || ''
    // TODO: implement these
    const calendarStartDate = searchParams.get('sd') || ''
    const calendarEndDate = searchParams.get('ed') || ''

    // Ref for the events sidebar container
    const eventsSidebarRef = useRef<HTMLDivElement>(null)

    // Local state for filters
    const [searchQuery, setLocalSearchQuery] = useState('')
    const [dateRange, setLocalDateRange] = useState<{ start: string; end: string } | undefined>(undefined)
    type AppInitState = 'reset' | 'starting' | 'complete'
    const [appInitState, setAppInitState] = useState<AppInitState>('reset')

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
        setAppInitState('reset')
        logr.info('app', `uE: Calendar ID gc=${calendarId}, setAppInitState=reset`)
    }, [calendarId])

    // resetMapToAllEvents is called only once after api loads, and again if the calendarId changes
    useEffect(() => {
        const l = eventsFn().shownEvents.length
        const k = evts.shownEvents.length
        const all = evts.allEvents ? evts.allEvents.length : 0
        const msg = `uE: appInitState=${appInitState},apiIsLoading=${apiIsLoading}, evnts.shown=${l}:${k}, evnts.all=${all}`
        logr.debug('app', msg)

        // Initialize if we haven't yet AND the API finished loading, and we have events, regardless of shown count
        if (appInitState === 'reset' && !apiIsLoading && all > 0) {
            logr.info('app', `uE: api loaded and not initialized, so setTimeout resetMapToAllEvents`)
            setAppInitState('starting')
            setTimeout(() => {
                logr.info('app', `uE: api loaded and initializing, shown=${l}, all=${all}, calling resetMapToAllEvents`)
                resetMapToAllEvents()
                setTimeout(() => {
                    logr.info('app', 'uE: api loaded and initialized, setting setAppInitState=complete')
                    setAppInitState('complete')
                }, 100)
            }, 100)
        }
    }, [apiIsLoading, appInitState, resetMapToAllEvents, evts])

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
            if (appInitState !== 'complete') {
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
            setViewport({
                ...viewport,
                latitude: event.resolved_location.lat || 0,
                longitude: event.resolved_location.lng || 0,
                zoom: 14,
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

    // If no calendar ID is provided, show the calendar selector
    if (!calendarId) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-grow flex items-center justify-center p-4">
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
