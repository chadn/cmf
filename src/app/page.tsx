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
    } = useMap({ events: filteredEvents })

    // Handle map bounds change
    const handleBoundsChange = useCallback((bounds: MapBounds) => {
        debugLog('page', 'Map bounds changed', bounds)
        setMapBounds(bounds)
    }, [])

    // Handle map filter removal
    const handleClearMapFilter = () => {
        debugLog('page', 'Map filter cleared')
        setMapBounds(null)
        setSelectedMarkerId(null)
        setSelectedEventId(null)
        // Reset viewport to show all filtered events
        if (filteredEvents.length > 0) {
            const eventsWithLocations = filteredEvents.filter(
                (event) =>
                    event.resolved_location?.lat && event.resolved_location?.lng
            )
            if (eventsWithLocations.length > 0) {
                const bounds = eventsWithLocations.reduce(
                    (acc, event) => {
                        const lat = event.resolved_location!.lat!
                        const lng = event.resolved_location!.lng!
                        return {
                            minLat: Math.min(acc.minLat, lat),
                            maxLat: Math.max(acc.maxLat, lat),
                            minLng: Math.min(acc.minLng, lng),
                            maxLng: Math.max(acc.maxLng, lng),
                        }
                    },
                    {
                        minLat: 90,
                        maxLat: -90,
                        minLng: 180,
                        maxLng: -180,
                    }
                )

                // Add 10% padding to the bounds
                const latPadding = (bounds.maxLat - bounds.minLat) * 0.1
                const lngPadding = (bounds.maxLng - bounds.minLng) * 0.1

                setViewport({
                    latitude: (bounds.minLat + bounds.maxLat) / 2,
                    longitude: (bounds.minLng + bounds.maxLng) / 2,
                    zoom: Math.min(
                        15,
                        Math.max(
                            1,
                            Math.log2(
                                360 /
                                    (bounds.maxLng -
                                        bounds.minLng +
                                        2 * lngPadding)
                            )
                        )
                    ),
                    bearing: 0,
                    pitch: 0,
                })
            }
        }
    }

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

    // Handle clearing the search query
    const handleClearSearchQuery = useCallback(() => {
        debugLog('page', 'Clearing search query')
        setSearchQuery('')
    }, [])

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

    // Calculate filtered counts
    const getFilteredCounts = () => {
        let mapFilteredCount = 0
        let searchFilteredCount = 0
        let dateFilteredCount = 0

        events.forEach((event) => {
            // Check map filter
            if (mapBounds && event.resolved_location) {
                const lat = event.resolved_location.lat
                const lng = event.resolved_location.lng
                if (lat && lng) {
                    if (
                        !(
                            lat >= mapBounds.south &&
                            lat <= mapBounds.north &&
                            lng >= mapBounds.west &&
                            lng <= mapBounds.east
                        )
                    ) {
                        mapFilteredCount++
                    }
                }
            }

            // Check search filter
            if (searchQuery.trim() !== '') {
                const query = searchQuery.toLowerCase()
                if (
                    !event.name?.toLowerCase().includes(query) &&
                    !event.location?.toLowerCase().includes(query) &&
                    !event.description?.toLowerCase().includes(query)
                ) {
                    searchFilteredCount++
                }
            }

            // Check date filter
            if (dateRange) {
                const eventStart = new Date(event.startDate)
                const eventEnd = new Date(event.endDate)
                const rangeStart = new Date(dateRange.start)
                const rangeEnd = new Date(dateRange.end)
                if (eventEnd < rangeStart || eventStart > rangeEnd) {
                    dateFilteredCount++
                }
            }
        })

        return { mapFilteredCount, searchFilteredCount, dateFilteredCount }
    }

    const { mapFilteredCount, searchFilteredCount, dateFilteredCount } =
        getFilteredCounts()

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
                        {!isMapOfAllEvents &&
                            mapBounds &&
                            mapFilteredCount > 0 && (
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
                        {searchQuery.trim() !== '' &&
                            searchFilteredCount > 0 && (
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
                                        onClick={handleClearSearchQuery}
                                        className="ml-1 text-blue-700 hover:text-blue-900"
                                        aria-label="Remove search filter"
                                    >
                                        ×
                                    </button>
                                </div>
                            )}
                        {dateRange && dateFilteredCount > 0 && (
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
                                    onClick={() => setDateRange(undefined)}
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
                        onSearchChange={setSearchQuery}
                        dateRange={dateRange}
                        onDateRangeChange={setDateRange}
                        onReset={handleResetFilters}
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
