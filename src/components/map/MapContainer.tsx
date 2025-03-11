'use client'

import { useRef, useEffect, useState } from 'react'
import Map, { Marker, Popup, NavigationControl, ViewState } from 'react-map-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapViewport, MapBounds, MapMarker } from '@/types/map'
import MapMarkerComponent from './MapMarker'
import MapPopup from './MapPopup'

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

    // Update popup info when selected marker changes
    useEffect(() => {
        if (selectedMarkerId) {
            const marker = markers.find((m) => m.id === selectedMarkerId)
            setPopupInfo(marker || null)
        } else {
            setPopupInfo(null)
        }
    }, [selectedMarkerId, markers])

    // Handle viewport change
    const handleViewportChange = (newViewport: ViewState) => {
        onViewportChange(newViewport as MapViewport)

        // Get current bounds and notify parent
        if (mapRef.current) {
            const bounds = mapRef.current.getMap().getBounds()
            onBoundsChange({
                north: bounds.getNorth(),
                south: bounds.getSouth(),
                east: bounds.getEast(),
                west: bounds.getWest(),
            })
        }
    }

    // Handle marker click
    const handleMarkerClick = (marker: MapMarker) => {
        onMarkerSelect(marker.id)
        setPopupInfo(marker)
    }

    // Handle popup close
    const handlePopupClose = () => {
        onMarkerSelect(null)
        setPopupInfo(null)
    }

    // Handle reset view button click
    const handleResetView = () => {
        onResetView()
    }

    return (
        <div className="relative w-full h-full">
            <Map
                ref={mapRef}
                mapLib={import('maplibre-gl')}
                mapStyle={
                    process.env.MAPLIBRE_STYLE_URL ||
                    'https://demotiles.maplibre.org/style.json'
                }
                {...viewport}
                onMove={(evt) => handleViewportChange(evt.viewState)}
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
