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
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

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

            if (marker && marker.events && marker.events.length > 0) {
                setPopupInfo(marker)

                debugLog('map', `Selected marker: ${selectedMarkerId}`, {
                    lat: marker.latitude,
                    lng: marker.longitude,
                    eventCount: marker.events.length,
                })

                // If no specific event is selected or the selected event is not in this marker,
                // default to the first event in this marker
                if (
                    !selectedEventId ||
                    !marker.events.find((e) => e.id === selectedEventId)
                ) {
                    setSelectedEventId(marker.events[0]?.id || null)
                    debugLog(
                        'map',
                        `Defaulting to first event: ${marker.events[0]?.name}`,
                        {
                            eventId: marker.events[0]?.id,
                        }
                    )
                }
            } else {
                debugLog(
                    'map',
                    `Selected marker has no events: ${selectedMarkerId}`
                )
                setPopupInfo(null)
                setSelectedEventId(null)
            }
        } else {
            setPopupInfo(null)
            setSelectedEventId(null)
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
        if (!marker.events || marker.events.length === 0) {
            debugLog('map', `Clicked marker has no events: ${marker.id}`)
            return
        }

        debugLog('map', `Marker clicked: ${marker.id}`, {
            lat: marker.latitude,
            lng: marker.longitude,
            eventCount: marker.events.length,
            firstEventName: marker.events[0]?.name,
        })

        onMarkerSelect(marker.id)
        setPopupInfo(marker)

        // Default to the first event in the marker when clicking
        if (marker.events.length > 0) {
            const firstEventId = marker.events[0].id
            setSelectedEventId(firstEventId)
            debugLog(
                'map',
                `Setting selected event: ${marker.events[0].name}`,
                {
                    eventId: firstEventId,
                }
            )
        }
    }

    // Handle event selection in popup
    const handleEventSelect = (eventId: string) => {
        debugLog('map', `Event selected in popup: ${eventId}`)
        setSelectedEventId(eventId)
    }

    // Handle popup close
    const handlePopupClose = () => {
        debugLog('map', 'Popup closed')
        onMarkerSelect(null)
        setPopupInfo(null)
        setSelectedEventId(null)
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
        <div className="relative w-full h-full" style={{ minHeight: '100%' }}>
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
                style={{ width: '100%', height: '100%', position: 'absolute' }}
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
                {popupInfo &&
                    popupInfo.events &&
                    popupInfo.events.length > 0 && (
                        <Popup
                            longitude={popupInfo.longitude}
                            latitude={popupInfo.latitude}
                            anchor="bottom"
                            onClose={handlePopupClose}
                            closeOnClick={false}
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
