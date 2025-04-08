'use client'
import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { MapViewport, MapBounds, MapMarker, MapState } from '@/types/map'
import { CalendarEvent } from '@/types/events'
import { logr } from '@/lib/utils/logr'

interface UseMapProps {
    eventsShown: CalendarEvent[] // Events that are currently visible (filtered and have locations)
    eventsAll: CalendarEvent[] // All events from the API
}

interface UseMapReturn {
    viewport: MapViewport
    setViewport: (viewport: MapViewport) => void
    bounds: MapBounds | null
    markers: MapMarker[]
    selectedMarkerId: string | null
    setSelectedMarkerId: (id: string | null) => void
    resetMapToAllEvents: () => void
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
 * Generate map markers from events
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
export function useMap({ eventsShown, eventsAll }: UseMapProps): UseMapReturn {
    // Flag to track internal updates to prevent loops
    const isInternalUpdate = useRef(false)

    // Memoize markers generation from events
    const markersFromAllEvents = useMemo(() => generateMapMarkers(eventsAll), [eventsAll])

    // Combine all map state into a single state object
    const [mapState, setMapState] = useState<MapState>(() => {
        const calculatedViewport = calculateMapViewport(markersFromAllEvents)
        logr.info('map', 'uE: Setting initial viewport', calculatedViewport)

        return {
            viewport: {
                ...calculatedViewport,
            },
            bounds: null,
            markers: [],
            isMapOfAllEvents: true,
            selectedMarkerId: null,
        }
    })

    // Track if events have been initialized
    const [eventsInitialized, setEventsInitialized] = useState(false)

    // Memoize filtered markers based on eventsShown
    const filteredMarkers = useMemo(() => {
        // During initialization or when showing all events, use eventsAll
        if (!eventsInitialized || mapState.isMapOfAllEvents) {
            return markersFromAllEvents
        }

        if (!eventsShown) return []

        // Create a Set of event IDs that should be shown
        const shownEventIds = new Set(eventsShown.map((event) => event.id))

        // Filter markers and their events
        return markersFromAllEvents
            .map((marker) => ({
                ...marker,
                events: marker.events.filter((event) => shownEventIds.has(event.id)),
            }))
            .filter((marker) => marker.events.length > 0) // Only keep markers that still have events
    }, [eventsShown, markersFromAllEvents, eventsInitialized, mapState.isMapOfAllEvents])

    // Reset initialization when eventsAll changes (e.g., calendar switch)
    useEffect(() => {
        setEventsInitialized(false)
    }, [eventsAll])

    // Log when the hook initializes
    useEffect(() => {
        logr.info('map', 'uE: useMap hook initialized', {
            initialViewport: { ...mapState.viewport },
            eventsCount: eventsAll.length,
        })
    }, [])

    // Update markers when filtered markers change
    useEffect(() => {
        // save time by first checking if markers array length changed
        let markersChanged = filteredMarkers.length !== mapState.markers.length
        if (!markersChanged) {
            // If same length, check if any ID in one set isn't in the other
            const currentIds = new Set(mapState.markers.map((m) => m.id))
            const newIds = new Set(filteredMarkers.map((m) => m.id))
            markersChanged = Array.from(currentIds).some((id) => !newIds.has(id))
        }

        if (markersChanged) {
            const el = eventsInitialized ? eventsShown.length : eventsAll.length
            const ol = mapState.markers.length
            logr.info('map', `uE: markers changed, ${filteredMarkers.length} markers, was ${ol}, from ${el} events`)
            setMapState((prev) => ({
                ...prev,
                markers: filteredMarkers,
            }))
        }
    }, [filteredMarkers, mapState.markers, setMapState, eventsShown.length, eventsAll.length, eventsInitialized])

    // Update viewport to show all events
    const resetMapToAllEvents = useCallback(() => {
        logr.info('map', `resetMapToAllEvents: called, all ${eventsAll.length} events`)
        if (!eventsAll || eventsAll.length === 0) return

        // Use the existing calculateMapViewport function instead of duplicating the calculation
        const newViewport = calculateMapViewport(markersFromAllEvents)

        // Calculate bounds for filtering
        const validCoords = markersFromAllEvents.map((marker) => ({
            lat: marker.latitude,
            lng: marker.longitude,
        }))

        if (validCoords.length === 0) return

        // Calculate bounds
        const bounds = validCoords.reduce(
            (acc, coord) => ({
                north: Math.max(acc.north, coord.lat),
                south: Math.min(acc.south, coord.lat),
                east: Math.max(acc.east, coord.lng),
                west: Math.min(acc.west, coord.lng),
            }),
            {
                north: validCoords[0].lat,
                south: validCoords[0].lat,
                east: validCoords[0].lng,
                west: validCoords[0].lng,
            }
        )

        // Add padding
        const padding = 0.1
        const newBounds = {
            north: bounds.north + padding,
            south: bounds.south - padding,
            east: bounds.east + padding,
            west: bounds.west - padding,
        }

        // Simple equality check for viewport
        const viewportChanged =
            newViewport.latitude !== mapState.viewport.latitude ||
            newViewport.longitude !== mapState.viewport.longitude ||
            newViewport.zoom !== mapState.viewport.zoom

        // Only update if viewport or bounds have changed
        if (viewportChanged || JSON.stringify(newBounds) !== JSON.stringify(mapState.bounds)) {
            logr.info('map', `resetMapToAllEvents: updating map to show all ${markersFromAllEvents.length} markers`)

            setMapState((prev) => ({
                ...prev,
                viewport: newViewport,
                bounds: newBounds,
                isMapOfAllEvents: true,
                markers: markersFromAllEvents,
            }))
        } else {
            logr.debug('map', `resetMapToAllEvents: no change needed for ${markersFromAllEvents.length} markers`)
        }
    }, [eventsAll, markersFromAllEvents, mapState.viewport, mapState.bounds, setMapState])

    // Handle viewport changes from user interaction
    const handleViewportChange = useCallback((newViewport: MapViewport) => {
        // Skip if this is an internal update
        if (isInternalUpdate.current) return

        setMapState((prev) => ({
            ...prev,
            viewport: newViewport,
            isMapOfAllEvents: false, // User changed the viewport, so no longer showing all events
        }))
    }, [])

    // Log when selected marker changes
    useEffect(() => {
        if (mapState.selectedMarkerId) {
            const marker = markersFromAllEvents.find((m) => m.id === mapState.selectedMarkerId)
            if (marker) {
                logr.info('map', `uE: Selected marker: ${mapState.selectedMarkerId}`, {
                    latitude: marker.latitude,
                    longitude: marker.longitude,
                    eventCount: marker.events.length,
                })
            }
        } else if (mapState.selectedMarkerId === null) {
            logr.info('map', 'uE: Marker selection cleared')
        }
    }, [mapState.selectedMarkerId, markersFromAllEvents])

    // Initialize map to show all events on first load or calendar switch
    useEffect(() => {
        // Only reset when events first load or change to a new set
        if (!eventsInitialized && markersFromAllEvents.length > 0) {
            setEventsInitialized(true)
            logr.info(
                'map',
                `uE: First load of events or calendar switch, showing all ${markersFromAllEvents.length} markers on map`
            )
            resetMapToAllEvents()
        }
    }, [markersFromAllEvents.length, eventsInitialized, resetMapToAllEvents])

    return {
        viewport: mapState.viewport,
        setViewport: handleViewportChange,
        bounds: mapState.bounds,
        markers: mapState.markers,
        selectedMarkerId: mapState.selectedMarkerId,
        setSelectedMarkerId: (id: string | null) => setMapState((prev) => ({ ...prev, selectedMarkerId: id })),
        resetMapToAllEvents,
        isMapOfAllEvents: mapState.isMapOfAllEvents,
    }
}
