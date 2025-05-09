import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import MapContainer from '../MapContainer'
import { MapViewport, MapBounds, MapMarker } from '@/types/map'
import { CmfEvent } from '@/types/events'

// Mock map instance
const mockMapInstance = {
    getBounds: () => ({
        getNorth: () => 37.7749,
        getSouth: () => 37.7749,
        getEast: () => -122.4194,
        getWest: () => -122.4194,
    }),
    getContainer: () => ({
        clientWidth: 1000,
        clientHeight: 800,
    }),
}

// Mock react-map-gl components
jest.mock('react-map-gl', () => {
    const React = require('react')
    return {
        __esModule: true,
        default: React.forwardRef(({ children, onLoad, onMove }: any, ref: any) => {
            // Set up the ref to return our mock map instance
            React.useEffect(() => {
                if (ref) {
                    ;(ref as any).current = {
                        getMap: () => mockMapInstance,
                    }
                }
            }, [ref])

            return (
                <div
                    data-testid="map-container"
                    onClick={() => onLoad?.()}
                    onMouseMove={() =>
                        onMove?.({
                            viewState: {
                                latitude: 37.7749,
                                longitude: -122.4194,
                                zoom: 12,
                                bearing: 0,
                                pitch: 0,
                            },
                        })
                    }
                    ref={ref}
                >
                    {children}
                </div>
            )
        }),
        Marker: ({ children, onClick }: any) => (
            <div data-testid="map-marker" onClick={onClick}>
                {children}
            </div>
        ),
        Popup: ({ children }: any) => <div data-testid="map-popup">{children}</div>,
        NavigationControl: () => <div data-testid="navigation-control" />,
    }
})

// Mock maplibre-gl
jest.mock('maplibre-gl', () => ({
    Map: jest.fn().mockImplementation(() => mockMapInstance),
}))

describe('MapContainer', () => {
    const mockViewport: MapViewport = {
        latitude: 37.7749,
        longitude: -122.4194,
        zoom: 12,
        bearing: 0,
        pitch: 0,
    }

    const mockMarkers: MapMarker[] = [
        {
            id: '1',
            latitude: 37.7749,
            longitude: -122.4194,
            events: [
                {
                    id: 'event1',
                    name: 'Test Event 1',
                    start: '2024-01-01T10:00:00',
                    end: '2024-01-01T11:00:00',
                    location: 'Test Location 1',
                    resolved_location: {
                        status: 'resolved',
                        lat: 37.7749,
                        lng: -122.4194,
                    },
                } as CmfEvent,
            ],
        },
    ]

    const defaultProps = {
        viewport: mockViewport,
        onViewportChange: jest.fn(),
        markers: mockMarkers,
        selectedMarkerId: null,
        onMarkerSelect: jest.fn(),
        onBoundsChange: jest.fn(),
        onWidthHeightChange: jest.fn(),
        onResetView: jest.fn(),
        selectedEventId: null,
        onEventSelect: jest.fn(),
        isMapOfAllEvents: false,
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('renders without crashing', () => {
        render(<MapContainer {...defaultProps} />)
        expect(screen.getByTestId('map-container')).toBeInTheDocument()
    })

    it('renders markers when provided', () => {
        render(<MapContainer {...defaultProps} />)
        expect(screen.getByTestId('map-marker')).toBeInTheDocument()
    })

    it('renders popup when a marker is selected', () => {
        render(<MapContainer {...defaultProps} selectedMarkerId="1" />)
        expect(screen.getByTestId('map-popup')).toBeInTheDocument()
    })

    it('calls onMarkerSelect when a marker is clicked', () => {
        render(<MapContainer {...defaultProps} />)
        const marker = screen.getByTestId('map-marker')
        fireEvent.click(marker)
        expect(defaultProps.onMarkerSelect).toHaveBeenCalledWith('1')
    })

    it('calls onEventSelect with first event when marker is clicked', () => {
        render(<MapContainer {...defaultProps} />)
        const marker = screen.getByTestId('map-marker')
        fireEvent.click(marker)
        expect(defaultProps.onEventSelect).toHaveBeenCalledWith('event1')
    })

    it('updates bounds when map is loaded', async () => {
        render(<MapContainer {...defaultProps} />)
        const map = screen.getByTestId('map-container')

        // Wait for ref to be set up and click to trigger onLoad
        await act(async () => {
            fireEvent.click(map) // Trigger onLoad
            // Add a small delay to allow the setTimeout in handleMapLoad to complete
            await new Promise((resolve) => setTimeout(resolve, 20))
        })

        expect(defaultProps.onBoundsChange).toHaveBeenCalledWith({
            north: 37.7749,
            south: 37.7749,
            east: -122.4194,
            west: -122.4194,
        })
    })

    it('calls onViewportChange when map is moved', () => {
        render(<MapContainer {...defaultProps} />)
        const map = screen.getByTestId('map-container')
        fireEvent.mouseMove(map) // Trigger onMove
        expect(defaultProps.onViewportChange).toHaveBeenCalled()
    })

    it('closes popup when selectedMarkerId is set to null', () => {
        const { rerender } = render(<MapContainer {...defaultProps} selectedMarkerId="1" />)
        expect(screen.getByTestId('map-popup')).toBeInTheDocument()

        rerender(<MapContainer {...defaultProps} selectedMarkerId={null} />)
        expect(screen.queryByTestId('map-popup')).not.toBeInTheDocument()
    })

    it('handles marker with no events gracefully', async () => {
        const markersWithNoEvents = [
            {
                ...mockMarkers[0],
                events: [],
            },
        ]
        render(<MapContainer {...defaultProps} markers={markersWithNoEvents} />)
        const marker = screen.getByTestId('map-marker')

        await act(async () => {
            fireEvent.click(marker)
        })

        expect(defaultProps.onMarkerSelect).not.toHaveBeenCalled()
        expect(defaultProps.onEventSelect).not.toHaveBeenCalled()
    })

    it('renders navigation control', () => {
        render(<MapContainer {...defaultProps} />)
        expect(screen.getByTestId('navigation-control')).toBeInTheDocument()
    })
})
