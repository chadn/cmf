'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { MapViewport, MapBounds, MapMarker } from '@/types/map'
import { CalendarEvent } from '@/types/events'
import { calculateCenter } from '@/lib/utils/location'
import { debugLog } from '@/lib/utils/debug'

interface UseMapProps {
    events: CalendarEvent[]
    initialViewport?: Partial<MapViewport>
}

interface UseMapReturn {
    viewport: MapViewport
    setViewport: (viewport: MapViewport) => void
    bounds: MapBounds | null
    markers: MapMarker[]
    selectedMarkerId: string | null
    setSelectedMarkerId: (id: string | null) => void
    resetToAllEvents: () => void
    isMapOfAllEvents: boolean
}

// Default viewport centered on the US
const DEFAULT_VIEWPORT: MapViewport = {
    latitude: 39.8283,
    longitude: -98.5795,
    zoom: 3,
    bearing: 0,
    pitch: 0,
}

/**
 * Custom hook for managing map state and interactions
 */
export function useMap({
    events,
    initialViewport = {},
}: UseMapProps): UseMapReturn {
    // Map viewport state
    const [viewport, setViewport] = useState<MapViewport>({
        ...DEFAULT_VIEWPORT,
        ...initialViewport,
    })

    // Log initial setup
    useEffect(() => {
        debugLog('map', 'useMap hook initialized', {
            initialViewport: { ...viewport },
            eventsCount: events.length,
        })
    }, [])

    // Map bounds state
    const [bounds, setBounds] = useState<MapBounds | null>(null)

    // Selected marker state
    const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(
        null
    )

    // Track if we're in "Map of All Events" state
    const [isMapOfAllEvents, setIsMapOfAllEvents] = useState<boolean>(false)

    // Generate markers from events
    const markers = useMemo(() => {
        const markersMap = new Map<string, MapMarker>()
        let eventsWithLocation = 0
        let eventsWithoutLocation = 0

        events.forEach((event) => {
            if (
                event.resolved_location?.status === 'resolved' &&
                event.resolved_location.lat &&
                event.resolved_location.lng
            ) {
                eventsWithLocation++
                // Create a unique ID for the marker based on coordinates
                const id = `${event.resolved_location.lat.toFixed(
                    6
                )},${event.resolved_location.lng.toFixed(6)}`

                if (markersMap.has(id)) {
                    // Add event to existing marker
                    markersMap.get(id)?.events.push(event)
                } else {
                    // Create new marker
                    markersMap.set(id, {
                        id,
                        latitude: event.resolved_location.lat,
                        longitude: event.resolved_location.lng,
                        events: [event],
                    })
                }
            } else {
                eventsWithoutLocation++
            }
        })

        const markerArray = Array.from(markersMap.values())

        debugLog('map', 'Generated map markers', {
            totalEvents: events.length,
            eventsWithLocation,
            eventsWithoutLocation,
            uniqueMarkers: markerArray.length,
            multiEventMarkers: markerArray.filter((m) => m.events.length > 1)
                .length,
        })

        return markerArray
    }, [events])

    // Reset to show all events
    const resetToAllEvents = useCallback(() => {
        debugLog('map', 'Resetting map to show all events', {
            markerCount: markers.length,
        })

        if (markers.length === 0) {
            debugLog('map', 'No markers to display, using default viewport')
            setViewport(DEFAULT_VIEWPORT)
            return
        }

        // Extract all resolved locations from events
        const locations = events
            .filter((event) => event.resolved_location?.status === 'resolved')
            .map((event) => event.resolved_location!)

        // Calculate the center point
        const center = calculateCenter(locations)

        debugLog('map', 'Calculated center point for all events', {
            latitude: center.latitude,
            longitude: center.longitude,
            locationCount: locations.length,
        })

        // Set viewport to show all events
        setViewport({
            ...viewport,
            latitude: center.latitude,
            longitude: center.longitude,
            zoom: 3, // A reasonable zoom level to show multiple markers
        })

        setIsMapOfAllEvents(true)
    }, [events, viewport, markers.length])

    // Update bounds when viewport changes
    const handleViewportChange = useCallback((newViewport: MapViewport) => {
        debugLog('map', 'Viewport changed', {
            latitude: newViewport.latitude,
            longitude: newViewport.longitude,
            zoom: newViewport.zoom,
        })

        setViewport(newViewport)
        setIsMapOfAllEvents(false)
    }, [])

    // Log when selected marker changes
    useEffect(() => {
        if (selectedMarkerId) {
            const marker = markers.find((m) => m.id === selectedMarkerId)
            if (marker) {
                debugLog(
                    'map',
                    `Selected marker changed: ${selectedMarkerId}`,
                    {
                        latitude: marker.latitude,
                        longitude: marker.longitude,
                        eventCount: marker.events.length,
                    }
                )
            }
        } else if (selectedMarkerId === null) {
            debugLog('map', 'Marker selection cleared')
        }
    }, [selectedMarkerId, markers])

    // Initialize map to show all events
    useEffect(() => {
        if (markers.length > 0 && !initialViewport.latitude) {
            debugLog('map', 'Initializing map to show all events', {
                markerCount: markers.length,
            })
            resetToAllEvents()
        }
    }, [markers.length, initialViewport, resetToAllEvents])

    return {
        viewport,
        setViewport: handleViewportChange,
        bounds,
        markers,
        selectedMarkerId,
        setSelectedMarkerId,
        resetToAllEvents,
        isMapOfAllEvents,
    }
}
