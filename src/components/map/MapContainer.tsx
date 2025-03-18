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

    // Simplified state: Only track the current popup info
    const [popupInfo, setPopupInfo] = useState<MapMarker | null>(null)

    // Log when component mounts
    useEffect(() => {
        debugLog('map', 'MapContainer component mounted', {
            initialViewport: viewport,
            markerCount: markers.length,
        })
    }, [])

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
        } else {
            setPopupInfo(null)
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
        onViewportChange(newViewport as MapViewport)

        // Get current bounds and notify parent
        if (mapRef.current) {
            const bounds = mapRef.current.getMap().getBounds()
            const newBounds = {
                north: bounds.getNorth(),
                south: bounds.getSouth(),
                east: bounds.getEast(),
                west: bounds.getWest(),
            }
            onBoundsChange(newBounds)
        }
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

    // Log when markers change
    useEffect(() => {
        if (mapLoaded) {
            debugLog('map', `Markers updated: ${markers.length} markers on map`)
        }
    }, [markers, mapLoaded])

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
                reuseMaps={false} // Disable map reuse to ensure fresh rendering
                renderWorldCopies={true}
                {...viewport}
                onMove={(evt) => handleViewportChange(evt.viewState)}
                onLoad={handleMapLoad}
                style={{ width: '100%', height: '100%', position: 'absolute' }}
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
