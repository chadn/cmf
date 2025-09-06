'use client'
import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { MapViewport, MapBounds, MapMarker, MapState } from '@/types/map'
import { CmfEvent, FilteredEvents } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import { calculateMapBoundsAndViewport, generateMapMarkers } from '@/lib/utils/location'

interface UseMapReturn {
    viewport: MapViewport
    setViewport: (viewport: MapViewport) => void
    markers: MapMarker[]
    selectedMarkerId: string | null
    setSelectedMarkerId: (id: string | null) => void
    resetMapToAllEvents: () => void
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
 * @param {FilteredEvents} props.evts - List of calendar events, usually filtered. Only events with locations are shown on the map.
 * @param {number} props.mapW - Width of the map in pixels, used for calculating map bounds
 * @param {number} props.mapH - Height of the map in pixels
 * @param {Function} onBoundsChange - Callback to notify parent about bounds changes
 * @returns {UseMapReturn} - Map state and functions
 */
export function useMap(
    evts: FilteredEvents,
    mapW: number,
    mapH: number,
    onBoundsChange?: (bounds: MapBounds) => void
): UseMapReturn {
    // Flag to track internal updates to prevent loops
    const isInternalUpdate = useRef(false)

    // Memoize markers generation from events
    const markersFromAllEvents = useMemo(() => generateMapMarkers(evts.allEvents), [evts.allEvents])

    // Combine all map state into a single state object
    const [mapState, setMapState] = useState<MapState>(() => {
        const { bounds, viewport } = calculateMapBoundsAndViewport(markersFromAllEvents, mapW, mapH)
        logr.info('umap', 'setMapState', { viewport, bounds })

        return {
            viewport,
            bounds,
            markers: markersFromAllEvents,
            selectedMarkerId: null,
        }
    })

    // Memoize filtered markers based on evts.visibleEvents
    const filteredMarkers = useMemo(() => {
        if (!evts.visibleEvents) return []

        // Create a Set of event IDs that should be shown for efficient lookup
        const shownEventIds = new Set(evts.visibleEvents.map((event) => event.id))

        // Filter markers to only include those with events in the shown set
        const filtered = markersFromAllEvents
            .map((marker) => {
                const filteredEvents = marker.events.filter((event) => shownEventIds.has(event.id))
                // Skip logging - was causing test issues with logr.skip method
                // logr.debug('umap', 'filteredMarkers:Marker filtering', {
                //     markerId: marker.id,
                //     originalEventCount: marker.events.length,
                //     filteredEventCount: filteredEvents.length,
                //     events: filteredEvents.map((e) => e.id),
                // })
                return {
                    ...marker,
                    events: filteredEvents,
                }
            })
            .filter((marker) => marker.events.length > 0)

        // Log the filtering results for debugging
        logr.info('umap', 'filteredMarkers updated', {
            totalMarkers: markersFromAllEvents.length,
            visibleEvents: evts.visibleEvents.length,
            allEvents: evts.allEvents.length,
            markersShowing: filtered.map((m) => ({
                id: m.id,
                eventCount: m.events.length,
            })),
        })

        return filtered
    }, [evts.allEvents.length, evts.visibleEvents, markersFromAllEvents])

    // Log when the hook initializes - only once
    useEffect(() => {
        logr.info('umap', 'uE: useMap hook initialized', {
            initialViewport: { ...mapState.viewport },
            eventsCount: evts.allEvents.length,
        })
        // empty dependency array to run only once
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            const el = evts.visibleEvents.length
            const ol = mapState.markers.length
            logr.info('umap', `uE: markersChanged, ${filteredMarkers.length} markers, was ${ol}, from ${el} events`, {
                oldMarkers: mapState.markers.map((m) => ({ id: m.id, count: m.events.length })),
                newMarkers: filteredMarkers.map((m) => ({ id: m.id, count: m.events.length })),
            })
            setMapState((prev) => ({
                ...prev,
                markers: filteredMarkers,
            }))
        } else {
            // Log when markers haven't changed but we should check event counts
            const currentMarkerCounts = mapState.markers.map((m) => ({ id: m.id, count: m.events.length }))
            const newMarkerCounts = filteredMarkers.map((m) => ({ id: m.id, count: m.events.length }))
            const countsChanged = JSON.stringify(currentMarkerCounts) !== JSON.stringify(newMarkerCounts)

            if (countsChanged) {
                logr.info('umap', 'Marker counts changed without marker array change', {
                    currentCounts: currentMarkerCounts,
                    newCounts: newMarkerCounts,
                })
                setMapState((prev) => ({
                    ...prev,
                    markers: filteredMarkers,
                }))
            }
        }
    }, [filteredMarkers, mapState.markers, evts.visibleEvents, setMapState])

    // Update viewport to show all events
    const resetMapToAllEvents = useCallback(() => {
        if (!evts.allEvents || evts.allEvents.length === 0) return

        logr.info(
            'umap',
            `resetMapToAllEvents: showing all ${evts.allEvents.length} events and ${markersFromAllEvents.length} markers`
        )

        const { bounds, viewport } = calculateMapBoundsAndViewport(markersFromAllEvents, mapW, mapH)
        setMapState((prev) => ({
            ...prev,
            viewport,
            bounds,
            markers: markersFromAllEvents,
        }))

        // IMPORTANT: Notify parent component about the new bounds for filtering
        if (bounds && onBoundsChange) {
            onBoundsChange(bounds)
        }

        logr.info('umap', `resetMapToAllEvents done.`)
    }, [evts.allEvents, markersFromAllEvents, mapW, mapH, onBoundsChange])

    // Handle viewport changes from user interaction
    const setViewport = useCallback((newViewport: MapViewport) => {
        // Skip if this is an internal update
        if (isInternalUpdate.current) return

        setMapState((prev) => ({
            ...prev,
            viewport: newViewport,
            // Note: bounds will be updated by page.tsx via onBoundsChange from MapContainer
            // This keeps the actual map bounds in sync with the viewport
        }))
    }, [])

    // Log when selected marker changes
    useEffect(() => {
        logr.info('umap', `uE: selectedMarkerId now ${mapState.selectedMarkerId}`)
    }, [mapState.selectedMarkerId])

    return {
        viewport: mapState.viewport,
        setViewport,
        markers: mapState.markers,
        selectedMarkerId: mapState.selectedMarkerId,
        setSelectedMarkerId: (id: string | null) => setMapState((prev) => ({ ...prev, selectedMarkerId: id })),
        resetMapToAllEvents,
    }
}
