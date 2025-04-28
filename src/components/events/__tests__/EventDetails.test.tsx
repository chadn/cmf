import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import EventDetails from '../EventDetails'
import '@testing-library/jest-dom'
import { CmfEvent } from '@/types/events'

describe('EventDetails', () => {
    // Mock event data for testing
    const mockEvent: CmfEvent = {
        id: 'event1',
        name: 'Test Event',
        description: 'This is a test event description.\nIt has multiple lines.',
        description_urls: [
            'https://example.com',
            'https://test.com/very-long-url-that-should-be-truncated-in-the-ui-display',
        ],
        original_event_url: 'https://calendar.google.com/event?id=123456',
        location: 'New York, NY',
        start: '2025-03-15T10:00:00Z',
        end: '2025-03-15T12:00:00Z',
        resolved_location: {
            original_location: 'New York, NY',
            formatted_address: 'New York, NY, USA',
            lat: 40.7128,
            lng: -74.006,
            status: 'resolved',
        },
    }

    const mockEventWithUnresolvedLocation: CmfEvent = {
        ...mockEvent,
        id: 'event2',
        resolved_location: {
            original_location: 'Unknown Location',
            status: 'unresolved',
        },
    }

    const mockEventWithoutDescription: CmfEvent = {
        ...mockEvent,
        id: 'event3',
        description: '',
        description_urls: [],
    }

    it('renders event details correctly', () => {
        const mockOnClose = jest.fn()

        render(<EventDetails event={mockEvent} onClose={mockOnClose} />)

        // Check that the event name is displayed
        expect(screen.getByText('Test Event')).toBeInTheDocument()

        // Check that the date and time are displayed
        expect(screen.getByText(/Date & Time/)).toBeInTheDocument()

        // Check that the location is displayed
        expect(screen.getByText(/Location/)).toBeInTheDocument()
        expect(screen.getByText('New York, NY')).toBeInTheDocument()

        // Check that the description is displayed
        expect(screen.getByText(/Description/)).toBeInTheDocument()
        expect(screen.getByText('This is a test event description.')).toBeInTheDocument()
        expect(screen.getByText('It has multiple lines.')).toBeInTheDocument()

        // Check that the links are displayed
        expect(screen.getByText(/Links/)).toBeInTheDocument()
        expect(screen.getByText('https://example.com')).toBeInTheDocument()

        // Check that the original event link is displayed
        expect(screen.getByText('View in Google Calendar')).toBeInTheDocument()
    })

    it('calls onClose when close button is clicked', () => {
        const mockOnClose = jest.fn()

        render(<EventDetails event={mockEvent} onClose={mockOnClose} />)

        // Find and click the close button
        const closeButton = screen.getByLabelText('Close')
        fireEvent.click(closeButton)

        // Check that onClose was called
        expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('displays unresolved location message', () => {
        const mockOnClose = jest.fn()

        render(<EventDetails event={mockEventWithUnresolvedLocation} onClose={mockOnClose} />)

        // Check that the unresolved location message is displayed
        expect(screen.getByText('This location could not be mapped')).toBeInTheDocument()
    })

    it('handles event without description', () => {
        const mockOnClose = jest.fn()

        render(<EventDetails event={mockEventWithoutDescription} onClose={mockOnClose} />)

        // Check that the description section is not displayed
        expect(screen.queryByText(/Description/)).not.toBeInTheDocument()

        // Check that the links section is not displayed
        expect(screen.queryByText(/Links/)).not.toBeInTheDocument()
    })
})
