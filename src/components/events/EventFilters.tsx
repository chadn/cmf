'use client'

import { useState, useEffect } from 'react'
import { format, addMonths, subMonths } from 'date-fns'

interface EventFiltersProps {
    searchQuery: string
    onSearchChange: (query: string) => void
    dateRange?: { start: string; end: string }
    onDateRangeChange: (
        range: { start: string; end: string } | undefined
    ) => void
    onReset: () => void
}

export default function EventFilters({
    searchQuery,
    onSearchChange,
    dateRange,
    onDateRangeChange,
    onReset,
}: EventFiltersProps) {
    const [showDateSliders, setShowDateSliders] = useState(false)

    // Set up date boundaries to match the calendar API's default range
    const now = new Date()
    const minDate = subMonths(now, 1)
    const maxDate = addMonths(now, 3)
    const totalDays = Math.floor(
        (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    const [startValue, setStartValue] = useState(0)
    const [endValue, setEndValue] = useState(totalDays)

    // Reset UI state when dateRange becomes undefined (e.g. when clicking X button)
    useEffect(() => {
        if (!dateRange) {
            setShowDateSliders(false)
            setStartValue(0)
            setEndValue(totalDays)
        }
    }, [dateRange, totalDays])

    // Convert slider value to date
    const getDateFromValue = (value: number) => {
        const date = new Date(minDate.getTime() + value * (1000 * 60 * 60 * 24))
        return format(date, "yyyy-MM-dd'T'HH:mm:ss'Z'")
    }

    // Handle slider changes
    const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = parseInt(e.target.value)
        if (newValue <= endValue) {
            setStartValue(newValue)
            onDateRangeChange({
                start: getDateFromValue(newValue),
                end: getDateFromValue(endValue),
            })
        }
    }

    const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = parseInt(e.target.value)
        if (newValue >= startValue) {
            setEndValue(newValue)
            onDateRangeChange({
                start: getDateFromValue(startValue),
                end: getDateFromValue(newValue),
            })
        }
    }

    const toggleDateSliders = () => {
        setShowDateSliders(!showDateSliders)
    }

    const handleReset = () => {
        setShowDateSliders(false)
        setStartValue(0)
        setEndValue(totalDays)
        onReset()
    }

    const formatDateForButton = (date: Date) => {
        return format(date, 'MMM d EEE')
    }

    const getDateButtonText = () => {
        const startDate = new Date(getDateFromValue(startValue))
        const endDate = new Date(getDateFromValue(endValue))
        const msg = `Date Sliders that Filter by Date - (${formatDateForButton(
            startDate
        )} - ${formatDateForButton(endDate)})`

        if (!showDateSliders) {
            return `Show ${msg}`
        }
        return `Hide ${msg}`
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col space-y-2">
                <input
                    type="text"
                    placeholder="Search by name, location, or description"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="p-2 border rounded w-full text-black"
                    data-testid="search-input"
                />
            </div>

            <div className="flex flex-col space-y-2">
                <button
                    onClick={toggleDateSliders}
                    className="text-blue-500 hover:text-blue-700 text-left"
                    data-testid="date-range-dropdown"
                >
                    {getDateButtonText()}
                </button>

                {showDateSliders && (
                    <div className="space-y-4 p-4 bg-gray-50 rounded">
                        <div>
                            <label className="block text-sm text-gray-600">
                                Start Date:{' '}
                                {format(
                                    new Date(getDateFromValue(startValue)),
                                    'MMM d, yyyy'
                                )}
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
                            <label className="block text-sm text-gray-600">
                                End Date:{' '}
                                {format(
                                    new Date(getDateFromValue(endValue)),
                                    'MMM d, yyyy'
                                )}
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
                    </div>
                )}
            </div>

            <button
                onClick={handleReset}
                className="text-red-500 hover:text-red-700"
                data-testid="reset-filters-button"
            >
                Reset Filters
            </button>
        </div>
    )
}
