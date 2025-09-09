// Mock the SWR hook with a more complete implementation
jest.mock('swr', () => ({
    __esModule: true,
    default: jest.fn().mockImplementation(() => {
        // Return a stable object to prevent unnecessary re-renders
        return {
            data: undefined,
            error: null,
            isLoading: false,
            mutate: jest.fn(),
        }
    }),
}))

// Mock the FilterEventsManager with updated interface (no map bounds setters)
jest.mock('@/lib/events/FilterEventsManager', () => {
    return {
        FilterEventsManager: jest.fn().mockImplementation(() => ({
            reset: jest.fn(),
            setEvents: jest.fn(),
            setDateRange: jest.fn(),
            setSearchQuery: jest.fn(),
            setShowUnknownLocationsOnly: jest.fn(),
            resetAllFilters: jest.fn(),
            getFilteredEvents: jest.fn().mockReturnValue({
                shownEvents: [],
                totalEvents: 0,
                mapFilteredEvents: [],
                searchFilteredEvents: [],
                dateFilteredEvents: [],
                unknownLocationsFilteredEvents: [],
                filteredEvents: [],
                allEvents: [],
            }),
            cmf_events_all: [],
        })),
    }
})

// Mock the logr utility
jest.mock('@/lib/utils/logr', () => ({
    logr: {
        info: jest.fn(),
        debug: jest.fn(),
    },
}))

// Mock the fetcherLogr utility
jest.mock('@/lib/utils/utils-client', () => ({
    fetcherLogr: jest.fn(),
}))

import { renderHook, act } from '@testing-library/react'
import { useEventsManager } from '../useEventsManager'
import { CmfEvent } from '@/types/events'
import { MapBounds } from '@/types/map'

// Reconfigure SWR mock to be controllable per test
// eslint-disable-next-line @typescript-eslint/no-require-imports
const swrMock = require('swr')

describe('useEventsManager - new viewport parameter model', () => {
    // Use a single mock event instead of multiple
    const mockEvent: CmfEvent = {
        id: '1',
        name: 'Test Event',
        original_event_url: 'https://example.com/event',
        description: 'Test Description',
        description_urls: [],
        start: '2024-04-01T10:00:00Z',
        end: '2024-04-01T11:00:00Z',
        location: 'Test Location',
        resolved_location: {
            status: 'resolved',
            lat: 37.7749,
            lng: -122.4194,
            formatted_address: 'Test Location',
            original_location: 'Test Location',
        },
    }

    const mockApiResponse = {
        events: [mockEvent],
        source: {
            prefix: 'test',
            name: 'Test Source',
            url: 'https://test.com',
            id: 'test-source',
            totalCount: 1,
            unknownLocationsCount: 0,
        },
        httpStatus: 200,
    }

    beforeEach(() => {
        jest.clearAllMocks()
        swrMock.default.mockImplementation(() => ({
            data: mockApiResponse,
            error: null,
            isLoading: false,
            mutate: jest.fn(),
        }))
    })

    it('accepts currentViewport parameter and passes it to getFilteredEvents', () => {
        const currentViewport: MapBounds = {
            north: 37.8,
            south: 37.7,
            east: -122.4,
            west: -122.5,
        }

        const { result } = renderHook(() =>
            useEventsManager({
                eventSourceId: 'test-source',
                currentViewport,
            })
        )

        expect(result.current.evts).toBeDefined()

        // Verify getFilteredEvents is called with currentViewport
        const filterManager = result.current.fltrEvtMgr
        expect(filterManager.getFilteredEvents).toHaveBeenCalledWith(currentViewport)
    })

    it('exposes only domain filter setters (no map bounds setters)', () => {
        const { result } = renderHook(() => useEventsManager({ eventSourceId: 'test-source' }))

        expect(result.current.filters).toBeDefined()
        expect(result.current.filters.setSearchQuery).toBeDefined()
        expect(result.current.filters.setDateRange).toBeDefined()
        expect(result.current.filters.setShowUnknownLocationsOnly).toBeDefined()
        expect(result.current.filters.resetAll).toBeDefined()

        // These should no longer exist
        expect((result.current.filters as Record<string, unknown>).setMapBounds).toBeUndefined()
        expect((result.current.filters as Record<string, unknown>).setViewportBounds).toBeUndefined()

        // Test that filter setters work without throwing
        act(() => {
            result.current.filters.setSearchQuery('test')
            result.current.filters.setDateRange({ start: '2024-01-01', end: '2024-01-02' })
            result.current.filters.setShowUnknownLocationsOnly(true)
        })
        expect(result.current.evts).toBeDefined()
    })

    it('should fetch events when eventSourceId is provided', () => {
        const { result } = renderHook(() => useEventsManager({ eventSourceId: 'test-source' }))

        expect(result.current.eventSources?.[0]).toEqual({
            prefix: mockApiResponse.source.prefix,
            id: mockApiResponse.source.id,
            name: mockApiResponse.source.name,
            totalCount: mockApiResponse.source.totalCount,
            unknownLocationsCount: mockApiResponse.source.unknownLocationsCount,
            url: mockApiResponse.source.url
        })
    })

    it('should handle API errors', () => {
        const mockError = new Error('API Error')
        swrMock.default.mockImplementation(() => ({
            data: null,
            error: mockError,
            isLoading: false,
            mutate: jest.fn(),
        }))

        const { result } = renderHook(() => useEventsManager({ eventSourceId: 'test-source' }))

        expect(result.current.apiError).toBe(mockError)
    })

    it('should update domain filters when provided (no map bounds)', () => {
        const dateRange = { start: '2024-04-01', end: '2024-04-02' }
        const searchQuery = 'test'

        const { result } = renderHook(() =>
            useEventsManager({
                eventSourceId: 'test-source',
                dateRange,
                searchQuery,
                showUnknownLocationsOnly: true,
            })
        )

        const filterManager = result.current.fltrEvtMgr
        expect(filterManager.setDateRange).toHaveBeenCalledWith(dateRange)
        expect(filterManager.setSearchQuery).toHaveBeenCalledWith(searchQuery)
        expect(filterManager.setShowUnknownLocationsOnly).toHaveBeenCalledWith(true)
    })

    it('should reset filters when resetAll is called', () => {
        const { result } = renderHook(() => useEventsManager())

        act(() => {
            result.current.filters.resetAll()
        })

        expect(result.current.fltrEvtMgr.resetAllFilters).toHaveBeenCalled()
    })

    it('should re-run filtering when currentViewport changes', () => {
        const viewport1: MapBounds = { north: 37.8, south: 37.7, east: -122.4, west: -122.5 }
        const viewport2: MapBounds = { north: 37.9, south: 37.6, east: -122.3, west: -122.6 }

        const { result, rerender } = renderHook(
            ({ currentViewport }) => useEventsManager({ eventSourceId: 'test-source', currentViewport }),
            { initialProps: { currentViewport: viewport1 } }
        )

        const filterManager = result.current.fltrEvtMgr
        expect(filterManager.getFilteredEvents).toHaveBeenCalledWith(viewport1)

        // Change viewport
        rerender({ currentViewport: viewport2 })
        expect(filterManager.getFilteredEvents).toHaveBeenCalledWith(viewport2)
    })
})
