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
                <div className="w-full md:w-1/2 h-[500px] md:h-full">
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
