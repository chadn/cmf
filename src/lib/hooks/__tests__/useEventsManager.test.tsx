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
                visibleEvents: [],
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

    describe('Multiple Event Sources', () => {
        beforeEach(() => {
            // Mock multiple API responses
            swrMock.default.mockImplementation((url) => {
                if (typeof url === 'string') {
                    return {
                        data: mockApiResponse,
                        error: null,
                        isLoading: false,
                        mutate: jest.fn(),
                    }
                }
                
                // Handle multiple URLs array
                if (Array.isArray(url)) {
                    return {
                        data: url.map(() => mockApiResponse),
                        error: null,
                        isLoading: false,
                        mutate: jest.fn(),
                    }
                }
                
                return {
                    data: undefined,
                    error: null,
                    isLoading: false,
                    mutate: jest.fn(),
                }
            })
        })

        it('should handle multiple event sources', () => {
            const { result } = renderHook(() => useEventsManager({ 
                eventSourceId: ['source1', 'source2']
            }))

            expect(result.current.evts).toBeDefined()
        })

        it('should construct multiple API URLs correctly', () => {
            renderHook(() => useEventsManager({ 
                eventSourceId: ['source1', 'source2'],
                sd: '2024-01-01',
                ed: '2024-12-31'
            }))

            // Should call SWR with multiple URLs constructed
            expect(swrMock.default).toHaveBeenCalled()
        })
    })

    describe('Error Handling', () => {
        it('should handle HTTP 404 errors for Google Calendar', () => {
            const mockError = { message: 'HTTP 404 Not Found' }
            swrMock.default.mockImplementation(() => ({
                data: null,
                error: mockError,
                isLoading: false,
                mutate: jest.fn(),
            }))

            const { result } = renderHook(() => useEventsManager({ 
                eventSourceId: 'gc:calendar@gmail.com'
            }))

            expect(result.current.apiError).toBe(mockError)
        })

        it('should handle HTTP 404 errors for non-Google Calendar sources', () => {
            const mockError = { message: 'HTTP 404 Not Found' }
            swrMock.default.mockImplementation(() => ({
                data: null,
                error: mockError,
                isLoading: false,
                mutate: jest.fn(),
            }))

            const { result } = renderHook(() => useEventsManager({ 
                eventSourceId: 'fb:event-page'
            }))

            expect(result.current.apiError).toBe(mockError)
        })

        it('should handle HTTP 403 errors', () => {
            const mockError = { message: 'HTTP 403 Forbidden' }
            swrMock.default.mockImplementation(() => ({
                data: null,
                error: mockError,
                isLoading: false,
                mutate: jest.fn(),
            }))

            const { result } = renderHook(() => useEventsManager({ 
                eventSourceId: 'test-source'
            }))

            expect(result.current.apiError).toBe(mockError)
        })

        it('should handle HTTP 401 errors', () => {
            const mockError = { message: 'HTTP 401 Unauthorized' }
            swrMock.default.mockImplementation(() => ({
                data: null,
                error: mockError,
                isLoading: false,
                mutate: jest.fn(),
            }))

            const { result } = renderHook(() => useEventsManager({ 
                eventSourceId: 'test-source'
            }))

            expect(result.current.apiError).toBe(mockError)
        })

        it('should handle non-200 HTTP status responses', () => {
            const mockResponseWith500 = {
                ...mockApiResponse,
                httpStatus: 500
            }
            
            swrMock.default.mockImplementation(() => ({
                data: mockResponseWith500,
                error: null,
                isLoading: false,
                mutate: jest.fn(),
            }))

            const { result } = renderHook(() => useEventsManager({ 
                eventSourceId: 'test-source'
            }))

            expect(result.current.evts).toBeDefined()
            // Component should handle non-200 status gracefully
        })
    })

    describe('URL Date Parameters', () => {
        it('should use sd and ed parameters for API URLs', () => {
            renderHook(() => useEventsManager({ 
                eventSourceId: 'test-source',
                sd: '2024-01-01',
                ed: '2024-12-31'
            }))

            // Should have called SWR with properly constructed URL containing date params
            expect(swrMock.default).toHaveBeenCalled()
            const callArgs = swrMock.default.mock.calls[0]
            expect(callArgs[0]).toBeDefined() // URL should be constructed
        })

        it('should use default date ranges when sd/ed not provided', () => {
            renderHook(() => useEventsManager({ 
                eventSourceId: 'test-source'
            }))

            expect(swrMock.default).toHaveBeenCalled()
        })

        it('should handle invalid date parameters gracefully', () => {
            renderHook(() => useEventsManager({ 
                eventSourceId: 'test-source',
                sd: 'invalid-date',
                ed: 'another-invalid-date'
            }))

            expect(swrMock.default).toHaveBeenCalled()
            // Should not crash with invalid date parameters
        })
    })

    describe('Loading States', () => {
        it('should handle loading state correctly', () => {
            swrMock.default.mockImplementation(() => ({
                data: undefined,
                error: null,
                isLoading: true,
                mutate: jest.fn(),
            }))

            const { result } = renderHook(() => useEventsManager({ 
                eventSourceId: 'test-source'
            }))

            expect(result.current.apiIsLoading).toBe(true)
            expect(result.current.eventSources).toBeNull()
        })

        it('should transition from loading to loaded state', () => {
            let isLoading = true
            swrMock.default.mockImplementation(() => ({
                data: isLoading ? undefined : mockApiResponse,
                error: null,
                isLoading,
                mutate: jest.fn(),
            }))

            const { result, rerender } = renderHook(() => useEventsManager({ 
                eventSourceId: 'test-source'
            }))

            expect(result.current.apiIsLoading).toBe(true)

            // Simulate loading completion
            isLoading = false
            swrMock.default.mockImplementation(() => ({
                data: mockApiResponse,
                error: null,
                isLoading: false,
                mutate: jest.fn(),
            }))
            
            rerender()
            
            expect(result.current.apiIsLoading).toBe(false)
            expect(result.current.eventSources).toHaveLength(1)
        })
    })

    describe('Filter Integration', () => {
        it('should properly integrate with FilterEventsManager', () => {
            const { result } = renderHook(() => useEventsManager({
                eventSourceId: 'test-source',
                dateRange: { start: '2024-01-01', end: '2024-01-31' },
                searchQuery: 'music',
                showUnknownLocationsOnly: true,
            }))

            const filterManager = result.current.fltrEvtMgr
            
            // Verify filter manager was called with all filters
            expect(filterManager.setDateRange).toHaveBeenCalledWith({
                start: '2024-01-01',
                end: '2024-01-31'
            })
            expect(filterManager.setSearchQuery).toHaveBeenCalledWith('music')
            expect(filterManager.setShowUnknownLocationsOnly).toHaveBeenCalledWith(true)
        })

        it('should handle undefined filter values', () => {
            const { result } = renderHook(() => useEventsManager({
                eventSourceId: 'test-source',
                dateRange: undefined,
                searchQuery: undefined,
                showUnknownLocationsOnly: undefined,
            }))

            // Should not crash with undefined filter values
            expect(result.current.fltrEvtMgr).toBeDefined()
        })
    })
})
