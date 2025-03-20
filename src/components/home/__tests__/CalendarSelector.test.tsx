import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CalendarSelector from '../CalendarSelector'
import '@testing-library/jest-dom'
import { useRouter } from 'next/navigation'

// Mock the Next.js router
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
}))

describe('CalendarSelector', () => {
    const mockPush = jest.fn()

    beforeEach(() => {
        // Setup router mock
        ;(useRouter as jest.Mock).mockReturnValue({
            push: mockPush,
        })

        // Clear mocks between tests
        mockPush.mockClear()
    })

    it('renders the calendar selector form', () => {
        render(<CalendarSelector />)

        // Check for main elements
        expect(
            screen.getByText('Enter a Google Calendar ID')
        ).toBeInTheDocument()
        expect(screen.getByLabelText('Calendar ID')).toBeInTheDocument()
        expect(screen.getByText('View Calendar')).toBeInTheDocument()
        expect(screen.getByText('Or try an example:')).toBeInTheDocument()
    })

    it('shows error when submitting empty calendar ID', () => {
        render(<CalendarSelector />)

        // Submit form with empty input
        const submitButton = screen.getByText('View Calendar')
        fireEvent.click(submitButton)

        // Check for error message
        expect(
            screen.getByText('Please enter a Calendar ID')
        ).toBeInTheDocument()
        expect(mockPush).not.toHaveBeenCalled()
    })

    it('redirects when submitting valid calendar ID', async () => {
        render(<CalendarSelector />)

        // Fill in the calendar ID
        const input = screen.getByLabelText('Calendar ID')
        fireEvent.change(input, { target: { value: 'test@example.com' } })

        // Submit the form
        const submitButton = screen.getByText('View Calendar')
        fireEvent.click(submitButton)

        // Check that router.push was called with the correct URL
        expect(mockPush).toHaveBeenCalledWith('/?gc=test%40example.com')
    })

    it('selects an example calendar when clicked', () => {
        render(<CalendarSelector />)

        // Find and click the example calendar
        const exampleCalendarButton = screen.getByText('Geocaching in Spain')
        fireEvent.click(exampleCalendarButton)

        // Check that the input value was updated
        const input = screen.getByLabelText('Calendar ID') as HTMLInputElement
        expect(input.value).toBe('geocachingspain@gmail.com')
    })

    it('shows loading spinner when submitting', async () => {
        render(<CalendarSelector />)

        // Fill in the calendar ID
        const input = screen.getByLabelText('Calendar ID')
        fireEvent.change(input, { target: { value: 'test@example.com' } })

        // Submit the form
        const submitButton = screen.getByText('View Calendar')
        fireEvent.click(submitButton)

        // Check for loading spinner
        // Note: In a real test, we might need to use waitFor if the loading state
        // is not immediately reflected, but in this implementation it should be
        expect(screen.queryByRole('status')).toBeInTheDocument()
    })
})
