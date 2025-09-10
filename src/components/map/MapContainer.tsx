'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import Map, { Marker, Popup, NavigationControl, ViewState, MapRef } from 'react-map-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapViewport, MapBounds, MapMarker } from '@/types/map'
import { EventsSource } from '@/types/events'
import MapMarkerComponent from './MapMarker'
import MapPopup from './MapPopup'
import { logr } from '@/lib/utils/logr'
import { roundMapBounds, viewstate2Viewport } from '@/lib/utils/location'
import { useDebounce } from '@/lib/utils/utils-client'
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
    const mapWidthHeightRef = useRef({ w: 1001, h: 1001 })

    // Get map dimensions and update parent component if dimensions have changed
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
            logr.info('mapc', 'updateMapWidthHeight changed:', newDimensions)
            mapWidthHeightRef.current = newDimensions
            onWidthHeightChange(newDimensions)
        } else {
            logr.info('mapc', 'updateMapWidthHeight unchanged:', newDimensions)
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
            const map = mapRef.current.getMap()
            const bounds = map.getBounds()
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
        onBoundsChange(newBounds, true) // true = from user interaction
    }, 200)

    // Handle viewport change, Map onMove
    const handleViewportChange = useCallback(
        (newViewstate: ViewState) => {
            const vp = viewstate2Viewport(newViewstate)
            logr.info(
                'mapc',
                'uC: Map onMove: handleViewportChange: updateMapWidthHeight, onViewportChange, debouncedUpdateBounds',
                vp
            )
            updateMapWidthHeight() // Update dimensions and notify parent if changed
            onViewportChange(vp)
            debouncedUpdateBounds()
        },
        [onViewportChange, debouncedUpdateBounds, updateMapWidthHeight]
    )

    // Handle Map onLoad
    const handleMapLoad = useCallback(() => {
        logr.info('mapc', 'uC: Map onLoad: handleMapLoad')
        setTimeout(() => {
            updateMapWidthHeight() // Update dimensions and notify parent if changed
            const initialBounds = getMapBounds()
            logr.info('mapc', 'timeout=10ms, setting initial bounds', initialBounds)
            onBoundsChange(initialBounds, false) // false = not from user interaction
        }, 10)
    }, [updateMapWidthHeight, getMapBounds, onBoundsChange])

    // Log when markers length changes
    useEffect(() => {
        logr.info('mapc', `uE: MapContainer updated num markers, now ${markers.length}`)
    }, [markers.length])

    // Log when viewport changes
    useEffect(() => {
        const vport = `lat=${viewport.latitude} lon=${viewport.longitude} zoom=${viewport.zoom}`
        logr.info('mapc', `uE: MapContainer updated viewport, now ${vport}`)
    }, [viewport.latitude, viewport.longitude, viewport.zoom])

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
                mapboxAccessToken="" // Ensure no token is used
                minZoom={2} // Slightly restrict min zoom to avoid world wrapping issues
                maxZoom={19} // Allow high zoom for detailed city views
                attributionControl={true}
                reuseMaps={true} // Set to true to fix performance issues
                renderWorldCopies={true}
                latitude={viewport.latitude}
                longitude={viewport.longitude}
                zoom={viewport.zoom}
                bearing={viewport.bearing}
                pitch={viewport.pitch}
                onMove={(evt) => handleViewportChange(evt.viewState)}
                onLoad={handleMapLoad}
                style={{ width: '100%', height: '100%', position: 'absolute' }}
                interactive={true}
                dragRotate={false} // Disable rotation for simplicity
                doubleClickZoom={true} // Enable double-click zoom
                scrollZoom={{
                    speed: 0.01, // Increase zoom speed (default is 0.002)
                    smooth: true,
                }} // Configure faster scroll zoom
                dragPan={true} // Ensure drag pan is enabled
                touchPitch={false}
            >
                {/* Navigation controls */}
                <NavigationControl position="top-right" showCompass={true} showZoom={true} visualizePitch={true} />

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
