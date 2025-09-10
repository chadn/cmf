'use client'
import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { MapViewport, MapBounds, MapMarker, MapState } from '@/types/map'
import { CmfEvent, FilteredEvents } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import { calculateMapBoundsAndViewport, generateMapMarkers } from '@/lib/utils/location'
import { appActions, AppState, isReadyForViewportSetting, isReadyForInteraction } from '@/lib/state/appStateReducer'
import { FilterEventsManager } from '../events/FilterEventsManager'

interface UseMapReturn {
    viewport: MapViewport
    setViewport: (viewport: MapViewport) => void
    markers: MapMarker[]
    selectedMarkerId: string | null
    setSelectedMarkerId: (id: string | null) => void
    resetMapToVisibleEvents: () => void
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
 * @param {AppState} appState - Current application state
 * @param {React.Dispatch<any>} dispatch - Dispatch function for updating app state
 * @param {FilteredEvents} props.evts - List of calendar events, usually filtered. Only events with locations are shown on the map.
 * @param {number} props.mapW - Width of the map in pixels, used for calculating map bounds
 * @param {number} props.mapH - Height of the map in pixels
 * @param {Function} onBoundsChange - Callback to notify parent about bounds changes
 * @returns {UseMapReturn} - Map state and functions
 */
export function useMap(
    appState: AppState,
    dispatch: React.Dispatch<ReturnType<typeof appActions[keyof typeof appActions]>>,
    evts: FilteredEvents,
    fltrEvtMgr: FilterEventsManager,
    mapW: number,
    mapH: number,
    onBoundsChange?: (bounds: MapBounds) => void
): UseMapReturn {
    // Flag to track internal updates to prevent loops
    const isInternalUpdate = useRef(false)

    // Memoize markers generation from events
    const markersFromAllEvents = useMemo(() => generateMapMarkers(evts.allEvents), [evts.allEvents])

    // TODO: delete these logr once this is stable
    useEffect(() => {
        logr.info('umap', `${markersFromAllEvents.length} markersFromAllEvents from ${evts.allEvents.length} total events`)
    }, [markersFromAllEvents, evts.allEvents.length])
    
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
                return {
                    ...marker,
                    events: filteredEvents,
                }
            })
            .filter((marker) => marker.events.length > 0)

        // Log the filtering results for debugging
        logr.info('umap', `filteredMarkers updated - ${filtered.length} of ${markersFromAllEvents.length} markers`
            + ` showing, with ${evts.visibleEvents.length} of ${evts.allEvents.length} visible events`)

        return filtered
    }, [evts.visibleEvents, evts.allEvents.length, markersFromAllEvents])

    // Log when the hook initializes - only once
    useEffect(() => {
        const vport = `lat=${mapState.viewport.latitude} lon=${mapState.viewport.longitude} zoom=${mapState.viewport.zoom}`
        logr.info('umap', `uE: useMap hook initialized. ${evts.allEvents.length} evts, ${vport}`)
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


    // Handle showing all events that pass search/date filters (clear map bounds only)
    const resetMapToVisibleEvents = useCallback(() => {
        // maybe add to isReady: isViewportSet(appState)
        const isReady = isReadyForViewportSetting(appState) || isReadyForInteraction(appState)
        if (!isReady) {
            logr.info('umap', 'resetMapToVisibleEvents: Ignoring - not in ready state')
            return
        }

        // Get domain-filtered visible events (what would be visible if no map bounds)
        // calling getFilteredEvents() with no mapbounds param will not filter based on map bounds
        const visibleEvents = fltrEvtMgr.getFilteredEvents().visibleEvents
        const markersFromVisibleEvts = generateMapMarkers(visibleEvents);

        // Calculate map bounds from domain-filtered visible events (ignore map bounds) and update viewport
        if (markersFromVisibleEvts.length > 0) {
            const { bounds, viewport } = calculateMapBoundsAndViewport(markersFromVisibleEvts, mapW, mapH)
            logr.info('umap', `resetMapToVisibleEvents: updating viewport to show ${markersFromVisibleEvts.length}`
                +` markers from ${visibleEvents.length} visible events`)
            setMapState((prev) => ({
                ...prev,
                viewport,
                bounds,
                markers: markersFromVisibleEvts,
            }))

            // IMPORTANT: Notify parent component about the new bounds for filtering
            if (bounds && onBoundsChange) {
                onBoundsChange(bounds)
            }
        } else {
            logr.info('umap', `resetMapToVisibleEvents: doing nothing to show 0 markers`)
        }
        // Dispatch viewport set action for proper state machine transition
        // TODO: should dispatch happen even if markers.length === 0?  I think so.
        if (isReadyForViewportSetting(appState)) {
            dispatch(appActions.viewportSet())
        }
    }, [
        appState,
        fltrEvtMgr,
        mapW, mapH,
        setMapState,
        onBoundsChange,
        dispatch,
    ])

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
        resetMapToVisibleEvents,
    }
}
