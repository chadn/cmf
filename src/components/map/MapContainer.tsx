'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import Map, { Marker, Popup, NavigationControl, GeolocateControl, ViewState, MapRef } from 'react-map-gl/maplibre'
import type { GeolocateResultEvent } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { env } from '@/lib/config/env'
import { MapViewport, MapBounds, MapMarker } from '@/types/map'
import { EventsSource } from '@/types/events'
import MapMarkerComponent from './MapMarker'
import MapPopup from './MapPopup'
import { logr } from '@/lib/utils/logr'
import { roundMapBounds, viewstate2Viewport } from '@/lib/utils/location'
import { useDebounce } from '@/lib/utils/utils-client'
import { stringify } from '@/lib/utils/utils-shared'

/**
 * MapContainer handles the display and interaction with the map
 * It manages markers, popups, viewport changes, and user interactions
 */
interface MapContainerProps {
    viewport: MapViewport
    onViewportChange: (viewport: MapViewport) => void
    markers: MapMarker[]
    selectedMarkerId: string | null
    onMarkerSelect: (markerId: string | null) => void
    onBoundsChange: (bounds: MapBounds, fromUserInteraction?: boolean) => void
    onWidthHeightChange: (mapWidthHeight: { w: number; h: number }) => void
    selectedEventId: string | null
    onEventSelect: (eventId: string | null) => void
    eventSources?: EventsSource[]
}

