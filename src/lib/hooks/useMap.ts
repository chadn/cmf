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

// Calculate initial viewport based on markers
const calculateInitialViewport = (markers: MapMarker[]): MapViewport => {
    if (markers.length === 0) {
        return {
            latitude: 0,
            longitude: 0,
            zoom: 1,
            bearing: 0,
            pitch: 0,
        }
    }

    if (markers.length === 1) {
        return {
            latitude: markers[0].latitude,
            longitude: markers[0].longitude,
            zoom: 14,
            bearing: 0,
            pitch: 0,
        }
    }

    const latitudes = markers.map((m) => m.latitude)
    const longitudes = markers.map((m) => m.longitude)

    const minLat = Math.min(...latitudes)
    const maxLat = Math.max(...latitudes)
    const minLng = Math.min(...longitudes)
    const maxLng = Math.max(...longitudes)

    // Add padding to bounds
    const latPadding = (maxLat - minLat) * 0.1
    const lngPadding = (maxLng - minLng) * 0.1

    // Calculate center
    const centerLat = (minLat + maxLat) / 2
    const centerLng = (minLng + maxLng) / 2

    // Calculate zoom level to fit the bounds
    const latZoom = Math.log2(360 / (maxLat - minLat + 2 * latPadding)) - 1
    const lngZoom = Math.log2(360 / (maxLng - minLng + 2 * lngPadding)) - 1

    // Use the smaller zoom level to ensure all markers are visible
    const zoom = Math.min(latZoom, lngZoom, 15)

    return {
        latitude: centerLat,
        longitude: centerLng,
        zoom: Math.max(zoom, 1),
        bearing: 0,
        pitch: 0,
    }
}

/**
 * Custom hook for managing map state and interactions
 */
export function useMap({
    events,
    initialViewport = {},
}: UseMapProps): UseMapReturn {
    // Generate markers from events (moved up to calculate initial viewport)
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

    // Map viewport state with calculated initial viewport
    const [viewport, setViewport] = useState<MapViewport>(() => ({
        ...calculateInitialViewport(markers),
        ...initialViewport,
    }))

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

    // At the top of the component, add this state to track if we've already focused on the first marker
    const [hasFocusedOnFirstMarker, setHasFocusedOnFirstMarker] =
        useState(false)

    // Reset to show all events
    const resetToAllEvents = useCallback(() => {
        debugLog('map', 'Resetting map to show all events', {
            markerCount: markers.length,
        })

        if (markers.length === 0) {
            debugLog('map', 'No markers to display, keeping current viewport')
            setIsMapOfAllEvents(true)
            return
        }

        // Extract all locations
        const locations = markers.map((marker) => ({
            latitude: marker.latitude,
            longitude: marker.longitude,
        }))

        if (markers.length === 1) {
            // If there's only one location, zoom to show about 0.5 miles around it
            debugLog(
                'map',
                'Only one marker, zooming to show ~0.5 miles around it'
            )
            setViewport({
                latitude: markers[0].latitude,
                longitude: markers[0].longitude,
                zoom: 14, // Approximately shows 0.5 miles radius
                bearing: 0,
                pitch: 0,
            })
        } else {
            // Calculate bounds to fit all markers
            const latitudes = locations.map((loc) => loc.latitude)
            const longitudes = locations.map((loc) => loc.longitude)

            const minLat = Math.min(...latitudes)
            const maxLat = Math.max(...latitudes)
            const minLng = Math.min(...longitudes)
            const maxLng = Math.max(...longitudes)

            // Add padding to bounds
            const latPadding = (maxLat - minLat) * 0.1 // 10% padding
            const lngPadding = (maxLng - minLng) * 0.1 // 10% padding

            // Calculate center
            const centerLat = (minLat + maxLat) / 2
            const centerLng = (minLng + maxLng) / 2

            // Calculate zoom level to fit the bounds
            // This is an approximation
            const latZoom =
                Math.log2(360 / (maxLat - minLat + 2 * latPadding)) - 1
            const lngZoom =
                Math.log2(360 / (maxLng - minLng + 2 * lngPadding)) - 1

            // Use the smaller zoom level to ensure all markers are visible
            const zoom = Math.min(latZoom, lngZoom, 15) // Cap at zoom level 15

            debugLog('map', 'Calculated zoom and center for all markers', {
                centerLat,
                centerLng,
                zoom,
                markerCount: markers.length,
            })

            setViewport({
                latitude: centerLat,
                longitude: centerLng,
                zoom: Math.max(zoom, 1), // Ensure zoom is at least 1
                bearing: 0,
                pitch: 0,
            })
        }

        setHasFocusedOnFirstMarker(true)
        setIsMapOfAllEvents(true)
    }, [markers])

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

    // Initialize map to show first event while loading, then all events
    useEffect(() => {
        // Only run this effect if:
        // 1. We have at least one marker
        // 2. We're not already in "Map of All Events" state
        // 3. We haven't focused on the first marker yet
        // 4. No initial viewport was provided
        if (
            markers.length > 0 &&
            !isMapOfAllEvents &&
            !hasFocusedOnFirstMarker &&
            !initialViewport.latitude
        ) {
            debugLog('map', 'First marker loaded, focusing on it', {
                latitude: markers[0].latitude,
                longitude: markers[0].longitude,
            })

            // Mark that we've focused on the first marker to prevent this effect from running again
            setHasFocusedOnFirstMarker(true)

            // Focus on the first marker temporarily
            setViewport({
                ...DEFAULT_VIEWPORT,
                latitude: markers[0].latitude,
                longitude: markers[0].longitude,
                zoom: 12, // A reasonable zoom level for a single marker
            })

            // Then, after a short delay, show all events
            const timer = setTimeout(() => {
                debugLog('map', 'Transitioning to show all events')
                resetToAllEvents()
            }, 1000) // 1 second delay

            return () => clearTimeout(timer)
        }
    }, [
        markers.length,
        initialViewport.latitude,
        isMapOfAllEvents,
        resetToAllEvents,
        hasFocusedOnFirstMarker,
    ])

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
