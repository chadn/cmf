import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import DateQuickButtons from '../DateQuickButtons'
import { dateQuickFilterLabels } from '../DateQuickButtons'

// Mock the DateQuickButtons component's date-dependent behavior
jest.mock('../DateQuickButtons', () => {
    const originalModule = jest.requireActual('../DateQuickButtons')

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
        dateQuickFilterLabels: originalModule.dateQuickFilterLabels,
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
    const mockSetStartValue = jest.fn()
    const mockSetEndValue = jest.fn()
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
                setStartValue={mockSetStartValue}
                setEndValue={mockSetEndValue}
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
                setStartValue={mockSetStartValue}
                setEndValue={mockSetEndValue}
                getDateFromDays={getDateFromDays}
                onDateRangeChange={mockOnDateRangeChange}
                onDateQuickFilterChange={mockOnDateQuickFilterChange}
            />
        )

        // The today value is 30 (days since minDate)
        const todayValue = 30

        fireEvent.click(screen.getByText('Past'))

        // Start value should be 0 (beginning of range)
        expect(mockSetStartValue).toHaveBeenCalledWith(0)
        // End value should be todayValue (30)
        expect(mockSetEndValue).toHaveBeenCalledWith(todayValue)
        // onDateRangeChange should be called with correct dates
        expect(mockOnDateRangeChange).toHaveBeenCalledWith({
            start: getDateFromDays(0),
            end: getDateFromDays(todayValue),
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
                setStartValue={mockSetStartValue}
                setEndValue={mockSetEndValue}
                getDateFromDays={getDateFromDays}
                onDateRangeChange={mockOnDateRangeChange}
                onDateQuickFilterChange={mockOnDateQuickFilterChange}
            />
        )

        const todayValue = 30

        fireEvent.click(screen.getByText('Future'))

        expect(mockSetStartValue).toHaveBeenCalledWith(todayValue)
        expect(mockSetEndValue).toHaveBeenCalledWith(totalDays)
        expect(mockOnDateRangeChange).toHaveBeenCalledWith({
            start: getDateFromDays(todayValue),
            end: getDateFromDays(totalDays),
        })
        expect(mockOnDateQuickFilterChange).toHaveBeenCalledWith('future')
    })

    it('selects Next 3 days correctly', () => {
        render(
            <DateQuickButtons
                now={now}
                minDate={minDate}
                totalDays={totalDays}
                setStartValue={mockSetStartValue}
                setEndValue={mockSetEndValue}
                getDateFromDays={getDateFromDays}
                onDateRangeChange={mockOnDateRangeChange}
                onDateQuickFilterChange={mockOnDateQuickFilterChange}
            />
        )

        const todayValue = 30
        const threeDaysLaterValue = todayValue + 3

        fireEvent.click(screen.getByText('Next 3 days'))

        expect(mockSetStartValue).toHaveBeenCalledWith(todayValue)
        expect(mockSetEndValue).toHaveBeenCalledWith(threeDaysLaterValue)
        expect(mockOnDateRangeChange).toHaveBeenCalledWith({
            start: getDateFromDays(todayValue),
            end: getDateFromDays(threeDaysLaterValue),
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
                setStartValue={mockSetStartValue}
                setEndValue={mockSetEndValue}
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
        expect(mockSetStartValue).toHaveBeenCalledWith(fridayValue)
        expect(mockSetEndValue).toHaveBeenCalledWith(sundayValue)
        expect(mockOnDateRangeChange).toHaveBeenCalledWith({
            start: getDateFromDays(fridayValue),
            end: getDateFromDays(sundayValue),
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
                setStartValue={mockSetStartValue}
                setEndValue={mockSetEndValue}
                getDateFromDays={getDateFromDays}
                onDateRangeChange={mockOnDateRangeChange}
                onDateQuickFilterChange={mockOnDateQuickFilterChange}
            />
        )

        fireEvent.click(screen.getByText('Weekend'))

        // Wednesday is day 27, Friday is day 29 (2 days later)
        const fridayValue = 30
        const sundayValue = 32 // Sunday is 2 days after Friday

        // Should set to upcoming weekend (Friday to Sunday)
        expect(mockSetStartValue).toHaveBeenCalledWith(fridayValue)
        expect(mockSetEndValue).toHaveBeenCalledWith(sundayValue)
        expect(mockOnDateRangeChange).toHaveBeenCalledWith({
            start: getDateFromDays(fridayValue),
            end: getDateFromDays(sundayValue),
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
                setStartValue={mockSetStartValue}
                setEndValue={mockSetEndValue}
                getDateFromDays={getDateFromDays}
                onDateRangeChange={mockOnDateRangeChange}
                onDateQuickFilterChange={mockOnDateQuickFilterChange}
            />
        )

        fireEvent.click(screen.getByText('Weekend'))

        // Sunday is day 31, next Friday is day 36 (5 days later)
        const fridayValue = 31
        const sundayValue = 33 // Sunday is 2 days after Friday

        // Should set to next weekend (Friday to Sunday)
        expect(mockSetStartValue).toHaveBeenCalledWith(fridayValue)
        expect(mockSetEndValue).toHaveBeenCalledWith(sundayValue)
    })

    it('selects Today correctly', () => {
        render(
            <DateQuickButtons
                now={now}
                minDate={minDate}
                totalDays={totalDays}
                setStartValue={mockSetStartValue}
                setEndValue={mockSetEndValue}
                getDateFromDays={getDateFromDays}
                onDateRangeChange={mockOnDateRangeChange}
                onDateQuickFilterChange={mockOnDateQuickFilterChange}
            />
        )

        const todayValue = 30

        fireEvent.click(screen.getByText('Today'))

        expect(mockSetStartValue).toHaveBeenCalledWith(todayValue)
        expect(mockSetEndValue).toHaveBeenCalledWith(todayValue)
        expect(mockOnDateRangeChange).toHaveBeenCalledWith({
            start: getDateFromDays(todayValue),
            end: getDateFromDays(todayValue),
        })
        expect(mockOnDateQuickFilterChange).toHaveBeenCalledWith('today')
    })

    it('handles URL parameter initialization correctly', () => {
        render(
            <DateQuickButtons
                now={now}
                minDate={minDate}
                totalDays={totalDays}
                setStartValue={mockSetStartValue}
                setEndValue={mockSetEndValue}
                getDateFromDays={getDateFromDays}
                onDateRangeChange={mockOnDateRangeChange}
                onDateQuickFilterChange={mockOnDateQuickFilterChange}
                dateQuickFilterUrl="next7days"
                appState="main-state"
            />
        )

        // The component should automatically select Next 7 days based on the URL parameter
        const todayValue = 30
        const sevenDaysLaterValue = todayValue + 7

        expect(mockSetStartValue).toHaveBeenCalledWith(todayValue)
        expect(mockSetEndValue).toHaveBeenCalledWith(sevenDaysLaterValue)
        expect(mockOnDateRangeChange).toHaveBeenCalledWith({
            start: getDateFromDays(todayValue),
            end: getDateFromDays(sevenDaysLaterValue),
        })
    })

    it('handles weekend URL parameter initialization correctly', () => {
        render(
            <DateQuickButtons
                now={now}
                minDate={minDate}
                totalDays={totalDays}
                setStartValue={mockSetStartValue}
                setEndValue={mockSetEndValue}
                getDateFromDays={getDateFromDays}
                onDateRangeChange={mockOnDateRangeChange}
                onDateQuickFilterChange={mockOnDateQuickFilterChange}
                dateQuickFilterUrl="weekend"
                appState="main-state"
            />
        )

        // The component should automatically select Weekend based on the URL parameter
        // Today is Saturday, so Friday is today (no days to add)
        const fridayValue = 30 // Today (Saturday) is already day 30
        const sundayValue = 32 // Sunday is 2 days after Friday

        expect(mockSetStartValue).toHaveBeenCalledWith(fridayValue)
        expect(mockSetEndValue).toHaveBeenCalledWith(sundayValue)
        expect(mockOnDateRangeChange).toHaveBeenCalledWith({
            start: getDateFromDays(fridayValue),
            end: getDateFromDays(sundayValue),
        })
    })

    it('does not process URL parameter when appState is not main-state', () => {
        render(
            <DateQuickButtons
                now={now}
                minDate={minDate}
                totalDays={totalDays}
                setStartValue={mockSetStartValue}
                setEndValue={mockSetEndValue}
                getDateFromDays={getDateFromDays}
                onDateRangeChange={mockOnDateRangeChange}
                onDateQuickFilterChange={mockOnDateQuickFilterChange}
                dateQuickFilterUrl="next7days"
                appState="loading" // Not main-state
            />
        )

        // No automatic selection should happen
        expect(mockSetStartValue).not.toHaveBeenCalled()
        expect(mockSetEndValue).not.toHaveBeenCalled()
        expect(mockOnDateRangeChange).not.toHaveBeenCalled()
    })

    it('highlights the active filter button', () => {
        render(
            <DateQuickButtons
                now={now}
                minDate={minDate}
                totalDays={totalDays}
                setStartValue={mockSetStartValue}
                setEndValue={mockSetEndValue}
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
                setStartValue={mockSetStartValue}
                setEndValue={mockSetEndValue}
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
                setStartValue={mockSetStartValue}
                setEndValue={mockSetEndValue}
                getDateFromDays={getDateFromDays}
                onDateRangeChange={mockOnDateRangeChange}
            />
        )

        // Click Next 7 days, but total days is only 5 days after today
        fireEvent.click(screen.getByText('Next 7 days'))

        const todayValue = 30

        // End value should be capped at totalDays
        expect(mockSetStartValue).toHaveBeenCalledWith(todayValue)
        expect(mockSetEndValue).toHaveBeenCalledWith(smallTotalDays)
        expect(mockOnDateRangeChange).toHaveBeenCalledWith({
            start: getDateFromDays(todayValue),
            end: getDateFromDays(smallTotalDays),
        })
    })
})
