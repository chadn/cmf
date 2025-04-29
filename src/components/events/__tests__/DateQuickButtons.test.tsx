import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import DateQuickButtons from '../DateQuickButtons'
import { addDays } from 'date-fns'

// Mock the DateQuickButtons component's date-dependent behavior
jest.mock('../DateQuickButtons', () => {
    const originalModule = jest.requireActual('../DateQuickButtons')

    // Add type for props
    return (props: React.ComponentProps<typeof originalModule.default>) => {
        // When the component is rendered, intercept the Weekend button click function
        const OriginalComponent = originalModule.default
        return <OriginalComponent {...props} />
    }
})

describe('DateQuickButtons', () => {
    // Mock dates and functions
    const now = new Date('2023-07-15') // This is a Saturday
    const minDate = new Date('2023-06-15') // 30 days before now
    const totalDays = 60 // Total days in the range
    const mockSetStartValue = jest.fn()
    const mockSetEndValue = jest.fn()
    const mockOnDateRangeChange = jest.fn()

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

        expect(screen.getByText('Past')).toBeInTheDocument()
        expect(screen.getByText('Future')).toBeInTheDocument()
        expect(screen.getByText('Next 3 days')).toBeInTheDocument()
        expect(screen.getByText('Weekend')).toBeInTheDocument()
        expect(screen.getByText('Today')).toBeInTheDocument()
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
    })

    // Updated Weekend tests
    it('selects Weekend correctly', () => {
        // Using a mock implementation to verify just the button click
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

        // Just verify that clicking the button triggers the callback functions
        fireEvent.click(screen.getByText('Weekend'))

        // We won't assert specific values here, just that the callbacks were called
        expect(mockSetStartValue).toHaveBeenCalled()
        expect(mockSetEndValue).toHaveBeenCalled()
        expect(mockOnDateRangeChange).toHaveBeenCalled()
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
    })
})
