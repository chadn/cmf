import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import DateAndSearchFilters from '../DateAndSearchFilters'

describe('DateAndSearchFilters Component', () => {
    const mockOnSearchChange = jest.fn()
    const mockOnDateRangeChange = jest.fn()
    const mockOnDateQuickFilterChange = jest.fn()

    const defaultProps = {
        searchQuery: '',
        onSearchChange: mockOnSearchChange,
        dateSliderRange: undefined,
        onDateRangeChange: mockOnDateRangeChange,
        dateQuickFilterUrl: '',
        onDateQuickFilterChange: mockOnDateQuickFilterChange,
        appState: 'main-state',
        sd: undefined,
        ed: undefined,
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    test('renders search input correctly', () => {
        render(<DateAndSearchFilters {...defaultProps} />)

        const searchInput = screen.getByPlaceholderText('Search name, location, or description')
        expect(searchInput).toBeInTheDocument()
    })

    test('calls onSearchChange when search input changes', () => {
        render(<DateAndSearchFilters {...defaultProps} />)

        const searchInput = screen.getByPlaceholderText('Search name, location, or description')
        fireEvent.change(searchInput, { target: { value: 'test search' } })

        expect(mockOnSearchChange).toHaveBeenCalledWith('test search')
    })

    test('renders date range button with proper format', () => {
        render(<DateAndSearchFilters {...defaultProps} />)

        // Get the button by its test ID
        const dateButton = screen.getByTestId('date-range-dropdown')
        expect(dateButton).toBeInTheDocument()

        // Check that the button contains a date range (e.g., 'May 9 Fri - Sep 9 Tue')
        expect(dateButton.textContent).toMatch(/\w+ \d+ \w+ - \w+ \d+ \w+/)
    })

    test('shows date sliders when button is clicked', () => {
        render(<DateAndSearchFilters {...defaultProps} />)

        // Get the button by its test ID instead of text
        const dateButton = screen.getByTestId('date-range-dropdown')
        fireEvent.click(dateButton)

        // In the new UI, we should now see two sliders
        expect(screen.getAllByRole('slider').length).toBe(2)
    })

    test('call onDateRangeChange when sliders change', () => {
        render(<DateAndSearchFilters {...defaultProps} />)

        // First show the sliders using the test ID
        const dateButton = screen.getByTestId('date-range-dropdown')
        fireEvent.click(dateButton)

        // Find the slider thumbs (role="slider")
        const sliders = screen.getAllByRole('slider')
        expect(sliders.length).toBe(2)

        // Simulate keyboard event to change value (ArrowRight)
        fireEvent.keyDown(sliders[0], { key: 'ArrowRight', code: 'ArrowRight' })

        // Check that onDateRangeChange was called
        expect(mockOnDateRangeChange).toHaveBeenCalled()
    })

    test('adds data-testid attributes to key elements', () => {
        render(<DateAndSearchFilters {...defaultProps} />)

        // Check if the search input has a data-testid attribute
        const searchInput = screen.getByTestId('search-input')
        expect(searchInput).toBeInTheDocument()

        // Check if the date range button has a data-testid attribute
        const dateDropdown = screen.getByTestId('date-range-dropdown')
        expect(dateDropdown).toBeInTheDocument()
    })

    test('displays quick selection buttons when expanded', () => {
        render(<DateAndSearchFilters {...defaultProps} />)

        // Open the date selector
        const dateButton = screen.getByTestId('date-range-dropdown')
        fireEvent.click(dateButton)

        // Check for the quick selection buttons
        expect(screen.getByText('Past')).toBeInTheDocument()
        expect(screen.getByText('Future')).toBeInTheDocument()
        expect(screen.getByText('Next 3 days')).toBeInTheDocument()
        expect(screen.getByText('Weekend')).toBeInTheDocument()
        expect(screen.getByText('Today')).toBeInTheDocument()
    })
})
