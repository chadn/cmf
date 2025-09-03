import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import EventSourceSelector from '../EventSourceSelector'
import '@testing-library/jest-dom'
import { useRouter } from 'next/navigation'
import { logr } from '@/lib/utils/logr'

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

describe('EventSourceSelector', () => {
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
        render(<EventSourceSelector />)

        // Check for main elements
        expect(screen.getByText('Welcome to CMF - Calendar Map Filter')).toBeInTheDocument()
        expect(screen.getByText('Enter Event Source ID string')).toBeInTheDocument()
        expect(screen.getByLabelText('Enter Event Source ID string')).toBeInTheDocument()
        expect(screen.getByText('View Events')).toBeInTheDocument()

        // Check for the correct text
        expect(screen.getByText(/Or try an example - click below then click View Events/i)).toBeInTheDocument()

        // Check for the border-t and border-black classes
        const mainContainer = screen
            .getByRole('heading', { name: 'Welcome to CMF - Calendar Map Filter' })
            .closest('div')
        expect(mainContainer).toHaveClass('border-t')
        expect(mainContainer).toHaveClass('border-black')
        expect(mainContainer).toHaveClass('px-8')
    })

    it('shows error when submitting invalid event source ID format', () => {
        render(<EventSourceSelector />)

        // Fill in the event source with invalid format (no colon)
        const input = screen.getByLabelText('Enter Event Source ID string')
        fireEvent.change(input, { target: { value: 'invalid-format' } })

        // Submit form with invalid input
        const submitButton = screen.getByText('View Events')
        fireEvent.click(submitButton)

        // Check for error message about invalid format
        expect(screen.getByText(/Invalid event source format. Must include a colon/)).toBeInTheDocument()
        expect(mockPush).not.toHaveBeenCalled()
    })

    it('clears error when entering a valid event source ID after error', () => {
        render(<EventSourceSelector />)

        // Fill in invalid format to trigger error
        const input = screen.getByLabelText('Enter Event Source ID string')
        fireEvent.change(input, { target: { value: 'invalid-format' } })

        // Submit form with invalid input
        const submitButton = screen.getByText('View Events')
        fireEvent.click(submitButton)

        // Verify error is shown
        expect(screen.getByText(/Invalid event source format/)).toBeInTheDocument()

        // Now enter a valid ID
        fireEvent.change(input, { target: { value: 'gc:test@example.com' } })

        // Submit again
        fireEvent.click(submitButton)

        // Error should be gone (component is in loading state)
        expect(screen.queryByText(/Invalid event source format/)).not.toBeInTheDocument()
    })

    it('redirects when submitting valid event source ID', async () => {
        render(<EventSourceSelector />)

        // Fill in the event source ID
        const input = screen.getByLabelText('Enter Event Source ID string')
        fireEvent.change(input, { target: { value: 'gc:test@example.com' } })

        // Submit the form
        const submitButton = screen.getByText('View Events')
        fireEvent.click(submitButton)

        // Check that router.push was called with the correct URL
        expect(mockPush).toHaveBeenCalledWith('/?es=gc%3Atest%40example.com')
    })

    it('selects an example event source when clicked', () => {
        render(<EventSourceSelector />)

        // Find and click the example event source
        const exampleButton = screen.getByText('Geocaching in Spain (Google Calendar)')
        fireEvent.click(exampleButton)

        // Check that the input value was updated
        const input = screen.getByLabelText('Enter Event Source ID string') as HTMLInputElement
        expect(input.value).toBe('gc:geocachingspain@gmail.com')

        // Check logging was called
        expect(logr.info).toHaveBeenCalledWith('calendar', 'Example event source selected', {
            id: 'gc:geocachingspain@gmail.com',
            name: 'Geocaching in Spain (Google Calendar)',
        })
    })

    it('shows loading spinner when submitting and disables inputs', async () => {
        render(<EventSourceSelector />)

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

        // Check that example buttons are disabled
        const exampleButtons = screen
            .getAllByRole('button')
            .filter(
                (button) =>
                    button.textContent?.includes('Geocaching in Spain') ||
                    button.textContent?.includes('SF Bay Facebook Events')
            )

        exampleButtons.forEach((button) => {
            expect(button).toBeDisabled()
        })
    })

    it('renders all example event sources correctly with white text', () => {
        render(<EventSourceSelector />)

        // Check that both examples are rendered
        expect(screen.getByText('SF Bay Facebook Events (Google Calendar)')).toBeInTheDocument()
        expect(screen.getByText('Geocaching in Spain (Google Calendar)')).toBeInTheDocument()

        // Check for the correct event source IDs
        expect(screen.getByText('gc:geocachingspain@gmail.com')).toBeInTheDocument()
        expect(screen.getByText(/aabe6c219ee2af5b791ea6719e04a92990f9ccd1e68a3ff0d89bacd153a0b36d/)).toBeInTheDocument()

        // Check that text is white
        const exampleButtons = screen
            .getAllByRole('button')
            .filter(
                (button) =>
                    button.textContent?.includes('Geocaching in Spain') ||
                    button.textContent?.includes('SF Bay Facebook Events')
            )

        exampleButtons.forEach((button) => {
            const nameDiv = button.querySelector('div:first-child')
            const idDiv = button.querySelector('div:last-child')

            expect(nameDiv).toHaveClass('text-white')
            expect(idDiv).toHaveClass('text-white')
        })
    })

    it('renders a link to usage documentation', () => {
        render(<EventSourceSelector />)

        // Check for the "Read Usage Docs" link
        const link = screen.getByText('Read Usage Docs')
        expect(link).toBeInTheDocument()
        expect(link.closest('a')).toHaveAttribute(
            'href',
            'https://github.com/chadn/cmf/blob/main/docs/usage.md#how-to-use-cmf'
        )
        expect(link.closest('a')).toHaveAttribute('target', '_blank')

        // Check for the help text
        expect(screen.getByText(/to find your Calendar ID/i)).toBeInTheDocument()
        expect(screen.getByText(/and more on using this app/i)).toBeInTheDocument()
    })
})
