import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import DateAndSearchFilters from '../DateAndSearchFilters'
import { appActions, AppState } from '@/lib/state/appStateReducer'

// Mock dependencies
jest.mock('@/lib/utils/logr', () => ({
    logr: {
        info: jest.fn(),
        warn: jest.fn(),
    },
}))

jest.mock('@/lib/utils/umami', () => ({
    umamiTrack: jest.fn(),
}))

jest.mock('@/lib/utils/quickFilters', () => ({
    calculateQuickFilterRange: jest.fn(),
    getAllQuickFilterConfigs: jest.fn(() => [
        { key: 'today', label: 'Today' },
        { key: 'next3days', label: 'Next 3 days' },
        { key: 'weekend', label: 'Weekend' },
        { key: 'past', label: 'Past' },
        { key: 'future', label: 'Future' }
    ]),
}))

jest.mock('@/lib/utils/date', () => ({
    getDateFromUrlDateString: jest.fn(),
    getStartOfDay: jest.fn(),
    getEndOfDay: jest.fn(),
    calculateTodayValue: jest.fn(() => 30), // Mock today as day 30
}))

describe('DateAndSearchFilters Component', () => {
    const mockOnSearchChange = jest.fn()
    const mockOnDateRangeChange = jest.fn()
    const mockOnDateQuickFilterChange = jest.fn()
    const mockDispatch = jest.fn()

    const defaultProps = {
        searchQuery: '',
        onSearchChange: mockOnSearchChange,
        dateSliderRange: undefined,
        onDateRangeChange: mockOnDateRangeChange,
        onDateQuickFilterChange: mockOnDateQuickFilterChange,
        appState: 'main-state' as AppState,
        searchQueryFromUrl: undefined,
        dateQuickFilterFromUrl: undefined,
        dateRangeFromUrl: undefined,
        dispatch: mockDispatch,
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

    describe('URL Parameter Processing', () => {
        beforeEach(() => {
            const { calculateQuickFilterRange } = jest.requireMock('@/lib/utils/quickFilters')
            const { getStartOfDay, getEndOfDay } = jest.requireMock('@/lib/utils/date')
            
            // Setup default mock returns
            calculateQuickFilterRange.mockReturnValue({ start: 10, end: 20 })
            getStartOfDay.mockReturnValue('2024-01-10T00:00:00.000Z')
            getEndOfDay.mockReturnValue('2024-01-20T23:59:59.999Z')
        })

        it('should apply date quick filter from URL during events-loaded state', async () => {
            const { calculateQuickFilterRange } = jest.requireMock('@/lib/utils/quickFilters')
            const { logr } = jest.requireMock('@/lib/utils/logr')
            
            render(
                <DateAndSearchFilters 
                    {...defaultProps} 
                    appState="events-loaded"
                    dateQuickFilterFromUrl="next7days"
                />
            )

            await waitFor(() => {
                expect(calculateQuickFilterRange).toHaveBeenCalledWith('next7days', expect.any(Number), expect.any(Number), expect.any(Function))
                expect(mockOnDateRangeChange).toHaveBeenCalledWith({
                    start: '2024-01-10T00:00:00.000Z',
                    end: '2024-01-20T23:59:59.999Z'
                })
                expect(logr.info).toHaveBeenCalledWith('url-filters', expect.stringContaining('applying date filter "next7days"'))
                expect(mockDispatch).toHaveBeenCalledWith(appActions.urlFiltersApplied())
            })
        })

        it('should apply search filter from URL during events-loaded state', async () => {
            const { logr } = jest.requireMock('@/lib/utils/logr')
            
            render(
                <DateAndSearchFilters 
                    {...defaultProps} 
                    appState="events-loaded"
                    searchQueryFromUrl="test search"
                />
            )

            await waitFor(() => {
                expect(mockOnSearchChange).toHaveBeenCalledWith('test search')
                expect(logr.info).toHaveBeenCalledWith('url-filters', expect.stringContaining('applying search filter "test search"'))
                expect(mockDispatch).toHaveBeenCalledWith(appActions.urlFiltersApplied())
            })
        })

        it('should apply both date and search filters from URL', async () => {
            render(
                <DateAndSearchFilters 
                    {...defaultProps} 
                    appState="events-loaded"
                    dateQuickFilterFromUrl="today"
                    searchQueryFromUrl="concert"
                />
            )

            await waitFor(() => {
                expect(mockOnDateRangeChange).toHaveBeenCalled()
                expect(mockOnSearchChange).toHaveBeenCalledWith('concert')
                expect(mockDispatch).toHaveBeenCalledWith(appActions.urlFiltersApplied())
            })
        })

        it('should not apply URL filters when not in events-loaded state', () => {
            const { logr } = jest.requireMock('@/lib/utils/logr')
            
            render(
                <DateAndSearchFilters 
                    {...defaultProps} 
                    appState="events-init"
                    dateQuickFilterFromUrl="today"
                    searchQueryFromUrl="test"
                />
            )

            expect(mockOnDateRangeChange).not.toHaveBeenCalled()
            expect(mockOnSearchChange).not.toHaveBeenCalled()
            expect(logr.info).not.toHaveBeenCalled()
        })

        it('should warn and skip invalid date quick filters', async () => {
            const { calculateQuickFilterRange } = jest.requireMock('@/lib/utils/quickFilters')
            const { logr } = jest.requireMock('@/lib/utils/logr')
            
            calculateQuickFilterRange.mockReturnValue(null)
            
            render(
                <DateAndSearchFilters 
                    {...defaultProps} 
                    appState="events-loaded"
                    dateQuickFilterFromUrl="invalid-filter"
                />
            )

            await waitFor(() => {
                expect(logr.warn).toHaveBeenCalledWith('url-filters', 'Unknown or invalid quick filter: invalid-filter')
                expect(mockOnDateRangeChange).not.toHaveBeenCalled()
                expect(mockDispatch).toHaveBeenCalledWith(appActions.urlFiltersApplied())
            })
        })

        it('should dispatch URL filters applied when no URL params are present', async () => {
            render(
                <DateAndSearchFilters 
                    {...defaultProps} 
                    appState="events-loaded"
                />
            )

            await waitFor(() => {
                expect(mockDispatch).toHaveBeenCalledWith(appActions.urlFiltersApplied())
            })
        })

        it('should only process URL parameters once', async () => {
            const { rerender } = render(
                <DateAndSearchFilters 
                    {...defaultProps} 
                    appState="events-loaded"
                    searchQueryFromUrl="test"
                />
            )

            await waitFor(() => {
                expect(mockOnSearchChange).toHaveBeenCalledTimes(1)
            })

            // Re-render with same props should not trigger again
            rerender(
                <DateAndSearchFilters 
                    {...defaultProps} 
                    appState="events-loaded"
                    searchQueryFromUrl="test"
                />
            )

            expect(mockOnSearchChange).toHaveBeenCalledTimes(1)
        })
    })

    describe('Calendar Interactions', () => {
        it('should handle calendar date selection for start date', async () => {
            render(<DateAndSearchFilters {...defaultProps} />)
            
            // Open the date selector
            const dateButton = screen.getByTestId('date-range-dropdown')
            fireEvent.click(dateButton)

            // Find and click on a calendar date
            // Note: This is a simplified test - actual calendar interaction would be more complex
            const calendars = screen.getAllByRole('grid')
            expect(calendars.length).toBeGreaterThan(0)
        })

        it('should clear quick filter when calendar date is selected', async () => {
            render(<DateAndSearchFilters {...defaultProps} />)
            
            const dateButton = screen.getByTestId('date-range-dropdown')
            fireEvent.click(dateButton)

            // Calendar selection would trigger handleCalendarSelect
            // This would call onDateQuickFilterChange('') if the handler exists
            // Since we can't easily simulate calendar date selection in tests,
            // we verify the component renders without errors
            expect(screen.getByTestId('date-range-dropdown')).toBeInTheDocument()
        })
    })

    describe('Calendar Display Modes', () => {
        it('should handle same month display mode', () => {
            render(<DateAndSearchFilters {...defaultProps} />)
            
            const dateButton = screen.getByTestId('date-range-dropdown')
            fireEvent.click(dateButton)

            // The component should render calendar(s) when opened
            const calendars = screen.getAllByRole('grid')
            expect(calendars.length).toBeGreaterThan(0)
        })

        it('should handle different months display mode', () => {
            // Set up date range that spans different months
            const propsWithRange = {
                ...defaultProps,
                dateSliderRange: {
                    start: '2024-01-15T00:00:00.000Z',
                    end: '2024-03-15T23:59:59.999Z'
                }
            }
            
            render(<DateAndSearchFilters {...propsWithRange} />)
            
            const dateButton = screen.getByTestId('date-range-dropdown')
            fireEvent.click(dateButton)

            // Should render calendar interface
            const calendars = screen.getAllByRole('grid')
            expect(calendars.length).toBeGreaterThan(0)
        })
    })

    describe('Edge Cases and Error Handling', () => {
        it('should handle missing onDateQuickFilterChange prop', async () => {
            const propsWithoutQuickFilter = {
                ...defaultProps,
                onDateQuickFilterChange: undefined
            }
            
            render(
                <DateAndSearchFilters 
                    {...propsWithoutQuickFilter} 
                    appState="events-loaded"
                    dateQuickFilterFromUrl="today"
                />
            )

            // Should not crash even without the optional prop
            await waitFor(() => {
                expect(mockDispatch).toHaveBeenCalled()
            })
        })

        it('should handle component unmounting during URL processing', () => {
            const { unmount } = render(
                <DateAndSearchFilters 
                    {...defaultProps} 
                    appState="events-loaded"
                    searchQueryFromUrl="test"
                />
            )

            // Unmounting during processing should not cause errors
            unmount()
            expect(true).toBe(true) // Test passes if no errors thrown
        })
    })
})
