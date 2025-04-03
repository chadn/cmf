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
import { useMap } from '@/lib/hooks/useMap'
import { MapBounds } from '@/types/map'
import { logr } from '@/lib/utils/logr'

// quiet window.cmf_events build error - https://stackoverflow.com/questions/56457935/typescript-error-property-x-does-not-exist-on-type-window
declare const window: any

function HomeContent() {
    const searchParams = useSearchParams()
    const calendarId = searchParams.get('gc') || ''
    // TODO: implement these
    const calendarStartDate = searchParams.get('sd') || ''
    const calendarEndDate = searchParams.get('ed') || ''

    // Local state for filters
    const [searchQuery, setLocalSearchQuery] = useState('')
    const [dateRange, setLocalDateRange] = useState<{ start: string; end: string } | undefined>(undefined)

    // Log component mount and calendar ID - only once when component mounts
    useEffect(() => {
        logr.info('app', `uE: Calendar ID gc=${calendarId}`)
    }, [calendarId]) // Added calendarId to dependencies to ensure logs on calendar change

    // Use our new EventsManager hook to get events and filter methods
    const { events, filters, calendar, apiIsLoading, apiError, fltrEvtMgr } = useEventsManager({ calendarId })

    // State for selected event
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

    // Map state - now uses events with locations instead of filtered events
    const {
        viewport,
        setViewport,
        markers,
        selectedMarkerId,
        setSelectedMarkerId,
        updateMarkersShown,
        resetToAllEvents,
        isMapOfAllEvents,
    } = useMap({ events: events.filtered })

    // Log component mount and calendar ID - only once when component mounts
    useEffect(() => {
        if (!apiIsLoading && events.filteredWithLocations.length > 0) {
            logr.info(
                'app',
                `isLoading=false, Loading finished ${events.filteredWithLocations.length} events, setTimeout resetToAllEvents`
            )
            setTimeout(() => {
                logr.info('app', 'uE: apiIsLoading=false, calling resetToAllEvents')
                resetToAllEvents()
            }, 100)
        } else {
            // TODO: Chad - consider pausing stuff
            const l = events.filteredWithLocations ? events.filteredWithLocations.length : 0
            logr.info('app', `uE: CHAD apiIsLoading=${apiIsLoading}, evnts.withLocations=${l}`)
        }
    }, [apiIsLoading, resetToAllEvents, events.filteredWithLocations]) // Added calendarId to dependencies to ensure logs on calendar change

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
            logr.info('app', 'Map bounds changed', bounds)
            filters.setMapBounds(bounds)
        },
        [filters]
    )

    // Handle map filter removal
    const handleClearMapFilter = () => {
        logr.info('app', 'Map filter cleared')
        filters.setMapBounds(undefined)
        setSelectedMarkerId(null)
        setSelectedEventId(null)
        // Call resetToAllEvents to properly reset the map to show all events
        resetToAllEvents()
        updateMarkersShown(events.filtered)
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
        resetToAllEvents()
    }, [filters, resetToAllEvents])

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
            const event = events.all.find((e) => e.id === eventId)
            if (!event || !event.resolved_location?.lat || !event.resolved_location?.lng) {
                return
            }

            // Generate marker ID
            const markerId = `${event.resolved_location.lat.toFixed(6)},${event.resolved_location.lng.toFixed(6)}`

            // Set marker and update viewport
            setSelectedMarkerId(markerId)
            setViewport({
                ...viewport,
                latitude: event.resolved_location.lat,
                longitude: event.resolved_location.lng,
                zoom: 14,
            })
        },
        [events.all, setSelectedMarkerId, setViewport, viewport]
    )

    // Expose events data to window for debugging
    useEffect(() => {
        logr.info('app', `uE: updateMarkersShown(${events.filtered.length})`)
        updateMarkersShown(events.filtered)
    }, [events.filtered, updateMarkersShown])

    useEffect(() => {
        if (events?.all?.length > 0 && typeof window !== 'undefined') {
            // Add events to window for debugging
            const temp_cmf_events = {
                all: events.all,
                filtered: events.filtered,
                filteredWithLocations: events.filteredWithLocations,
                withoutLocations: events.withoutLocations,
                totalCount: calendar.totalCount,
                //unknown_locations_count: calendar.unknownLocationsCount, // TODO: CHAD - probably delete this
                calendar_name: calendar.name || '',
                calendarId: calendarId,
            }
            window.cmf_events = temp_cmf_events

            logr.debug('app', 'Events data exposed to window.cmf_events', window.cmf_events)
        }
    }, [
        events, // NOTE: events is an object with multiple properties, when any change this effect runs
        calendar.totalCount,
        calendar.unknownLocationsCount,
        calendar.name,
        calendarId,
    ])

    // Get filter stats
    const { mapFilteredCount, searchFilteredCount, dateFilteredCount } = filters.getStats()

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
            <Header calendarName={calendar.name} />

            <main className="flex-grow flex flex-col md:flex-row h-[calc(100vh-120px)]">
                {/* Sidebar with filters and event list */}
                <div className="w-full md:w-1/2 h-full overflow-auto p-4 border-r">
                    <div className="mb-4">
                        <p>
                            Map showing {events.filtered.length} of {calendar.totalCount} events
                            {calendar.unknownLocationsCount > 0 && (
                                <button
                                    onClick={handleUnknownLocationsToggle}
                                    className="ml-2 text-blue-500 text-xs hover:underline"
                                >
                                    ({calendar.unknownLocationsCount} bad addr)
                                </button>
                            )}
                        </p>
                    </div>

                    {/* Active filters display */}
                    <div className="mb-4 flex flex-wrap gap-2">
                        {!isMapOfAllEvents && mapFilteredCount > 0 && (
                            <div className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-3 w-3 mr-1"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4"
                                    />
                                </svg>
                                {mapFilteredCount} Filtered by Map
                                <button
                                    onClick={handleClearMapFilter}
                                    className="ml-1 text-blue-700 hover:text-blue-900"
                                    aria-label="Remove map filter"
                                >
                                    ×
                                </button>
                            </div>
                        )}
                        {searchFilteredCount > 0 && (
                            <div className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-3 w-3 mr-1"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                                {searchFilteredCount} Filtered by Search
                                <button
                                    onClick={() => handleSearchChange('')}
                                    className="ml-1 text-blue-700 hover:text-blue-900"
                                    aria-label="Remove search filter"
                                >
                                    ×
                                </button>
                            </div>
                        )}
                        {dateFilteredCount > 0 && (
                            <div className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-3 w-3 mr-1"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                </svg>
                                {dateFilteredCount} Filtered by Date
                                <button
                                    onClick={() => handleDateRangeChange(undefined)}
                                    className="ml-1 text-blue-700 hover:text-blue-900"
                                    aria-label="Remove date filter"
                                >
                                    ×
                                </button>
                            </div>
                        )}
                    </div>

                    <EventFilters
                        searchQuery={searchQuery}
                        onSearchChange={handleSearchChange}
                        dateRange={dateRange}
                        onDateRangeChange={handleDateRangeChange}
                        onReset={handleResetFilters}
                    />

                    <EventList
                        events={events.filtered}
                        selectedEventId={selectedEventId}
                        onEventSelect={handleEventSelect}
                        apiIsLoading={apiIsLoading}
                    />
                </div>

                {/* Map */}
                <div className="w-full md:w-1/2 h-[500px] md:h-full">
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
                        onResetView={resetToAllEvents}
                        selectedEventId={selectedEventId}
                        onEventSelect={setSelectedEventId}
                        isMapOfAllEvents={isMapOfAllEvents}
                    />
                </div>
            </main>

            <Footer />
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
