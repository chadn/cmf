import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CalendarSelector from '../CalendarSelector'
import '@testing-library/jest-dom'
import { useRouter } from 'next/navigation'
import { logr } from '@/lib/utils/logr'

// Add type declaration for the global umami object
declare global {
    var umami:
        | {
              track: jest.Mock
          }
        | undefined
}

// Mock the Next.js router
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}))

// Mock the logr utility
jest.mock('@/lib/utils/logr', () => ({
    logr: {
        info: jest.fn(),
    },
}))

// Mock Umami global object
global.umami = {
    track: jest.fn(),
}

describe('CalendarSelector', () => {
    const mockPush = jest.fn()
    const mockUmamiTrack = jest.fn()

    beforeEach(() => {
        // Setup router mock
        ;(useRouter as jest.Mock).mockReturnValue({
            push: mockPush,
        })

        // Setup umami mock
        if (global.umami) {
            global.umami.track = mockUmamiTrack
        }

        // Clear mocks between tests
        mockPush.mockClear()
        mockUmamiTrack.mockClear()
        jest.clearAllMocks()
    })

    it('renders the calendar selector form with correct styling', () => {
        const { container } = render(<CalendarSelector />)

        // Check for main elements
        expect(screen.getByText('Welcome to Calendar Map Filter')).toBeInTheDocument()
        expect(screen.getByText('Enter a Google Calendar ID')).toBeInTheDocument()
        expect(screen.getByLabelText('Calendar ID')).toBeInTheDocument()
        expect(screen.getByText('View Calendar')).toBeInTheDocument()

        // Fixed test - check for the correct text
        expect(screen.getByText(/Or try an example - click below then click View Calendar/i)).toBeInTheDocument()

        // Check for the border-t and border-black classes
        const mainContainer = container.firstChild as HTMLElement
        expect(mainContainer).toHaveClass('border-t')
        expect(mainContainer).toHaveClass('border-black')
        expect(mainContainer).toHaveClass('px-8')
    })

    it('shows error when submitting empty calendar ID', () => {
        render(<CalendarSelector />)

        // Submit form with empty input
        const submitButton = screen.getByText('View Calendar')
        fireEvent.click(submitButton)

        // Check for error message
        expect(screen.getByText('Please enter a Calendar ID')).toBeInTheDocument()
        expect(mockPush).not.toHaveBeenCalled()
        expect(logr.info).toHaveBeenCalledWith('calendar', 'Calendar submission error: empty ID')
    })

    it('clears error when entering a valid calendar ID after error', () => {
        render(<CalendarSelector />)

        // Submit form with empty input to trigger error
        const submitButton = screen.getByText('View Calendar')
        fireEvent.click(submitButton)

        // Verify error is shown
        expect(screen.getByText('Please enter a Calendar ID')).toBeInTheDocument()

        // Now enter a valid ID
        const input = screen.getByLabelText('Calendar ID')
        fireEvent.change(input, { target: { value: 'test@example.com' } })

        // Submit again
        fireEvent.click(submitButton)

        // Error should be gone
        expect(screen.queryByText('Please enter a Calendar ID')).not.toBeInTheDocument()
    })

    it('redirects when submitting valid calendar ID and tracks with umami', async () => {
        render(<CalendarSelector />)

        // Fill in the calendar ID
        const input = screen.getByLabelText('Calendar ID')
        fireEvent.change(input, { target: { value: 'test@example.com' } })

        // Submit the form
        const submitButton = screen.getByText('View Calendar')
        fireEvent.click(submitButton)

        // Check that router.push was called with the correct URL
        expect(mockPush).toHaveBeenCalledWith('/?gc=test%40example.com')

        // Check umami tracking was called
        expect(mockUmamiTrack).toHaveBeenCalledWith('ViewCalendar', { gc: 'test@example.com' })

        // Check logging was called
        expect(logr.info).toHaveBeenCalledWith('calendar', 'Calendar ID submitted', { calendarId: 'test@example.com' })
    })

    it('selects an example calendar when clicked', () => {
        render(<CalendarSelector />)

        // Find and click the example calendar
        const exampleCalendarButton = screen.getByText('Geocaching in Spain')
        fireEvent.click(exampleCalendarButton)

        // Check that the input value was updated
        const input = screen.getByLabelText('Calendar ID') as HTMLInputElement
        expect(input.value).toBe('geocachingspain@gmail.com')

        // Check logging was called
        expect(logr.info).toHaveBeenCalledWith('calendar', 'Example calendar selected', {
            id: 'geocachingspain@gmail.com',
            name: 'Geocaching in Spain',
        })
    })

    it('shows loading spinner when submitting and disables inputs', async () => {
        render(<CalendarSelector />)

        // Fill in the calendar ID
        const input = screen.getByLabelText('Calendar ID')
        fireEvent.change(input, { target: { value: 'test@example.com' } })

        // Submit the form
        const submitButton = screen.getByText('View Calendar')
        fireEvent.click(submitButton)

        // Check for loading spinner
        expect(screen.queryByRole('status')).toBeInTheDocument()

        // Check that inputs are disabled
        expect(input).toBeDisabled()
        expect(submitButton).toBeDisabled()

        // Check that example buttons are disabled
        const exampleButtons = screen
            .getAllByRole('button')
            .filter(
                (button) =>
                    button.textContent?.includes('Geocaching in Spain') ||
                    button.textContent?.includes('SF Bay Area Facebook Events')
            )

        exampleButtons.forEach((button) => {
            expect(button).toBeDisabled()
        })
    })

    it('renders all example calendars correctly with white text', () => {
        const { container } = render(<CalendarSelector />)

        // Check that both examples are rendered
        expect(screen.getByText('SF Bay Area Facebook Events')).toBeInTheDocument()
        expect(screen.getByText('Geocaching in Spain')).toBeInTheDocument()

        // Check for the correct calendar IDs
        expect(screen.getByText('geocachingspain@gmail.com')).toBeInTheDocument()
        expect(screen.getByText(/aabe6c219ee2af5b791ea6719e04a92990f9ccd1e68a3ff0d89bacd153a0b36d/)).toBeInTheDocument()

        // Check that text is white
        const exampleButtons = screen
            .getAllByRole('button')
            .filter(
                (button) =>
                    button.textContent?.includes('Geocaching in Spain') ||
                    button.textContent?.includes('SF Bay Area Facebook Events')
            )

        exampleButtons.forEach((button) => {
            const nameDiv = button.querySelector('div:first-child')
            const idDiv = button.querySelector('div:last-child')

            expect(nameDiv).toHaveClass('text-white')
            expect(idDiv).toHaveClass('text-white')
        })
    })

    it('renders the help section with instructions for finding calendar ID', () => {
        render(<CalendarSelector />)

        // Check for help section header
        expect(screen.getByText('How to find your Calendar ID:')).toBeInTheDocument()

        // Check for all list items
        expect(screen.getByText('Go to Google Calendar')).toBeInTheDocument()
        expect(screen.getByText('Click on the three dots next to your calendar name')).toBeInTheDocument()
        expect(screen.getByText('Select "Settings and sharing"')).toBeInTheDocument()
        expect(screen.getByText('Scroll down to "Integrate calendar"')).toBeInTheDocument()
        expect(screen.getByText('Copy the Calendar ID')).toBeInTheDocument()
    })
})
