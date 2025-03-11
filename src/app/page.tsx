'use client'

import { useState, useEffect } from 'react'
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
    // Add a useEffect to ensure this runs only in the browser
    useEffect(() => {
        clientDebug.log('page', 'Home page component mounted')
    }, [])

    const searchParams = useSearchParams()
    const calendarId = searchParams.get('gc') || ''

    // Log the calendar ID from URL parameters
    useEffect(() => {
        if (calendarId) {
            clientDebug.log('page', 'Calendar ID from URL parameter', {
                param: 'gc',
                value: calendarId,
            })
        } else {
            clientDebug.log('page', 'No calendar ID found in URL parameters')
        }
    }, [calendarId])

    // State for filters
    const [searchQuery, setSearchQuery] = useState('')
    const [dateRange, setDateRange] = useState<
        { start: string; end: string } | undefined
    >(undefined)
    const [mapBounds, setMapBounds] = useState<MapBounds | null>(null)
    const [showUnknownLocationsOnly, setShowUnknownLocationsOnly] =
        useState(false)

    // Log component mount and calendar ID
    useEffect(() => {
        debugLog('page', 'Home page component mounted', { calendarId })
    }, [calendarId])

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

    // Log when events are loaded or filtered
    useEffect(() => {
        if (!isLoading && events.length > 0) {
            debugLog('page', `Calendar events loaded: ${calendarName}`, {
                totalCount,
                filteredCount,
                unknownLocationsCount,
            })
        }

        if (error) {
            debugLog('page', 'Error loading calendar events', { error })
        }
    }, [
        events,
        filteredEvents,
        isLoading,
        error,
        totalCount,
        filteredCount,
        unknownLocationsCount,
        calendarName,
    ])

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

    // Log when markers are created
    useEffect(() => {
        debugLog('page', `Map markers created: ${markers.length} markers`)
    }, [markers])

    // Handle map bounds change
    const handleBoundsChange = (bounds: MapBounds) => {
        debugLog('page', 'Map bounds changed', bounds)
        setMapBounds(bounds)
    }

    // Handle unknown locations filter toggle
    const handleUnknownLocationsToggle = () => {
        const newValue = !showUnknownLocationsOnly
        debugLog(
            'page',
            `Unknown locations filter toggled: ${
                newValue ? 'showing only unknown' : 'showing all'
            }`
        )
        setShowUnknownLocationsOnly(newValue)
    }

    // Reset all filters
    const handleResetFilters = () => {
        debugLog('page', 'Resetting all filters')
        setSearchQuery('')
        setDateRange(undefined)
        setMapBounds(null)
        setShowUnknownLocationsOnly(false)
        resetToAllEvents()
    }

    // Log when search query changes
    useEffect(() => {
        if (searchQuery) {
            debugLog('page', `Search query changed: "${searchQuery}"`)
        }
    }, [searchQuery])

    // Log when date range changes
    useEffect(() => {
        if (dateRange) {
            debugLog('page', 'Date range filter applied', dateRange)
        }
    }, [dateRange])

    // If no calendar ID is provided, show the calendar selector
    if (!calendarId) {
        debugLog('page', 'No calendar ID provided, showing selector')
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
        <div className="min-h-screen flex flex-col">
            <Header calendarName={calendarName} />

            <main className="flex-grow flex flex-col md:flex-row">
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
                        onEventSelect={(eventId) => {
                            // Find the marker for this event
                            const event = events.find((e) => e.id === eventId)
                            if (
                                event?.resolved_location?.lat &&
                                event?.resolved_location?.lng
                            ) {
                                const markerId = `${event.resolved_location.lat.toFixed(
                                    6
                                )},${event.resolved_location.lng.toFixed(6)}`
                                setSelectedMarkerId(markerId)

                                debugLog('page', `Event selected: ${eventId}`, {
                                    title: event.name,
                                    location: event.location,
                                    markerId,
                                })

                                // Update viewport to center on this event
                                setViewport({
                                    ...viewport,
                                    latitude: event.resolved_location.lat,
                                    longitude: event.resolved_location.lng,
                                    zoom: 14,
                                })
                            } else {
                                debugLog(
                                    'page',
                                    `Event selected has no location: ${eventId}`,
                                    {
                                        title: event?.name,
                                        location: event?.location,
                                    }
                                )
                            }
                        }}
                    />
                </div>

                {/* Map */}
                <div className="w-full md:w-1/2 h-1/2 md:h-full">
                    <MapContainer
                        viewport={viewport}
                        onViewportChange={setViewport}
                        markers={markers}
                        selectedMarkerId={selectedMarkerId}
                        onMarkerSelect={setSelectedMarkerId}
                        onBoundsChange={handleBoundsChange}
                        onResetView={resetToAllEvents}
                    />
                </div>
            </main>

            <Footer />
        </div>
    )
}
