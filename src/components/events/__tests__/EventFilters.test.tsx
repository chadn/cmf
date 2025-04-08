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
        onReset: mockOnResetFilters,
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    test('renders search input correctly', () => {
        render(<EventFilters {...defaultProps} />)

        const searchInput = screen.getByPlaceholderText('Search name, location, or description')
        expect(searchInput).toBeInTheDocument()
    })

    test('calls onSearchChange when search input changes', () => {
        render(<EventFilters {...defaultProps} />)

        const searchInput = screen.getByPlaceholderText('Search name, location, or description')
        fireEvent.change(searchInput, { target: { value: 'test search' } })

        expect(mockOnSearchChange).toHaveBeenCalledWith('test search')
    })

    test('renders date slider button when no date range is selected', () => {
        render(<EventFilters {...defaultProps} />)

        // Check if the button contains text that includes "Date Sliders"
        const dateButton = screen.getByText(/Show Date Sliders:/i)
        expect(dateButton).toBeInTheDocument()
    })

    test('shows date sliders when button is clicked', () => {
        render(<EventFilters {...defaultProps} />)

        // Check if the button contains text that includes "Date Sliders"
        const dateButton = screen.getByText(/Show Date Sliders:/i)
        fireEvent.click(dateButton)

        // In the new UI, we should now see two sliders
        expect(screen.getAllByRole('slider').length).toBe(2)
    })

    test('call onDateRangeChange when sliders change', () => {
        render(<EventFilters {...defaultProps} />)

        // First show the sliders
        const dateButton = screen.getByText(/Show Date Sliders:/i)
        fireEvent.click(dateButton)

        // Find the start date slider
        const sliders = screen.getAllByRole('slider')
        expect(sliders.length).toBe(2)

        // Change the start date slider
        fireEvent.change(sliders[0], { target: { value: '10' } })

        // Check that onDateRangeChange was called
        expect(mockOnDateRangeChange).toHaveBeenCalled()
    })

    test('adds data-testid attributes to key elements', () => {
        render(<EventFilters {...defaultProps} />)

        // Check if the search input has a data-testid attribute
        const searchInput = screen.getByTestId('search-input')
        expect(searchInput).toBeInTheDocument()

        // Check if the date range button has a data-testid attribute
        const dateDropdown = screen.getByTestId('date-range-dropdown')
        expect(dateDropdown).toBeInTheDocument()
    })
})
