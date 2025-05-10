import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import MapContainer from '../MapContainer'
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

// Import React directly to avoid require style import
import * as ReactImport from 'react'

// Mock react-map-gl components
jest.mock('react-map-gl', () => {
    interface MapProps {
        children?: React.ReactNode
        onLoad?: () => void
        onMove?: (evt: { viewState: Record<string, number> }) => void
    }

    interface MapRef {
        getMap: () => typeof mockMapInstance
    }

    const MockMapComponent = ReactImport.forwardRef<MapRef, MapProps>(({ children, onLoad, onMove }, ref) => {
        // Set up the ref to return our mock map instance
        ReactImport.useEffect(() => {
            if (ref) {
                ;(ref as React.MutableRefObject<MapRef>).current = {
                    getMap: () => mockMapInstance,
                }
            }
        }, [ref])

        return (
            <button
                data-testid="map-container"
                type="button"
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
                ref={ref as React.RefObject<HTMLButtonElement>}
                style={{ width: '100%', height: '100%', padding: 0, border: 'none', background: 'none' }}
            >
                {children}
            </button>
        )
    })

    MockMapComponent.displayName = 'MockMap'

    interface MarkerProps {
        children?: React.ReactNode
        onClick?: () => void
    }

    const MockMarker = ({ children, onClick }: MarkerProps) => (
        <button data-testid="map-marker" onClick={onClick} type="button">
            {children}
        </button>
    )

    MockMarker.displayName = 'MockMarker'

    interface PopupProps {
        children?: React.ReactNode
        onClose?: () => void
    }

    const MockPopup = ({ children, onClose }: PopupProps) => (
        <div data-testid="map-popup">
            {children}
            <button data-testid="popup-close-button" onClick={onClose} type="button">
                Close
            </button>
        </div>
    )
    MockPopup.displayName = 'MockPopup'

    const MockNavigationControl = () => <div data-testid="navigation-control" />
    MockNavigationControl.displayName = 'MockNavigationControl'

    return {
        __esModule: true,
        default: MockMapComponent,
        Marker: MockMarker,
        Popup: MockPopup,
        NavigationControl: MockNavigationControl,
    }
})

// Mock MapPopup component
jest.mock('../MapPopup', () => {
    interface MapPopupProps {
        marker: {
            id: string
            events: Array<{
                id: string
            }>
        }
        selectedEventId: string | null
        onEventSelect: (eventId: string) => void
    }

    const MockMapPopup = ({ marker, selectedEventId, onEventSelect }: MapPopupProps) => (
        <div data-testid="map-popup-content">
            <div>Marker ID: {marker.id}</div>
            <div>Events: {marker.events.length}</div>
            <div>Selected Event: {selectedEventId || 'none'}</div>
            <button data-testid="select-event-button" onClick={() => onEventSelect(marker.events[0].id)} type="button">
                Select Event
            </button>
            <button
                data-testid="select-different-event-button"
                onClick={() => onEventSelect(marker.events.length > 1 ? marker.events[1].id : marker.events[0].id)}
                type="button"
            >
                Select Different Event
            </button>
        </div>
    )
    MockMapPopup.displayName = 'MockMapPopup'
    return MockMapPopup
})

// Mock MapMarker component
jest.mock('../MapMarker', () => {
    const MockMapMarker = ({ count, isSelected }: { count: number; isSelected: boolean }) => (
        <div data-testid="map-marker-component" data-count={count} data-selected={isSelected}>
            Marker ({count}) {isSelected ? 'Selected' : ''}
        </div>
    )
    MockMapMarker.displayName = 'MockMapMarker'
    return MockMapMarker
})

// Mock maplibre-gl
jest.mock('maplibre-gl', () => ({
    Map: jest.fn().mockImplementation(() => mockMapInstance),
}))

