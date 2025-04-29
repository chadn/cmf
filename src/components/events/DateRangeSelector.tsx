'use client'

import { useState, useEffect } from 'react'
import { format, addMonths, subMonths } from 'date-fns'
import DateQuickButtons from './DateQuickButtons'

interface DateRangeSelectorProps {
    dateRange?: { start: string; end: string }
    onDateRangeChange: (range: { start: string; end: string } | undefined) => void
    showDateSliders: boolean
    setShowDateSliders: (show: boolean) => void
    dateQuickFilterUrl?: string | null
    onDateQuickFilterChange?: (value: string) => void
    appState?: string
}

export default function DateRangeSelector({
    dateRange,
    onDateRangeChange,
    showDateSliders,
    setShowDateSliders,
    dateQuickFilterUrl,
    onDateQuickFilterChange,
    appState,
}: DateRangeSelectorProps) {
    // TODO: support passing in dates from datesUrl - see app/page.tsx

    // Set up date boundaries to match the calendar API's default range
    const now = new Date()
    const minDate = subMonths(now, 1)
    const maxDate = addMonths(now, 3)
    const totalDays = Math.floor((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))

    const [startValue, setStartValue] = useState(0)
    const [endValue, setEndValue] = useState(totalDays)

    // Reset UI state when dateRange becomes undefined (e.g. when clicking X button)
    useEffect(() => {
        if (!dateRange) {
            setStartValue(0)
            setEndValue(totalDays)
        }
    }, [dateRange, totalDays])

    // Convert slider value to date
    const getDateFromDays = (days: number) => {
        const date = new Date(minDate.getTime() + days * (1000 * 60 * 60 * 24))
        return format(date, "yyyy-MM-dd'T'HH:mm:ss'Z'")
    }

    // Handle slider changes
    const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = parseInt(e.target.value)
        if (newValue <= endValue) {
            setStartValue(newValue)
            onDateRangeChange({
                start: getDateFromDays(newValue),
                end: getDateFromDays(endValue),
            })
        }
    }

    const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = parseInt(e.target.value)
        if (newValue >= startValue) {
            setEndValue(newValue)
            onDateRangeChange({
                start: getDateFromDays(startValue),
                end: getDateFromDays(newValue),
            })
        }
    }

    const formatDateForButton = (date: Date) => {
        return format(date, 'MMM d EEE')
    }
    const startDateText = formatDateForButton(new Date(getDateFromDays(startValue)))
    const endDateText = formatDateForButton(new Date(getDateFromDays(endValue)))

    return (
        <div className="bg-white rounded-md shadow-sm overflow-hidden">
            <button
                onClick={() => setShowDateSliders(!showDateSliders)}
                className="w-full text-left text-sm md:text-xl p-1 text-gray-700 hover:bg-gray-50 transition-colors"
                data-testid="date-range-dropdown"
            >
                Showing: {startDateText} - {endDateText}{' '}
                <span className="text-xs text-blue-500">[{showDateSliders ? 'HIDE' : 'CHANGE'}]</span>
            </button>

            <div
                className={`overflow-hidden transition-[max-height] duration-700 ease-in-out ${
                    showDateSliders ? 'max-h-48' : 'max-h-0'
                }`}
            >
                <div className="p-2 border-t border-gray-100 bg-white shadow-md">
                    <div className="mb-2">
                        <label className="block text-xs text-gray-600 mb-0.5">
                            Start Date: {format(new Date(getDateFromDays(startValue)), 'MMM d, yyyy')}
                        </label>
                        <input
                            type="range"
                            min="0"
                            max={totalDays}
                            value={startValue}
                            onChange={handleStartChange}
                            className="w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-600 mb-0.5">
                            End Date: {format(new Date(getDateFromDays(endValue)), 'MMM d, yyyy')}
                        </label>
                        <input
                            type="range"
                            min="0"
                            max={totalDays}
                            value={endValue}
                            onChange={handleEndChange}
                            className="w-full"
                        />
                    </div>

                    <DateQuickButtons
                        now={now}
                        minDate={minDate}
                        totalDays={totalDays}
                        setStartValue={setStartValue}
                        setEndValue={setEndValue}
                        getDateFromDays={getDateFromDays}
                        onDateRangeChange={onDateRangeChange}
                        dateQuickFilterUrl={dateQuickFilterUrl}
                        onDateQuickFilterChange={onDateQuickFilterChange}
                        appState={appState}
                    />
                </div>
            </div>
        </div>
    )
}
