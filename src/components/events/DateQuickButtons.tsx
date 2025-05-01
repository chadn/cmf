'use client'

import { format } from 'date-fns'
import { useEffect, useRef } from 'react'
import { logr } from '@/lib/utils/logr'
import { umamiTrack } from '@/lib/utils/umami'

interface DateQuickButtonsProps {
    now: Date
    minDate: Date
    totalDays: number
    setStartValue: (value: number) => void
    setEndValue: (value: number) => void
    getDateFromDays: (value: number) => string
    onDateRangeChange: (range: { start: string; end: string }) => void
    dateQuickFilterUrl?: string | null
    onDateQuickFilterChange?: (value: string) => void
    appState?: string
}

// Simple data structure for quick filter button configuration
interface QuickFilterButton {
    label: string
    // Range configuration (start defaults to today if not specified)
    start?: number
    end?: number | null // null = same as start (for "Today")
}
export const dateQuickFilterLabels = ['Today', 'Past', 'Future', 'Next 3 days', 'Next 7 days', 'Weekend']

export default function DateQuickButtons({
    now,
    minDate,
    totalDays,
    setStartValue,
    setEndValue,
    getDateFromDays,
    onDateRangeChange,
    dateQuickFilterUrl,
    onDateQuickFilterChange,
    appState,
}: DateQuickButtonsProps) {
    // Get today's value in slider units
    const getTodayValue = () => {
        return Math.floor((now.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
    }

    // Calculate today's value once to avoid repetition
    const todayValue = getTodayValue()

    // Common button style
    const buttonClass = 'text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 py-1 px-2 rounded'

    // Handle date range selection based on the filter configuration
    const handleDateRange = (filter: QuickFilterButton) => {
        logr.info('date-buttons', `****** handleDateRange(${filter.label})`)
        // Default to today for start if not specified
        const start = filter.start ?? todayValue
        // End is either explicitly set, or calculated by adding days, or same as start
        const end = filter.end === null ? start : filter.end ?? totalDays

        setStartValue(start)
        setEndValue(end)
        onDateRangeChange({
            start: getDateFromDays(start),
            end: getDateFromDays(end),
        })

        const filterId = filter.label.toLowerCase().replace(/\s+/g, '')
        // Update URL parameter if handler provided
        if (onDateQuickFilterChange) {
            onDateQuickFilterChange(filterId)
        }
        umamiTrack('dateQuickFilter', { clicked: filterId})
        //umamiTrack('dateQuickFilter', filterId)
    }

    // Special handler for weekend selection
    const handleWeekendSelection = () => {
        logr.info('date-buttons', `****** handleWeekendSelection()`)
        const today = new Date(getDateFromDays(todayValue))
        const dayOfWeek = today.getDay()

        // Calculate days until Friday (if today is Sun-Thu) or use today (if Fri-Sat)
        let daysToFriday = 0
        if (dayOfWeek === 0) {
            // Sunday
            daysToFriday = 5
        } else if (dayOfWeek < 5) {
            // Monday-Thursday
            daysToFriday = 5 - dayOfWeek
        } // Friday-Saturday: use today

        const fridayValue = Math.min(todayValue + daysToFriday, totalDays)
        // Sunday is 2 days after Friday
        const sundayValue = Math.min(fridayValue + 2, totalDays)

        setStartValue(fridayValue)
        setEndValue(sundayValue)
        onDateRangeChange({
            start: getDateFromDays(fridayValue),
            end: getDateFromDays(sundayValue),
        })

        // Update URL parameter if handler provided
        if (onDateQuickFilterChange) {
            onDateQuickFilterChange('weekend')
        }
    }

    // Define quick filter buttons configuration
    const quickFilters: QuickFilterButton[] = [
        {
            label: 'Past',
            start: 0,
            end: todayValue,
        },
        {
            label: 'Future',
            start: todayValue,
            end: totalDays,
        },
        {
            label: 'Today',
            start: todayValue,
            end: todayValue,
        },
        {
            label: 'Next 3 days',
            start: todayValue,
            end: Math.min(todayValue + 3, totalDays),
        },
        {
            label: 'Next 7 days',
            start: todayValue,
            end: Math.min(todayValue + 7, totalDays),
        },
        {
            label: 'Weekend',
        },
    ]

    // Ref to track if we've already processed the initial URL parameter
    const initialUrlProcessed = useRef(false)

    // Effect to handle URL parameter changes - only runs once on mount
    useEffect(() => {
        logr.info('date-qf-chad-rock', `***** dateQuickFilterUrl=${dateQuickFilterUrl}`)
        // Only process if we have a URL parameter, haven't processed it yet, and appState is main-state
        if (dateQuickFilterUrl && !initialUrlProcessed.current && appState === 'main-state') {
            // Find the matching filter based on the URL parameter
            const matchingFilter = quickFilters.find(
                (filter) => filter.label.toLowerCase().replace(/\s+/g, '') === dateQuickFilterUrl
            )

            if (matchingFilter) {
                // Simulate clicking the button
                if (matchingFilter.label === 'Weekend') {
                    handleWeekendSelection()
                } else {
                    handleDateRange(matchingFilter)
                }
            }

            // Mark that we've processed the initial URL parameter
            initialUrlProcessed.current = true
        }
    }, [dateQuickFilterUrl, appState]) // Add appState to the dependency array

    return (
        <div className="mt-3 flex flex-wrap gap-1 justify-between">
            {quickFilters.map((curQF) => (
                <button
                    key={curQF.label.replace(/\s+/g, '')}
                    data-umami-event="DateQuickButton"
                    data-umami-event-dateqbtn={curQF.label.replace(/\s+/g, '')}
                    onClick={() => (curQF.label === 'Weekend' ? handleWeekendSelection() : handleDateRange(curQF))}
                    className={`${buttonClass} ${
                        dateQuickFilterUrl === curQF.label.toLowerCase().replace(/\s+/g, '') ? 'bg-blue-300' : ''
                    }`}
                >
                    {curQF.label}
                </button>
            ))}
        </div>
    )
}
