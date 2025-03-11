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
    const handleBoundsChange = (bounds: MapBounds) => {
        setMapBounds(bounds)
    }

    // Handle unknown locations filter toggle
    const handleUnknownLocationsToggle = () => {
        setShowUnknownLocationsOnly(!showUnknownLocationsOnly)
    }

    // Reset all filters
    const handleResetFilters = () => {
        setSearchQuery('')
        setDateRange(undefined)
        setMapBounds(null)
        setShowUnknownLocationsOnly(false)
        resetToAllEvents()
    }

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

                                // Update viewport to center on this event
                                setViewport({
                                    ...viewport,
                                    latitude: event.resolved_location.lat,
                                    longitude: event.resolved_location.lng,
                                    zoom: 14,
                                })
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
