import { renderHook, act } from '@testing-library/react'
import { useMap } from '../useMap'
import { CmfEvent } from '@/types/events'
import { MapViewport } from '@/types/map'

// Mock the generateMapMarkers function
jest.mock('@/lib/utils/location', () => ({
    generateMapMarkers: jest.fn().mockImplementation((events: CmfEvent[]) =>
        events
            .filter((event) => event.resolved_location?.status === 'resolved')
            .map((event) => ({
                id: `marker-${event.id}`,
                event,
                events: [event],
                position: [0, 0],
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

    const mockFilteredEvents = {
        mapFilteredEvents: [],
        searchFilteredEvents: [],
        dateFilteredEvents: [],
        unknownLocationsFilteredEvents: [],
        filteredEvents: [],
        shownEvents: [mockEvent],
        allEvents: [mockEvent],
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should initialize with default values', () => {
        const { result } = renderHook(() => useMap(mockFilteredEvents))

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
        const { result } = renderHook(() => useMap(mockFilteredEvents))

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
        const { result } = renderHook(() => useMap(mockFilteredEvents))

        act(() => {
            result.current.setSelectedMarkerId('marker-1')
        })

        expect(result.current.selectedMarkerId).toBe('marker-1')
    })

    it('should reset map to show all events', () => {
        const { result } = renderHook(() => useMap(mockFilteredEvents))

        act(() => {
            result.current.resetMapToAllEvents()
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
            ...mockFilteredEvents,
            shownEvents: [eventWithoutLocation],
            allEvents: [eventWithoutLocation],
        }

        const { result } = renderHook(() => useMap(filteredEventsWithoutLocation))

        expect(result.current.markers).toHaveLength(0)
    })
})
