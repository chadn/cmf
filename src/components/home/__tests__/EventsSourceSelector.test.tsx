import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import EventsSourceSelector from '../EventsSourceSelector'
import '@testing-library/jest-dom'
import { useRouter } from 'next/navigation'

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

// Define umami type
interface UmamiTracker {
    track: (event: string, data?: Record<string, unknown>) => void
    identify: (id: string) => void
}

// Mock umami globally
declare global {
    interface Window {
        umami?: UmamiTracker
    }
}

// Set up mock umami
window.umami = {
    track: jest.fn(),
    identify: jest.fn(),
}

// Suppress React DOM nesting validation warnings
const originalConsoleError = console.error
console.error = (...args) => {
    if (args[0]?.includes?.('validateDOMNesting') || args[0]?.includes?.('<p> cannot appear as a descendant of <p>')) {
        return
    }
    originalConsoleError(...args)
}

describe('EventsSourceSelector', () => {
    const mockPush = jest.fn()
    const mockUmamiTrack = jest.fn()

    beforeEach(() => {
        // Setup router mock
        ;(useRouter as jest.Mock).mockReturnValue({
            push: mockPush,
        })

        // Setup umami mock
        if (window.umami) {
            window.umami.track = mockUmamiTrack
        }

        // Clear mocks between tests
        mockPush.mockClear()
        mockUmamiTrack.mockClear()
        jest.clearAllMocks()
    })

    // Restore console.error after tests
    afterAll(() => {
        console.error = originalConsoleError
    })

    it('renders the event source selector form with correct styling', () => {
        render(<EventsSourceSelector />)

        // Check for main elements
        expect(screen.getByText('Welcome to CMF - Calendar Map Filter')).toBeInTheDocument()
        expect(screen.getByText('Enter Event Source ID string')).toBeInTheDocument()
        expect(screen.getByLabelText('Enter Event Source ID string')).toBeInTheDocument()
        expect(screen.getByText('View Events')).toBeInTheDocument()

        // Check for the correct text
        expect(screen.getByText('Examples:')).toBeInTheDocument()

        // Check for the border-t and border-black classes
        const mainContainer = screen
            .getByRole('heading', { name: 'Welcome to CMF - Calendar Map Filter' })
            .closest('div')
        expect(mainContainer).toHaveClass('border-t')
        expect(mainContainer).toHaveClass('border-black')
        expect(mainContainer).toHaveClass('px-8')
    })

    it('redirects when submitting valid event source ID', async () => {
        render(<EventsSourceSelector />)

        // Fill in the event source ID
        const input = screen.getByLabelText('Enter Event Source ID string')
        fireEvent.change(input, { target: { value: 'gc:test@example.com' } })

        // Submit the form
        const submitButton = screen.getByText('View Events')
        fireEvent.click(submitButton)

        // Check that router.push was called with the correct URL
        expect(mockPush).toHaveBeenCalledWith('/?es=gc%3Atest%40example.com')
    })

    it('renders example event source links correctly', () => {
        render(<EventsSourceSelector />)

        // Find the example event source link
        const exampleLink = screen.getByText('Geocaching in Spain')
        expect(exampleLink).toBeInTheDocument()

        // Check that it's a link with the correct href
        expect(exampleLink.closest('a')).toHaveAttribute('href', '/?es=gc:geocachingspain@gmail.com')

        // Check that the input field is not affected by the link
        const input = screen.getByLabelText('Enter Event Source ID string') as HTMLInputElement
        expect(input.value).toBe('')
    })

    it('shows loading spinner when submitting and disables inputs', async () => {
        render(<EventsSourceSelector />)

        // Fill in the event source ID
        const input = screen.getByLabelText('Enter Event Source ID string')
        fireEvent.change(input, { target: { value: 'gc:test@example.com' } })

        // Submit the form
        const submitButton = screen.getByText('View Events')
        fireEvent.click(submitButton)

        // Check for loading spinner
        expect(screen.queryByRole('status')).toBeInTheDocument()

        // Check that inputs are disabled
        expect(input).toBeDisabled()
        expect(submitButton).toBeDisabled()

        // Example links should still be clickable (they're not buttons that get disabled)
        const exampleLink = screen.getByText('Geocaching in Spain').closest('a')
        expect(exampleLink).not.toBeNull()
    })

    it('renders all example event sources correctly as links', () => {
        render(<EventsSourceSelector />)

        // Check that key examples are rendered
        expect(screen.getByText('SF Bay Facebook Events')).toBeInTheDocument()
        expect(screen.getByText('Geocaching in Spain')).toBeInTheDocument()
        expect(screen.getByText('SF Bay Music + FB Events')).toBeInTheDocument()

        // Check that they have correct href attributes
        const geocachingLink = screen.getByText('Geocaching in Spain').closest('a')
        expect(geocachingLink).toHaveAttribute('href', '/?es=gc:geocachingspain@gmail.com')

        const sfBayLink = screen.getByText('SF Bay Music + FB Events').closest('a')
        expect(sfBayLink).toHaveAttribute('href', '/?es=sf')

        // Check that the links have the correct styling
        expect(geocachingLink).toHaveClass('hover:underline', 'text-blue-600')
    })

    it('renders a link to usage documentation', () => {
        render(<EventsSourceSelector />)

        // Check for the "Read Usage Docs" link
        const link = screen.getByText('Read Usage Docs')
        expect(link).toBeInTheDocument()
        expect(link.closest('a')).toHaveAttribute(
            'href',
            'https://github.com/chadn/cmf/blob/main/docs/usage.md#initial-view---pick-event-source'
        )
        expect(link.closest('a')).toHaveAttribute('target', '_blank')

        // Check for the help text
        expect(screen.getByText(/to find your Event Source ID and more on using this app/i)).toBeInTheDocument()
    })
})
