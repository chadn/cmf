'use client'
import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { MapViewport, MapBounds, MapMarker, MapState } from '@/types/map'
import { CmfEvent, FilteredEvents } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import { calculateMapBoundsAndViewport, generateMapMarkers } from '@/lib/utils/location'

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

export const genMarkerId = (event: CmfEvent): string => {
    if (
        event.resolved_location?.status !== 'resolved' ||
        !event.resolved_location?.lat ||
        !event.resolved_location?.lng
    ) {
        return ''
    }
    return `${event.resolved_location.lat.toFixed(6)},${event.resolved_location.lng.toFixed(6)}`
}

/**
 * Custom hook for managing map state and interactions
 * @param {UseMapProps} props - Props for the hook
 * @param {CmfEvent[]} props.events - List of calendar events, usually filtered. Only events with locations are shown on the map.
 * @param {Partial<MapViewport>} [props.initialViewport] - Initial viewport settings
 * @returns {UseMapReturn} - Map state and functions
 */
export function useMap(evts: FilteredEvents): UseMapReturn {
    // Flag to track internal updates to prevent loops
    const isInternalUpdate = useRef(false)

    // Memoize markers generation from events
    const markersFromAllEvents = useMemo(() => generateMapMarkers(evts.allEvents), [evts.allEvents])

    // Combine all map state into a single state object
    const [mapState, setMapState] = useState<MapState>(() => {
        const { bounds, viewport } = calculateMapBoundsAndViewport(markersFromAllEvents)
        logr.info('map', 'setMapState', viewport)

        return {
            viewport,
            bounds,
            markers: markersFromAllEvents,
            isMapOfAllEvents: true,
            selectedMarkerId: null,
        }
    })

    // Track if events have been initialized
    const [eventsInitialized, setEventsInitialized] = useState(false)

    // Memoize filtered markers based on evts.shownEvents
    const filteredMarkers = useMemo(() => {
        // During initialization or when showing all events, use evts.allEvents
        if (!eventsInitialized || mapState.isMapOfAllEvents) {
            return markersFromAllEvents
        }

        if (!evts.shownEvents) return []

        // Create a Set of event IDs that should be shown
        const shownEventIds = new Set(evts.shownEvents.map((event) => event.id))

        // Filter markers and their events
        return markersFromAllEvents
            .map((marker) => ({
                ...marker,
                events: marker.events.filter((event) => shownEventIds.has(event.id)),
            }))
            .filter((marker) => marker.events.length > 0) // Only keep markers that still have events
    }, [evts.shownEvents, markersFromAllEvents, eventsInitialized, mapState.isMapOfAllEvents])

    // Reset initialization when evts.allEvents changes (e.g., calendar switch)
    // TODO - do we need this?
    useEffect(() => {
        logr.info('map', `uE: MAYBE DELME? evts.allEvents=${evts.allEvents.length}`)
        setEventsInitialized(false)
    }, [evts.allEvents])

    // Log when the hook initializes
    useEffect(() => {
        logr.info('map', 'uE: useMap hook initialized', {
            initialViewport: { ...mapState.viewport },
            eventsCount: evts.allEvents.length,
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
            const el = eventsInitialized ? evts.shownEvents.length : evts.allEvents.length
            const ol = mapState.markers.length
            logr.info('map', `uE: markers changed, ${filteredMarkers.length} markers, was ${ol}, from ${el} events`)
            setMapState((prev) => ({
                ...prev,
                markers: filteredMarkers,
            }))
        }
    }, [
        filteredMarkers,
        mapState.markers,
        setMapState,
        evts.shownEvents.length,
        evts.allEvents.length,
        eventsInitialized,
    ])

    // Update viewport to show all events
    const resetMapToAllEvents = useCallback(() => {
        logr.info(
            'map',
            `resetMapToAllEvents: called, Showing all ${evts.allEvents.length} events and ${markersFromAllEvents.length} markers`
        )
        if (!evts.allEvents || evts.allEvents.length === 0) return

        const { bounds, viewport } = calculateMapBoundsAndViewport(markersFromAllEvents)

        setMapState((prev) => ({
            ...prev,
            viewport,
            bounds,
            markers: markersFromAllEvents,
            isMapOfAllEvents: true,
        }))
        logr.info('map', `resetMapToAllEvents done.`)
    }, [evts.allEvents, markersFromAllEvents])

    // Handle viewport changes from user interaction
    const setViewport = useCallback((newViewport: MapViewport) => {
        // Skip if this is an internal update
        if (isInternalUpdate.current) return

        logr.info('map', 'setViewport from user interaction', newViewport)
        setMapState((prev) => ({
            ...prev,
            viewport: newViewport,
            isMapOfAllEvents: false, // User changed the viewport, so no longer showing all events
        }))
    }, [])

    // Log when selected marker changes
    useEffect(() => {
        logr.info('map', `uE: selectedMarkerId now ${mapState.selectedMarkerId}`)
    }, [mapState.selectedMarkerId])
    /* 
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
    */

    /*
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
    */

    return {
        viewport: mapState.viewport,
        setViewport,
        bounds: mapState.bounds,
        markers: mapState.markers,
        selectedMarkerId: mapState.selectedMarkerId,
        setSelectedMarkerId: (id: string | null) => setMapState((prev) => ({ ...prev, selectedMarkerId: id })),
        resetMapToAllEvents,
        isMapOfAllEvents: mapState.isMapOfAllEvents,
    }
}
