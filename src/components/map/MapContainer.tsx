'use client'

import { useRef, useEffect, useState } from 'react'
import Map, { Marker, Popup, NavigationControl, ViewState } from 'react-map-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapViewport, MapBounds, MapMarker } from '@/types/map'
import MapMarkerComponent from './MapMarker'
import MapPopup from './MapPopup'
import { debugLog } from '@/lib/utils/debug'
// Import maplibre-gl as a type
import type maplibregl from 'maplibre-gl'
import { CalendarEvent } from '@/types/events'

interface MapContainerProps {
    viewport: MapViewport
    onViewportChange: (viewport: MapViewport) => void
    markers: MapMarker[]
    selectedMarkerId: string | null
    onMarkerSelect: (markerId: string | null) => void
    onBoundsChange: (bounds: MapBounds) => void
    onResetView: () => void
    selectedEventId: string | null
    onEventSelect: (eventId: string | null) => void
    isMapOfAllEvents?: boolean
}

const MapContainer: React.FC<MapContainerProps> = ({
    viewport,
    onViewportChange,
    markers,
    selectedMarkerId,
    onMarkerSelect,
    onBoundsChange,
    onResetView,
    selectedEventId,
    onEventSelect,
    isMapOfAllEvents = false,
}) => {
    const mapRef = useRef<any>(null)
    const [mapLoaded, setMapLoaded] = useState(false)
    const [userInteracted, setUserInteracted] = useState(false)
    const boundsUpdateTimerRef = useRef<NodeJS.Timeout | null>(null)

    // Simplified state: Only track the current popup info
    const [popupInfo, setPopupInfo] = useState<MapMarker | null>(null)

    // Log when component mounts
    useEffect(() => {
        debugLog('map', 'MapContainer component mounted', {
            initialViewport: viewport,
            markerCount: markers.length,
        })
    }, [])

    // Close popup when selected marker changes to null
    useEffect(() => {
        if (!selectedMarkerId) {
            // TODO: bug here, infinite loop is happening
            setPopupInfo(null)
        }
    }, [selectedMarkerId])
    
    // Simplified effect: Update popup when selected marker changes
    useEffect(() => {
        if (selectedMarkerId) {
            const marker = markers.find((m) => m.id === selectedMarkerId)

            if (marker && marker.events && marker.events.length > 0) {
                setPopupInfo(marker)

                // If no specific event is selected or the selected event is not in this marker,
                // default to the first event in this marker
                if (
                    !selectedEventId ||
                    !marker.events.find((e) => e.id === selectedEventId)
                ) {
                    const firstEventId = marker.events[0]?.id || null
                    if (firstEventId) {
                        onEventSelect(firstEventId)
                    }
                }
            } else {
                setPopupInfo(null)
            }
        }
    }, [selectedMarkerId, markers, selectedEventId, onEventSelect])

    // Handle map load
    const handleMapLoad = () => {
        setMapLoaded(true)

        // Get initial bounds
        if (mapRef.current) {
            const bounds = mapRef.current.getMap().getBounds()
            const initialBounds = {
                north: bounds.getNorth(),
                south: bounds.getSouth(),
                east: bounds.getEast(),
                west: bounds.getWest(),
            }
            onBoundsChange(initialBounds)
        }
    }

    // Handle viewport change
    const handleViewportChange = (newViewport: ViewState) => {
        setUserInteracted(true)
        debugLog('map', 'handleViewportChange called, setUserInteracted=true but did user trigger? CHAD consider delete setUserInteracted')

        // Pass the complete viewport state to the parent component
        onViewportChange({
            latitude: newViewport.latitude,
            longitude: newViewport.longitude,
            zoom: newViewport.zoom,
            bearing: newViewport.bearing || 0,
            pitch: newViewport.pitch || 0,
        })

        // Only update bounds when user stops interacting (through the debounce)
        // This prevents constant updates during drag/zoom operations
        updateBoundsWithDebounce()
    }

    // Separated debounce logic for better organization
    const updateBoundsWithDebounce = () => {
        if (!mapRef.current || !mapLoaded) return

        // Clear any existing timeout
        if (boundsUpdateTimerRef.current) {
            clearTimeout(boundsUpdateTimerRef.current)
        }
        const timeoutMs = 500 // Adjusted timeout for better performance
        // Set new timeout - only update bounds after user stops interacting for a moment
        boundsUpdateTimerRef.current = setTimeout(() => {
            if (mapRef.current) {
                try {
                    const bounds = mapRef.current.getMap().getBounds()
                    const newBounds = {
                        north: bounds.getNorth(),
                        south: bounds.getSouth(),
                        east: bounds.getEast(),
                        west: bounds.getWest(),
                    }
                    onBoundsChange(newBounds)
                    debugLog(
                        'map',
                        `Bounds updated after debounce timeout=${timeoutMs}ms`,
                        newBounds
                    )
                } catch (error) {
                    debugLog('map', 'Error updating bounds', error)
                }
            }
        }, timeoutMs) // Increased to 500ms for more reliable updates
    }

    // Reset userInteracted when returning to "Map of All Events" view
    useEffect(() => {
        if (isMapOfAllEvents) {
            setUserInteracted(false)
        }
    }, [isMapOfAllEvents])

    // Simplified marker click handler
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
        onMarkerSelect(null)
        onEventSelect(null)
        setPopupInfo(null)
    }


    return (
        <div className="relative w-full h-full" style={{ minHeight: '100%' }}>
            <Map
                ref={mapRef}
                // @ts-ignore - This works at runtime but has type issues
                mapLib={import('maplibre-gl')}
                mapStyle={{
                    version: 8,
                    sources: {
                        'osm-tiles': {
                            type: 'raster',
                            tiles: [
                                'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                            ],
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
                scrollZoom={true} // Ensure scroll zoom is enabled
                dragPan={true} // Ensure drag pan is enabled
                touchZoom={true} // Enable touch zoom for mobile
                touchRotate={false} // Disable touch rotation for simpler interaction
            >
                {/* Navigation controls */}
                <NavigationControl
                    position="top-right"
                    showCompass={true}
                    showZoom={true}
                    visualizePitch={true}
                />

                {/* Markers */}
                {markers.map((marker) => (
                    <Marker
                        key={marker.id}
                        longitude={marker.longitude}
                        latitude={marker.latitude}
                        anchor="bottom"
                        onClick={() => handleMarkerClick(marker)}
                    >
                        <MapMarkerComponent
                            count={marker.events.length}
                            isSelected={marker.id === selectedMarkerId}
                        />
                    </Marker>
                ))}

                {/* Popup - simplified condition */}
                {selectedMarkerId &&
                    popupInfo &&
                    popupInfo.events &&
                    popupInfo.events.length > 0 && (
                        <Popup
                            longitude={popupInfo.longitude}
                            latitude={popupInfo.latitude}
                            anchor="bottom"
                            onClose={handlePopupClose}
                            closeButton={true}
                            closeOnClick={false}
                            className="map-popup"
                        >
                            <MapPopup
                                marker={popupInfo}
                                selectedEventId={selectedEventId}
                                onEventSelect={handleEventSelect}
                            />
                        </Popup>
                    )}
            </Map>
        </div>
    )
}

export default MapContainer
