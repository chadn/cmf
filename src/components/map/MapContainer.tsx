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

interface MapContainerProps {
    viewport: MapViewport
    onViewportChange: (viewport: MapViewport) => void
    markers: MapMarker[]
    selectedMarkerId: string | null
    onMarkerSelect: (markerId: string | null) => void
    onBoundsChange: (bounds: MapBounds) => void
    onResetView: () => void
}

const MapContainer: React.FC<MapContainerProps> = ({
    viewport,
    onViewportChange,
    markers,
    selectedMarkerId,
    onMarkerSelect,
    onBoundsChange,
    onResetView,
}) => {
    const mapRef = useRef<any>(null)
    const [popupInfo, setPopupInfo] = useState<MapMarker | null>(null)
    const [mapLoaded, setMapLoaded] = useState(false)

    // Log when component mounts
    useEffect(() => {
        debugLog('map', 'MapContainer component mounted', {
            initialViewport: viewport,
            markerCount: markers.length,
        })
    }, [])

    // Update popup info when selected marker changes
    useEffect(() => {
        if (selectedMarkerId) {
            const marker = markers.find((m) => m.id === selectedMarkerId)
            setPopupInfo(marker || null)

            if (marker) {
                debugLog('map', `Selected marker: ${selectedMarkerId}`, {
                    lat: marker.latitude,
                    lng: marker.longitude,
                    eventCount: marker.events.length,
                })
            }
        } else {
            setPopupInfo(null)
        }
    }, [selectedMarkerId, markers])

    // Handle map load
    const handleMapLoad = () => {
        setMapLoaded(true)
        debugLog('map', 'Map loaded successfully')

        // Get initial bounds
        if (mapRef.current) {
            const bounds = mapRef.current.getMap().getBounds()
            const initialBounds = {
                north: bounds.getNorth(),
                south: bounds.getSouth(),
                east: bounds.getEast(),
                west: bounds.getWest(),
            }
            debugLog('map', 'Initial map bounds', initialBounds)
            onBoundsChange(initialBounds)
        }
    }

    // Handle viewport change
    const handleViewportChange = (newViewport: ViewState) => {
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

    // Handle marker click
    const handleMarkerClick = (marker: MapMarker) => {
        debugLog('map', `Marker clicked: ${marker.id}`, {
            lat: marker.latitude,
            lng: marker.longitude,
            eventCount: marker.events.length,
        })
        onMarkerSelect(marker.id)
        setPopupInfo(marker)
    }

    // Handle popup close
    const handlePopupClose = () => {
        debugLog('map', 'Popup closed')
        onMarkerSelect(null)
        setPopupInfo(null)
    }

    // Handle reset view button click
    const handleResetView = () => {
        debugLog('map', 'Reset view requested')
        onResetView()
    }

    // Log when markers change
    useEffect(() => {
        if (mapLoaded) {
            debugLog('map', `Markers updated: ${markers.length} markers on map`)
        }
    }, [markers, mapLoaded])

    return (
        <div className="relative w-full h-full">
            <Map
                ref={mapRef}
                // @ts-ignore - This works at runtime but has type issues
                mapLib={import('maplibre-gl')}
                mapStyle={
                    process.env.MAPLIBRE_STYLE_URL ||
                    'https://demotiles.maplibre.org/style.json'
                }
                {...viewport}
                onMove={(evt) => handleViewportChange(evt.viewState)}
                onLoad={handleMapLoad}
                style={{ width: '100%', height: '100%' }}
            >
                {/* Navigation controls */}
                <NavigationControl position="top-right" />

                {/* Reset view button */}
                <div className="absolute top-2 left-2 z-10">
                    <button
                        className="bg-white px-2 py-1 rounded shadow text-sm"
                        onClick={handleResetView}
                    >
                        Show All Events
                    </button>
                </div>

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

                {/* Popup */}
                {popupInfo && (
                    <Popup
                        longitude={popupInfo.longitude}
                        latitude={popupInfo.latitude}
                        anchor="bottom"
                        onClose={handlePopupClose}
                        closeOnClick={false}
                    >
                        <MapPopup marker={popupInfo} />
                    </Popup>
                )}
            </Map>
        </div>
    )
}

export default MapContainer
