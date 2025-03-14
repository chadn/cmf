import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import MapPopup from '../MapPopup'
import { MapMarker } from '@/types/map'
import { CalendarEvent } from '@/types/events'

describe('MapPopup', () => {
    const mockEvent: CalendarEvent = {
        id: '1',
        name: 'Test Event',
        startDate: '2023-01-01T02:00:00Z',
        endDate: '2023-01-01T04:00:00Z',
        location: 'Test Location',
        description: 'Test Description',
        description_urls: [],
        original_event_url: 'https://example.com',
    }

    const mockMarker: MapMarker = {
        id: '1',
        latitude: 0,
        longitude: 0,
        events: [mockEvent],
    }

    const mockMarkerWithMultipleEvents: MapMarker = {
        id: '2',
        latitude: 0,
        longitude: 0,
        events: [
            mockEvent,
            {
                ...mockEvent,
                id: '2',
                name: 'Test Event 2',
            },
        ],
    }

    it('renders a popup with event details', () => {
        render(<MapPopup marker={mockMarker} />)

        expect(screen.getByText('Test Event')).toBeInTheDocument()
        expect(screen.getByText('Test Location')).toBeInTheDocument()
        expect(screen.getByText('Test Description')).toBeInTheDocument()
        expect(screen.getByText('View in Calendar')).toBeInTheDocument()
    })

    it('handles multiple events with pagination', () => {
        render(<MapPopup marker={mockMarkerWithMultipleEvents} />)

        // Should show pagination controls
        const nextButton = screen.getByText('Next')
        expect(nextButton).toBeInTheDocument()

        // Navigate to next event
        fireEvent.click(nextButton)
        expect(screen.getByText('Test Event 2')).toBeInTheDocument()

        // Navigate back to first event
        const prevButton = screen.getByText('Previous')
        fireEvent.click(prevButton)
        expect(screen.getByText('Test Event')).toBeInTheDocument()
    })

    it('does not show pagination for single event', () => {
        render(<MapPopup marker={mockMarker} />)

        // Should not show pagination controls
        expect(screen.queryByText('Next')).not.toBeInTheDocument()
        expect(screen.queryByText('Previous')).not.toBeInTheDocument()
    })

    it('displays event date and time correctly', () => {
        render(<MapPopup marker={mockMarker} />)

        // The actual formatted date will depend on the formatEventDate implementation
        // This is a simplified check for the format MM/dd EEE h:mm a
        expect(
            screen.getByText(/\d{2}\/\d{2} \w{3} \d{1,2}:\d{2} [AP]M/)
        ).toBeInTheDocument()
    })
})