describe('MapContainer', () => {
    const mockViewport = {
        latitude: 37.7749,
        longitude: -122.4194,
        zoom: 12,
        bearing: 0,
        pitch: 0,
    }

    // Create multiple events for testing multi-event markers
    const mockEvents = [
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
        {
            id: 'event2',
            name: 'Test Event 2',
            start: '2024-01-01T12:00:00',
            end: '2024-01-01T13:00:00',
            location: 'Test Location 2',
            resolved_location: {
                status: 'resolved',
                lat: 37.7749,
                lng: -122.4194,
            },
        } as CmfEvent,
    ]

    const mockMarkers = [
        {
            id: '1',
            latitude: 37.7749,
            longitude: -122.4194,
            events: mockEvents,
        },
        {
            id: '2',
            latitude: 38.5816,
            longitude: -121.4944,
            events: [
                {
                    id: 'event3',
                    name: 'Test Event 3',
                    start: '2024-01-01T14:00:00',
                    end: '2024-01-01T15:00:00',
                    location: 'Test Location 3',
                    resolved_location: {
                        status: 'resolved',
                        lat: 38.5816,
                        lng: -121.4944,
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
        selectedEventId: null,
        onEventSelect: jest.fn(),
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
        const markers = screen.getAllByTestId('map-marker')
        expect(markers).toHaveLength(2)
    })

    it('renders popup when a marker is selected', () => {
        render(<MapContainer {...defaultProps} selectedMarkerId="1" />)
        expect(screen.getByTestId('map-popup')).toBeInTheDocument()
        expect(screen.getByTestId('map-popup-content')).toBeInTheDocument()
    })

    it('calls onMarkerSelect when a marker is clicked', () => {
        render(<MapContainer {...defaultProps} />)
        const markers = screen.getAllByTestId('map-marker')
        fireEvent.click(markers[0])
        expect(defaultProps.onMarkerSelect).toHaveBeenCalledWith('1')
    })

    it('calls onEventSelect with first event when marker is clicked', () => {
        render(<MapContainer {...defaultProps} />)
        const markers = screen.getAllByTestId('map-marker')
        fireEvent.click(markers[0])
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

    // New tests for better coverage
    it('selects an event in the popup when event selection button is clicked', () => {
        render(<MapContainer {...defaultProps} selectedMarkerId="1" />)

        // Click the select event button in the popup
        const selectEventButton = screen.getByTestId('select-event-button')
        fireEvent.click(selectEventButton)

        // Check that onEventSelect was called with the correct event ID
        expect(defaultProps.onEventSelect).toHaveBeenCalledWith('event1')
    })

    it('selects a different event in the popup when different event button is clicked', () => {
        render(<MapContainer {...defaultProps} selectedMarkerId="1" />)

        // Click the select different event button in the popup
        const selectDifferentEventButton = screen.getByTestId('select-different-event-button')
        fireEvent.click(selectDifferentEventButton)

        // Check that onEventSelect was called with the second event ID
        expect(defaultProps.onEventSelect).toHaveBeenCalledWith('event2')
    })

    it('closes popup and resets selections when popup close button is clicked', () => {
        render(<MapContainer {...defaultProps} selectedMarkerId="1" selectedEventId="event1" />)

        // Verify popup is shown
        expect(screen.getByTestId('map-popup')).toBeInTheDocument()

        // Click the close button
        const closeButton = screen.getByTestId('popup-close-button')
        fireEvent.click(closeButton)

        // Check that marker and event selections were reset
        expect(defaultProps.onMarkerSelect).toHaveBeenCalledWith(null)
        expect(defaultProps.onEventSelect).toHaveBeenCalledWith(null)

        // Check that bounds were updated
        expect(defaultProps.onBoundsChange).toHaveBeenCalled()
    })

    it('selects first event in a marker when no event is selected', () => {
        render(<MapContainer {...defaultProps} selectedMarkerId="1" selectedEventId={null} />)

        // The component should automatically select the first event
        expect(defaultProps.onEventSelect).toHaveBeenCalledWith('event1')
    })

    it('selects first event in a marker when selected event is not in the marker', () => {
        render(<MapContainer {...defaultProps} selectedMarkerId="1" selectedEventId="event999" />)

        // The component should select the first event since event999 is not in marker 1
        expect(defaultProps.onEventSelect).toHaveBeenCalledWith('event1')
    })

    it('updates map dimensions when dimensions change', async () => {
        // Mock a change in map dimensions
        const originalGetContainer = mockMapInstance.getContainer
        mockMapInstance.getContainer = jest.fn().mockReturnValue({
            clientWidth: 1200, // Changed from 1000
            clientHeight: 900, // Changed from 800
        })

        render(<MapContainer {...defaultProps} />)

        // Trigger map load to initialize dimensions
        await act(async () => {
            fireEvent.click(screen.getByTestId('map-container'))
            await new Promise((resolve) => setTimeout(resolve, 20))
        })

        // Verify dimensions were reported
        expect(defaultProps.onWidthHeightChange).toHaveBeenCalledWith({
            w: 1200,
            h: 900,
        })

        // Restore original mock
        mockMapInstance.getContainer = originalGetContainer
    })

    it('does not update dimensions when they have not changed', async () => {
        // Create a new props object with a fresh mock
        const props = {
            ...defaultProps,
            onWidthHeightChange: jest.fn(),
        }

        render(<MapContainer {...props} />)

        // Trigger initial map load to set dimensions
        await act(async () => {
            fireEvent.click(screen.getByTestId('map-container'))
            await new Promise((resolve) => setTimeout(resolve, 20))
        })

        // Clear the mock to track new calls
        props.onWidthHeightChange.mockClear()

        // Mock getContainer to return the same dimensions as before
        const originalGetContainer = mockMapInstance.getContainer
        mockMapInstance.getContainer = jest.fn().mockReturnValue({
            clientWidth: 1000,
            clientHeight: 800,
        })

        // Trigger map move which calls updateMapWidthHeight
        fireEvent.mouseMove(screen.getByTestId('map-container'))

        // Since dimensions haven't changed, onWidthHeightChange should not be called again
        expect(props.onWidthHeightChange).not.toHaveBeenCalled()

        // Restore original mock
        mockMapInstance.getContainer = originalGetContainer
    })

    it('displays the correct marker count', () => {
        render(<MapContainer {...defaultProps} />)

        const markerComponents = screen.getAllByTestId('map-marker-component')

        // First marker has 2 events
        expect(markerComponents[0]).toHaveAttribute('data-count', '2')

        // Second marker has 1 event
        expect(markerComponents[1]).toHaveAttribute('data-count', '1')
    })

    it('highlights the selected marker', () => {
        render(<MapContainer {...defaultProps} selectedMarkerId="1" />)

        const markerComponents = screen.getAllByTestId('map-marker-component')

        // First marker should be selected
        expect(markerComponents[0]).toHaveAttribute('data-selected', 'true')

        // Second marker should not be selected
        expect(markerComponents[1]).toHaveAttribute('data-selected', 'false')
    })
})
