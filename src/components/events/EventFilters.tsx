'use client'

import { useState } from 'react'
import DateRangeSelector from './DateRangeSelector'
import { umamiTrack } from '@/lib/utils/umami'
import { useEffect } from 'react'

interface EventFiltersProps {
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

export default function EventFilters({
    searchQuery,
    onSearchChange,
    dateSliderRange,
    onDateRangeChange,
    dateQuickFilterUrl,
    onDateQuickFilterChange,
    appState,
    sd,
    ed,
}: EventFiltersProps) {
    const [showDateSliders, setShowDateSliders] = useState(false)

    // log if showDateSliders changes
    useEffect(() => {
        if (showDateSliders) {
            umamiTrack('showDateSliders') // Track when the date sliders are shown
        }
    }, [showDateSliders])

    return (
        <div className="relative">
            <DateRangeSelector
                dateSliderRange={dateSliderRange}
                onDateRangeChange={onDateRangeChange}
                showDateSliders={showDateSliders}
                setShowDateSliders={setShowDateSliders}
                dateQuickFilterUrl={dateQuickFilterUrl}
                onDateQuickFilterChange={onDateQuickFilterChange}
                appState={appState}
                sd={sd}
                ed={ed}
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
