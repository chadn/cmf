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
    const { sq: searchQuery, dateSliderRange } = urlState
    const [showDateSliders, setShowDateSliders] = useState(false)

    // Date calculations now centralized in useUrlProcessor hook via dateConfig prop
    const { minDate, maxDate, totalDays, fsdDays, fedDays } = dateConfig
    const now = useMemo(() => new Date(), [])
    const [startDays, setStartDays] = useState(fsdDays)
    const [endDays, setEndDays] = useState(fedDays)

    logr.debug('date-and-search-filters', `dateConfig: ${stringify({ startDays, endDays, dateConfig })}`)
    useEffect(() => {
        logr.debug('date-and-search-filters', `new startDays=${startDays}, endDays=${endDays} ${stringify(dateConfig)}`)
    }, [startDays, endDays])

    useEffect(() => {
        if (!dateSliderRange) {
            setStartDays(0)
            setEndDays(totalDays)
        }
    }, [dateSliderRange, totalDays])

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

    // Compute current start/end as Date objects
    const { startDate, endDate } = useMemo(() => {
        return { startDate: addDays(minDate, startDays), endDate: addDays(minDate, endDays) }
    }, [startDays, endDays, minDate])

    // Helper: check if two dates are in the same month and year
    const isSameMonthBoolean = !!startDate && !!endDate && isSameMonth(startDate, endDate)

    // Handler for calendar selection
    const handleCalendarSelect = (date: Date | undefined, which: 'start' | 'end') => {
        if (!date) return
        const selectedDays = differenceInCalendarDays(date, minDate)
        // Update the start date by default. Update the end date if
        // - the selected date is after the end date
        // - the selected date is after the start AND which is 'end'
        let updateWhich = selectedDays > endDays ? 'end' : 'start'
        if (selectedDays > startDays && which === 'end') {
            updateWhich = 'end'
        }
        if (updateWhich === 'start') {
            setStartDays(selectedDays)
            onDateRangeChange({
                startIso: getStartOfDay(selectedDays, minDate),
                endIso: getEndOfDay(endDays, minDate),
            })
        } else {
            setEndDays(selectedDays)
            onDateRangeChange({
                startIso: getStartOfDay(startDays, minDate),
                endIso: getEndOfDay(selectedDays, minDate),
            })
        }
        if (onDateQuickFilterChange) onDateQuickFilterChange(null)
    }

    const formatDateForButton = (date: Date) => {
        return format(date, 'MMM d EEE')
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
                                    {formatDateForButton(startDate)} - {formatDateForButton(endDate)}{' '}
                                    {showDateSliders ? '↑' : '↓'}
                                </button>
                            </div>
                        </div>
                    </Popover.Trigger>
                    <Popover.Portal>
                        <Popover.Content className="z-50 w-[95vw] max-w-[480px] sm:w-[480px] p-0 bg-white rounded-md shadow-lg border mt-2 overflow-x-auto popover-content">
                            <div className="p-2 border-t border-gray-100 bg-white shadow-md">
                                {/* Single range slider for start and end */}
                                <div className="mb-4">
                                    <label className="block text-md md:text-lg text-gray-600 mb-0.5 text-center">
                                        Date Range: {format(startDate, 'MMM d, yyyy')} -{' '}
                                        {format(endDate, 'MMM d, yyyy')}
                                    </label>
                                    <Slider
                                        min={0}
                                        max={totalDays}
                                        value={[startDays, endDays]}
                                        onValueChange={([newStart, newEnd]) => {
                                            setStartDays(newStart)
                                            setEndDays(newEnd)
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
                                            setStartValue={setStartDays}
                                            setEndValue={setEndDays}
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
