'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { MapViewport, MapBounds, MapMarker } from '@/types/map'
import { CalendarEvent } from '@/types/events'
import { calculateCenter } from '@/lib/utils/location'

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

        events.forEach((event) => {
            if (
                event.resolved_location?.status === 'resolved' &&
                event.resolved_location.lat &&
                event.resolved_location.lng
            ) {
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
            }
        })

        return Array.from(markersMap.values())
    }, [events])

    // Reset to show all events
    const resetToAllEvents = useCallback(() => {
        if (markers.length === 0) {
            setViewport(DEFAULT_VIEWPORT)
            return
        }

        // Extract all resolved locations from events
        const locations = events
            .filter((event) => event.resolved_location?.status === 'resolved')
            .map((event) => event.resolved_location!)

        // Calculate the center point
        const center = calculateCenter(locations)

        // Set viewport to show all events
        setViewport({
            ...viewport,
            latitude: center.latitude,
            longitude: center.longitude,
            zoom: 3, // A reasonable zoom level to show multiple markers
        })

        setIsMapOfAllEvents(true)
    }, [events, viewport])

    // Update bounds when viewport changes
    const handleViewportChange = useCallback((newViewport: MapViewport) => {
        setViewport(newViewport)
        setIsMapOfAllEvents(false)
    }, [])

    // Initialize map to show all events
    useEffect(() => {
        if (markers.length > 0 && !initialViewport.latitude) {
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
