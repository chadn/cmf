'use client'
import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { MapViewport, MapBounds, MapMarker, MapState } from '@/types/map'
import { CmfEvent, CmfEvents } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import { calculateMapBoundsAndViewport, calculateViewportFromBounds, generateMapMarkers } from '@/lib/utils/location'
import { AppState } from '@/lib/state/appStateReducer'
import { FilterEventsManager } from '@/lib/events/FilterEventsManager'
import { stringify } from '@/lib/utils/utils-shared'

interface UseMapReturn {
    viewport: MapViewport
    setViewport: (viewport: MapViewport) => void
    markers: MapMarker[]
    selectedMarkerId: string | null
    setSelectedMarkerId: (id: string | null) => void
    resetMapToVisibleEvents: (options?: { useBounds?: boolean; mapBounds?: MapBounds }) => void
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
 * @param {CmfEvents} cmfEvents - core events object, contains allEvents and filtered visibleEvents
 * @param {number} mapW - Width of the map in pixels, used for calculating map bounds
 * @param {number} mapH - Height of the map in pixels
 * @param {Function} onBoundsChange - Callback to notify parent about bounds changes
 * @returns {UseMapReturn} - Map state and functions
 */
export function useMap(
    appState: AppState,
    cmfEvents: CmfEvents,
    filtrEvtMgr: FilterEventsManager,
    mapW: number,
    mapH: number,
    onBoundsChange?: (bounds: MapBounds, fromUserInteraction?: boolean) => void
): UseMapReturn {
    // Flag to track internal updates to prevent loops
    const isInternalUpdate = useRef(false)

    // Memoize markers generation from events
    const markersFromAllEvents = useMemo(() => generateMapMarkers(cmfEvents.allEvents), [cmfEvents.allEvents])

    // TODO: delete these logr once this is stable
    useEffect(() => {
        logr.info('umap', `${markersFromAllEvents.length} markers from ${cmfEvents.allEvents.length} all events`)
    }, [markersFromAllEvents, cmfEvents.allEvents.length])

    // Combine all map state into a single state object
    const [mapState, setMapState] = useState<MapState>(() => {
        const { bounds, viewport } = calculateMapBoundsAndViewport(markersFromAllEvents, mapW, mapH)
        logr.info('umap', `setMapState from ${mapW},${mapH}: ${stringify(viewport)} ${stringify(bounds)}`)

        return {
            viewport,
            bounds,
            markers: markersFromAllEvents,
            selectedMarkerId: null,
        }
    })

    // Memoize filtered markers based on cmfEvents.visibleEvents
    const filteredMarkers = useMemo(() => {
        if (!cmfEvents.visibleEvents) return []

        // Create a Set of event IDs that should be shown for efficient lookup
        const shownEventIds = new Set(cmfEvents.visibleEvents.map((event) => event.id))

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
        logr.info(
            'umap',
            `filteredMarkers updated - ${filtered.length} of ${markersFromAllEvents.length} ` +
                ` markers showing, with ${cmfEvents.visibleEvents.length} of ${cmfEvents.allEvents.length} visible events`
        )
        return filtered
    }, [cmfEvents.visibleEvents, cmfEvents.allEvents.length, markersFromAllEvents])

    // Log when the hook initializes - only once
    useEffect(() => {
        logr.info(
            'umap',
            `uE: useMap hook initialized. ${cmfEvents.allEvents.length} cmfEvents, ${stringify(mapState.viewport)}`
        )
        // empty dependency array to run only once
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Respond to map dimension changes by recalculating viewport and bounds
    // Uses current markers (not all markers) to preserve user's current view
    // STATUS: BUGGY - disabling
    useEffect(() => {
        logr.info('umap', `uE: map dimensions changed to ${mapW}x${mapH} or ${mapState.markers.length} markers`)
        if (mapH || mapW) return // temp disabling

        const { bounds, viewport } = calculateMapBoundsAndViewport(mapState.markers, mapW, mapH)
        logr.info(
            'umap',
            `uE: map dimensions changed to ${mapW}x${mapH}, recalculating viewport for ${mapState.markers.length} current markers`
        )
        setMapState((prev) => ({
            ...prev,
            viewport,
            bounds,
        }))
        // Notify parent about bounds change if callback is provided
        if (bounds && onBoundsChange) {
            onBoundsChange(bounds, false) // false = not from user interaction
        }
    }, [mapW, mapH, onBoundsChange, mapState.markers])

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
            const el = cmfEvents.visibleEvents.length
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
    }, [filteredMarkers, mapState.markers, cmfEvents.visibleEvents, setMapState])

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

    /**
     *  resetMapToVisibleEvents goal is to update map so it's showing all visible events, which is sometimes 0.
     *  It does this over several steps
     *  1. Figures out the events that should be shown
     *     1a. First filters based on current domain filters (date, search)
     *     1b. If mapbounds is supplied, it uses that to filter events byMap
     *     1c. If not supplied but useBounds==true, then use current bounds to filter byMap
     *  2. Build set of markers from those events
     *  3. Compute new bounds to focus on just those new markers.
     *  4. If there are no markers, all events are filtered out
     *     4a. If mapBounds was supplied, use that as new map bounds - shortcut to setMapState
     *     4b. if no mapBounds was supplied, do nothing (should not be here)
     *  This should not change any filters or markers, it only recalculates ideal map bounds.
     *  @param options.mapBounds - custom map bounds to use for filtering, implies useBounds=true.
     *  @param options.useBounds - If true and no mapBounds, use current map bounds for filtering. If false, reset map as if no filters.
     */
    const resetMapToVisibleEvents = useCallback(
        (options?: { mapBounds?: MapBounds; useBounds?: boolean }) => {
            // Allow resetMapToVisibleEvents to run as soon as events are loaded
            // TODO: this logic should be moved out of here - it should be the responsibility of the caller
            const isReady = appState !== 'starting-app' && appState !== 'fetching-events'
            if (!isReady) {
                logr.info('umap', 'resetMapToVisibleEvents: Ignoring - not in ready state')
                return
            }
            const curBounds = options?.mapBounds ? options.mapBounds : options?.useBounds ? mapState.bounds : undefined
            logr.info(
                'umap',
                `resetMapToVisibleEvents(${stringify(options)}) ${mapState.markers.length} markers, curBounds:${stringify(curBounds)}`
            )

            // Get domain-filtered visible events for current viewport
            const curEvents = filtrEvtMgr.getCmfEvents(curBounds || undefined)
            const markers = generateMapMarkers(curBounds ? curEvents.visibleEvents : curEvents.allEvents)

            // Calculate map bounds from domain-filtered visible events (ignore map bounds) and update viewport
            if (markers.length > 0) {
                // calculate new bounds for the map
                const { bounds, viewport } = calculateMapBoundsAndViewport(markers, mapW, mapH)
                const log = curBounds
                    ? curEvents.visibleEvents.length + ' visible'
                    : curEvents.allEvents.length + ' all'
                logr.info(
                    'umap',
                    `resetMapToVisibleEvents: showing ${markers.length} markers from ${log} events; bounds:`,
                    bounds
                )
                setMapState((prev) => ({
                    ...prev,
                    viewport,
                    bounds,
                    markers,
                }))

                // IMPORTANT: Notify parent component about the new bounds for filtering
                if (bounds && onBoundsChange) {
                    onBoundsChange(bounds, true)
                }
            } else if (options?.mapBounds) {
                // no markers, but mapBounds are defined, just reset map using provide use mapBounds to setMapState
                const viewport = calculateViewportFromBounds(options.mapBounds, mapW, mapH)
                setMapState((prev) => ({
                    ...prev,
                    viewport,
                    bounds: options.mapBounds || null,
                }))
            } else {
                logr.warn('umap', `resetMapToVisibleEvents: doing nothing to show 0 markers (should not be here)`)
            }
        },
        [appState, filtrEvtMgr, mapW, mapH, mapState.bounds, mapState.markers.length, setMapState, onBoundsChange]
    )

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
