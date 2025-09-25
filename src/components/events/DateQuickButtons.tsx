'use client'

import React from 'react'
import { DateRangeIso } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import { umamiTrack } from '@/lib/utils/umami'
import { getStartOfDay, getEndOfDay } from '@/lib/utils/date'
import { getAllQuickFilterConfigs, calculateQuickFilterRange } from '@/lib/utils/quickFilters'
import { differenceInCalendarDays } from 'date-fns'

interface DateQuickButtonsProps {
    now: Date
    minDate: Date
    totalDays: number
    getDateFromDays: (value: number) => string
    onDateRangeChange: (range: DateRangeIso) => void
    dateQuickFilterUrl?: string | null
    onDateQuickFilterChange?: (value: string | null) => void
}

// Note: Quick filter configurations are now imported from shared utility

export default function DateQuickButtons({
    now,
    minDate,
    totalDays,
    getDateFromDays,
    onDateRangeChange,
    dateQuickFilterUrl,
    onDateQuickFilterChange,
}: DateQuickButtonsProps) {
    // Calculate today's value once to avoid repetition
    const todayValue = differenceInCalendarDays(now, minDate)

    // Common button style
    const buttonClass = 'text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 py-2 px-2 sm:px-2rounded'

    // Handle date range selection using shared utility
    const handleDateRange = (filterId: string, label: string) => {
        logr.info('date-buttons', `handleDateRange(${filterId}, ${label})`)
        const range = calculateQuickFilterRange(filterId, todayValue, totalDays, getDateFromDays)
        if (!range) {
            logr.error('date-buttons', `No range calculated for filter: ${filterId}`)
            return
        }

        onDateRangeChange({
            startIso: getStartOfDay(range.start, minDate),
            endIso: getEndOfDay(range.end, minDate),
        })

        // Update URL parameter if handler provided
        if (onDateQuickFilterChange) {
            onDateQuickFilterChange(filterId)
        }
        umamiTrack('dateQuickFilter', { clicked: filterId })
    }

    // Get quick filter configurations from shared utility
    const quickFilters = getAllQuickFilterConfigs()

    return (
        <div className="flex flex-col gap-1">
            {quickFilters.map((curQF) => (
                <button
                    key={curQF.id}
                    data-umami-event="DateQuickButton"
                    data-umami-event-dateqbtn={curQF.id}
                    onClick={() => handleDateRange(curQF.id, curQF.label)}
                    className={`${buttonClass} ${dateQuickFilterUrl === curQF.id ? 'bg-blue-300' : ''}`}
                >
                    {curQF.label}
                </button>
            ))}
        </div>
    )
}
