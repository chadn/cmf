'use client'

import { useState, useEffect } from 'react'
import { format, addMonths, subMonths } from 'date-fns'
import DateQuickButtons from './DateQuickButtons'
import { getDateFromUrlDateString } from '@/lib/utils/date'
import { umamiTrack } from '@/lib/utils/umami'

interface DateAndSearchFiltersProps {
    searchQuery: string
    onSearchChange: (query: string) => void
    dateSliderRange?: { start: string; end: string }
    onDateRangeChange: (range: { start: string; end: string } | undefined) => void
    dateQuickFilterUrl?: string | null
    onDateQuickFilterChange?: (value: string) => void
    appState?: string
    sd?: string // Start date from URL
    ed?: string // End date from URL
}

export default function DateAndSearchFilters({
    searchQuery,
    onSearchChange,
    dateSliderRange,
    onDateRangeChange,
    dateQuickFilterUrl,
    onDateQuickFilterChange,
    appState,
    sd,
    ed,
}: DateAndSearchFiltersProps) {
    const [showDateSliders, setShowDateSliders] = useState(false)

    // Date slider state
    const now = new Date()
    const minDate = getDateFromUrlDateString(sd || '-1m') || subMonths(now, 1)
    const maxDate = getDateFromUrlDateString(ed || '3m') || addMonths(now, 3)
    const totalDays = Math.floor((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
    const [startValue, setStartValue] = useState(0)
    const [endValue, setEndValue] = useState(totalDays)

    useEffect(() => {
        if (!dateSliderRange) {
            setStartValue(0)
            setEndValue(totalDays)
        }
    }, [dateSliderRange, totalDays])

    useEffect(() => {
        if (showDateSliders) {
            umamiTrack('showDateSliders')
        }
    }, [showDateSliders])

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
            if (onDateQuickFilterChange) {
                onDateQuickFilterChange('')
            }
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
            if (onDateQuickFilterChange) {
                onDateQuickFilterChange('')
            }
        }
    }

    const formatDateForButton = (date: Date) => {
        return format(date, 'MMM d EEE')
    }
    const startDateText = formatDateForButton(new Date(getDateFromDays(startValue)))
    const endDateText = formatDateForButton(new Date(getDateFromDays(endValue)))

    return (
        <div className="relative">
            <div className={showDateSliders ? 'w-full' : 'flex flex-col sm:flex-row sm:items-center gap-2 w-full'}>
                <div
                    className={`transition-[max-height] duration-700 ease-in-out overflow-hidden min-w-0 ${
                        showDateSliders ? ' w-full max-h-[400px]' : 'flex-1 max-h-[56px] text-primary'
                    }`}
                >
                    <div className="bg-white rounded-md shadow-sm overflow-hidden min-w-0">
                        <button
                            onClick={() => setShowDateSliders(!showDateSliders)}
                            className="w-full text-left text-sm md:text-xl p-1 text-gray-700 hover:bg-gray-50 transition-colors"
                            data-testid="date-range-dropdown"
                        >
                            {startDateText} - {endDateText}
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
                </div>
                {!showDateSliders && (
                    <input
                        type="text"
                        placeholder="Search name, location, or description"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="p-2 border rounded flex-1  text-black min-w-0 ml-0 sm:ml-2"
                        data-testid="search-input"
                    />
                )}
            </div>
        </div>
    )
}
