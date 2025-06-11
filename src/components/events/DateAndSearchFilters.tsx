'use client'

import { useState, useEffect } from 'react'
import { format, subMonths, addMonths, addDays, differenceInCalendarDays } from 'date-fns'
import DateQuickButtons from './DateQuickButtons'
import { getDateFromUrlDateString } from '@/lib/utils/date'
import { umamiTrack } from '@/lib/utils/umami'
import { Calendar } from '@/components/ui/calendar'
import { Slider } from '@/components/ui/slider'
import * as Popover from '@radix-ui/react-popover'

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
    const totalDays = differenceInCalendarDays(maxDate, minDate)
    const [startDays, setStartDays] = useState(0)
    const [endDays, setEndDays] = useState(totalDays)

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

    // Convert slider value to date
    const getDateFromDays = (days: number) => {
        const date = new Date(minDate.getTime() + days * (1000 * 60 * 60 * 24))
        return format(date, "yyyy-MM-dd'T'HH:mm:ss'Z'")
    }

    // Helper: convert ISO string to Date
    const isoToDate = (iso?: string) => (iso ? new Date(iso) : undefined)

    // Compute current start/end as Date objects
    const startDate = isoToDate(getDateFromDays(startDays))
    const endDate = isoToDate(getDateFromDays(endDays))

    // Helper: check if two dates are in the same month and year
    const isSameMonth =
        startDate &&
        endDate &&
        startDate.getFullYear() === endDate.getFullYear() &&
        startDate.getMonth() === endDate.getMonth()

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
                start: getDateFromDays(selectedDays),
                end: getDateFromDays(endDays),
            })
        } else {
            setEndDays(selectedDays)
            onDateRangeChange({
                start: getDateFromDays(startDays),
                end: getDateFromDays(selectedDays),
            })
        }
        if (onDateQuickFilterChange) onDateQuickFilterChange('')
    }

    const formatDateForButton = (date: Date) => {
        return format(date, 'MMM d EEE')
    }
    const startDateText = formatDateForButton(new Date(getDateFromDays(startDays)))
    const endDateText = formatDateForButton(new Date(getDateFromDays(endDays)))

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
                                    {startDateText} - {endDateText} {showDateSliders ? '↑' : '↓'}
                                </button>
                            </div>
                        </div>
                    </Popover.Trigger>
                    <Popover.Portal>
                        <Popover.Content className="z-50 w-[95vw] max-w-[480px] sm:w-[480px] p-0 bg-white rounded-md shadow-lg border mt-2 overflow-x-auto popover-content">
                            <div className="p-2 border-t border-gray-100 bg-white shadow-md">
                                {/* Single range slider for start and end */}
                                <div className="mb-4">
                                    <label className="block text-xs text-gray-600 mb-0.5 text-center">
                                        Date Range: {format(new Date(getDateFromDays(startDays)), 'MMM d, yyyy')} -{' '}
                                        {format(new Date(getDateFromDays(endDays)), 'MMM d, yyyy')}
                                    </label>
                                    <Slider
                                        min={0}
                                        max={totalDays}
                                        value={[startDays, endDays]}
                                        onValueChange={([newStart, newEnd]) => {
                                            setStartDays(newStart)
                                            setEndDays(newEnd)
                                            onDateRangeChange({
                                                start: getDateFromDays(newStart),
                                                end: getDateFromDays(newEnd),
                                            })
                                            if (onDateQuickFilterChange) onDateQuickFilterChange('')
                                        }}
                                        className="w-full"
                                    />
                                </div>
                                <DateQuickButtons
                                    now={now}
                                    minDate={minDate}
                                    totalDays={totalDays}
                                    setStartValue={setStartDays}
                                    setEndValue={setEndDays}
                                    getDateFromDays={getDateFromDays}
                                    onDateRangeChange={onDateRangeChange}
                                    dateQuickFilterUrl={dateQuickFilterUrl}
                                    onDateQuickFilterChange={onDateQuickFilterChange}
                                    appState={appState}
                                />
                                {/* Calendar pickers for start and end date */}
                                <div className="flex flex-col sm:flex-row gap-0 2xl:gap-4 justify-center mt-0 sm:mt-4">
                                    <div className="scale-90 sm:scale-100 origin-top">
                                        {isSameMonth ? (
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
                                                            ? { from: addDays(startDate, 1), to: addDays(endDate, -1) }
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
