'use client'

import { useState } from 'react'
import DateRangeSelector from './DateRangeSelector'

interface EventFiltersProps {
    searchQuery: string
    onSearchChange: (query: string) => void
    dateRange?: { start: string; end: string }
    onDateRangeChange: (range: { start: string; end: string } | undefined) => void
    onReset: () => void
    dateQuickFilterUrl?: string | null
    onDateQuickFilterChange?: (value: string) => void
    appState?: string
}

export default function EventFilters({
    searchQuery,
    onSearchChange,
    dateRange,
    onDateRangeChange,
    onReset,
    dateQuickFilterUrl,
    onDateQuickFilterChange,
    appState,
}: EventFiltersProps) {
    const [showDateSliders, setShowDateSliders] = useState(false)

    const handleReset = () => {
        setShowDateSliders(false)
        onReset()
    }

    return (
        <div className="relative">
            <DateRangeSelector
                dateRange={dateRange}
                onDateRangeChange={onDateRangeChange}
                showDateSliders={showDateSliders}
                setShowDateSliders={setShowDateSliders}
                dateQuickFilterUrl={dateQuickFilterUrl}
                onDateQuickFilterChange={onDateQuickFilterChange}
                appState={appState}
            />

            <div className="mt-0.5">
                <input
                    type="text"
                    placeholder="Search name, location, or description"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="p-2 border rounded w-full text-black"
                    data-testid="search-input"
                />
            </div>
        </div>
    )
}
