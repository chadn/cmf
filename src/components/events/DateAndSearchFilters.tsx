'use client'

import { useState, useEffect, useMemo } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { format, addDays, differenceInCalendarDays, isSameMonth } from 'date-fns'
import { DateRangeIso } from '@/types/events'
import { CurrentUrlState, DateConfig } from '@/types/urlProcessing'
import DateQuickButtons from './DateQuickButtons'
import { getStartOfDay, getEndOfDay } from '@/lib/utils/date'
import { umamiTrack } from '@/lib/utils/umami'
import { Calendar } from '@/components/ui/calendar'
import { Slider } from '@/components/ui/slider'
import { logr } from '@/lib/utils/logr'
import { stringify } from '@/lib/utils/utils-shared'

interface DateAndSearchFiltersProps {
    // URL state object (consolidated interface)
    urlState: CurrentUrlState
    onSearchChange: (query: string) => void
    onDateRangeChange: (range: DateRangeIso | undefined) => void
    onDateQuickFilterChange?: (value: string | null) => void
    // Date configuration from useUrlProcessor (centralized calculations)
    dateConfig: DateConfig
}

export default function DateAndSearchFilters({
    urlState,
    onSearchChange,
    onDateRangeChange,
    onDateQuickFilterChange,
    dateConfig,
}: DateAndSearchFiltersProps) {
    // Extract values from consolidated URL state
    const { sq: searchQuery } = urlState
    const [showDateSliders, setShowDateSliders] = useState(false)

    // Extract from simplified dateConfig - single source of truth
    const { minDate, maxDate, totalDays, activeRange } = dateConfig
    const now = useMemo(() => new Date(), [])

    // Calculate current slider positions from actual dates (eliminates redundant state)
    const startDays = useMemo(() => differenceInCalendarDays(activeRange.start, minDate), [activeRange.start, minDate])
    const endDays = useMemo(() => differenceInCalendarDays(activeRange.end, minDate), [activeRange.end, minDate])

    /* Commmented out for performance reasons
    logr.info('date-and-search-filters', `RECEIVED dateConfig: ${stringify({
        startDays,
        endDays,
        activeRange: {start: activeRange.start.toISOString(), end: activeRange.end.toISOString()},
        isFiltered: dateConfig.isFiltered
    })}`)
    */
    useEffect(() => {
        if (showDateSliders) {
            umamiTrack('showDateSliders')
        }
    }, [showDateSliders])

    // URL processing now handled by useUrlProcessor hook in useAppController

    // Convert slider value to date
    const getDateFromDays = (days: number) => {
        // Inline implementation as fallback for Jest issues
        const date = new Date(minDate.getTime() + days * (1000 * 60 * 60 * 24))
        return format(date, "yyyy-MM-dd'T'HH:mm:ss") // no Z on end for local time string, Z implies UTC
    }

    // Use active range directly (eliminates addDays calculations)
    const { startDate, endDate } = useMemo(() => {
        const result = { startDate: activeRange.start, endDate: activeRange.end }
        logr.info(
            'date-and-search-filters',
            `Using active range: ${stringify({ start: result.startDate.toISOString(), end: result.endDate.toISOString() })}`
        )
        return result
    }, [activeRange.start, activeRange.end])

    // Memoized formatted date strings to avoid expensive format() calls on every render
    const formattedDates = useMemo(
        () => ({
            startButton: format(startDate, 'MMM d EEE'),
            endButton: format(endDate, 'MMM d EEE'),
            startSlider: format(startDate, 'MMM d, yyyy'),
            endSlider: format(endDate, 'MMM d, yyyy'),
        }),
        [startDate, endDate]
    )

    // Helper: check if two dates are in the same month and year
    const isSameMonthBoolean = !!startDate && !!endDate && isSameMonth(startDate, endDate)

    // Handler for calendar selection - simplified to work directly with dates
    const handleCalendarSelect = (date: Date | undefined, which: 'start' | 'end') => {
        if (!date) return

        // Determine if we should update start or end based on selection
        const selectedDays = differenceInCalendarDays(date, minDate)
        let updateWhich = selectedDays > endDays ? 'end' : 'start'
        if (selectedDays > startDays && which === 'end') {
            updateWhich = 'end'
        }

        if (updateWhich === 'start') {
            onDateRangeChange({
                startIso: getStartOfDay(selectedDays, minDate),
                endIso: getEndOfDay(endDays, minDate),
            })
        } else {
            onDateRangeChange({
                startIso: getStartOfDay(startDays, minDate),
                endIso: getEndOfDay(selectedDays, minDate),
            })
        }
        if (onDateQuickFilterChange) onDateQuickFilterChange(null)
    }
    return (
        <div className="relative">
            <div className="flex flex-row items-center gap-2 w-full">
                <Popover.Root open={showDateSliders} onOpenChange={setShowDateSliders}>
                    <Popover.Trigger asChild>
                        <div className="min-w-0 flex-1 text-primary">
                            <div className="bg-white rounded-md shadow-sm overflow-hidden min-w-0">
                                <button
                                    className="w-full text-left text-sm md:text-md p-1 transition-colors bg-blue-100 text-blue-800 rounded cursor-pointer hover:bg-blue-200  duration-150"
                                    data-testid="date-range-dropdown"
                                >
                                    {formattedDates.startButton} - {formattedDates.endButton}{' '}
                                    {showDateSliders ? '↑' : '↓'}
                                </button>
                            </div>
                        </div>
                    </Popover.Trigger>
                    <Popover.Portal>
                        <Popover.Content className="z-50 w-[95vw] max-w-[480px] sm:w-[480px] p-0 bg-white rounded-md shadow-lg border mt-2 overflow-x-auto popover-content">
                            <div className="p-2 border-t border-gray-100 bg-white shadow-md">
                                {/* Single range slider for start and end. Need left+right margin to make easier on mobile, left margin >= right) */}
                                <div className="mb-4 mx-2">
                                    <label className="block text-md md:text-lg text-gray-600 mb-0.5 text-center">
                                        Date Range: {formattedDates.startSlider} - {formattedDates.endSlider}
                                    </label>
                                    <Slider
                                        min={0}
                                        max={totalDays}
                                        value={[startDays, endDays]}
                                        onValueChange={([newStart, newEnd]) => {
                                            onDateRangeChange({
                                                startIso: getStartOfDay(newStart, minDate),
                                                endIso: getEndOfDay(newEnd, minDate),
                                            })
                                            if (onDateQuickFilterChange) onDateQuickFilterChange(null)
                                        }}
                                        className="w-full"
                                    />
                                </div>
                                {/* Two column layout for calendars and quick buttons */}
                                <div className="flex flex-row gap-4">
                                    {/* First column: Calendars */}
                                    <div className="flex-1">
                                        <div className="scale-90 sm:scale-100 origin-top">
                                            {isSameMonthBoolean ? (
                                                <Calendar
                                                    mode="single"
                                                    selected={startDate}
                                                    onSelect={(date: Date | undefined) =>
                                                        handleCalendarSelect(date, 'start')
                                                    }
                                                    modifiers={{
                                                        range_start: startDate,
                                                        range_end: endDate,
                                                        range_middle:
                                                            startDate && endDate && startDate < endDate
                                                                ? {
                                                                      from: addDays(startDate, 1),
                                                                      to: addDays(endDate, -1),
                                                                  }
                                                                : undefined,
                                                    }}
                                                    modifiersClassNames={{
                                                        range_start: 'bg-blue-200 !text-black',
                                                        range_end: 'bg-blue-200 !text-black',
                                                        range_middle: 'bg-blue-100',
                                                    }}
                                                    fromDate={minDate}
                                                    toDate={endDate}
                                                    month={startDate ?? minDate}
                                                />
                                            ) : (
                                                <>
                                                    <div>
                                                        <Calendar
                                                            mode="single"
                                                            selected={startDate}
                                                            onSelect={(date: Date | undefined) =>
                                                                handleCalendarSelect(date, 'start')
                                                            }
                                                            modifiers={{
                                                                range_start: startDate,
                                                                range_end: endDate,
                                                                range_middle:
                                                                    startDate && endDate && startDate < endDate
                                                                        ? {
                                                                              from: addDays(startDate, 1),
                                                                              to: addDays(endDate, -1),
                                                                          }
                                                                        : undefined,
                                                            }}
                                                            modifiersClassNames={{
                                                                range_start: 'bg-blue-200 !text-black',
                                                                range_end: 'bg-blue-200 !text-black',
                                                                range_middle: 'bg-blue-100',
                                                            }}
                                                            fromDate={minDate}
                                                            toDate={endDate}
                                                            month={startDate ?? minDate}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Calendar
                                                            mode="single"
                                                            selected={endDate}
                                                            onSelect={(date: Date | undefined) =>
                                                                handleCalendarSelect(date, 'end')
                                                            }
                                                            modifiers={{
                                                                range_start: startDate,
                                                                range_end: endDate,
                                                                range_middle:
                                                                    startDate && endDate && startDate < endDate
                                                                        ? {
                                                                              from: addDays(startDate, 1),
                                                                              to: addDays(endDate, -1),
                                                                          }
                                                                        : undefined,
                                                            }}
                                                            modifiersClassNames={{
                                                                range_start: 'bg-blue-200 !text-black',
                                                                range_end: 'bg-blue-200 !text-black',
                                                                range_middle: 'bg-blue-100',
                                                            }}
                                                            fromDate={startDate}
                                                            toDate={maxDate}
                                                            month={endDate ?? maxDate}
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {/* Second column: Quick buttons */}
                                    <div className="flex-1 flex flex-col items-start">
                                        <DateQuickButtons
                                            now={now}
                                            minDate={minDate}
                                            totalDays={totalDays}
                                            getDateFromDays={getDateFromDays}
                                            onDateRangeChange={onDateRangeChange}
                                            onDateQuickFilterChange={onDateQuickFilterChange}
                                        />
                                    </div>
                                </div>
                            </div>
                        </Popover.Content>
                    </Popover.Portal>
                </Popover.Root>
                <input
                    type="text"
                    placeholder="Search name, location, or description"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="p-1.5 border rounded flex-1  text-black min-w-0 ml-0 sm:ml-2"
                    data-testid="search-input"
                />
            </div>
        </div>
    )
}
