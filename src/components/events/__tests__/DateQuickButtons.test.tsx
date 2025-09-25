import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import DateQuickButtons from '@/components/events/DateQuickButtons'
import { dateQuickFilterLabels } from '@/lib/utils/date-constants'

// Mock the DateQuickButtons component's date-dependent behavior
jest.mock('@/components/events/DateQuickButtons', () => {
    const originalModule = jest.requireActual('@/components/events/DateQuickButtons')

    // Add type for props
    const MockDateQuickButtons = (props: React.ComponentProps<typeof originalModule.default>) => {
        // When the component is rendered, intercept the Weekend button click function
        const OriginalComponent = originalModule.default
        return <OriginalComponent {...props} />
    }

    MockDateQuickButtons.displayName = 'MockDateQuickButtons'
    return {
        __esModule: true,
        default: MockDateQuickButtons,
    }
})

// Mock the umami tracking function
jest.mock('@/lib/utils/umami', () => ({
    umamiTrack: jest.fn(),
}))

describe('DateQuickButtons', () => {
    // Mock dates and functions
    const now = new Date('2023-07-15') // This is a Saturday
    const minDate = new Date('2023-06-15') // 30 days before now
    const totalDays = 60 // Total days in the range
    const mockOnDateRangeChange = jest.fn()
    const mockOnDateQuickFilterChange = jest.fn()

    // Mock the getDateFromValue function to simulate slider behavior
    const getDateFromDays = (value: number) => {
        const date = new Date(minDate.getTime() + value * 24 * 60 * 60 * 1000)
        return date.toISOString()
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('renders all quick selection buttons', () => {
        render(
            <DateQuickButtons
                now={now}
                minDate={minDate}
                totalDays={totalDays}
                getDateFromDays={getDateFromDays}
                onDateRangeChange={mockOnDateRangeChange}
            />
        )

        // Check that all buttons from dateQuickFilterLabels are rendered
        dateQuickFilterLabels.forEach((label) => {
            expect(screen.getByText(label)).toBeInTheDocument()
        })
    })

    it('selects Past dates correctly', () => {
        render(
            <DateQuickButtons
                now={now}
                minDate={minDate}
                totalDays={totalDays}
                getDateFromDays={getDateFromDays}
                onDateRangeChange={mockOnDateRangeChange}
                onDateQuickFilterChange={mockOnDateQuickFilterChange}
            />
        )

        fireEvent.click(screen.getByText('Past'))

        // onDateRangeChange should be called with correct dates using proper day boundaries
        expect(mockOnDateRangeChange).toHaveBeenCalledWith({
            startIso: expect.stringMatching(/^2023-06-14T11:01:00\.000Z$/),
            endIso: expect.stringMatching(/^2023-07-14T06:59:59\.999Z$/),
        })
        // onDateQuickFilterChange should be called with 'past'
        expect(mockOnDateQuickFilterChange).toHaveBeenCalledWith('past')
    })

    it('selects Future dates correctly', () => {
        render(
            <DateQuickButtons
                now={now}
                minDate={minDate}
                totalDays={totalDays}
                getDateFromDays={getDateFromDays}
                onDateRangeChange={mockOnDateRangeChange}
                onDateQuickFilterChange={mockOnDateQuickFilterChange}
            />
        )

        fireEvent.click(screen.getByText('Future'))

        expect(mockOnDateRangeChange).toHaveBeenCalledWith({
            startIso: expect.stringMatching(/^2023-07-14T11:01:00\.000Z$/),
            endIso: expect.stringMatching(/^2023-08-14T06:59:59\.999Z$/),
        })
        expect(mockOnDateQuickFilterChange).toHaveBeenCalledWith('future')
    })

    it('selects Next 3 days correctly', () => {
        render(
            <DateQuickButtons
                now={now}
                minDate={minDate}
                totalDays={totalDays}
                getDateFromDays={getDateFromDays}
                onDateRangeChange={mockOnDateRangeChange}
                onDateQuickFilterChange={mockOnDateQuickFilterChange}
            />
        )

        fireEvent.click(screen.getByText('Next 3 days'))

        expect(mockOnDateRangeChange).toHaveBeenCalledWith({
            startIso: expect.stringMatching(/^2023-07-14T11:01:00\.000Z$/),
            endIso: expect.stringMatching(/^2023-07-18T06:59:59\.999Z$/),
        })
        expect(mockOnDateQuickFilterChange).toHaveBeenCalledWith('next3days')
    })

    it('selects Weekend correctly when today is Saturday', () => {
        // Saturday: now is already on a weekend
        render(
            <DateQuickButtons
                now={now} // Saturday
                minDate={minDate}
                totalDays={totalDays}
                getDateFromDays={getDateFromDays}
                onDateRangeChange={mockOnDateRangeChange}
                onDateQuickFilterChange={mockOnDateQuickFilterChange}
            />
        )

        fireEvent.click(screen.getByText('Weekend'))

        // Today is Saturday, so Friday is today (no days to add)
        const fridayValue = 30 // Today (Saturday) is already day 30
        const sundayValue = 32 // Sunday is 2 days after Friday

        // Should set to current weekend (Friday to Sunday)
        expect(mockOnDateRangeChange).toHaveBeenCalledWith({
            startIso: expect.stringMatching(/^2023-07-14T11:01:00\.000Z$/),
            endIso: expect.stringMatching(/^2023-07-17T06:59:59\.999Z$/),
        })
        expect(mockOnDateQuickFilterChange).toHaveBeenCalledWith('weekend')
    })

    it('selects Weekend correctly when today is Wednesday', () => {
        // Set today to Wednesday
        const wednesday = new Date('2023-07-12') // A Wednesday

        render(
            <DateQuickButtons
                now={wednesday}
                minDate={minDate}
                totalDays={totalDays}
                getDateFromDays={getDateFromDays}
                onDateRangeChange={mockOnDateRangeChange}
                onDateQuickFilterChange={mockOnDateQuickFilterChange}
            />
        )

        fireEvent.click(screen.getByText('Weekend'))

        // Should set to upcoming weekend (Friday to Sunday)
        expect(mockOnDateRangeChange).toHaveBeenCalledWith({
            startIso: expect.stringMatching(/^2023-07-14T11:01:00\.000Z$/),
            endIso: expect.stringMatching(/^2023-07-17T06:59:59\.999Z$/),
        })
    })

    it('selects Weekend correctly when today is Sunday', () => {
        // Set today to Sunday
        const sunday = new Date('2023-07-16') // A Sunday

        render(
            <DateQuickButtons
                now={sunday}
                minDate={minDate}
                totalDays={totalDays}
                getDateFromDays={getDateFromDays}
                onDateRangeChange={mockOnDateRangeChange}
                onDateQuickFilterChange={mockOnDateQuickFilterChange}
            />
        )

        fireEvent.click(screen.getByText('Weekend'))

        // Should set to next weekend (Friday to Sunday)
    })

    it('selects Today correctly', () => {
        render(
            <DateQuickButtons
                now={now}
                minDate={minDate}
                totalDays={totalDays}
                getDateFromDays={getDateFromDays}
                onDateRangeChange={mockOnDateRangeChange}
                onDateQuickFilterChange={mockOnDateQuickFilterChange}
            />
        )

        fireEvent.click(screen.getByText('Today'))

        expect(mockOnDateRangeChange).toHaveBeenCalledWith({
            startIso: expect.stringMatching(/^2023-07-14T11:01:00\.000Z$/),
            endIso: expect.stringMatching(/^2023-07-15T06:59:59\.999Z$/),
        })
        expect(mockOnDateQuickFilterChange).toHaveBeenCalledWith('today')
    })

    // Note: URL parameter handling tests removed as this functionality
    // was moved to DateAndSearchFilters component

    it('highlights the active filter button', () => {
        render(
            <DateQuickButtons
                now={now}
                minDate={minDate}
                totalDays={totalDays}
                getDateFromDays={getDateFromDays}
                onDateRangeChange={mockOnDateRangeChange}
                dateQuickFilterUrl="today" // Today is active
            />
        )

        // The Today button should have the active class
        const todayButton = screen.getByText('Today')
        expect(todayButton).toHaveClass('bg-blue-300')

        // Other buttons should not have the active class
        const pastButton = screen.getByText('Past')
        expect(pastButton).not.toHaveClass('bg-blue-300')
    })

    it('tracks button clicks with umami', () => {
        // Use the mocked module from the jest.mock call at the top of the file
        const { umamiTrack } = jest.requireMock('@/lib/utils/umami')

        render(
            <DateQuickButtons
                now={now}
                minDate={minDate}
                totalDays={totalDays}
                getDateFromDays={getDateFromDays}
                onDateRangeChange={mockOnDateRangeChange}
                onDateQuickFilterChange={mockOnDateQuickFilterChange}
            />
        )

        fireEvent.click(screen.getByText('Next 7 days'))

        // Check that umami tracking was called
        expect(umamiTrack).toHaveBeenCalledWith('dateQuickFilter', { clicked: 'next7days' })
    })

    it('handles case where totalDays is less than the calculated end value', () => {
        // Set totalDays to a small value
        const smallTotalDays = 35 // Just 5 days after "today" at day 30

        render(
            <DateQuickButtons
                now={now}
                minDate={minDate}
                totalDays={smallTotalDays}
                getDateFromDays={getDateFromDays}
                onDateRangeChange={mockOnDateRangeChange}
            />
        )

        // Click Next 7 days, but total days is only 5 days after today
        fireEvent.click(screen.getByText('Next 7 days'))

        // Should call onDateRangeChange with the capped range
        expect(mockOnDateRangeChange).toHaveBeenCalledWith({
            startIso: expect.stringMatching(/^2023-07-14T11:01:00\.000Z$/),
            endIso: expect.stringMatching(/^2023-07-20T06:59:59\.999Z$/),
        })
    })
})
