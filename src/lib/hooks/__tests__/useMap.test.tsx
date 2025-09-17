import { renderHook, act } from '@testing-library/react'
import { useMap } from '@/lib/hooks/useMap'
import { CmfEvent } from '@/types/events'
import { MapViewport } from '@/types/map'
import { AppState } from '@/lib/state/appStateReducer'
import { FilterEventsManager } from '@/lib/events/FilterEventsManager'

// Mock the generateMapMarkers function
jest.mock('@/lib/utils/location', () => ({
    generateMapMarkers: jest.fn().mockImplementation((events: CmfEvent[]) =>
        events
            .filter((event) => event.resolved_location?.status === 'resolved')
            .map((event) => ({
                id: `marker-${event.id}`,
                latitude: event.resolved_location?.lat || 0,
                longitude: event.resolved_location?.lng || 0,
                events: [event],
            }))
    ),
    calculateMapBoundsAndViewport: jest.fn().mockImplementation(() => ({
        bounds: {
            north: 37.7749,
            south: 37.7749,
            east: -122.4194,
            west: -122.4194,
        },
        viewport: {
            latitude: 37.7749,
            longitude: -122.4194,
            zoom: 12,
            bearing: 0,
            pitch: 0,
        },
    })),
    calculateAggregateCenter: jest.fn().mockImplementation(() => ({
        lat: 37.7749,
        lng: -122.4194,
    })),
}))

// Mock the logr utility
jest.mock('@/lib/utils/logr', () => ({
    logr: {
        info: jest.fn(),
        debug: jest.fn(),
    },
}))

describe('useMap', () => {
    // Use a single mock event instead of multiple
    const mockEvent: CmfEvent = {
        id: '1',
        name: 'Test Event',
        original_event_url: 'https://example.com/event',
        description: 'Test Description',
        description_urls: [],
        start: '2024-01-01T10:00:00Z',
        end: '2024-01-01T11:00:00Z',
        location: 'Test Location',
        resolved_location: {
            status: 'resolved',
            lat: 37.7749,
            lng: -122.4194,
            formatted_address: 'Test Location',
            original_location: 'Test Location',
        },
    }

    const mockCmfEvents = {
        allEvents: [mockEvent],
        visibleEvents: [mockEvent],
        hiddenCounts: {
            byMap: 0,
            bySearch: 0,
            byDate: 0,
            byLocationFilter: 0,
        },
    }

    const mockAppState: AppState = 'user-interactive'
    const mockFilterEventsManager = new FilterEventsManager(mockCmfEvents.allEvents)
    const mockMapW = 800
    const mockMapH = 600

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should initialize with default values', () => {
        const { result } = renderHook(() =>
            useMap(mockAppState, mockCmfEvents, mockFilterEventsManager, mockMapW, mockMapH)
        )

        expect(result.current.viewport).toEqual({
            latitude: 37.7749,
            longitude: -122.4194,
            zoom: 12,
            bearing: 0,
            pitch: 0,
        })
        expect(result.current.markers).toHaveLength(1)
        expect(result.current.selectedMarkerId).toBeNull()
    })

    it('should update viewport', () => {
        const { result } = renderHook(() =>
            useMap(mockAppState, mockCmfEvents, mockFilterEventsManager, mockMapW, mockMapH)
        )

        const newViewport: MapViewport = {
            latitude: 37.7833,
            longitude: -122.4167,
            zoom: 14,
            bearing: 45,
            pitch: 60,
        }

        act(() => {
            result.current.setViewport(newViewport)
        })

        expect(result.current.viewport).toEqual(newViewport)
    })

    it('should update selected marker', () => {
        const { result } = renderHook(() =>
            useMap(mockAppState, mockCmfEvents, mockFilterEventsManager, mockMapW, mockMapH)
        )

        act(() => {
            result.current.setSelectedMarkerId('marker-1')
        })

        expect(result.current.selectedMarkerId).toBe('marker-1')
    })

    it('should reset map to show visible events', () => {
        const { result } = renderHook(() =>
            useMap(mockAppState, mockCmfEvents, mockFilterEventsManager, mockMapW, mockMapH)
        )

        act(() => {
            result.current.resetMapToVisibleEvents()
        })

        expect(result.current.viewport).toEqual({
            latitude: 37.7749,
            longitude: -122.4194,
            zoom: 12,
            bearing: 0,
            pitch: 0,
        })
        expect(result.current.markers).toHaveLength(1)
    })

    it('should handle events without locations', () => {
        const eventWithoutLocation: CmfEvent = {
            ...mockEvent,
            id: '2',
            location: '',
            resolved_location: undefined,
        }

        const filteredEventsWithoutLocation = {
            ...mockCmfEvents,
            visibleEvents: [eventWithoutLocation],
            allEvents: [eventWithoutLocation],
        }

        const filterManagerWithoutLocation = new FilterEventsManager([eventWithoutLocation])

        const { result } = renderHook(() =>
            useMap(mockAppState, filteredEventsWithoutLocation, filterManagerWithoutLocation, mockMapW, mockMapH)
        )

        expect(result.current.markers).toHaveLength(0)
    })
})
