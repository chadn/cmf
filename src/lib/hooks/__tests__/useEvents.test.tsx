import { renderHook, waitFor } from '@testing-library/react'
import { useEvents } from '../useEvents'
import { SWRConfig } from 'swr'
import React from 'react'
import '@testing-library/jest-dom'

// Mock fetch
global.fetch = jest.fn()

describe('useEvents Hook', () => {
    // Mock data for testing
    const mockCalendarData = {
        calendar_id: 'test-calendar-id',
        calendar_name: 'Test Calendar',
        total_count: 3,
        unknown_locations_count: 1,
        events: [
            {
                id: 'event1',
                name: 'Event One',
                description: 'First test event',
                location: 'New York',
                startDate: '2025-03-15T10:00:00Z',
                endDate: '2025-03-15T12:00:00Z',
                resolved_location: {
                    original_location: 'New York',
                    formatted_address: 'New York, NY, USA',
                    lat: 40.7128,
                    lng: -74.006,
                    status: 'resolved',
                },
            },
            {
                id: 'event2',
                name: 'Event Two',
                description: 'Second test event',
                location: 'Los Angeles',
                startDate: '2025-03-20T14:00:00Z',
                endDate: '2025-03-20T16:00:00Z',
                resolved_location: {
                    original_location: 'Los Angeles',
                    formatted_address: 'Los Angeles, CA, USA',
                    lat: 34.0522,
                    lng: -118.2437,
                    status: 'resolved',
                },
            },
            {
                id: 'event3',
                name: 'Event Three',
                description: 'Third test event with unknown location',
                location: 'Unknown Place',
                startDate: '2025-03-25T09:00:00Z',
                endDate: '2025-03-25T11:00:00Z',
                resolved_location: {
                    original_location: 'Unknown Place',
                    status: 'unresolved',
                },
            },
        ],
    }

    // Setup wrapper for SWR
    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SWRConfig
            value={{
                dedupingInterval: 0,
                provider: () => new Map(),
            }}
        >
            {children}
        </SWRConfig>
    )

    beforeEach(() => {
        // Reset mocks
        jest.resetAllMocks()

        // Mock successful fetch response
        ;(global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => mockCalendarData,
        })
    })

    it('returns loading state initially', async () => {
        const { result } = renderHook(
            () => useEvents({ calendarId: 'test-calendar-id' }),
            { wrapper }
        )

        expect(result.current.isLoading).toBe(true)
        expect(result.current.events).toEqual([])
    })

    it('fetches and returns calendar events', async () => {
        const { result } = renderHook(
            () => useEvents({ calendarId: 'test-calendar-id' }),
            { wrapper }
        )

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.events).toEqual(mockCalendarData.events)
        expect(result.current.totalCount).toBe(mockCalendarData.total_count)
        expect(result.current.calendarName).toBe(mockCalendarData.calendar_name)
    })

    it('filters events by date range', async () => {
        const { result } = renderHook(
            () =>
                useEvents({
                    calendarId: 'test-calendar-id',
                    dateRange: {
                        start: '2025-03-19T00:00:00Z',
                        end: '2025-03-26T23:59:59Z',
                    },
                }),
            { wrapper }
        )

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        // Should only include events 2 and 3 (within date range)
        expect(result.current.filteredEvents).toHaveLength(2)
        expect(result.current.filteredEvents[0].id).toBe('event2')
        expect(result.current.filteredEvents[1].id).toBe('event3')
    })

    it('filters events by search query', async () => {
        const { result } = renderHook(
            () =>
                useEvents({
                    calendarId: 'test-calendar-id',
                    searchQuery: 'unknown',
                }),
            { wrapper }
        )

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        // Should only include event 3 (contains "unknown" in description)
        expect(result.current.filteredEvents).toHaveLength(1)
        expect(result.current.filteredEvents[0].id).toBe('event3')
    })

    it('filters events by map bounds', async () => {
        const { result } = renderHook(
            () =>
                useEvents({
                    calendarId: 'test-calendar-id',
                    mapBounds: {
                        north: 42,
                        south: 38,
                        east: -72,
                        west: -76,
                    },
                }),
            { wrapper }
        )

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        // Should only include event 1 (New York is within bounds)
        expect(result.current.filteredEvents).toHaveLength(1)
        expect(result.current.filteredEvents[0].id).toBe('event1')
    })

    it('filters to show only events with unknown locations', async () => {
        const { result } = renderHook(
            () =>
                useEvents({
                    calendarId: 'test-calendar-id',
                    showUnknownLocationsOnly: true,
                }),
            { wrapper }
        )

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        // Should only include event 3 (has unresolved location)
        expect(result.current.filteredEvents).toHaveLength(1)
        expect(result.current.filteredEvents[0].id).toBe('event3')
    })

    it('handles API errors', async () => {
        // Mock error response
        ;(global.fetch as jest.Mock).mockRejectedValue(
            new Error('Failed to fetch')
        )

        const { result } = renderHook(
            () => useEvents({ calendarId: 'test-calendar-id' }),
            { wrapper }
        )

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.error).not.toBeNull()
        expect(result.current.events).toEqual([])
    })
})
