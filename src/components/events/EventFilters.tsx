'use client'

import React, { useState } from 'react'
import { format, addMonths, subMonths } from 'date-fns'

interface EventFiltersProps {
    searchQuery: string
    onSearchChange: (query: string) => void
    dateRange?: { start: string; end: string }
    onDateRangeChange: (range?: { start: string; end: string }) => void
    onResetFilters: () => void
}

const EventFilters: React.FC<EventFiltersProps> = ({
    searchQuery,
    onSearchChange,
    dateRange,
    onDateRangeChange,
    onResetFilters,
}) => {
    const [isDateFilterOpen, setIsDateFilterOpen] = useState(false)

    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSearchChange(e.target.value)
    }

    // Handle date range selection
    const handleDateRangeSelect = (range: string) => {
        const now = new Date()
        let start: Date
        let end: Date

        switch (range) {
            case 'today':
                start = new Date(now.setHours(0, 0, 0, 0))
                end = new Date(now.setHours(23, 59, 59, 999))
                break
            case 'tomorrow':
                start = new Date(now.setDate(now.getDate() + 1))
                start.setHours(0, 0, 0, 0)
                end = new Date(start)
                end.setHours(23, 59, 59, 999)
                break
            case 'this-week':
                start = new Date(now)
                start.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
                start.setHours(0, 0, 0, 0)
                end = new Date(start)
                end.setDate(start.getDate() + 6) // End of week (Saturday)
                end.setHours(23, 59, 59, 999)
                break
            case 'this-month':
                start = new Date(now.getFullYear(), now.getMonth(), 1)
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
                end.setHours(23, 59, 59, 999)
                break
            case 'next-month':
                const nextMonth = addMonths(now, 1)
                start = new Date(
                    nextMonth.getFullYear(),
                    nextMonth.getMonth(),
                    1
                )
                end = new Date(
                    nextMonth.getFullYear(),
                    nextMonth.getMonth() + 1,
                    0
                )
                end.setHours(23, 59, 59, 999)
                break
            case 'next-3-months':
                start = new Date(now)
                start.setHours(0, 0, 0, 0)
                end = addMonths(now, 3)
                end.setHours(23, 59, 59, 999)
                break
            case 'clear':
                onDateRangeChange(undefined)
                setIsDateFilterOpen(false)
                return
            default:
                return
        }

        onDateRangeChange({
            start: format(start, "yyyy-MM-dd'T'HH:mm:ss"),
            end: format(end, "yyyy-MM-dd'T'HH:mm:ss"),
        })
        setIsDateFilterOpen(false)
    }

    // Format date range for display
    const formatDateRangeDisplay = () => {
        if (!dateRange) return 'Any time'

        const start = new Date(dateRange.start)
        const end = new Date(dateRange.end)

        return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
    }

    return (
        <div className="mb-6 space-y-4">
            {/* Search input */}
            <div className="form-control">
                <label htmlFor="search" className="form-label">
                    Search events
                </label>
                <input
                    id="search"
                    type="text"
                    className="form-input"
                    placeholder="Search by name, location, or description"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    data-testid="event-search-input"
                />
            </div>

            {/* Date filter */}
            <div className="form-control">
                <label className="form-label">Date range</label>
                <div className="relative" data-testid="date-range-dropdown">
                    <button
                        type="button"
                        className="w-full px-4 py-2 text-left border rounded-md flex justify-between items-center"
                        onClick={() => setIsDateFilterOpen(!isDateFilterOpen)}
                    >
                        <span>{formatDateRangeDisplay()}</span>
                        <span className="text-gray-500">▼</span>
                    </button>

                    {isDateFilterOpen && (
                        <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg">
                            <div className="p-2 space-y-1">
                                <button
                                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
                                    onClick={() =>
                                        handleDateRangeSelect('today')
                                    }
                                >
                                    Today
                                </button>
                                <button
                                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
                                    onClick={() =>
                                        handleDateRangeSelect('tomorrow')
                                    }
                                >
                                    Tomorrow
                                </button>
                                <button
                                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
                                    onClick={() =>
                                        handleDateRangeSelect('this-week')
                                    }
                                >
                                    This week
                                </button>
                                <button
                                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
                                    onClick={() =>
                                        handleDateRangeSelect('this-month')
                                    }
                                >
                                    This month
                                </button>
                                <button
                                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
                                    onClick={() =>
                                        handleDateRangeSelect('next-month')
                                    }
                                >
                                    Next month
                                </button>
                                <button
                                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
                                    onClick={() =>
                                        handleDateRangeSelect('next-3-months')
                                    }
                                >
                                    Next 3 months
                                </button>
                                <div className="border-t my-2"></div>
                                <button
                                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-primary"
                                    onClick={() =>
                                        handleDateRangeSelect('clear')
                                    }
                                >
                                    Clear filter
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Reset filters button */}
            <div className="flex justify-end">
                <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                    onClick={onResetFilters}
                    data-testid="reset-filters-button"
                >
                    Reset all filters
                </button>
            </div>
        </div>
    )
}

export default EventFilters
