'use client'
import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { MapViewport, MapBounds, MapMarker } from '@/types/map'
import { CalendarEvent } from '@/types/events'
import { logr } from '@/lib/utils/logr'

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
    updateMarkersShown: (events: CalendarEvent[]) => void
    resetToAllEvents: () => void
    isMapOfAllEvents: boolean
}

interface MapState {
    viewport: MapViewport
    isMapOfAllEvents: boolean
}

/**
 * Calculates the optimal viewport settings to display a set of map markers
 */
const calculateMapViewport = (markers: MapMarker[]): MapViewport => {
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

    // Add 10% padding to bounds
    const latPadding = (maxLat - minLat) * 0.1
    const lngPadding = (maxLng - minLng) * 0.1

    // Calculate center point
    const centerLat = (minLat + maxLat) / 2
    const centerLng = (minLng + maxLng) / 2

    // Calculate zoom level to fit all markers
    const latZoom = Math.log2(360 / (maxLat - minLat + 2 * latPadding)) - 1
    const lngZoom = Math.log2(360 / (maxLng - minLng + 2 * lngPadding)) - 1
    const zoom = Math.min(Math.max(Math.min(latZoom, lngZoom), 1), 15)

    return {
        latitude: centerLat,
        longitude: centerLng,
        zoom,
        bearing: 0,
        pitch: 0,
    }
}

/**
 * Generate map markers from events with locations
 */
const generateMapMarkers = (events: CalendarEvent[]): MapMarker[] => {
    const markersMap = new Map<string, MapMarker>()
    let eventsWithLocation = 0
    let eventsWithoutLocation = 0

    // Ensure events is an array before iterating
    if (!events || !Array.isArray(events)) {
        logr.info('map', 'No events provided to generate markers', { events })
        return []
    }

    events.forEach((event) => {
        if (
            event.resolved_location?.status === 'resolved' &&
            event.resolved_location.lat &&
            event.resolved_location.lng
        ) {
            eventsWithLocation++
            // Create a unique ID for the marker based on coordinates
            const id = `${event.resolved_location.lat.toFixed(6)},${event.resolved_location.lng.toFixed(6)}`

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

    const markers = Array.from(markersMap.values())

    logr.info(
        'map',
        `Generated ${markers.length} markers from ${eventsWithLocation} events with locations, ` +
            `skipped ${eventsWithoutLocation} events without resolvable location`
    )

    return markers
}

/**
 * Custom hook for managing map state and interactions
 * @param {UseMapProps} props - Props for the hook
 * @param {CalendarEvent[]} props.events - List of calendar events, usually filtered. Only events with locations are shown on the map.
 * @param {Partial<MapViewport>} [props.initialViewport] - Initial viewport settings
 * @returns {UseMapReturn} - Map state and functions
 */
export function useMap({ events, initialViewport = {} }: UseMapProps): UseMapReturn {
    // Flag to track internal updates to prevent loops
    const isInternalUpdate = useRef(false)
    // need useRef else variable gets re-initialized on every component render
    const lastResetToAllEventsCount = useRef(0)

    // Memoize markers generation from events
    const markers = useMemo(() => generateMapMarkers(events), [events])

    // Combine viewport and map state to reduce state variables
    const [mapState, setMapState] = useState<MapState>(() => {
        const calculatedViewport = calculateMapViewport(markers)
        logr.info('map', 'uE: Setting initial viewport', calculatedViewport)

        return {
            viewport: {
                ...calculatedViewport,
                ...initialViewport,
            },
            isMapOfAllEvents: true,
        }
    })

    // Map bounds state
    const [bounds, setBounds] = useState<MapBounds | null>(null)

    // Selected marker state
    const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null)

    // Track if events have been initialized
    const [eventsInitialized, setEventsInitialized] = useState(false)

    // Log when the hook initializes
    useEffect(() => {
        logr.info('map', 'uE: useMap hook initialized', {
            initialViewport: { ...mapState.viewport },
            eventsCount: events.length,
        })
    }, [])

    // Update Markers shown on map to match events not filtered out
    const updateMarkersShown = useCallback(
        (events: CalendarEvent[]) => {
            logr.info('map', `updateMarkersShown: now ${markers.length} markers, ${events.length} events`)
        },
        [markers, events]
    )

    // Reset to show all events
    const resetToAllEvents = useCallback(() => {
        logr.info('map', 'resetToAllEvents', {
            eventsCount: events ? events.length : 0,
            oldEventsCount: lastResetToAllEventsCount.current,
            markerCount: markers.length,
        })
        if (events.length !== lastResetToAllEventsCount.current) {
            lastResetToAllEventsCount.current = events.length
        } else {
            // count has not changed, so do not reset
            // TODO: better to compare all events, not just the length
            return
        }

        const newViewport = calculateMapViewport(markers)

        // Mark as internal update to prevent infinite loops
        isInternalUpdate.current = true

        setMapState({
            viewport: newViewport,
            isMapOfAllEvents: true,
        })

        setBounds(null)

        // Reset flag after state updates are queued
        setTimeout(() => {
            isInternalUpdate.current = false
        }, 0)
    }, [markers, events])

    // Handle viewport changes from user interaction
    const handleViewportChange = useCallback((newViewport: MapViewport) => {
        // Skip if this is an internal update
        if (isInternalUpdate.current) return

        setMapState((prev) => ({
            viewport: newViewport,
            isMapOfAllEvents: false, // User changed the viewport, so no longer showing all events
        }))
    }, [])

    // Log when selected marker changes
    useEffect(() => {
        if (selectedMarkerId) {
            const marker = markers.find((m) => m.id === selectedMarkerId)
            if (marker) {
                logr.info('map', `uE: Selected marker: ${selectedMarkerId}`, {
                    latitude: marker.latitude,
                    longitude: marker.longitude,
                    eventCount: marker.events.length,
                })
            }
        } else if (selectedMarkerId === null) {
            logr.info('map', 'uE: Marker selection cleared')
        }
    }, [selectedMarkerId, markers])

    // Initialize map to show all events on first load
    useEffect(() => {
        // Only reset when events first load or change to a new set
        if (markers.length > 0 && !eventsInitialized) {
            logr.info('map', 'uE: First load of events, showing all on map', {
                markerCount: markers.length,
            })
            resetToAllEvents()
            setEventsInitialized(true)
        }
    }, [markers.length, eventsInitialized, resetToAllEvents])

    // Reset initialization flag when events array reference changes completely
    useEffect(() => {
        //setEventsInitialized(false)
        logr.info(
            'map',
            `uE: Events (len=${events.length}) reference changed completely, consider resetting map on next render`
        )
    }, [events])

    return {
        viewport: mapState.viewport,
        setViewport: handleViewportChange,
        bounds,
        markers,
        selectedMarkerId,
        setSelectedMarkerId,
        updateMarkersShown,
        resetToAllEvents,
        isMapOfAllEvents: mapState.isMapOfAllEvents,
    }
}