const MapContainer: React.FC<MapContainerProps> = ({
    viewport,
    onViewportChange,
    markers,
    selectedMarkerId,
    onMarkerSelect,
    onBoundsChange,
    onWidthHeightChange,
    selectedEventId,
    onEventSelect,
    eventSources,
}) => {
    const mapRef = useRef<MapRef>(null)
    const [popupMarker, setPopupMarker] = useState<MapMarker | null>(null)
    const mapWidthHeightRef = useRef({ w: 1001, h: 1001 }) // local copy of mapHookWidthHeight (set to 999 x 999), should be actual pixels of map
    const renderCountRef = useRef(0)
    const lastRenderTime = useRef(performance.now())

    // Performance monitoring (conditional)
    if (env.ENABLE_PERFORMANCE_MONITORING) {
        renderCountRef.current++
        const currentRenderTime = performance.now()
        const timeSinceLastRender = currentRenderTime - lastRenderTime.current
        if (renderCountRef.current > 1) {
            logr.info(
                'performance',
                `MapContainer render #${renderCountRef.current} (+${timeSinceLastRender.toFixed(0)}ms) - ${markers.length} markers`
            )
        }
        lastRenderTime.current = currentRenderTime
    } else {
        renderCountRef.current++
    }

    // Get map width and height in pixels, store in local mapWidthHeightRef,
    // and if changed then update parents mapHookWidthHeight via onWidthHeightChange.
    // This is needed to accurately calcuate bounds from viewport 
    // and update parent component if dimensions have changed.
    // Only changes when user resizes window or map container (dragging separator)
    // vs bounds and viewport which change more frequently.
    const updateMapWidthHeight = useCallback(() => {
        let newDimensions = { w: 1000, h: 1000 }
        if (mapRef.current) {
            const container = mapRef.current.getMap().getContainer()
            newDimensions = {
                w: container.clientWidth,
                h: container.clientHeight,
            }
        }
        // Only notify parent if dimensions actually changed
        if (mapWidthHeightRef.current.w !== newDimensions.w || mapWidthHeightRef.current.h !== newDimensions.h) {
            if (env.ENABLE_PERFORMANCE_MONITORING) {
                logr.info(
                    'performance',
                    `updateMapWidthHeight changed ${JSON.stringify(mapWidthHeightRef.current)} to ${JSON.stringify(newDimensions)}`
                )
            }
            mapWidthHeightRef.current = newDimensions
            onWidthHeightChange(newDimensions)
        } else {
            if (env.ENABLE_PERFORMANCE_MONITORING) {
                logr.info(
                    'performance',
                    `updateMapWidthHeight unchanged: ${JSON.stringify(newDimensions)} - skipping onWidthHeightChange`
                )
            }
        }
        return newDimensions
    }, [onWidthHeightChange])

    const getMapBounds = useCallback(() => {
        let ret = {
            north: 0,
            south: 0,
            east: 0,
            west: 0,
        }
        if (mapRef.current) {
            const bounds = mapRef.current.getMap().getBounds()
            if (bounds) {
                ret = roundMapBounds({
                    north: bounds.getNorth(),
                    south: bounds.getSouth(),
                    east: bounds.getEast(),
                    west: bounds.getWest(),
                })
            }
        }
        logr.debug('mapc', `getMapBounds`, ret)
        return ret
    }, [mapRef])

    // TODO: note possible side effects
    const debouncedUpdateBounds = useDebounce(() => {
        const newBounds = getMapBounds()
        logr.info('mapc', 'Bounds updating after debounce', newBounds)
        onBoundsChange(newBounds, true) // true = from user interaction (but not necessarily from user, like page load)
    }, env.MAP_BOUNDS_CHANGE_UPDATE_DELAY)

    // Handle viewport change, Map onMove
    const handleViewportChange = useCallback(
        (newViewstate: ViewState) => {
            const vp = viewstate2Viewport(newViewstate)
            logr.info(
                'mapc',
                'uC: Map onMove: handleViewportChange: updateMapWidthHeight, onViewportChange, debouncedUpdateBounds',
                stringify(vp)
            )
            // TODO: this function should debounce
            updateMapWidthHeight() // Check for change in WxH pixels, which is rare but possible
            onViewportChange(vp) // calls setViewport()
            debouncedUpdateBounds()
        },
        [onViewportChange, debouncedUpdateBounds, updateMapWidthHeight]
    )

    // At some point very early in initialization need to:
    // - get actual size (width, height) in pixels of map, done by updateMapWidthHeight()
    // - use that size to get accurate N, S, E, W, bounds (needed for visible events and markers) 
    //
    // handleMapLoad ends up not being called till way later, so using the following solution:
    if (renderCountRef.current < 6) {
        logr.info('mapc', `renderCountRef(${renderCountRef.current}) calling updateMapWidthHeight()`)
        updateMapWidthHeight()
    }

    const handleMapLoad = useCallback(() => {
        logr.info('mapc', 'uC: Map onLoad: handleMapLoad')
        setTimeout(() => {
            updateMapWidthHeight() // Update dimensions and notify parent if changed
            const initialBounds = getMapBounds()
            logr.info('mapc', 'timeout=10ms, handleMapLoad setting initial bounds', initialBounds)
            onBoundsChange(initialBounds, false) // false = not from user interaction
        }, 10)
    }, [updateMapWidthHeight, getMapBounds, onBoundsChange])


    // Log when markers length changes
    useEffect(() => {
        logr.info('mapc', `uE: MapContainer updated num markers, now ${markers.length}`)
    }, [markers.length])

    // Log when viewport changes
    useEffect(() => {
        const bounds = getMapBounds()
        logr.info('mapc', `uE: MapContainer updated viewport, now ${stringify(viewport)} ${stringify(bounds)} `)
    }, [viewport, viewport.latitude, viewport.longitude, viewport.zoom, getMapBounds])

    // Close popup when selected marker changes to null
    useEffect(() => {
        if (!selectedMarkerId) {
            if (popupMarker !== null) {
                setPopupMarker(null)
            }
        }
    }, [selectedMarkerId, popupMarker])

    // Simplified effect: Update popup when selected marker changes
    useEffect(() => {
        // Only execute this effect when we have a selectedMarkerId
        if (selectedMarkerId) {
            const marker = markers.find((m) => m.id === selectedMarkerId)

            // Check if marker exists and has events
            if (marker && marker.events && marker.events.length > 0) {
                // Only update popupMarker if it's different to prevent unnecessary rerenders
                if (!popupMarker || popupMarker.id !== marker.id) {
                    setPopupMarker(marker)
                }

                // If no specific event is selected or the selected event is not in this marker,
                // default to the first event in this marker
                if (!selectedEventId || !marker.events.find((e) => e.id === selectedEventId)) {
                    const firstEventId = marker.events[0]?.id || null
                    if (firstEventId) {
                        onEventSelect(firstEventId)
                    }
                }
            } else if (popupMarker !== null) {
                // Only set to null if it's not already null
                setPopupMarker(null)
            }
        }
    }, [selectedMarkerId, markers, selectedEventId, onEventSelect, popupMarker])

    /**
     * Handles marker click events
     * Selects the marker and shows its popup with events
     */
    const handleMarkerClick = (marker: MapMarker) => {
        if (!marker.events || marker.events.length === 0) return

        // Select marker and show popup
        onMarkerSelect(marker.id)

        // Default to first event when marker is clicked
        if (marker.events.length > 0) {
            onEventSelect(marker.events[0].id)
        }
    }

    // Handle event selection in popup
    const handleEventSelect = (eventId: string) => {
        onEventSelect(eventId)
    }

    // Handle popup close - simplified
    const handlePopupClose = () => {
        // Clear marker and event selection
        onMarkerSelect(null)
        onEventSelect(null)
        setPopupMarker(null)
    }

    // Handle geolocate events
    const handleGeolocate = useCallback((e: GeolocateResultEvent) => {
        logr.info('mapc', 'User location found', {
            latitude: e.coords.latitude.toFixed(6),
            longitude: e.coords.longitude.toFixed(6),
            accuracy: e.coords.accuracy,
        })
    }, [])

    return (
        <div className="relative w-full h-full" style={{ minHeight: '100%' }}>
            <Map
                ref={mapRef}
                mapStyle={{
                    version: 8,
                    sources: {
                        'osm-tiles': {
                            type: 'raster',
                            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                            tileSize: 256,
                            attribution: '© OpenStreetMap contributors',
                        },
                    },
                    layers: [
                        {
                            id: 'osm-tiles',
                            type: 'raster',
                            source: 'osm-tiles',
                            minzoom: 0,
                            maxzoom: 19,
                        },
                    ],
                }}
                minZoom={2} // Slightly restrict min zoom to avoid world wrapping issues
                maxZoom={19} // Allow high zoom for detailed city views
                reuseMaps={true} // Set to true to fix performance issues
                renderWorldCopies={true}
                latitude={viewport.latitude}
                longitude={viewport.longitude}
                zoom={viewport.zoom}
                bearing={viewport.bearing}
                pitch={viewport.pitch}
                onMove={(evt) => handleViewportChange(evt.viewState)}
                onLoad={handleMapLoad} // Note this is not called till user-interactive, so we also load earlier.
                style={{ width: '100%', height: '100%', position: 'absolute' }}
                interactive={true}
                dragRotate={false} // Disable rotation for simplicity
                doubleClickZoom={true} // Enable double-click zoom
                scrollZoom={true} // Enable scroll zoom
                dragPan={true} // Ensure drag pan is enabled
                touchPitch={false}
            >
                {/* Navigation controls */}
                <NavigationControl position="top-right" showCompass={true} showZoom={true} visualizePitch={true} />

                {/* Geolocate control - user location */}
                <GeolocateControl
                    position="bottom-right"
                    trackUserLocation={false}
                    onGeolocate={handleGeolocate}
                    fitBoundsOptions={{
                        maxZoom: 12, // Don't zoom in closer than this level
                        duration: 0, // Animation duration in milliseconds
                    }}
                />

                {/* Markers */}
                {markers.map((marker) => (
                    <Marker key={marker.id} longitude={marker.longitude} latitude={marker.latitude} anchor="bottom">
                        <div
                            onClick={() => handleMarkerClick(marker)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    handleMarkerClick(marker)
                                }
                            }}
                            role="button"
                            tabIndex={0}
                            aria-label={`View ${marker.events.length} event${
                                marker.events.length === 1 ? '' : 's'
                            } at this location`}
                        >
                            <MapMarkerComponent
                                count={marker.events.length}
                                isSelected={marker.id === selectedMarkerId}
                                isUnresolved={marker.id === 'unresolved'}
                            />
                        </div>
                    </Marker>
                ))}

                {/* Popup - simplified condition */}
                {/* TODO: Consider simplifying this condition for better readability */}
                {selectedMarkerId && popupMarker && popupMarker.events && popupMarker.events.length > 0 && (
                    <Popup
                        longitude={popupMarker.longitude}
                        latitude={popupMarker.latitude}
                        anchor="bottom"
                        offset={[0, -20]}
                        onClose={handlePopupClose}
                        closeButton={true}
                        closeOnClick={false}
                        className="map-popup"
                    >
                        <MapPopup
                            marker={popupMarker}
                            selectedEventId={selectedEventId}
                            onEventSelect={handleEventSelect}
                            eventSources={eventSources}
                        />
                    </Popup>
                )}
            </Map>
        </div>
    )
}

export default MapContainer
