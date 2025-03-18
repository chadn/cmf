'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import MapContainer from '@/components/map/MapContainer'
import EventList from '@/components/events/EventList'
import EventFilters from '@/components/events/EventFilters'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import CalendarSelector from '@/components/home/CalendarSelector'
import { useEvents } from '@/lib/hooks/useEvents'
import { useMap } from '@/lib/hooks/useMap'
import { MapBounds } from '@/types/map'
import { debugLog, clientDebug } from '@/lib/utils/debug'

export default function Home() {
    const searchParams = useSearchParams()
    const calendarId = searchParams.get('gc') || ''

    // State for filters
    const [searchQuery, setSearchQuery] = useState('')
    const [dateRange, setDateRange] = useState<
        { start: string; end: string } | undefined
    >(undefined)
    const [mapBounds, setMapBounds] = useState<MapBounds | null>(null)
    const [showUnknownLocationsOnly, setShowUnknownLocationsOnly] =
        useState(false)
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

    // Log component mount and calendar ID - only once when component mounts
    useEffect(() => {
        clientDebug.log('page', 'Home page component mounted')

        if (calendarId) {
            clientDebug.log('page', 'Calendar ID from URL parameter', {
                param: 'gc',
                value: calendarId,
            })
        } else {
            clientDebug.log('page', 'No calendar ID found in URL parameters')
        }
    }, []) // Empty dependency array ensures this runs only once

    // Get events with filters applied
    const {
        events,
        filteredEvents,
        isLoading,
        error,
        totalCount,
        filteredCount,
        unknownLocationsCount,
        calendarName,
    } = useEvents({
        calendarId,
        dateRange,
        searchQuery,
        mapBounds: mapBounds || undefined,
        showUnknownLocationsOnly,
    })

    // Map state
    const {
        viewport,
        setViewport,
        markers,
        selectedMarkerId,
        setSelectedMarkerId,
        resetToAllEvents,
        isMapOfAllEvents,
    } = useMap({ events })

    // Handle map bounds change
    const handleBoundsChange = useCallback((bounds: MapBounds) => {
        debugLog('page', 'Map bounds changed', bounds)
        setMapBounds(bounds)
    }, [])

    // Handle map filter removal
    const handleClearMapFilter = useCallback(() => {
        debugLog('page', 'Map filter cleared')
        setMapBounds(null)
        resetToAllEvents()
    }, [resetToAllEvents])

    // Handle unknown locations filter toggle
    const handleUnknownLocationsToggle = useCallback(() => {
        setShowUnknownLocationsOnly((prev) => !prev)
        debugLog(
            'page',
            `Unknown locations filter toggled: ${
                !showUnknownLocationsOnly
                    ? 'showing only unknown'
                    : 'showing all'
            }`
        )
    }, [showUnknownLocationsOnly])

    // Reset all filters
    const handleResetFilters = useCallback(() => {
        debugLog('page', 'Resetting all filters')
        setSearchQuery('')
        setDateRange(undefined)
        setMapBounds(null)
        setShowUnknownLocationsOnly(false)
        resetToAllEvents()
    }, [resetToAllEvents])

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
            const event = events.find((e) => e.id === eventId)
            if (
                !event ||
                !event.resolved_location?.lat ||
                !event.resolved_location?.lng
            ) {
                return
            }

            // Generate marker ID
            const markerId = `${event.resolved_location.lat.toFixed(
                6
            )},${event.resolved_location.lng.toFixed(6)}`

            // Set marker and update viewport
            setSelectedMarkerId(markerId)
            setViewport({
                ...viewport,
                latitude: event.resolved_location.lat,
                longitude: event.resolved_location.lng,
                zoom: 14,
            })
        },
        [events, setSelectedMarkerId, setViewport, viewport]
    )

    // Expose events data to window for debugging
    useEffect(() => {
        if (events && events.length > 0 && typeof window !== 'undefined') {
            // @ts-ignore - Adding cmf_events to window for debugging
            window.cmf_events = {
                events,
                total_count: totalCount,
                unknown_locations_count: unknownLocationsCount,
                calendar_name: calendarName || '',
                calendar_id: calendarId || '',
            }
        }
    }, [events, totalCount, unknownLocationsCount, calendarName, calendarId])

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
            <Header calendarName={calendarName} />

            <main className="flex-grow flex flex-col md:flex-row h-[calc(100vh-120px)]">
                {/* Sidebar with filters and event list */}
                <div className="w-full md:w-1/2 h-full overflow-auto p-4 border-r">
                    <div className="mb-4">
                        <p>
                            Map showing {filteredCount} of {totalCount} events
                            {unknownLocationsCount > 0 && (
                                <button
                                    onClick={handleUnknownLocationsToggle}
                                    className="ml-2 text-blue-500 hover:underline"
                                >
                                    ({unknownLocationsCount} have unknown
                                    locations)
                                </button>
                            )}
                        </p>
                    </div>

                    {/* Active filters display */}
                    <div className="mb-4 flex flex-wrap gap-2">
                        {!isMapOfAllEvents && mapBounds && (
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
                                Map Area Filter
                                <button
                                    onClick={handleClearMapFilter}
                                    className="ml-1 text-blue-700 hover:text-blue-900"
                                    aria-label="Remove map filter"
                                >
                                    ×
                                </button>
                            </div>
                        )}

                        {/* Show All Events button */}
                        <button
                            onClick={resetToAllEvents}
                            className="inline-flex items-center bg-blue-500 text-white text-xs px-2 py-1 rounded hover:bg-blue-600"
                        >
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
                                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                                />
                            </svg>
                            Show All Events
                        </button>
                    </div>

                    <EventFilters
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        dateRange={dateRange}
                        onDateRangeChange={setDateRange}
                        onResetFilters={handleResetFilters}
                    />

                    <EventList
                        events={filteredEvents}
                        isLoading={isLoading}
                        error={error}
                        onEventSelect={handleEventSelect}
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
