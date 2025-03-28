import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import EventList from '../EventList'
import '@testing-library/jest-dom'
import { CalendarEvent } from '@/types/events'

describe('EventList', () => {
    // Mock data for testing
    const mockEvents: CalendarEvent[] = [
        {
            id: 'event1',
            name: 'Test Event 1',
            description: 'Description for test event 1',
            description_urls: [],
            original_event_url: 'https://example.com/event1',
            location: 'New York, NY',
            startDate: '2025-03-15T10:00:00Z',
            endDate: '2025-03-15T12:00:00Z',
            resolved_location: {
                original_location: 'New York, NY',
                formatted_address: 'New York, NY, USA',
                lat: 40.7128,
                lng: -74.006,
                status: 'resolved',
            },
        },
        {
            id: 'event2',
            name: 'Test Event 2',
            description: 'Description for test event 2',
            description_urls: [],
            original_event_url: 'https://example.com/event2',
            location: 'Los Angeles, CA',
            startDate: '2025-03-20T14:00:00Z',
            endDate: '2025-03-20T16:00:00Z',
            resolved_location: {
                original_location: 'Los Angeles, CA',
                formatted_address: 'Los Angeles, CA, USA',
                lat: 34.0522,
                lng: -118.2437,
                status: 'resolved',
            },
        },
        {
            id: 'event3',
            name: 'Test Event 3',
            description: 'Description for test event 3',
            description_urls: [],
            original_event_url: 'https://example.com/event3',
            location: 'Unknown Location',
            startDate: '2025-03-25T09:00:00Z',
            endDate: '2025-03-25T11:00:00Z',
            resolved_location: {
                original_location: 'Unknown Location',
                status: 'unresolved',
            },
        },
    ]

    it('renders a list of events', () => {
        const mockOnEventSelect = jest.fn()

        render(
            <EventList
                events={mockEvents}
                isLoading={false}
                error={null}
                onEventSelect={mockOnEventSelect}
            />
        )

        // Check that the events count is displayed
        expect(screen.getByText('Events (3)')).toBeInTheDocument()

        // Check that all event names are displayed
        expect(screen.getByText('Test Event 1')).toBeInTheDocument()
        expect(screen.getByText('Test Event 2')).toBeInTheDocument()
        expect(screen.getByText('Test Event 3')).toBeInTheDocument()

        // Check that locations are displayed
        expect(screen.getByText('New York, NY')).toBeInTheDocument()
        expect(screen.getByText('Los Angeles, CA')).toBeInTheDocument()

        // Check that unresolved location message is displayed
        expect(screen.getByText('⚠ Unmapped')).toBeInTheDocument()
    })

    it('calls onEventSelect when an event is clicked', () => {
        const mockOnEventSelect = jest.fn()

        render(
            <EventList
                events={mockEvents}
                isLoading={false}
                error={null}
                onEventSelect={mockOnEventSelect}
            />
        )

        // Click on the first event
        fireEvent.click(screen.getByText('Test Event 1'))

        // Check that onEventSelect was called with the correct event ID
        expect(mockOnEventSelect).toHaveBeenCalledWith('event1')
    })

    it('displays loading state', () => {
        const mockOnEventSelect = jest.fn()

        render(
            <EventList
                events={[]}
                isLoading={true}
                error={null}
                onEventSelect={mockOnEventSelect}
            />
        )

        expect(screen.getByText('Loading events...')).toBeInTheDocument()
    })

    it('displays error state', () => {
        const mockOnEventSelect = jest.fn()
        const mockError = new Error('Test error message')

        render(
            <EventList
                events={[]}
                isLoading={false}
                error={mockError}
                onEventSelect={mockOnEventSelect}
            />
        )

        expect(
            screen.getByText('Error loading events: Test error message')
        ).toBeInTheDocument()
    })

    it('displays empty state when no events are found', () => {
        const mockOnEventSelect = jest.fn()

        render(
            <EventList
                events={[]}
                isLoading={false}
                error={null}
                onEventSelect={mockOnEventSelect}
            />
        )

        expect(
            screen.getByText('No events found. Try adjusting your filters, moving the map, or clicking x on any filter above to remove.')
        ).toBeInTheDocument()
    })
})
