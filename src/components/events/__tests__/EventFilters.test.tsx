import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import EventFilters from '../EventFilters'
import { format, addMonths } from 'date-fns'

describe('EventFilters Component', () => {
    const mockOnSearchChange = jest.fn()
    const mockOnDateRangeChange = jest.fn()
    const mockOnResetFilters = jest.fn()

    const defaultProps = {
        searchQuery: '',
        onSearchChange: mockOnSearchChange,
        onDateRangeChange: mockOnDateRangeChange,
        onResetFilters: mockOnResetFilters,
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    test('renders search input with correct placeholder', () => {
        render(<EventFilters {...defaultProps} />)

        const searchInput = screen.getByPlaceholderText(
            'Search by name, location, or description'
        )
        expect(searchInput).toBeInTheDocument()
        expect(searchInput).toHaveValue('')
    })

    test('calls onSearchChange when search input changes', () => {
        render(<EventFilters {...defaultProps} />)

        const searchInput = screen.getByPlaceholderText(
            'Search by name, location, or description'
        )
        fireEvent.change(searchInput, { target: { value: 'test search' } })

        expect(mockOnSearchChange).toHaveBeenCalledWith('test search')
    })

    test('displays "Any time" when no date range is selected', () => {
        render(<EventFilters {...defaultProps} />)

        expect(screen.getByText('Any time')).toBeInTheDocument()
    })

    test('displays formatted date range when date range is provided', () => {
        const start = '2023-05-01T00:00:00'
        const end = '2023-05-31T23:59:59'

        render(<EventFilters {...defaultProps} dateRange={{ start, end }} />)

        const expectedDisplay = `${format(new Date(start), 'MMM d')} - ${format(
            new Date(end),
            'MMM d, yyyy'
        )}`
        expect(screen.getByText(expectedDisplay)).toBeInTheDocument()
    })

    test('opens date filter dropdown when date button is clicked', () => {
        render(<EventFilters {...defaultProps} />)

        const dateButton = screen.getByText('Any time')
        fireEvent.click(dateButton)

        expect(screen.getByText('Today')).toBeInTheDocument()
        expect(screen.getByText('Tomorrow')).toBeInTheDocument()
        expect(screen.getByText('This week')).toBeInTheDocument()
        expect(screen.getByText('This month')).toBeInTheDocument()
        expect(screen.getByText('Next month')).toBeInTheDocument()
        expect(screen.getByText('Next 3 months')).toBeInTheDocument()
        expect(screen.getByText('Clear filter')).toBeInTheDocument()
    })

    test('selects "Today" date range correctly', () => {
        // Mock date to ensure consistent test results
        const mockDate = new Date(2023, 4, 15) // May 15, 2023
        const originalDate = global.Date
        global.Date = jest.fn(() => mockDate) as unknown as typeof Date
        global.Date.UTC = originalDate.UTC
        global.Date.parse = originalDate.parse
        global.Date.now = originalDate.now

        render(<EventFilters {...defaultProps} />)

        // Open dropdown and select Today
        fireEvent.click(screen.getByText('Any time'))
        fireEvent.click(screen.getByText('Today'))

        // Check that onDateRangeChange was called with correct date range
        const expectedStart = new Date(mockDate)
        expectedStart.setHours(0, 0, 0, 0)
        const expectedEnd = new Date(mockDate)
        expectedEnd.setHours(23, 59, 59, 999)

        expect(mockOnDateRangeChange).toHaveBeenCalledWith({
            start: format(expectedStart, "yyyy-MM-dd'T'HH:mm:ss"),
            end: format(expectedEnd, "yyyy-MM-dd'T'HH:mm:ss"),
        })

        // Restore original Date implementation
        global.Date = originalDate
    })

    test('selects "This month" date range correctly', () => {
        // Mock date to ensure consistent test results
        const mockDate = new Date(2023, 4, 15) // May 15, 2023
        const originalDate = global.Date
        global.Date = jest.fn(() => mockDate) as unknown as typeof Date
        global.Date.UTC = originalDate.UTC
        global.Date.parse = originalDate.parse
        global.Date.now = originalDate.now

        render(<EventFilters {...defaultProps} />)

        // Open dropdown and select This month
        fireEvent.click(screen.getByText('Any time'))
        fireEvent.click(screen.getByText('This month'))

        // Check that onDateRangeChange was called with correct date range
        const expectedStart = new Date(2023, 4, 1) // May 1, 2023
        const expectedEnd = new Date(2023, 5, 0) // May 31, 2023
        expectedEnd.setHours(23, 59, 59, 999)

        expect(mockOnDateRangeChange).toHaveBeenCalledWith({
            start: format(expectedStart, "yyyy-MM-dd'T'HH:mm:ss"),
            end: format(expectedEnd, "yyyy-MM-dd'T'HH:mm:ss"),
        })

        // Restore original Date implementation
        global.Date = originalDate
    })

    test('selects "Next 3 months" date range correctly', () => {
        // Mock date to ensure consistent test results
        const mockDate = new Date(2023, 4, 15) // May 15, 2023
        const originalDate = global.Date
        global.Date = jest.fn(() => mockDate) as unknown as typeof Date
        global.Date.UTC = originalDate.UTC
        global.Date.parse = originalDate.parse
        global.Date.now = originalDate.now

        render(<EventFilters {...defaultProps} />)

        // Open dropdown and select Next 3 months
        fireEvent.click(screen.getByText('Any time'))
        fireEvent.click(screen.getByText('Next 3 months'))

        // Simply check that onDateRangeChange was called
        expect(mockOnDateRangeChange).toHaveBeenCalled()

        // Verify that the argument is an object with start and end properties
        const callArg = mockOnDateRangeChange.mock.calls[0][0]
        expect(callArg).toHaveProperty('start')
        expect(callArg).toHaveProperty('end')

        // Restore original Date implementation
        global.Date = originalDate
    })

    test('clears date filter when "Clear filter" is clicked', () => {
        render(
            <EventFilters
                {...defaultProps}
                dateRange={{
                    start: '2023-05-01T00:00:00',
                    end: '2023-05-31T23:59:59',
                }}
            />
        )

        // Open dropdown by clicking on the date range dropdown container
        const dateRangeDropdown = screen.getByTestId('date-range-dropdown')
        const dateButton = dateRangeDropdown.querySelector('button')
        fireEvent.click(dateButton!)

        // Now click the Clear filter button
        fireEvent.click(screen.getByText('Clear filter'))

        expect(mockOnDateRangeChange).toHaveBeenCalledWith(undefined)
    })

    test('calls onResetFilters when reset button is clicked', () => {
        render(<EventFilters {...defaultProps} />)

        const resetButton = screen.getByText('Reset all filters')
        fireEvent.click(resetButton)

        expect(mockOnResetFilters).toHaveBeenCalled()
    })

    test('adds data-testid attributes to key elements', () => {
        render(<EventFilters {...defaultProps} />)

        // Check if the search input has a data-testid attribute
        const searchInput = screen.getByTestId('event-search-input')
        expect(searchInput).toBeInTheDocument()

        // Check if the date range button has a data-testid attribute
        const dateDropdown = screen.getByTestId('date-range-dropdown')
        expect(dateDropdown).toBeInTheDocument()

        // Check if the reset button has a data-testid attribute
        const resetButton = screen.getByTestId('reset-filters-button')
        expect(resetButton).toBeInTheDocument()
    })
})
