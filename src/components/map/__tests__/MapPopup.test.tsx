import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import MapPopup from '../MapPopup'
import { MapMarker } from '@/types/map'
import { CalendarEvent } from '@/types/events'

// Mock logr to avoid console outputs during tests
jest.mock('@/lib/utils/logr', () => ({
    logr: {
        log: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
    },
}))

describe('MapPopup', () => {
    const mockEvent: CalendarEvent = {
        id: '1',
        name: 'Test Event',
        start: '2023-01-01T02:00:00Z',
        end: '2023-01-01T04:00:00Z',
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
        expect(screen.getByText(/\d{2}\/\d{2} \w{3} \d{1,2}:\d{2} [AP]M/)).toBeInTheDocument()
    })

    it('truncates long descriptions', () => {
        const longDescriptionEvent = {
            ...mockEvent,
            description: 'A'.repeat(200), // Create a description longer than 150 chars
        }

        const markerWithLongDesc = {
            ...mockMarker,
            events: [longDescriptionEvent],
        }

        render(<MapPopup marker={markerWithLongDesc} />)

        // Description should be truncated and end with ...
        expect(screen.getByText(/A{1,150}\.{3}$/)).toBeInTheDocument()
    })

    it('shows full description if under 150 characters', () => {
        const shortDescriptionEvent = {
            ...mockEvent,
            description: 'A short description',
        }

        const markerWithShortDesc = {
            ...mockMarker,
            events: [shortDescriptionEvent],
        }

        render(<MapPopup marker={markerWithShortDesc} />)

        // Full description should be shown without truncation
        expect(screen.getByText('A short description')).toBeInTheDocument()
    })

    it('calls onEventSelect when navigating events', () => {
        const mockOnEventSelect = jest.fn()

        render(<MapPopup marker={mockMarkerWithMultipleEvents} onEventSelect={mockOnEventSelect} />)

        // Navigate to next event
        fireEvent.click(screen.getByText('Next'))

        // Should call onEventSelect with the next event's ID
        expect(mockOnEventSelect).toHaveBeenCalledWith('2')

        // Navigate back to first event
        fireEvent.click(screen.getByText('Previous'))

        // Should call onEventSelect with the first event's ID
        expect(mockOnEventSelect).toHaveBeenCalledWith('1')
    })

    it('handles selectedEventId to show the correct event', () => {
        render(<MapPopup marker={mockMarkerWithMultipleEvents} selectedEventId="2" />)

        // Should show the second event initially
        expect(screen.getByText('Test Event 2')).toBeInTheDocument()
    })

    it('shows first event if selectedEventId is not found', () => {
        render(<MapPopup marker={mockMarkerWithMultipleEvents} selectedEventId="non-existent-id" />)

        // Should default to the first event
        expect(screen.getByText('Test Event')).toBeInTheDocument()
    })

    it('handles no events gracefully', () => {
        const emptyMarker = {
            ...mockMarker,
            events: [],
        }

        render(<MapPopup marker={emptyMarker} />)

        // Should show a message
        expect(screen.getByText('No events at this location')).toBeInTheDocument()
    })

    it('handles invalid current index gracefully', () => {
        // Create a wrapper component to test useState behavior
        const EventPopupWithIndexManipulation = () => {
            const [forcedRender, setForcedRender] = React.useState(false)

            React.useEffect(() => {
                // Force a re-render after component mounts
                setTimeout(() => setForcedRender(true), 0)
            }, [])

            return <MapPopup marker={mockMarker} selectedEventId="invalid-id" />
        }

        render(<EventPopupWithIndexManipulation />)

        // Should eventually show event details
        expect(screen.getByText('Test Event')).toBeInTheDocument()
    })
})
